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
