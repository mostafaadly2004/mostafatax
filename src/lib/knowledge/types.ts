/**
 * Knowledge Base Architecture & Types
 * Cloud Firestore (`knowledge` collection) is the SINGLE SOURCE OF TRUTH for all factual knowledge.
 */

export type KnowledgeCategory = 
  | 'استفسارات عن الضرائب العقاريه'
  | 'إجراءات نقل الملكية'
  | 'حساب الضريبة والنسب'
  | 'الإعفاءات السكنية والتجارية'
  | 'المستندات والأوراق المطلوبة'
  | 'مواعيد الطعون والتظلمات'
  | 'الشهادات العقارية وبراءة الذمة'
  | 'غرامات التأخير والمخالفات'
  | 'تقييم العقارات واللجان الحصرية'
  | 'السداد والتحصيل الإلكتروني'
  | 'استفسارات عامة'
  | 'عام';

export interface KnowledgeRecord {
  id: string;
  category: KnowledgeCategory | string;
  subcategory?: string;
  topic: string;
  question: string;
  answer: string;
  keywords: string[];
  requiredCustomerData?: string;
  crmMainCategory?: string;
  crmSubCategory?: string;
  routingAction?: string;
  sourceReference?: string;
  source?: string;
  approved: boolean;
  needsReview?: boolean;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  version?: number;
  contentHash?: string;
  sourceType?: 'firestore' | 'google_sheets';
  // Backward compatibility fields for migration
  rowNumber?: number;
  sheetRowIndex?: number;
  lastUpdated?: string;
  spreadsheetId?: string;
  spreadsheetTitle?: string;
  sheetName?: string;
  isGoogleSheetRecord?: boolean;
}

export interface KnowledgeQueryFilter {
  category?: string;
  subcategory?: string;
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

export interface CaseClassification {
  caseType: string;
  subType: string;
  customerSituation: string;
  requestedAction?: string;
  urgency?: 'normal' | 'high' | 'escalation';
  confidence?: 'high' | 'medium' | 'low';
}

export interface SupervisorGuidance {
  caseClassification: CaseClassification;
  crmDetails: {
    crmMainCategory: string;
    crmSubCategory: string;
    requiredCustomerData: string;
  };
  employeeSteps: string[];
  transferInfo?: {
    needsTransfer: boolean;
    transferDestination?: string;
    transferNumber?: string;
    instruction?: string;
  };
  customerScript: string;
  notes?: string;
}

export interface QuestionUnderstanding {
  intent: string;
  topic: string;
  caseType?: string;
  subType?: string;
  customerSituation?: string;
  requestedAction?: string;
  needsKnowledgeLookup?: boolean;
  knowledgeCategory?: string;
  needsTransfer?: boolean;
  transferDestination?: string;
  transferNumber?: string;
  requestedInformation: string[];
  entities?: string[];
  keywords: string[];
  searchQuery: string;
  needsClarification: boolean;
  clarificationPrompt?: string;
  isOutOfScope?: boolean;
  isGreeting?: boolean;
  detectedCategory?: string;
  confidence?: 'high' | 'medium' | 'low';
  priority?: 'normal' | 'high' | 'urgent';
}

export interface AnswerGenerationResult {
  answerText: string;
  status: 'verified' | 'clarification' | 'not_found' | 'error';
  relevantFacts?: string[];
  usedRecords: KnowledgeRecord[];
  sources?: {
    topic?: string;
    name?: string;
    source?: string;
    lastUpdated?: string;
    version?: number;
    id?: string;
  }[];
  latencyMs?: number;
  understanding?: QuestionUnderstanding;
  suggestedFollowUps?: string[];
}

export interface KnowledgeBaseStats {
  totalRecords: number;
  approvedRecords: number;
  unapprovedRecords: number;
  needsReviewRecords?: number;
  categories: { name: string; count: number }[];
  providerName: string;
  isConfigured: boolean;
  lastSyncedAt?: string;
  contentHash?: string;
  version?: number;
  cacheStatus: 'ACTIVE' | 'CLEARED' | 'UNINITIALIZED';
  isGoogleSheetsActive?: boolean;
  sheetTitle?: string;
  sheetId?: string;
  sheetName?: string;
}

export interface KnowledgeBaseDiagnostics {
  sourceType: 'firestore' | 'google_sheets';
  providerName: string;
  isReady: boolean;
  totalRecords: number;
  approvedRecords: number;
  unapprovedRecords: number;
  lastUpdatedAt?: string;
  lastSyncedAt?: string;
  contentHash: string;
  version: number;
  cacheStatus: 'ACTIVE' | 'CLEARED' | 'UNINITIALIZED';
  spreadsheetId?: string;
  spreadsheetTitle?: string;
  sheetName?: string;
}

export interface ExtractedFactItem {
  field: string;
  label: string;
  facts: string[];
  sourceRecordId: string;
  topic: string;
  version?: number;
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
    version?: number;
    id?: string;
  }[];
}

/**
 * KnowledgeBaseProvider Interface
 * Strict contract implemented by FirestoreKnowledgeBaseService.
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
   * Extracts ONLY verified fact lines from candidate Firestore knowledge documents.
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
   * Get all current records from Firestore
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
   * Invalidate and wipe in-memory cache
   */
  resetCache(): Promise<boolean>;

  /**
   * CRUD mutations directly on Firestore
   */
  createRecord?(record: Partial<KnowledgeRecord>, actor?: { uid: string; name: string }): Promise<KnowledgeRecord>;
  updateRecord?(id: string, record: Partial<KnowledgeRecord>, actor?: { uid: string; name: string }): Promise<KnowledgeRecord>;
  deleteRecord?(id: string, actor?: { uid: string; name: string }): Promise<boolean>;
  toggleApproval?(id: string, approved: boolean, actor?: { uid: string; name: string }): Promise<KnowledgeRecord>;
  upsertRecord?(record: Partial<KnowledgeRecord>, actor?: { uid: string; name: string }): Promise<KnowledgeRecord>;
}

export type KnowledgeBaseService = KnowledgeBaseProvider;
