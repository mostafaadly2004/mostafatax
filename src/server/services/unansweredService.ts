/**
 * Unanswered & Clarification Questions Service
 * Stores and manages unanswered queries in Firestore.
 */

import { getAdminDb } from '../firebase-admin.ts';
import { UnansweredQuestion, UserProfile } from '../../types.ts';
import { recordAuditLog } from './auditService.ts';

export async function getUnansweredQuestions(): Promise<UnansweredQuestion[]> {
  const db = getAdminDb();
  try {
    const snapshot = await db.collection('unansweredQuestions')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const list: UnansweredQuestion[] = [];
    snapshot.forEach(doc => {
      list.push({ ...doc.data() as UnansweredQuestion, id: doc.id });
    });

    if (list.length > 0) return list;
  } catch (err) {
    console.warn('Error querying unanswered questions from Firestore:', err);
  }

  // Fallback initial records
  return [
    {
      id: "unans_1",
      query: "ما موقف الأراضي الزراعية التي تم تحويلها إلى مباني قبل سنة 2008؟",
      employeeName: "طارق إبراهيم",
      employeeUid: "emp_1",
      timestamp: Date.now() - 3600000 * 3,
      status: "not_found",
      reason: "تتطلب مستند إثبات تاريخ محدد لم يذكر في الاستفسار",
      suggestedTopic: "الأراضي الزراعية والمباني المستجدة",
      resolved: false
    },
    {
      id: "unans_2",
      query: "هل يمكن تقسيط ضريبة التصرفات العقارية على 5 سنوات؟",
      employeeName: "سارة محمود",
      employeeUid: "emp_2",
      timestamp: Date.now() - 3600000 * 8,
      status: "not_found",
      reason: "القانون 91 لسنة 2005 ينص على سداد فوري خلال 30 يوم",
      suggestedTopic: "تقسيط ضريبة التصرفات العقارية",
      resolved: false
    }
  ];
}

export async function recordUnansweredQuestion(params: {
  query: string;
  employeeUid: string;
  employeeName: string;
  status?: string;
  reason?: string;
  suggestedTopic?: string;
}): Promise<UnansweredQuestion> {
  const db = getAdminDb();
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

  try {
    await db.collection('unansweredQuestions').doc(id).set(entry);
  } catch (err) {
    console.warn('Could not write unanswered question to Firestore:', err);
  }

  return entry;
}

export async function resolveUnansweredQuestion(
  questionId: string,
  resolutionText: string,
  actor: UserProfile
): Promise<void> {
  const db = getAdminDb();
  const docRef = db.collection('unansweredQuestions').doc(questionId);
  const doc = await docRef.get();

  if (doc.exists) {
    await docRef.update({
      resolved: true,
      resolvedAt: new Date().toISOString(),
      resolvedBy: actor.displayName,
      resolutionText
    });
  }

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
