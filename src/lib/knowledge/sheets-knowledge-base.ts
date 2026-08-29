/**
 * Google Sheets Knowledge Base Service
 * The SOLE authoritative KnowledgeBaseProvider for production chat and AI reasoning.
 * 
 * Rules:
 * - NO hardcoded legal facts or demo fallback records.
 * - Current Google Sheet data is the only source of truth.
 * - On synchronization, all previous records and caches are purged and REPLACED atomically.
 * - Every record maintains rowNumber, spreadsheetId, sheetName, and source metadata.
 */

import fs from 'fs';
import path from 'path';
import {
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

const SNAPSHOT_DIR = path.join(process.cwd(), 'data');
const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, 'sheets-knowledge-snapshot.json');

// Deterministic content hash for row synchronization verification
function computeRecordsHash(records: KnowledgeRecord[], spreadsheetId: string = ''): string {
  if (records.length === 0) return 'sh_empty_0';
  let hashStr = `sp:${spreadsheetId};`;
  for (const r of records) {
    hashStr += `${r.id}|${r.topic}|${r.answer}|${r.approved}|${r.rowNumber || 0}|${r.lastUpdated};`;
  }
  let hash = 0;
  for (let i = 0; i < hashStr.length; i++) {
    const char = hashStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'sh_' + Math.abs(hash).toString(16) + '_' + records.length;
}

export class GoogleSheetsKnowledgeBaseService implements KnowledgeBaseProvider {
  readonly providerName = 'GoogleSheetsKnowledgeBase (قاعدة معرفة Google Sheets المعتمدة)';
  private records: KnowledgeRecord[] = [];
  private spreadsheetId: string = '';
  private spreadsheetTitle: string = '';
  private sheetName: string = '';
  private lastSyncedAt: string = '';
  private contentHash: string = '';
  private version: number = 0;
  private isConfigured: boolean = false;
  private cacheStatus: 'ACTIVE' | 'CLEARED' | 'UNINITIALIZED' = 'UNINITIALIZED';

  constructor(
    spreadsheetId: string = '',
    spreadsheetTitle: string = '',
    sheetName: string = 'قاعدة المعرفة',
    initialRecords: KnowledgeRecord[] = []
  ) {
    if (spreadsheetId && initialRecords.length > 0) {
      this.syncInternal({
        spreadsheetId,
        spreadsheetTitle,
        sheetName,
        records: initialRecords
      });
    } else {
      this.loadSnapshotFromFile();
    }
  }

  private loadSnapshotFromFile(): void {
    try {
      if (fs.existsSync(SNAPSHOT_FILE)) {
        const raw = fs.readFileSync(SNAPSHOT_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.records) && data.records.length > 0) {
          this.records = data.records;
          this.spreadsheetId = data.spreadsheetId || '';
          this.spreadsheetTitle = data.spreadsheetTitle || '';
          this.sheetName = data.sheetName || 'قاعدة المعرفة';
          this.lastSyncedAt = data.lastSyncedAt || new Date().toISOString();
          this.contentHash = data.contentHash || computeRecordsHash(this.records, this.spreadsheetId);
          this.version = data.version || 1;
          this.isConfigured = Boolean(this.spreadsheetId && this.records.length > 0);
          this.cacheStatus = 'ACTIVE';
        }
      }
    } catch (err) {
      console.warn('Failed to load knowledge snapshot from disk:', err);
    }
  }

  private saveSnapshotToFile(): void {
    try {
      if (!fs.existsSync(SNAPSHOT_DIR)) {
        fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
      }
      const data = {
        spreadsheetId: this.spreadsheetId,
        spreadsheetTitle: this.spreadsheetTitle,
        sheetName: this.sheetName,
        lastSyncedAt: this.lastSyncedAt,
        contentHash: this.contentHash,
        version: this.version,
        records: this.records
      };
      fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save knowledge snapshot to disk:', err);
    }
  }

  private deleteSnapshotFile(): void {
    try {
      if (fs.existsSync(SNAPSHOT_FILE)) {
        fs.unlinkSync(SNAPSHOT_FILE);
      }
    } catch (err) {
      console.warn('Failed to delete knowledge snapshot file:', err);
    }
  }

  isReady(): boolean {
    if (this.records.length === 0) {
      this.loadSnapshotFromFile();
    }
    return this.records.length > 0;
  }

  /**
   * Replaces all existing knowledge with fresh Google Sheets records
   */
  async sync(params: {
    spreadsheetId: string;
    spreadsheetTitle?: string;
    sheetName?: string;
    records: KnowledgeRecord[];
  }): Promise<{ success: boolean; rowCount: number; contentHash: string; version: number }> {
    return this.syncInternal(params);
  }

  private syncInternal(params: {
    spreadsheetId: string;
    spreadsheetTitle?: string;
    sheetName?: string;
    records: KnowledgeRecord[];
  }): { success: boolean; rowCount: number; contentHash: string; version: number } {
    const { spreadsheetId, spreadsheetTitle, sheetName, records } = params;

    // 1. Invalidate previous cache and wipe old records completely (REPLACE, not append)
    this.records = [];
    this.cacheStatus = 'CLEARED';

    // 2. Validate and sanitize incoming rows
    const sanitized: KnowledgeRecord[] = [];
    const rawList = Array.isArray(records) ? records : [];

    for (let i = 0; i < rawList.length; i++) {
      const r = rawList[i];
      if (!r) continue;

      const topic = (r.topic || '').trim();
      const question = (r.question || topic).trim();
      const answer = (r.answer || '').trim();

      // Skip invalid/empty rows (requires at least topic or question, plus answer)
      if (!topic && !question && !answer) continue;

      const rowNum = r.rowNumber || r.sheetRowIndex || (i + 2); // default header at row 1

      sanitized.push({
        id: r.id || `kb_sheet_${spreadsheetId.slice(0, 6)}_${rowNum}`,
        category: r.category || 'عام',
        topic: topic || 'موضوع ضريبي',
        question: question || topic,
        answer: answer,
        source: r.source || `Google Sheet: ${spreadsheetTitle || 'جدول الضرائب العقارية'} (صف ${rowNum})`,
        approved: r.approved ?? true,
        lastUpdated: r.lastUpdated || new Date().toISOString().split('T')[0],
        keywords: Array.isArray(r.keywords) && r.keywords.length > 0
          ? r.keywords
          : [topic, r.category || 'عام'].filter(Boolean),
        sourceType: 'google_sheets',
        spreadsheetId,
        spreadsheetTitle: spreadsheetTitle || 'جدول الضرائب العقارية',
        sheetName: sheetName || 'قاعدة المعرفة',
        sheetRowIndex: rowNum,
        rowNumber: rowNum,
        isGoogleSheetRecord: true
      });
    }

    // 3. Atomically replace records
    this.records = sanitized;
    this.spreadsheetId = spreadsheetId;
    this.spreadsheetTitle = spreadsheetTitle || 'جدول الضرائب العقارية';
    this.sheetName = sheetName || 'قاعدة المعرفة';
    this.lastSyncedAt = new Date().toISOString();
    this.contentHash = computeRecordsHash(this.records, this.spreadsheetId);
    this.version += 1;
    this.isConfigured = Boolean(spreadsheetId && this.records.length > 0);
    this.cacheStatus = this.records.length > 0 ? 'ACTIVE' : 'CLEARED';

    // Persist snapshot to file
    this.saveSnapshotToFile();

    return {
      success: true,
      rowCount: this.records.length,
      contentHash: this.contentHash,
      version: this.version
    };
  }

  /**
   * Resets local cache and wipes all records
   */
  async resetCache(): Promise<boolean> {
    this.records = [];
    this.contentHash = '';
    this.isConfigured = false;
    this.cacheStatus = 'UNINITIALIZED';
    this.version += 1;
    this.lastSyncedAt = new Date().toISOString();
    this.deleteSnapshotFile();
    return true;
  }

  /**
   * Search knowledge base using normalized query, topic, keywords, and filters
   */
  async search(
    query: string,
    filter: KnowledgeQueryFilter = {},
    understanding?: Partial<QuestionUnderstanding>
  ): Promise<KnowledgeSearchResult[]> {
    if (!this.isReady()) {
      return [];
    }

    const approvedOnly = filter.approvedOnly ?? true;
    const limit = filter.limit ?? 5;
    const minScore = filter.minScore ?? 15;

    let pool = this.records;
    if (approvedOnly) {
      pool = pool.filter(r => r.approved === true);
    }
    if (filter.category) {
      const normCat = normalizeArabic(filter.category);
      pool = pool.filter(r => normalizeArabic(r.category) === normCat);
    }

    const results: KnowledgeSearchResult[] = [];
    const queryParts: string[] = [query];
    if (understanding?.searchQuery && understanding.searchQuery.trim() !== query.trim()) {
      queryParts.push(understanding.searchQuery);
    }
    if (understanding?.topic && understanding.topic.trim() !== query.trim()) {
      queryParts.push(understanding.topic);
    }

    const combinedQuery = queryParts.join(' ');
    const extraKeywords = (understanding?.keywords || []).filter(k => k.trim() !== query.trim());

    for (const record of pool) {
      const allRecordText = `${record.topic} ${record.question} ${record.answer} ${record.category}`;
      const allKeywords = [...record.keywords, ...extraKeywords];

      const match = calculateArabicMatchScore(combinedQuery, allRecordText, allKeywords);

      let score = match.score;
      if (score >= 10 && understanding?.detectedCategory) {
        if (normalizeArabic(record.category) === normalizeArabic(understanding.detectedCategory)) {
          score += 15;
        }
      }

      if (score >= minScore) {
        results.push({
          record,
          score,
          matchedKeywords: match.matchedKeywords,
          matchReason: `تطابق من صف Google Sheets رقم ${record.rowNumber || record.sheetRowIndex || '—'} (${match.matchedKeywords.slice(0, 3).join(', ') || 'نصي'})`
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Intermediate extraction layer:
   * Extracts ONLY verified fact lines from candidate Google Sheet rows.
   */
  async extractRelevantKnowledge(
    understanding: QuestionUnderstanding,
    filter: KnowledgeQueryFilter = { approvedOnly: true, limit: 4, minScore: 15 }
  ): Promise<IntermediateExtractionResult> {
    if (!this.isReady()) {
      return {
        candidateRecords: [],
        extractedFacts: [],
        requestedInformation: understanding.requestedInformation || ['details'],
        isInformationMissing: true,
        missingFields: understanding.requestedInformation || ['details'],
        sources: []
      };
    }

    const candidates = await this.search(
      understanding.searchQuery || understanding.topic,
      filter,
      understanding
    );

    const candidateRecords = candidates.map(c => c.record);
    const sources = candidateRecords.map(r => ({
      name: r.source || `Google Sheet: ${this.spreadsheetTitle} (صف ${r.rowNumber || r.sheetRowIndex})`,
      lastUpdated: r.lastUpdated,
      isGoogleSheet: true,
      rowNumber: r.rowNumber || r.sheetRowIndex
    }));

    if (candidateRecords.length === 0) {
      return {
        candidateRecords: [],
        extractedFacts: [],
        requestedInformation: understanding.requestedInformation || ['details'],
        isInformationMissing: true,
        missingFields: understanding.requestedInformation || ['details'],
        sources: []
      };
    }

    const requestedFields = (understanding.requestedInformation && understanding.requestedInformation.length > 0)
      ? understanding.requestedInformation
      : ['details'];

    const extractedFacts: ExtractedFactItem[] = [];
    const missingFields: string[] = [];

    for (const field of requestedFields) {
      let fieldFacts: string[] = [];
      let sourceTopic = '';
      let sourceId = '';
      let sourceRow: number | undefined;

      for (const record of candidateRecords) {
        const lines = record.answer
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean);

        if (field === 'required_documents') {
          const docLines = lines.filter(l => {
            const norm = normalizeArabic(l);
            return (
              /^\d+\./.test(l) ||
              norm.includes('بطاقة') ||
              norm.includes('عقد') ||
              norm.includes('كشف') ||
              norm.includes('ايصال') ||
              norm.includes('نموذج') ||
              norm.includes('توكيل') ||
              norm.includes('مستند') ||
              norm.includes('اوراق') ||
              norm.includes('شهادة')
            );
          });
          if (docLines.length > 0) {
            fieldFacts = docLines;
            sourceTopic = record.topic;
            sourceId = record.id;
            sourceRow = record.rowNumber || record.sheetRowIndex;
            break;
          }
        } else if (field === 'fees') {
          const feeLines = lines.filter(l => {
            const norm = normalizeArabic(l);
            return (
              norm.includes('%') ||
              norm.includes('جنيه') ||
              norm.includes('رسم') ||
              norm.includes('نسبة') ||
              norm.includes('ضريبة') ||
              norm.includes('تأمين') ||
              norm.includes('مصاريف')
            );
          });
          if (feeLines.length > 0) {
            fieldFacts = feeLines;
            sourceTopic = record.topic;
            sourceId = record.id;
            sourceRow = record.rowNumber || record.sheetRowIndex;
            break;
          }
        } else if (field === 'duration') {
          const durLines = lines.filter(l => {
            const norm = normalizeArabic(l);
            return (
              norm.includes('يوم') ||
              norm.includes('ايام') ||
              norm.includes('ساعة') ||
              norm.includes('ساعات') ||
              norm.includes('مدة') ||
              norm.includes('شهر') ||
              norm.includes('شهور') ||
              norm.includes('اسبوع')
            );
          });
          if (durLines.length > 0) {
            fieldFacts = durLines;
            sourceTopic = record.topic;
            sourceId = record.id;
            sourceRow = record.rowNumber || record.sheetRowIndex;
            break;
          }
        } else {
          fieldFacts = lines;
          sourceTopic = record.topic;
          sourceId = record.id;
          sourceRow = record.rowNumber || record.sheetRowIndex;
          break;
        }
      }

      if (fieldFacts.length > 0) {
        const fieldLabels: Record<string, string> = {
          required_documents: 'المستندات المطلوبة',
          fees: 'الرسوم والنسب المقررة',
          duration: 'المدة الزمنية',
          conditions: 'الشروط والأحكام',
          deadlines: 'المواعيد والمواقيت القانونية',
          exemption_rules: 'قواعد وحدود الإعفاء',
          procedure_steps: 'خطوات الإجراء',
          details: 'تفاصيل الإجراء'
        };
        extractedFacts.push({
          field,
          label: fieldLabels[field] || field,
          facts: fieldFacts,
          sourceRecordId: sourceId || candidateRecords[0].id,
          topic: sourceTopic || candidateRecords[0].topic,
          rowNumber: sourceRow
        });
      } else {
        missingFields.push(field);
      }
    }

    return {
      candidateRecords,
      extractedFacts,
      requestedInformation: requestedFields,
      isInformationMissing: extractedFacts.length === 0 && candidateRecords.length === 0,
      missingFields,
      sources
    };
  }

  async getById(id: string): Promise<KnowledgeRecord | null> {
    return this.records.find(r => r.id === id) || null;
  }

  async getAllRecords(): Promise<KnowledgeRecord[]> {
    return [...this.records];
  }

  async getStats(): Promise<KnowledgeBaseStats> {
    const total = this.records.length;
    const approved = this.records.filter(r => r.approved).length;
    const unapproved = total - approved;

    const catMap = new Map<string, number>();
    for (const r of this.records) {
      catMap.set(r.category, (catMap.get(r.category) || 0) + 1);
    }

    const categories = Array.from(catMap.entries()).map(([name, count]) => ({
      name,
      count
    }));

    return {
      totalRecords: total,
      approvedRecords: approved,
      unapprovedRecords: unapproved,
      categories,
      providerName: this.providerName,
      isConfigured: this.isConfigured,
      isGoogleSheetsActive: this.isConfigured,
      sheetTitle: this.spreadsheetTitle,
      sheetId: this.spreadsheetId,
      sheetName: this.sheetName,
      lastSyncedAt: this.lastSyncedAt,
      contentHash: this.contentHash,
      version: this.version,
      cacheStatus: this.cacheStatus
    };
  }

  getDiagnostics(): KnowledgeBaseDiagnostics {
    const approved = this.records.filter(r => r.approved).length;
    return {
      sourceType: 'google_sheets',
      providerName: this.providerName,
      isReady: this.isReady(),
      spreadsheetId: this.spreadsheetId,
      spreadsheetTitle: this.spreadsheetTitle,
      sheetName: this.sheetName,
      lastSyncedAt: this.lastSyncedAt,
      totalRecords: this.records.length,
      approvedRecords: approved,
      unapprovedRecords: this.records.length - approved,
      contentHash: this.contentHash,
      version: this.version,
      cacheStatus: this.cacheStatus
    };
  }

  async upsertRecord(record: KnowledgeRecord): Promise<boolean> {
    const idx = this.records.findIndex(r => r.id === record.id);
    const updatedRec: KnowledgeRecord = {
      ...record,
      sourceType: 'google_sheets',
      spreadsheetId: this.spreadsheetId || record.spreadsheetId || 'sheet_default',
      spreadsheetTitle: this.spreadsheetTitle || record.spreadsheetTitle || 'جدول الضرائب العقارية',
      sheetName: this.sheetName || record.sheetName || 'قاعدة المعرفة',
      isGoogleSheetRecord: true
    };

    if (idx >= 0) {
      this.records[idx] = updatedRec;
    } else {
      this.records.unshift(updatedRec);
    }

    this.isConfigured = true;
    this.cacheStatus = 'ACTIVE';
    this.contentHash = computeRecordsHash(this.records, this.spreadsheetId);
    this.version += 1;
    this.saveSnapshotToFile();
    return true;
  }

  async deleteRecord(id: string): Promise<boolean> {
    const initialLen = this.records.length;
    this.records = this.records.filter(r => r.id !== id);
    const deleted = this.records.length < initialLen;
    if (deleted) {
      this.isConfigured = this.records.length > 0;
      if (this.records.length === 0) {
        this.cacheStatus = 'CLEARED';
      }
      this.contentHash = computeRecordsHash(this.records, this.spreadsheetId);
      this.version += 1;
      this.saveSnapshotToFile();
    }
    return deleted;
  }
}
