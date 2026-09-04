/**
 * Global Frontend & Backend Shared Types for Tax Support AI
 */
import type { KnowledgeRecord, QuestionUnderstanding, SupervisorGuidance, CaseClassification } from './lib/knowledge/types.ts';

export type UserRole = 'employee' | 'admin';
export type UserAccountStatus = 'active' | 'suspended' | 'disabled';
export type UserAuthProvider = 'google' | 'password' | 'system';

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  photoURL?: string;
  provider?: UserAuthProvider;
  role: UserRole;
  department: string;
  jobTitle: string;
  status: UserAccountStatus;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  lastSeenAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  status?: 'sending' | 'thinking' | 'retrieving' | 'verified' | 'clarification' | 'not_found' | 'no_verified_data' | 'ai_error' | 'knowledge_error' | 'knowledge_conflict' | 'transfer_required' | 'error';
  understanding?: QuestionUnderstanding;
  supervisorGuidance?: SupervisorGuidance;
  sources?: {
    topic?: string;
    source?: string;
    name?: string;
    lastUpdated?: string;
    isDemo?: boolean;
    isGoogleSheet?: boolean;
  }[];
  usedRecords?: KnowledgeRecord[];
  followUps?: string[];
  suggestedFollowUps?: string[];
  latencyMs?: number;
}

export type Message = ChatMessage;

export interface Conversation {
  id: string;
  ownerUid?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerUsername?: string;
  department?: string;
  jobTitle?: string;
  userId?: string;
  userName?: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  pinned?: boolean;
}

export interface UnansweredQuestion {
  id: string;
  query?: string;
  question?: string;
  askedBy?: string;
  employeeName?: string;
  employeeUid?: string;
  timestamp: number | string;
  status?: 'not_found' | 'clarification' | 'retrieval_failed' | string;
  reason?: string;
  suggestedTopic?: string;
  resolved?: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionText?: string;
}

export interface AuditLogEntry {
  id: string;
  actorUid?: string;
  actorName?: string;
  userName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  timestamp: number | string;
}

export type AuditLog = AuditLogEntry;

export interface AdminOverviewStats {
  totalRecords: number;
  approvedRecords: number;
  unapprovedRecords: number;
  questionsToday: number;
  unansweredQuestionsCount: number;
  activeUsersCount: number;
  onlineUsersCount: number;
  verifiedAnswersCount: number;
  systemErrorsCount: number;
  systemStatus: 'online' | 'degraded' | 'offline';
  aiModel: string;
  knowledgeSource: string;
  avgLatencyMs: number;
  isGoogleSheetsActive?: boolean;
  connectedSheetTitle?: string;
}

export interface TestCase {
  id: string;
  title: string;
  description: string;
  query: string;
  contextMessages?: { role: 'user' | 'model'; content: string }[];
  expectedOutcome: 'verified' | 'clarification' | 'not_found' | 'ignored_unapproved' | 'safe_defense';
  expectedRecordId?: string;
  expectedKeyword?: string;
  actualStatus?: 'pass' | 'fail' | 'pending';
  actualAnswer?: string;
  actualLatency?: number;
  details?: string;
  intentExtracted?: string;
  searchQueryUsed?: string;
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  sheetName: string;
  lastSyncedAt: string;
  autoSync: boolean;
  syncIntervalMinutes: number;
  rowCount: number;
  isReadOnly: boolean;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface PerformanceRecord {
  id: string;
  employeeUid: string;
  employeeName: string;
  username?: string;
  department?: string;
  jobTitle?: string;
  month: number; // 1 - 12
  year: number;  // e.g. 2026
  monthLabel: string; // e.g. "يناير 2026"
  errorRate: number; // Percentage e.g. 12 (12% أخطاء)
  errorCount?: number; // e.g. 18 أخطاء
  accuracyRate: number; // e.g. 88 (88% دقة)
  casesHandled: number; // e.g. 180 معاملة / مكالمة منجزة
  callsPresented?: number; // e.g. 184 إجمالي المكالمات الواردة
  irRate?: number; // % Of IR (معدل الاستجابة/المطابقة) e.g. 100
  utilizationRate?: number; // Utli (نسبة الاستغلال) e.g. 89.6
  occupancyRate?: number; // Occu (نسبة الإشغال) e.g. 11.6
  attendance?: {
    emergency?: number; // أيام طوارئ
    sick?: number;      // أيام مرضي
    tardy?: number;     // تأخيرات
  };
  score: number; // 0 - 100 overall score
  overallRating: 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول' | 'يحتاج تحسين';
  strengths: string[];
  improvementAreas: string[];
  supervisorNotes: string;
  aiAnalysisSummary?: string;
  createdAt: string;
  updatedAt: string;
  addedBy?: string;
}

export interface PerformanceAnalysisRequest {
  month: number;
  year: number;
  images?: { mimeType: string; data: string; name?: string }[];
  textData?: string;
}

export type ReportCategory = 
  | 'utilization_occupancy' 
  | 'call_performance' 
  | 'attendance' 
  | 'quality_ir_mistakes' 
  | 'unknown';

export type KpiDatasetStatus = 'draft' | 'needs_review' | 'approved' | 'rejected';

export interface ImageUploadItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  data: string; // base64
  status: 'pending' | 'processing' | 'extracted' | 'needs_review' | 'approved' | 'failed';
  detectedCategory: ReportCategory;
  detectedMonth?: string;
  confidence?: number;
  extractedRowCount?: number;
  errorMessage?: string;
  warnings?: string[];
}

