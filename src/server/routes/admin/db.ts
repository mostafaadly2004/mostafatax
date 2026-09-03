/**
 * Admin Database Studio Route
 * Real-time REST API for collections and documents management.
 */

import { Router } from 'express';
import type { Response } from 'express';
import { requireAdmin } from '../../auth-middleware.ts';
import type { AuthenticatedRequest } from '../../auth-middleware.ts';
import { listAllUsers, updateUserProfile, createNewUser, deleteUser } from '../../services/userService.ts';
import { knowledgeService } from '../../../lib/knowledge/knowledge-service.ts';
import { getAllConversationsForAdmin, deleteConversation } from '../../services/conversationService.ts';
import { getAuditLogs, recordAuditLog } from '../../services/auditService.ts';
import { getUnansweredQuestions, resolveUnansweredQuestion } from '../../services/unansweredService.ts';

const router = Router();

// 1. Get List of Collections with dynamic counts
router.get('/collections', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [users, knowledgeRecords, conversations, auditLogs, unanswered] = await Promise.all([
      listAllUsers().catch(() => []),
      knowledgeService.getAllRecords().catch(() => []),
      getAllConversationsForAdmin().catch(() => []),
      getAuditLogs(100).catch(() => []),
      getUnansweredQuestions().catch(() => [])
    ]);

    const collections = [
      {
        id: 'users',
        name: 'users',
        title: 'المستخدمون والهويات (Users & Profiles)',
        description: 'سجلات الموظفين والمسؤولين والصلاحيات وحالات الحسابات',
        icon: 'Users',
        count: users.length,
        isSystem: true
      },
      {
        id: 'knowledge_records',
        name: 'knowledge_records',
        title: 'قاعدة المعرفة الضريبية (Knowledge Base)',
        description: 'المواد القانونية والإجراءات واللوائح والكتب الدورية المعتمدة',
        icon: 'Database',
        count: knowledgeRecords.length,
        isSystem: false
      },
      {
        id: 'conversations',
        name: 'conversations',
        title: 'المحادثات والجلسات (Conversations)',
        description: 'سجل محادثات الموظفين والأسئلة والردود المنتجة من الذكاء الاصطناعي',
        icon: 'MessageSquare',
        count: conversations.length,
        isSystem: false
      },
      {
        id: 'audit_logs',
        name: 'audit_logs',
        title: 'سجل التدقيق والأمان (Audit Logs)',
        description: 'سجلات العمليات الإدارية وتغييرات الصلاحيات ومحاولات الأمان',
        icon: 'FileText',
        count: auditLogs.length,
        isSystem: true
      },
      {
        id: 'unanswered_questions',
        name: 'unanswered_questions',
        title: 'الاستفسارات المعلقة (Unanswered Inquiries)',
        description: 'الأسئلة التي لم تجد إجابة مباشرة لتحسين وتوسيع قاعدة المعرفة',
        icon: 'HelpCircle',
        count: unanswered.length,
        isSystem: false
      }
    ];

    res.json({ success: true, collections });
  } catch (err: any) {
    console.error('Error fetching db collections:', err);
    res.status(500).json({ error: 'فشل استرجاع مجموعات البيانات', collections: [] });
  }
});

// 2. Get Documents in a Collection
router.get('/:collection', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { collection } = req.params;

  try {
    let documents: any[] = [];

    switch (collection) {
      case 'users': {
        const users = await listAllUsers();
        documents = users.map(u => ({
          _id: u.uid,
          id: u.uid,
          ...u
        }));
        break;
      }
      case 'knowledge_records': {
        const records = await knowledgeService.getAllRecords();
        documents = records.map(r => ({
          _id: r.id,
          id: r.id,
          ...r
        }));
        break;
      }
      case 'conversations': {
        const convs = await getAllConversationsForAdmin();
        documents = convs.map(c => ({
          _id: c.id,
          id: c.id,
          title: c.title,
          ownerName: c.ownerName,
          ownerUid: c.ownerUid,
          messagesCount: c.messages?.length || 0,
          updatedAt: new Date(c.updatedAt || c.createdAt).toISOString(),
          messages: c.messages
        }));
        break;
      }
      case 'audit_logs': {
        const logs = await getAuditLogs(100);
        documents = logs.map(l => ({
          _id: l.id,
          id: l.id,
          ...l
        }));
        break;
      }
      case 'unanswered_questions': {
        const list = await getUnansweredQuestions();
        documents = list.map(q => ({
          _id: q.id,
          id: q.id,
          ...q
        }));
        break;
      }
      default:
        res.status(404).json({ error: `المجموعة (${collection}) غير موجودة` });
        return;
    }

    res.json({ success: true, collection, count: documents.length, documents });
  } catch (err: any) {
    console.error(`Error fetching collection ${collection}:`, err);
    res.status(500).json({ error: 'فشل استرجاع مستندات المجموعة', documents: [] });
  }
});

