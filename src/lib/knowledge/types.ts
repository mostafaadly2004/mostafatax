/**
 * Knowledge Base Architecture & Types
 * Designed for seamless transition from DemoKnowledgeBase to GoogleSheetsKnowledgeBase.
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
  isDemoData?: boolean;
  isGoogleSheetRecord?: boolean;
  sheetRowIndex?: number;
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
    isDemo?: boolean;
    isGoogleSheet?: boolean;
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
  isDemo: boolean;
  isGoogleSheetsActive?: boolean;
  sheetTitle?: string;
  sheetId?: string;
  lastSyncedAt?: string;
}

export interface ExtractedFactItem {
  field: string;
  label: string;
  facts: string[];
  sourceRecordId: string;
  topic: string;
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
    isDemo?: boolean;
    isGoogleSheet?: boolean;
  }[];
}

/**
 * KnowledgeBaseService Interface
 * The central contract that decouples the knowledge provider (Demo vs. Google Sheets)
 * from the AI reasoning engine and UI components.
 */
export interface KnowledgeBaseService {
  readonly providerName: string;
  readonly isDemo: boolean;

  /**
   * Search knowledge base using normalized query, topic, keywords, and filters
   */
  search(query: string, filter?: KnowledgeQueryFilter, understanding?: Partial<QuestionUnderstanding>): Promise<KnowledgeSearchResult[]>;

  /**
   * Intermediate extraction layer:
   * Takes the understood intent and requested_information from Gemini/AI,
   * searches candidates, and extracts ONLY the relevant fields/facts rather than passing raw whole records.
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
   * Get all records (for admin inspection and sync)
   */
  getAllRecords(): Promise<KnowledgeRecord[]>;

  /**
   * Get stats for health and admin dashboard
   */
  getStats(): Promise<KnowledgeBaseStats>;

  /**
   * Toggle or update approval status (admin capability)
   */
  setRecordApproval?(id: string, approved: boolean): Promise<boolean>;

  /**
   * Upsert or update a single record in real-time
   */
  upsertRecord?(record: KnowledgeRecord): Promise<boolean>;

  /**
   * Delete a record by ID in real-time
   */
  deleteRecord?(id: string): Promise<boolean>;

  /**
   * Set or replace all records in memory / sync
   */
  setAllRecords?(records: KnowledgeRecord[]): Promise<boolean>;
}
