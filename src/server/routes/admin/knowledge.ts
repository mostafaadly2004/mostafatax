/**
 * Admin Knowledge Base Management Route
 * Cloud Firestore (`knowledge` collection) is the SINGLE SOURCE OF TRUTH for all knowledge management.
 */

import { Router } from 'express';
import type { Response } from 'express';
import { requireAdmin } from '../../auth-middleware.ts';
import type { AuthenticatedRequest } from '../../auth-middleware.ts';
import { knowledgeService, firestoreKnowledgeService } from '../../../lib/knowledge/knowledge-service.ts';
import { recordAuditLog } from '../../services/auditService.ts';

const router = Router();

// GET /api/knowledge/records or /api/admin/knowledge/records
router.get('/records', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const records = await knowledgeService.getAllRecords();
    const stats = await knowledgeService.getStats();
    const diagnostics = knowledgeService.getDiagnostics();
    res.json({
      success: true,
      records,
      stats,
      diagnostics,
      provider: knowledgeService.providerName
    });
  } catch (err: any) {
    console.error('Error fetching knowledge records:', err);
    res.status(500).json({ error: 'فشل استرجاع سجلات وقواعد المعرفة من Firestore' });
  }
});

// GET /api/knowledge/diagnostics
router.get('/diagnostics', async (_req, res: Response) => {
  try {
    const diagnostics = knowledgeService.getDiagnostics();
    res.json({
      success: true,
      diagnostics
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل استرجاع بيانات الفحص والتشخيص' });
  }
});

// GET /api/knowledge/stats
router.get('/stats', async (_req, res: Response) => {
  try {
    const stats = await knowledgeService.getStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل احتساب إحصاءات المعرفة' });
  }
});

// POST /api/knowledge/create - Create a new Firestore knowledge document
router.post('/create', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { topic, question, answer, category, subcategory, keywords, requiredCustomerData, crmMainCategory, crmSubCategory, routingAction, sourceReference, approved } = req.body;

    if (!topic || !answer) {
      res.status(400).json({ error: 'الموضوع والإجابة حقول مطلوبة لحفظ السجل' });
      return;
    }

    const createdRecord = await firestoreKnowledgeService.createRecord({
      topic,
      question: question || topic,
      answer,
      category: category || 'استفسارات عن الضرائب العقاريه',
      subcategory: subcategory || crmSubCategory || '',
      keywords: Array.isArray(keywords) ? keywords : (topic + ' ' + (question || '')).split(' ').filter(w => w.length > 2),
      requiredCustomerData: requiredCustomerData || 'الاسم ثلاثي / رقم الموبايل / المحافظه',
      crmMainCategory: crmMainCategory || 'استفسارات عن الضرائب العقاريه',
      crmSubCategory: crmSubCategory || subcategory || 'استفسار ضريبي',
      routingAction: routingAction || (answer.includes('المأمورية') ? 'توجيه إلى المأمورية المختصة' : 'مساعدة إلكترونية'),
      sourceReference: sourceReference || 'قانون 196 لسنة 2008 وقانون 3 لسنة 2026',
      approved: approved !== false
    }, { uid: actor.uid, name: actor.displayName });

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'FIRESTORE_KNOWLEDGE_CREATE',
      targetType: 'knowledge_record',
      targetId: createdRecord.id,
      details: `إضافة مستند معرفة جديد في Firestore: "${createdRecord.topic}" (التصنيف: ${createdRecord.category})`
    });

    res.json({
      success: true,
      message: 'تمت إضافة المستند بنجاح والتحقق من حفظه في Firestore',
      record: createdRecord
    });
  } catch (err: any) {
    console.error('Error creating knowledge record:', err);
    res.status(500).json({ error: err.message || 'فشل حفظ السجل في Firestore' });
  }
});