// 3. Create or Update Document in Collection
router.post('/:collection', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { collection } = req.params;
  const docPayload = req.body;
  const actor = req.user!;

  if (!docPayload || typeof docPayload !== 'object') {
    res.status(400).json({ error: 'محتوى المستند غير صالح' });
    return;
  }

  const docId = docPayload.id || docPayload._id || `doc_${Date.now()}`;

  try {
    switch (collection) {
      case 'users': {
        const existingUsers = await listAllUsers();
        const existing = existingUsers.find(u => u.uid === docId);
        if (existing) {
          await updateUserProfile(
            {
              uid: docId,
              displayName: docPayload.displayName,
              department: docPayload.department,
              jobTitle: docPayload.jobTitle,
              role: docPayload.role,
              status: docPayload.status
            },
            actor
          );
        } else {
          await createNewUser(
            {
              displayName: docPayload.displayName || 'مستخدم جديد',
              username: docPayload.username || `user_${Date.now()}`,
              email: docPayload.email,
              password: docPayload.password || 'TaxAdminPass@2025',
              confirmPassword: docPayload.password || 'TaxAdminPass@2025',
              department: docPayload.department,
              jobTitle: docPayload.jobTitle,
              role: docPayload.role || 'employee',
              status: docPayload.status || 'active'
            },
            actor
          );
        }
        break;
      }
      case 'knowledge_records': {
        if (knowledgeService.upsertRecord) {
          await knowledgeService.upsertRecord({
            id: docId,
            category: docPayload.category || 'عام',
            topic: docPayload.topic || 'مادة جديدة',
            question: docPayload.question || docPayload.topic || '',
            answer: docPayload.answer || docPayload.content || '',
            source: docPayload.source || 'قاعدة معرفة Google Sheets',
            approved: docPayload.approved ?? true,
            lastUpdated: new Date().toISOString(),
            keywords: Array.isArray(docPayload.keywords) ? docPayload.keywords : [docPayload.topic || ''],
            sourceType: 'google_sheets'
          });
        }
        break;
      }
      case 'unanswered_questions': {
        if (docPayload.resolved) {
          await resolveUnansweredQuestion(docId, docPayload.resolutionText || 'تمت التسوية', actor);
        }
        break;
      }
      default:
        res.status(400).json({ error: `التعديل غير مدعوم لهذه المجموعة (${collection})` });
        return;
    }

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'DB_DOCUMENT_UPSERT',
      targetType: collection,
      targetId: docId,
      details: `إضافة / تعديل مستند (${docId}) في مجموعة (${collection}) عبر استوديو قواعد البيانات`
    });

    res.json({ success: true, id: docId, message: 'تم حفظ المستند بنجاح' });
  } catch (err: any) {
    console.error(`Error saving doc in ${collection}:`, err);
    res.status(400).json({ error: err.message || 'فشل حفظ المستند' });
  }
});

// 4. Delete Document in Collection
router.delete('/:collection/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { collection, id } = req.params;
  const actor = req.user!;

  try {
    switch (collection) {
      case 'users':
        await deleteUser(id, actor);
        break;
      case 'knowledge_records':
        if (knowledgeService.deleteRecord) {
          await knowledgeService.deleteRecord(id);
        }
        break;
      case 'conversations':
        await deleteConversation(id, actor);
        break;
      default:
        res.status(400).json({ error: `الحذف غير مدعوم لهذه المجموعة (${collection})` });
        return;
    }

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'DB_DOCUMENT_DELETE',
      targetType: collection,
      targetId: id,
      details: `حذف مستند (${id}) من مجموعة (${collection}) عبر استوديو قواعد البيانات`
    });

    res.json({ success: true, message: `تم حذف المستند (${id}) بنجاح` });
  } catch (err: any) {
    console.error(`Error deleting doc ${id} from ${collection}:`, err);
    res.status(400).json({ error: err.message || 'فشل حذف المستند' });
  }
});

export default router;
