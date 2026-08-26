/**
 * Google Sheets Knowledge Base Service (Phase 2)
 * Implementation of KnowledgeBaseService backed by real-time synchronized Google Spreadsheet.
 */

import {
  KnowledgeBaseService,
  KnowledgeRecord,
  KnowledgeQueryFilter,
  KnowledgeSearchResult,
  KnowledgeBaseStats,
  QuestionUnderstanding,
  IntermediateExtractionResult,
  ExtractedFactItem
} from './types.ts';
import { normalizeArabic, calculateArabicMatchScore } from './arabic-utils.ts';
import { INITIAL_DEMO_RECORDS } from './demo-knowledge-base.ts';

export class GoogleSheetsKnowledgeBaseService implements KnowledgeBaseService {
  readonly providerName = 'GoogleSheetsKnowledgeBase (قاعدة معرفة Google Sheets المباشرة)';
  readonly isDemo = false;
  private records: KnowledgeRecord[] = [];
  private spreadsheetId: string = '';
  private spreadsheetTitle: string = '';
  private lastSyncedAt: string = '';

  constructor(
    spreadsheetId: string = '',
    spreadsheetTitle: string = 'Google Sheets',
    initialRecords: KnowledgeRecord[] = []
  ) {
    this.spreadsheetId = spreadsheetId;
    this.spreadsheetTitle = spreadsheetTitle;
    this.records = initialRecords.length > 0 ? [...initialRecords] : [...INITIAL_DEMO_RECORDS];
    this.lastSyncedAt = new Date().toISOString();
  }

  setSpreadsheetDetails(id: string, title: string, records: KnowledgeRecord[]) {
    this.spreadsheetId = id;
    this.spreadsheetTitle = title;
    this.records = records.length > 0 ? records : this.records;
    this.lastSyncedAt = new Date().toISOString();
  }

  async search(
    query: string,
    filter: KnowledgeQueryFilter = {},
    understanding?: Partial<QuestionUnderstanding>
  ): Promise<KnowledgeSearchResult[]> {
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
          matchReason: `تطابق من جداول Google Sheets (${match.matchedKeywords.slice(0, 3).join(', ') || 'نصي'})`
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  async extractRelevantKnowledge(
    understanding: QuestionUnderstanding,
    filter: KnowledgeQueryFilter = { approvedOnly: true, limit: 3, minScore: 15 }
  ): Promise<IntermediateExtractionResult> {
    const candidates = await this.search(
      understanding.searchQuery || understanding.topic,
      filter,
      understanding
    );

    const candidateRecords = candidates.map(c => c.record);
    const sources = candidateRecords.map(r => ({
      name: r.source || `Google Sheet: ${this.spreadsheetTitle}`,
      lastUpdated: r.lastUpdated,
      isDemo: false,
      isGoogleSheet: true
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
              norm.includes('اوراق')
            );
          });
          if (docLines.length > 0) {
            fieldFacts = docLines;
            sourceTopic = record.topic;
            sourceId = record.id;
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
              norm.includes('تأمين')
            );
          });
          if (feeLines.length > 0) {
            fieldFacts = feeLines;
            sourceTopic = record.topic;
            sourceId = record.id;
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
              norm.includes('شهر')
            );
          });
          if (durLines.length > 0) {
            fieldFacts = durLines;
            sourceTopic = record.topic;
            sourceId = record.id;
            break;
          }
        } else {
          fieldFacts = lines;
          sourceTopic = record.topic;
          sourceId = record.id;
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
          topic: sourceTopic || candidateRecords[0].topic
        });
      } else {
        missingFields.push(field);
      }
    }

    return {
      candidateRecords,
      extractedFacts,
      requestedInformation: requestedFields,
      isInformationMissing: extractedFacts.length === 0,
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
      isDemo: false,
      isGoogleSheetsActive: true,
      sheetTitle: this.spreadsheetTitle,
      sheetId: this.spreadsheetId,
      lastSyncedAt: this.lastSyncedAt
    };
  }

  async setRecordApproval(id: string, approved: boolean): Promise<boolean> {
    const rec = this.records.find(r => r.id === id);
    if (rec) {
      rec.approved = approved;
      rec.lastUpdated = new Date().toISOString().split('T')[0];
      return true;
    }
    return false;
  }

  async upsertRecord(record: KnowledgeRecord): Promise<boolean> {
    const idx = this.records.findIndex(r => r.id === record.id);
    if (idx >= 0) {
      this.records[idx] = { ...this.records[idx], ...record, isGoogleSheetRecord: true };
    } else {
      this.records.unshift({ ...record, isGoogleSheetRecord: true });
    }
    return true;
  }

  async deleteRecord(id: string): Promise<boolean> {
    const initialLen = this.records.length;
    this.records = this.records.filter(r => r.id !== id);
    return this.records.length < initialLen;
  }

  async setAllRecords(records: KnowledgeRecord[]): Promise<boolean> {
    if (Array.isArray(records)) {
      this.records = [...records];
      this.lastSyncedAt = new Date().toISOString();
      return true;
    }
    return false;
  }
}
