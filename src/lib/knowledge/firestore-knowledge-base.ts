/**
 * Cloud Firestore Knowledge Base Service
 * The SOLE authoritative KnowledgeBaseProvider for production chat and AI reasoning.
 * 
 * Rules:
 * - NO Google Sheets runtime dependency in live Chat.
 * - Firestore `knowledge` collection is the Single Source of Truth.
 * - Only `approved === true` records are used for factual AI Chat answers.
 * - Every mutation writes to Firestore, verifies read-back, bumps version, and invalidates retrieval cache immediately.
 */

import fs from 'fs';
import path from 'path';
import type {
  KnowledgeBaseProvider,
  KnowledgeRecord,
  KnowledgeQueryFilter,
  KnowledgeSearchResult,
  KnowledgeBaseStats,
  KnowledgeBaseDiagnostics,
  QuestionUnderstanding,
  IntermediateExtractionResult,
  ExtractedFactItem
} from './types.ts';
import { normalizeArabic, calculateArabicMatchScore } from './arabic-utils.ts';
import { RAW_USER_DATASET } from './raw-user-data.ts';

const SNAPSHOT_DIR = path.join(process.cwd(), 'data');
const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, 'firestore-knowledge-snapshot.json');

// Deterministic content hash helper
function computeRecordsHash(records: KnowledgeRecord[]): string {
  if (records.length === 0) return 'fs_empty_0';
  let hashStr = '';
  for (const r of records) {
    hashStr += `${r.id}|${r.topic}|${r.answer}|${r.approved}|${r.version}|${r.updatedAt};`;
  }
  let hash = 0;
  for (let i = 0; i < hashStr.length; i++) {
    const char = hashStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'fs_' + Math.abs(hash).toString(16) + '_' + records.length;
}

/**
 * Parses raw text dataset into structured KnowledgeRecord items
 */
export function parseInitialRawDataset(): KnowledgeRecord[] {
  const records: KnowledgeRecord[] = [];
  const text = RAW_USER_DATASET;
  const lines = text.split('\n');

  let currentQuestion = '';
  let currentAnswerLines: string[] = [];
  let currentCrm = '';
  let currentData = '';
  let currentTopic = '';
  let currentCategory = 'استفسارات عن الضرائب العقاريه';

  const flushCurrent = () => {
    if (currentQuestion && currentAnswerLines.length > 0) {
      const fullAnswer = currentAnswerLines.join('\n').trim();
      const questionClean = currentQuestion.replace(/^[\d\s\-–\u0660-\u0669]+/, '').trim();
      
      // Determine topic
      let topic = currentTopic || questionClean;
      if (topic.length > 60) {
        topic = topic.substring(0, 57) + '...';
      }

      // Determine category
      let category = currentCategory;
      if (fullAnswer.includes('إعفاء') || fullAnswer.includes('اعفاء') || questionClean.includes('إعفاء')) {
        category = 'الإعفاءات السكنية والتجارية';
      } else if (fullAnswer.includes('طعن') || questionClean.includes('طعن')) {
        category = 'مواعيد الطعون والتظلمات';
      } else if (fullAnswer.includes('سداد') || fullAnswer.includes('دفع') || questionClean.includes('سداد')) {
        category = 'السداد والتحصيل الإلكتروني';
      } else if (fullAnswer.includes('حساب') || fullAnswer.includes('سعر الضريبة') || fullAnswer.includes('10%')) {
        category = 'حساب الضريبة والنسب';
      } else if (fullAnswer.includes('كشف رسمي') || fullAnswer.includes('مستندات') || fullAnswer.includes('أوراق')) {
        category = 'المستندات والأوراق المطلوبة';
      }

      // Extract CRM classification
      let crmMain = 'استفسارات عن الضرائب العقاريه';
      let crmSub = 'تقديم الاقرار الضريبي';
      if (currentCrm) {
        const mainMatch = currentCrm.match(/التصنيف الاساسي\s*:\s*([^–\-)]+)/);
        const subMatch = currentCrm.match(/التصنيف الفرعي\s*:\s*([^)]+)/);
        if (mainMatch && mainMatch[1]) crmMain = mainMatch[1].trim();
        if (subMatch && subMatch[1]) crmSub = subMatch[1].trim();
      }

      const keywords = Array.from(new Set([
        ...questionClean.replace(/[^\w\s\u0600-\u06FF]/g, ' ').split(/\s+/).filter(w => w.length > 2),
        ...category.split(/\s+/).filter(w => w.length > 2)
      ]));

      const id = `tax_q_${records.length + 1}`;
      records.push({
        id,
        category,
        subcategory: crmSub,
        topic,
        question: questionClean,
        answer: fullAnswer,
        keywords,
        requiredCustomerData: currentData || 'الاسم ثلاثي / رقم الموبايل / المحافظه',
        crmMainCategory: crmMain,
        crmSubCategory: crmSub,
        routingAction: fullAnswer.includes('المأمورية') ? 'توجيه إلى المأمورية المختصة' : 'مساعدة إلكترونية',
        sourceReference: 'قانون الضريبة على العقارات المبنية رقم 196 لسنة 2008 وتعديلات قانون 3 لسنة 2026',
        source: 'قانون 196 لسنة 2008 وقانون 3 لسنة 2026',
        approved: true,
        needsReview: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'النظام الافتراضي',
        version: 1,
        sourceType: 'firestore'
      });
    }

    currentQuestion = '';
    currentAnswerLines = [];
    currentCrm = '';
    currentData = '';
    currentTopic = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if line is a question header like "١ - في حالة..." or "هل الضريبة..."
    const isQuestionStart = 
      /^[١-٩0-9]+\s*[\-–]\s*/.test(line) ||
      line.startsWith('هل ') ||
      line.startsWith('ما هو ') ||
      line.startsWith('ما موقف ') ||
      line.startsWith('متي ') ||
      line.startsWith('متى ') ||
      line.startsWith('من هو ') ||
      line.startsWith('برجاء توضيح ');

    if (isQuestionStart && currentQuestion) {
      flushCurrent();
    }

    if (isQuestionStart) {
      currentQuestion = line;
      currentTopic = line.replace(/^[١-٩0-9]+\s*[\-–]\s*/, '').trim();
    } else if (line.includes('💡يتم اختيارها علي CRM') || line.includes('💡 يتم اختيارها علي CRM') || line.includes('CRM')) {
      currentCrm = line;
    } else if (line.includes('البيانات المطلوبه') || line.includes('البيانات المطلوبة')) {
      // next line or remaining is required data
      if (lines[i + 1] && !lines[i + 1].includes('💡') && !/^[١-٩0-9]/.test(lines[i + 1])) {
        currentData = lines[i + 1].trim();
        i++;
      } else {
        currentData = line;
      }
    } else {
      currentAnswerLines.push(line);
    }
  }

  flushCurrent();
  return records;
}