export interface MetricTraceValue {
  value: number;
  sourceFile: string;
  row?: number;
  confidence?: number;
  isEdited?: boolean;
  originalValue?: number;
  editedBy?: string;
  editedAt?: string;
  editReason?: string;
}

export interface EmployeeKpiRecord {
  employeeUid: string;
  username: string;
  employeeName: string;
  department: string;
  jobTitle: string;
  matchStatus: 'matched' | 'unknown_employee' | 'manual_mapped';
  
  // Raw Source Report Data (Preserves exact numbers and source traceability)
  utilization?: MetricTraceValue;
  occupancy?: MetricTraceValue;
  callsPresented?: MetricTraceValue;
  callsHandled?: MetricTraceValue;
  emergency?: MetricTraceValue;
  sick?: MetricTraceValue;
  tardy?: MetricTraceValue;
  ir?: MetricTraceValue;
  mistakes?: MetricTraceValue;
  
  // Derived Deterministic Metrics (Calculated exclusively in application code)
  derived: {
    callHandlingRate: number | null; // (handled / presented) * 100
    accuracyRate: number | null; // 100 - mistakes
    totalAbsenceDays: number; // emergency + sick
    totalTardyCount: number; // tardy
    calculatedErrorsCount: number | null; // handled * (mistakes / 100)
    score: number | null; // null when scoring formula is not configured
    scoreFormulaStatus: 'not_configured' | 'configured';
    overallRating?: 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول' | 'يحتاج تحسين' | 'غير محدد';
  };
  
  // Explicit Validation flags for this employee
  validationFlags: string[];
  notes?: string;
}

export interface KpiValidationWarning {
  id: string;
  type: 
    | 'UNKNOWN_EMPLOYEE' 
    | 'DUPLICATE_EMPLOYEE' 
    | 'MISSING_FROM_UTILIZATION' 
    | 'MISSING_FROM_CALLS' 
    | 'MISSING_FROM_ATTENDANCE' 
    | 'MISSING_FROM_QUALITY' 
    | 'DATA_ANOMALY' 
    | 'MONTH_MISMATCH' 
    | 'DUPLICATE_REPORT' 
    | 'LOW_CONFIDENCE';
  message: string;
  employeeUsername?: string;
  employeeName?: string;
  sourceFile?: string;
  severity: 'warning' | 'error' | 'info';
  createdAt: string;
}

export interface KpiDatasetHistoryEntry {
  version: number;
  action: 'ingested' | 'edited' | 'approved' | 'rejected' | 'reopened' | 'manual_mapped';
  actorUid: string;
  actorName: string;
  timestamp: string;
  details?: string;
}

export interface MonthlyKpiDataset {
  id: string; // e.g. "kpi_2026_8"
  month: number; // 1-12
  year: number; // e.g. 2026
  monthKey: string; // e.g. "2026-08"
  monthLabel: string; // e.g. "أغسطس 2026"
  status: KpiDatasetStatus;
  version: number;
  sourceFiles: {
    id: string;
    name: string;
    category: ReportCategory;
    size: number;
    uploadedAt: string;
    uploadedBy: string;
    detectedMonth?: string;
  }[];
  employees: Record<string, EmployeeKpiRecord>; // keyed by exact username
  validationWarnings: KpiValidationWarning[];
  history: KpiDatasetHistoryEntry[];
  formulaConfig?: {
    isConfigured: boolean;
    weights?: {
      utilization: number;
      callHandling: number;
      accuracy: number;
      attendance: number;
      ir: number;
    };
  };
  approvedBy?: {
    uid: string;
    displayName: string;
  };
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeKpiPersonalMonth {
  monthKey: string;
  month: number;
  year: number;
  monthLabel: string;
  version: number;
  status: 'approved';
  approvedAt?: string;
  approvedBy?: {
    uid: string;
    displayName: string;
  };
  sourceFiles: {
    id: string;
    name: string;
    category: ReportCategory;
    uploadedAt: string;
  }[];
  record: EmployeeKpiRecord;
}

export interface EmployeePersonalKpiResponse {
  success: boolean;
  employee: {
    uid: string;
    displayName: string;
    username: string;
    department: string;
    jobTitle: string;
    email?: string;
  };
  approvedMonths: EmployeeKpiPersonalMonth[];
  totalApprovedMonthsCount: number;
}

