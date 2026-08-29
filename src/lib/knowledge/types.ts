/**
 * Knowledge Base Architecture & Types
 * Google Sheets is the SINGLE SOURCE OF TRUTH for all factual knowledge.
 */

export type KnowledgeCategory = 
  | 'إجراءات نقل الملكية'
  | 'حساب الضريبة والنسب'
  | 'الإعفاءات السكنية والتجارية'
  | 'المستندات والأوراق المطلوبة'
  | 'مواعيد الطعون والتظلمات'
  | 'الشهادات العقارية وبراءة الذمة'
  | 'غرامات التأخير والمخالفات'
  | 'تقييم العقارات واللجان الحصرية'
  | 'عام';

export interface KnowledgeRecord {
  id: string;
  category: KnowledgeCategory | string;
  topic: string;
  question: string;
  answer: string;
  source: string;
  approved: boolean;
  lastUpdated: string;
  keywords: string[];
  sourceType: 'google_sheets';
  spreadsheetId?: string;
  spreadsheetTitle?: string;
  sheetName?: string;
  sheetRowIndex?: number;
  rowNumber?: number;
  isGoogleSheetRecord?: boolean;
}

export interface KnowledgeQueryFilter {
  category?: string;
  approvedOnly?: boolean;
  limit?: number;
  minScore?: number;
}

export interface KnowledgeSearchResult {
  record: KnowledgeRecord;
  score: number;
  matchedKeywords: string[];
  matchReason?: string;
}

export interface QuestionUnderstanding {
  intent: string;
  topic: string;
  requestedInformation: string[];
  entities?: string[];
  keywords: string[];
  searchQuery: string;
  needsClarification: boolean;
  clarificationPrompt?: string;
  isOutOfScope?: boolean;
  isGreeting?: boolean;
  detectedCategory?: string;
}

export interface AnswerGenerationResult {
  answerText: string;
  status: 'verified' | 'clarification' | 'not_found' | 'error';
  relevantFacts?: string[];
  usedRecords: KnowledgeRecord[];
  sources?: {
    name: string;
    lastUpdated: string;
    isGoogleSheet?: boolean;
    rowNumber?: number;
  }[];
  latencyMs?: number;
  understanding?: QuestionUnderstanding;
  suggestedFollowUps?: string[];
}

export interface KnowledgeBaseStats {
  totalRecords: number;
  approvedRecords: number;
  unapprovedRecords: number;
  categories: { name: string; count: number }[];
  providerName: string;
  isConfigured: boolean;
  isGoogleSheetsActive?: boolean;
  sheetTitle?: string;
  sheetId?: string;
  sheetName?: string;
  lastSyncedAt?: string;
  contentHash?: string;
  version?: number;
  cacheStatus: 'ACTIVE' | 'CLEARED' | 'UNINITIALIZED';
}

export interface KnowledgeBaseDiagnostics {
  sourceType: 'google_sheets';
  providerName: string;
  isReady: boolean;
  spreadsheetId: string;
  spreadsheetTitle: string;
  sheetName: string;
  lastSyncedAt: string;
  totalRecords: number;
  approvedRecords: number;
  unapprovedRecords: number;
  contentHash: string;
  version: number;
  cacheStatus: 'ACTIVE' | 'CLEARED' | 'UNINITIALIZED';
}

export interface ExtractedFactItem {
  field: string;
  label: string;
  facts: string[];
  sourceRecordId: string;
  topic: string;
  rowNumber?: number;
}

export interface IntermediateExtractionResult {
  candidateRecords: KnowledgeRecord[];
  extractedFacts: ExtractedFactItem[];
  requestedInformation: string[];
  isInformationMissing: boolean;
  missingFields: string[];
  sources: {
    name: string;
    lastUpdated: string;
    isGoogleSheet?: boolean;
    rowNumber?: number;
  }[];
}

/**
 * KnowledgeBaseProvider Interface
 * Strict contract implemented exclusively by GoogleSheetsKnowledgeBase.
 */
export interface KnowledgeBaseProvider {
  readonly providerName: string;
  isReady(): boolean;

  /**
   * Search knowledge base using normalized query, topic, keywords, and filters
   */
  search(query: string, filter?: KnowledgeQueryFilter, understanding?: Partial<QuestionUnderstanding>): Promise<KnowledgeSearchResult[]>;

  /**
   * Intermediate extraction layer:
   * Extracts ONLY verified fact lines from candidate Google Sheet rows.
   */
  extractRelevantKnowledge(
    understanding: QuestionUnderstanding,
    filter?: KnowledgeQueryFilter
  ): Promise<IntermediateExtractionResult>;

  /**
   * Fetch single record by ID
   */
  getById(id: string): Promise<KnowledgeRecord | null>;

  /**
   * Get all current records
   */
  getAllRecords(): Promise<KnowledgeRecord[]>;

  /**
   * Get stats for diagnostics
   */
  getStats(): Promise<KnowledgeBaseStats>;

  /**
   * Get diagnostic report
   */
  getDiagnostics(): KnowledgeBaseDiagnostics;

  /**
   * Replace all records with fresh Google Sheets synchronization snapshot
   */
  sync(params: {
    spreadsheetId: string;
    spreadsheetTitle?: string;
    sheetName?: string;
    records: KnowledgeRecord[];
  }): Promise<{ success: boolean; rowCount: number; contentHash: string; version: number }>;

  /**
   * Invalidate and wipe in-memory cache and snapshot
   */
  resetCache(): Promise<boolean>;

  /**
   * Optional single record mutations (sync back to Google Sheets)
   */
  upsertRecord?(record: KnowledgeRecord): Promise<boolean>;
  deleteRecord?(id: string): Promise<boolean>;
}

// Alias for backward compatibility if referenced
export type KnowledgeBaseService = KnowledgeBaseProvider;