// POST /api/knowledge/update or PUT /api/knowledge/:id - Update existing record in Firestore
router.post('/update', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { id, ...updateData } = req.body;

    if (!id) {
      res.status(400).json({ error: 'معرف السجل مطلوب للتعديل' });
      return;
    }

    const updatedRecord = await firestoreKnowledgeService.updateRecord(
      id,
      updateData,
      { uid: actor.uid, name: actor.displayName }
    );

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'FIRESTORE_KNOWLEDGE_UPDATE',
      targetType: 'knowledge_record',
      targetId: id,
      details: `تعديل مستند المعرفة في Firestore: "${updatedRecord.topic}" (الإصدار: v${updatedRecord.version})`
    });

    res.json({
      success: true,
      message: 'تم تعديل السجل والتحقق من حفظه في Firestore بنجاح',
      record: updatedRecord
    });
  } catch (err: any) {
    console.error('Error updating knowledge record:', err);
    res.status(500).json({ error: err.message || 'فشل تعديل السجل في Firestore' });
  }
});

router.put('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const id = req.params.id;
    const updateData = req.body;

    const updatedRecord = await firestoreKnowledgeService.updateRecord(
      id,
      updateData,
      { uid: actor.uid, name: actor.displayName }
    );

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'FIRESTORE_KNOWLEDGE_UPDATE',
      targetType: 'knowledge_record',
      targetId: id,
      details: `تعديل مستند المعرفة في Firestore: "${updatedRecord.topic}" (الإصدار: v${updatedRecord.version})`
    });

    res.json({
      success: true,
      message: 'تم تعديل السجل بنجاح',
      record: updatedRecord
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل تعديل السجل في Firestore' });
  }
});

// POST /api/knowledge/delete or DELETE /api/knowledge/:id - Delete record from Firestore
router.post('/delete', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { id, recordId } = req.body;
    const targetId = id || recordId;

    if (!targetId) {
      res.status(400).json({ error: 'معرف السجل مطلوب للحذف' });
      return;
    }

    const existing = await firestoreKnowledgeService.getById(targetId);
    await firestoreKnowledgeService.deleteRecord(targetId, { uid: actor.uid, name: actor.displayName });

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'FIRESTORE_KNOWLEDGE_DELETE',
      targetType: 'knowledge_record',
      targetId: targetId,
      details: `حذف مستند المعرفة من Firestore نهائياً: "${existing?.topic || targetId}"`
    });

    res.json({
      success: true,
      message: 'تم حذف السجل نهائياً من Firestore والتحقق من الحذف'
    });
  } catch (err: any) {
    console.error('Error deleting knowledge record:', err);
    res.status(500).json({ error: err.message || 'فشل حذف السجل من Firestore' });
  }
});

router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const id = req.params.id;

    const existing = await firestoreKnowledgeService.getById(id);
    await firestoreKnowledgeService.deleteRecord(id, { uid: actor.uid, name: actor.displayName });

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'FIRESTORE_KNOWLEDGE_DELETE',
      targetType: 'knowledge_record',
      targetId: id,
      details: `حذف مستند المعرفة من Firestore نهائياً: "${existing?.topic || id}"`
    });

    res.json({
      success: true,
      message: 'تم حذف السجل بنجاح'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل حذف السجل' });
  }
});

// POST /api/knowledge/toggle-approval - Toggle approval status in Firestore
router.post('/toggle-approval', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { id, approved } = req.body;

    if (!id || typeof approved !== 'boolean') {
      res.status(400).json({ error: 'معرف السجل وحالة الاعتماد مطلوبة' });
      return;
    }

    const updatedRecord = await firestoreKnowledgeService.toggleApproval(
      id,
      approved,
      { uid: actor.uid, name: actor.displayName }
    );

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: approved ? 'FIRESTORE_KNOWLEDGE_APPROVE' : 'FIRESTORE_KNOWLEDGE_UNAPPROVE',
      targetType: 'knowledge_record',
      targetId: id,
      details: `${approved ? 'اعتماد' : 'إلغاء اعتماد'} مستند المعرفة في Firestore: "${updatedRecord.topic}"`
    });

    res.json({
      success: true,
      message: `تم ${approved ? 'اعتماد' : 'إلغاء اعتماد'} السجل بنجاح في Firestore`,
      record: updatedRecord
    });
  } catch (err: any) {
    console.error('Error toggling approval:', err);
    res.status(500).json({ error: err.message || 'فشل تغيير حالة الاعتماد في Firestore' });
  }
});