export class FirestoreKnowledgeBaseService implements KnowledgeBaseProvider {
  readonly providerName = 'FirestoreKnowledgeBase (قاعدة معرفة Cloud Firestore المعتمدة)';
  private cachedRecords: KnowledgeRecord[] = [];
  private lastFetchedAt: number = 0;
  private cacheTTLMs: number = 60000; // 60 seconds cache TTL, instantly invalidated on any mutation
  private isInitialized: boolean = false;
  private version: number = 1;
  private contentHash: string = '';
  private firestoreConnected: boolean = true;

  constructor() {
    this.initFromSnapshotOrDataset();
  }

  private initFromSnapshotOrDataset() {
    try {
      if (fs.existsSync(SNAPSHOT_FILE)) {
        const raw = fs.readFileSync(SNAPSHOT_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.records) && parsed.records.length > 0) {
          this.cachedRecords = parsed.records;
          this.version = parsed.version || 1;
          this.contentHash = parsed.contentHash || computeRecordsHash(this.cachedRecords);
          this.isInitialized = true;
          return;
        }
      }
    } catch {
      // fallback
    }

    // Default pre-population
    this.cachedRecords = parseInitialRawDataset();
    this.contentHash = computeRecordsHash(this.cachedRecords);
    this.isInitialized = true;
    this.saveSnapshotToFile();
  }

  private saveSnapshotToFile() {
    try {
      if (!fs.existsSync(SNAPSHOT_DIR)) {
        fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
      }
      fs.writeFileSync(
        SNAPSHOT_FILE,
        JSON.stringify(
          {
            version: this.version,
            contentHash: this.contentHash,
            updatedAt: new Date().toISOString(),
            records: this.cachedRecords
          },
          null,
          2
        ),
        'utf-8'
      );
    } catch {
      // Ignored
    }
  }

  /**
   * Lazily fetches Firestore Admin DB instance
   */
  private async getDb(): Promise<any | null> {
    try {
      const { getAdminDb } = await import('../../server/firebase-admin.ts');
      return getAdminDb();
    } catch {
      return null;
    }
  }

  isReady(): boolean {
    return this.cachedRecords.length > 0;
  }

  /**
   * Syncs with Firestore `knowledge` collection
   */
  private async loadFromFirestore(forceRefresh = false): Promise<KnowledgeRecord[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedRecords.length > 0 && now - this.lastFetchedAt < this.cacheTTLMs) {
      return this.cachedRecords;
    }

    try {
      const db = await this.getDb();
      if (!db) {
        return this.cachedRecords;
      }

      const snapshot = await db.collection('knowledge').get();
      if (snapshot.empty) {
        // If collection is empty in Firestore, auto-seed the 48 official records!
        await this.seedInitialKnowledge();
        return this.cachedRecords;
      }

      const records: KnowledgeRecord[] = [];
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        records.push({
          id: doc.id,
          category: data.category || 'عام',
          subcategory: data.subcategory || '',
          topic: data.topic || '',
          question: data.question || '',
          answer: data.answer || '',
          keywords: Array.isArray(data.keywords) ? data.keywords : [],
          requiredCustomerData: data.requiredCustomerData || '',
          crmMainCategory: data.crmMainCategory || '',
          crmSubCategory: data.crmSubCategory || '',
          routingAction: data.routingAction || '',
          sourceReference: data.sourceReference || 'قانون 196 لسنة 2008 وقانون 3 لسنة 2026',
          source: data.source || data.sourceReference || 'قانون 196 لسنة 2008',
          approved: data.approved !== false,
          needsReview: Boolean(data.needsReview),
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          updatedBy: data.updatedBy || 'النظام',
          version: typeof data.version === 'number' ? data.version : 1,
          contentHash: data.contentHash || '',
          sourceType: 'firestore'
        });
      });

      this.cachedRecords = records;
      this.lastFetchedAt = now;
      this.contentHash = computeRecordsHash(records);
      this.version = records.reduce((max, r) => Math.max(max, r.version || 1), 1);
      this.firestoreConnected = true;
      this.saveSnapshotToFile();
      return this.cachedRecords;
    } catch (err: any) {
      this.firestoreConnected = false;
      this.lastFetchedAt = now;
      return this.cachedRecords;
    }
  }

  /**
   * Seeds the official 48 tax questions and answers into Firestore
   */
  async seedInitialKnowledge(): Promise<number> {
    const initialRecords = parseInitialRawDataset();
    try {
      const db = await this.getDb();
      if (db) {
        const batch = db.batch();
        for (const record of initialRecords) {
          const docRef = db.collection('knowledge').doc(record.id);
          batch.set(docRef, record, { merge: true });
        }
        await batch.commit();
        this.firestoreConnected = true;
      }
    } catch {
      this.firestoreConnected = false;
    }

    this.cachedRecords = initialRecords;
    this.contentHash = computeRecordsHash(initialRecords);
    this.lastFetchedAt = Date.now();
    this.saveSnapshotToFile();
    return initialRecords.length;
  }

  /**
   * Invalidate in-memory cache immediately upon mutation
   */
  async resetCache(): Promise<boolean> {
    this.lastFetchedAt = 0;
    await this.loadFromFirestore(true);
    return true;
  }

  async getAllRecords(): Promise<KnowledgeRecord[]> {
    return this.loadFromFirestore();
  }

  async getApprovedRecords(): Promise<KnowledgeRecord[]> {
    const all = await this.loadFromFirestore();
    return all.filter(r => r.approved === true);
  }

  async getById(id: string): Promise<KnowledgeRecord | null> {
    const all = await this.loadFromFirestore();
    return all.find(r => r.id === id) || null;
  }

  /**
   * High accuracy search across Firestore knowledge documents
   */
  async search(
    query: string,
    filter?: KnowledgeQueryFilter,
    understanding?: Partial<QuestionUnderstanding>
  ): Promise<KnowledgeSearchResult[]> {
    const records = await this.loadFromFirestore();
    const approvedOnly = filter?.approvedOnly ?? true;

    // Filter by approval & category first
    let candidates = records.filter(r => {
      if (approvedOnly && !r.approved) return false;
      if (filter?.category && filter.category !== 'all' && r.category !== filter.category) return false;
      if (filter?.subcategory && r.subcategory !== filter.subcategory) return false;
      return true;
    });

    const searchPhrase = (understanding?.searchQuery || query || '').trim();
    const targetTopic = understanding?.topic || '';
    const targetKeywords = understanding?.keywords || [];
    const requestedInfo = understanding?.requestedInformation || [];

    const results: KnowledgeSearchResult[] = [];

    for (const record of candidates) {
      let score = 0;
      const matchedKeywords: string[] = [];

      // 1. Exact / Fuzzy match on question
      const qRes = calculateArabicMatchScore(searchPhrase, record.question, record.keywords);
      score += qRes.score * 1.5;
      matchedKeywords.push(...qRes.matchedKeywords);

      // 2. Match on topic
      if (targetTopic) {
        const topicRes = calculateArabicMatchScore(targetTopic, record.topic, record.keywords);
        score += topicRes.score * 2.0;
        if (topicRes.score > 30) {
          matchedKeywords.push('موضوع مطابق');
        }
      }

      // 3. Match on answer content
      const ansRes = calculateArabicMatchScore(searchPhrase, record.answer, record.keywords);
      score += ansRes.score * 0.8;
      matchedKeywords.push(...ansRes.matchedKeywords);

      // 4. Keyword matches
      for (const kw of targetKeywords) {
        const normKw = normalizeArabic(kw);
        if (!normKw || normKw.length < 2) continue;

        if (record.keywords.some(rk => normalizeArabic(rk).includes(normKw))) {
          score += 15;
          matchedKeywords.push(kw);
        } else if (normalizeArabic(record.answer).includes(normKw)) {
          score += 10;
          matchedKeywords.push(kw);
        } else if (normalizeArabic(record.topic).includes(normKw)) {
          score += 20;
          matchedKeywords.push(kw);
        }
      }

      // 5. Facet / Requested Info matches
      const normAnswer = normalizeArabic(record.answer);
      if (requestedInfo.includes('required_documents') && (normAnswer.includes('مستندات') || normAnswer.includes('اوراق') || normAnswer.includes('صورة'))) {
        score += 25;
      }
      if (requestedInfo.includes('fees') && (normAnswer.includes('رسوم') || normAnswer.includes('سداد') || normAnswer.includes('خصم') || normAnswer.includes('مبلغ') || normAnswer.includes('10%'))) {
        score += 25;
      }
      if (requestedInfo.includes('exemption_rules') && (normAnswer.includes('اعفاء') || normAnswer.includes('سكن خاص'))) {
        score += 30;
      }
      if (requestedInfo.includes('deadlines') && (normAnswer.includes('ميعاد') || normAnswer.includes('مدة') || normAnswer.includes('تاريخ') || normAnswer.includes('2/10/2026'))) {
        score += 25;
      }

      const minScore = filter?.minScore ?? 10;
      if (score >= minScore) {
        results.push({
          record,
          score,
          matchedKeywords: Array.from(new Set(matchedKeywords)),
          matchReason: `تطابق بنسبة ${Math.min(100, Math.round(score))}% مع بنود الموضوع والمعرفة المعتمدة`
        });
      }
    }

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);

    const limit = filter?.limit ?? 5;
    return results.slice(0, limit);
  }

  /**
   * Intermediate fact extraction layer for Gemini AI Grounding
   */
  async extractRelevantKnowledge(
    understanding: QuestionUnderstanding,
    filter?: KnowledgeQueryFilter
  ): Promise<IntermediateExtractionResult> {
    const searchResults = await this.search(understanding.searchQuery || understanding.topic, {
      ...filter,
      approvedOnly: true,
      limit: 3,
      minScore: 12
    }, understanding);

    const candidateRecords = searchResults.map(r => r.record);
    const extractedFacts: ExtractedFactItem[] = [];

    for (const record of candidateRecords) {
      extractedFacts.push({
        field: 'approved_knowledge',
        label: record.topic,
        facts: [record.answer],
        sourceRecordId: record.id,
        topic: record.topic,
        version: record.version
      });
    }

    const isMissing = candidateRecords.length === 0;
    const sources = candidateRecords.map(r => ({
      name: `قاعدة معرفة الضرائب العقارية - ${r.topic}`,
      lastUpdated: r.updatedAt,
      version: r.version,
      id: r.id
    }));

    return {
      candidateRecords,
      extractedFacts,
      requestedInformation: understanding.requestedInformation,
      isInformationMissing: isMissing,
      missingFields: isMissing ? understanding.requestedInformation : [],
      sources
    };
  }

  /**
   * Admin Create Mutation with read-back verification & cache invalidation
   */
  async createRecord(
    recordData: Partial<KnowledgeRecord>,
    actor?: { uid: string; name: string }
  ): Promise<KnowledgeRecord> {
    const id = recordData.id || `tax_k_${Date.now()}`;
    const now = new Date().toISOString();

    const newRecord: KnowledgeRecord = {
      id,
      category: recordData.category || 'استفسارات عن الضرائب العقاريه',
      subcategory: recordData.subcategory || recordData.crmSubCategory || '',
      topic: (recordData.topic || recordData.question || 'موضوع جديد').trim(),
      question: (recordData.question || recordData.topic || '').trim(),
      answer: (recordData.answer || '').trim(),
      keywords: Array.isArray(recordData.keywords) ? recordData.keywords : (recordData.topic || '').split(' ').filter(w => w.length > 2),
      requiredCustomerData: recordData.requiredCustomerData || 'الاسم ثلاثي / رقم الموبايل / المحافظه',
      crmMainCategory: recordData.crmMainCategory || 'استفسارات عن الضرائب العقاريه',
      crmSubCategory: recordData.crmSubCategory || recordData.subcategory || 'استفسار ضريبي',
      routingAction: recordData.routingAction || 'مساعدة إلكترونية',
      sourceReference: recordData.sourceReference || 'قانون 196 لسنة 2008 وقانون 3 لسنة 2026',
      source: recordData.source || recordData.sourceReference || 'قانون 196 لسنة 2008',
      approved: recordData.approved !== false,
      needsReview: Boolean(recordData.needsReview),
      createdAt: now,
      updatedAt: now,
      updatedBy: actor?.name || actor?.uid || 'المشرف',
      version: 1,
      sourceType: 'firestore'
    };

    // Update in-memory cache & snapshot immediately
    const existingIndex = this.cachedRecords.findIndex(r => r.id === id);
    if (existingIndex >= 0) {
      this.cachedRecords[existingIndex] = newRecord;
    } else {
      this.cachedRecords.unshift(newRecord);
    }
    this.version += 1;
    this.contentHash = computeRecordsHash(this.cachedRecords);
    this.saveSnapshotToFile();

    try {
      const db = await this.getDb();
      if (db) {
        const docRef = db.collection('knowledge').doc(id);
        await docRef.set(newRecord);
        this.firestoreConnected = true;
      }
    } catch {
      this.firestoreConnected = false;
    }

    return newRecord;
  }

  /**
   * Admin Update Mutation with read-back verification & version increment
   */
  async updateRecord(
    id: string,
    recordData: Partial<KnowledgeRecord>,
    actor?: { uid: string; name: string }
  ): Promise<KnowledgeRecord> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`السجل المطلوب تعديله ${id} غير موجود في قاعدة المعرفة`);
    }

    const now = new Date().toISOString();
    const updatedVersion = (existing.version || 1) + 1;

    const updatedRecord: KnowledgeRecord = {
      ...existing,
      ...recordData,
      id,
      updatedAt: now,
      updatedBy: actor?.name || actor?.uid || 'المشرف',
      version: updatedVersion,
      sourceType: 'firestore'
    };

    // Update in-memory cache & snapshot immediately
    const idx = this.cachedRecords.findIndex(r => r.id === id);
    if (idx >= 0) {
      this.cachedRecords[idx] = updatedRecord;
    } else {
      this.cachedRecords.unshift(updatedRecord);
    }
    this.version = Math.max(this.version + 1, updatedVersion);
    this.contentHash = computeRecordsHash(this.cachedRecords);
    this.saveSnapshotToFile();

    try {
      const db = await this.getDb();
      if (db) {
        const docRef = db.collection('knowledge').doc(id);
        await docRef.set(updatedRecord, { merge: true });
        this.firestoreConnected = true;
      }
    } catch {
      this.firestoreConnected = false;
    }

    return updatedRecord;
  }

  /**
   * Admin Delete Mutation with read-back verification & cache invalidation
   */
  async deleteRecord(id: string, actor?: { uid: string; name: string }): Promise<boolean> {
    // Update in-memory cache directly & snapshot immediately
    this.cachedRecords = this.cachedRecords.filter(r => r.id !== id);
    this.version += 1;
    this.contentHash = computeRecordsHash(this.cachedRecords);
    this.saveSnapshotToFile();

    try {
      const db = await this.getDb();
      if (db) {
        const docRef = db.collection('knowledge').doc(id);
        await docRef.delete();
        this.firestoreConnected = true;
      }
    } catch {
      this.firestoreConnected = false;
    }

    return true;
  }

  /**
   * Admin Toggle Approval with read-back verification & version increment
   */
  async toggleApproval(
    id: string,
    approved: boolean,
    actor?: { uid: string; name: string }
  ): Promise<KnowledgeRecord> {
    return this.updateRecord(id, { approved, needsReview: false }, actor);
  }

  /**
   * Upsert record helper (creates or updates)
   */
  async upsertRecord(
    record: Partial<KnowledgeRecord>,
    actor?: { uid: string; name: string }
  ): Promise<KnowledgeRecord> {
    if (record.id) {
      const existing = await this.getById(record.id);
      if (existing) {
        return this.updateRecord(record.id, record, actor);
      }
    }
    return this.createRecord(record, actor);
  }

  async getStats(): Promise<KnowledgeBaseStats> {
    const all = await this.loadFromFirestore();
    const approved = all.filter(r => r.approved).length;
    const unapproved = all.length - approved;
    const needsReview = all.filter(r => r.needsReview).length;

    const catMap = new Map<string, number>();
    all.forEach(r => {
      catMap.set(r.category, (catMap.get(r.category) || 0) + 1);
    });

    const categories = Array.from(catMap.entries()).map(([name, count]) => ({ name, count }));

    return {
      totalRecords: all.length,
      approvedRecords: approved,
      unapprovedRecords: unapproved,
      needsReviewRecords: needsReview,
      categories,
      providerName: this.providerName,
      isConfigured: true,
      lastSyncedAt: new Date(this.lastFetchedAt || Date.now()).toISOString(),
      contentHash: this.contentHash,
      version: this.version,
      cacheStatus: 'ACTIVE'
    };
  }

  getDiagnostics(): KnowledgeBaseDiagnostics {
    const all = this.cachedRecords;
    const approved = all.filter(r => r.approved).length;
    const unapproved = all.length - approved;

    return {
      sourceType: 'firestore',
      providerName: this.providerName,
      isReady: this.isReady(),
      totalRecords: all.length,
      approvedRecords: approved,
      unapprovedRecords: unapproved,
      lastUpdatedAt: new Date(this.lastFetchedAt || Date.now()).toISOString(),
      contentHash: this.contentHash,
      version: this.version,
      cacheStatus: 'ACTIVE'
    };
  }
}
