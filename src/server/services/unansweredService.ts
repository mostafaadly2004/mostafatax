/**
 * Unanswered & Clarification Questions Service
 * Stores and manages unanswered queries with Firestore and in-memory fallback.
 */

import { getAdminDb } from '../firebase-admin.ts';
import type { UnansweredQuestion, UserProfile } from '../../types.ts';
import { recordAuditLog } from './auditService.ts';

const inMemoryUnanswered = new Map<string, UnansweredQuestion>();

export async function getUnansweredQuestions(): Promise<UnansweredQuestion[]> {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection('unansweredQuestions')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const list: UnansweredQuestion[] = [];
    snapshot.forEach(doc => {
      const data = { ...doc.data() as UnansweredQuestion, id: doc.id };
      list.push(data);
      inMemoryUnanswered.set(data.id, data);
    });

    if (list.length > 0) return list;
  } catch (err) {
    // Graceful fallback
  }

  const list = Array.from(inMemoryUnanswered.values());
  list.sort((a, b) => {
    const tA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
    const tB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
    return tB - tA;
  });
  return list;
}

export async function recordUnansweredQuestion(params: {
  query: string;
  employeeUid: string;
  employeeName: string;
  status?: string;
  reason?: string;
  suggestedTopic?: string;
}): Promise<UnansweredQuestion> {
  const id = 'unans_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const entry: UnansweredQuestion = {
    id,
    query: params.query,
    employeeUid: params.employeeUid,
    employeeName: params.employeeName,
    timestamp: Date.now(),
    status: params.status || 'not_found',
    reason: params.reason || 'لا يوجد نص مباشر أو يتطلب صياغة قانونية جديدة',
    suggestedTopic: params.suggestedTopic || 'تفسيرات وتطبيقات قانونية',
    resolved: false
  };

  inMemoryUnanswered.set(id, entry);

  try {
    const db = getAdminDb();
    await db.collection('unansweredQuestions').doc(id).set(entry);
  } catch (err) {
    // Graceful in-memory handling
  }

  return entry;
}

export async function resolveUnansweredQuestion(
  questionId: string,
  resolutionText: string,
  actor: UserProfile
): Promise<void> {
  const item = inMemoryUnanswered.get(questionId);
  if (item) {
    item.resolved = true;
    item.resolvedAt = new Date().toISOString();
    item.resolvedBy = actor.displayName;
    item.resolutionText = resolutionText;
  }

  try {
    const db = getAdminDb();
    const docRef = db.collection('unansweredQuestions').doc(questionId);
    await docRef.set({
      resolved: true,
      resolvedAt: new Date().toISOString(),
      resolvedBy: actor.displayName,
      resolutionText
    }, { merge: true });
  } catch {}

  await recordAuditLog({
    actorUid: actor.uid,
    actorName: actor.displayName,
    action: 'RESOLVE_UNANSWERED_QUESTION',
    targetType: 'unanswered_question',
    targetId: questionId,
    details: `حل واعتماد استفسار غير مجاب بواسطة: ${actor.displayName}`,
    metadata: { resolutionText }
  });
}