// POST /api/knowledge/seed-initial - Re-seed official 48 tax questions into Firestore
router.post('/seed-initial', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const count = await firestoreKnowledgeService.seedInitialKnowledge();

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'FIRESTORE_KNOWLEDGE_SEED',
      targetType: 'knowledge_base',
      targetId: 'knowledge_collection',
      details: `تهيئة وزرع ${count} سجل ضريبي رسمي معتمد في Cloud Firestore`
    });

    res.json({
      success: true,
      message: `تمت تهيئة وزرع ${count} سجل ضريبي رسمي بنجاح في Firestore`,
      count
    });
  } catch (err: any) {
    console.error('Error seeding initial knowledge:', err);
    res.status(500).json({ error: 'فشل تهيئة السجلات في Firestore' });
  }
});

// POST /api/knowledge/reset-cache - Invalidates in-memory cache
router.post('/reset-cache', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await firestoreKnowledgeService.resetCache();
    res.json({
      success: true,
      message: 'تم تفريغ وإعادة تحميل ذاكرة قاعدة المعرفة بنجاح من Firestore'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تفريغ الذاكرة المؤقتة' });
  }
});

// -------------------------------------------------------------
// Legacy Google Sheets endpoints mapped seamlessly to Firestore
// -------------------------------------------------------------
router.post('/sheets/toggle-approval', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { id, approved } = req.body;
    if (id && typeof approved === 'boolean') {
      const updated = await firestoreKnowledgeService.toggleApproval(id, approved, { uid: actor.uid, name: actor.displayName });
      await recordAuditLog({
        actorUid: actor.uid,
        actorName: actor.displayName,
        action: approved ? 'FIRESTORE_KNOWLEDGE_APPROVE' : 'FIRESTORE_KNOWLEDGE_UNAPPROVE',
        targetType: 'knowledge_record',
        targetId: id,
        details: `${approved ? 'اعتماد' : 'إلغاء اعتماد'} سجل المعرفة: "${updated.topic}"`
      });
      res.json({ success: true, record: updated });
      return;
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sheets/delete-row', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { recordId, id } = req.body;
    const targetId = id || recordId;
    if (targetId) {
      const existing = await firestoreKnowledgeService.getById(targetId);
      await firestoreKnowledgeService.deleteRecord(targetId, { uid: actor.uid, name: actor.displayName });
      await recordAuditLog({
        actorUid: actor.uid,
        actorName: actor.displayName,
        action: 'FIRESTORE_KNOWLEDGE_DELETE',
        targetType: 'knowledge_record',
        targetId: targetId,
        details: `حذف سجل المعرفة: "${existing?.topic || targetId}"`
      });
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sheets/add-row', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { record } = req.body;
    const created = await firestoreKnowledgeService.createRecord(record, { uid: actor.uid, name: actor.displayName });
    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'FIRESTORE_KNOWLEDGE_CREATE',
      targetType: 'knowledge_record',
      targetId: created.id,
      details: `إضافة سجل معرفة: "${created.topic}"`
    });
    res.json({ success: true, record: created, rowNumber: 1 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sheets/update-row', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { record } = req.body;
    const updated = await firestoreKnowledgeService.updateRecord(record.id, record, { uid: actor.uid, name: actor.displayName });
    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'FIRESTORE_KNOWLEDGE_UPDATE',
      targetType: 'knowledge_record',
      targetId: record.id,
      details: `تحديث سجل المعرفة: "${updated.topic}"`
    });
    res.json({ success: true, record: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sheets/sync', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const count = await firestoreKnowledgeService.seedInitialKnowledge();
    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'FIRESTORE_KNOWLEDGE_SEED',
      targetType: 'knowledge_base',
      targetId: 'knowledge_collection',
      details: `إعادة مزامنة وزرع ${count} سجل ضريبي رسمي في Firestore`
    });
    res.json({
      success: true,
      message: `تم تحديث ${count} سجل في Firestore بنجاح`,
      result: { rowCount: count, approvedCount: count }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
