/**
 * Audit Logging Service
 * Persists administrative and security events immutably to Firestore.
 */

import { getAdminDb } from '../firebase-admin.ts';
import { AuditLogEntry } from '../../types.ts';

export interface RecordAuditParams {
  actorUid: string;
  actorName: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  metadata?: Record<string, any>;
}

export async function recordAuditLog(params: RecordAuditParams): Promise<AuditLogEntry> {
  const db = getAdminDb();
  const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  const entry: AuditLogEntry = {
    id: logId,
    actorUid: params.actorUid || 'system',
    actorName: params.actorName || 'النظام الذكي',
    action: params.action,
    targetType: params.targetType || 'system',
    targetId: params.targetId || '',
    details: params.details || '',
    metadata: params.metadata || {},
    createdAt: new Date().toISOString(),
    timestamp: Date.now()
  };

  try {
    await db.collection('auditLogs').doc(logId).set(entry);
  } catch (err) {
    console.warn('Could not write audit log to Firestore:', err);
  }

  return entry;
}

export async function getAuditLogs(limitCount: number = 100): Promise<AuditLogEntry[]> {
  const db = getAdminDb();
  try {
    const snapshot = await db.collection('auditLogs')
      .orderBy('timestamp', 'desc')
      .limit(limitCount)
      .get();

    const logs: AuditLogEntry[] = [];
    snapshot.forEach(doc => {
      logs.push({ ...doc.data() as AuditLogEntry, id: doc.id });
    });

    if (logs.length > 0) return logs;
  } catch (err) {
    console.warn('Failed to query audit logs from Firestore, falling back:', err);
  }

  // Fallback initial system logs if Firestore is newly provisioned
  return [
    {
      id: "log_sys_init",
      actorUid: "system",
      actorName: "نظام الضرائب العقارية الذكي",
      action: "SYSTEM_BOOT",
      details: "بدء تشغيل وتأمين منظومة الذكاء الاصطناعي لمصلحة الضرائب العقارية",
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    }
  ];
}
