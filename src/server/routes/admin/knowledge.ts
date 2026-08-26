/**
 * Admin Knowledge Base Management Route
 */

import { Router, Response } from 'express';
import { requireAdmin, AuthenticatedRequest } from '../../auth-middleware.ts';
import { knowledgeService, knowledgeManager } from '../../../lib/knowledge/knowledge-service.ts';
import { recordAuditLog } from '../../services/auditService.ts';

const router = Router();

router.get('/records', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const records = await knowledgeService.getAllRecords();
    res.json({
      success: true,
      records,
      provider: knowledgeService.providerName
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل استرجاع نصوص وقواعد المعرفة' });
  }
});

router.post('/save', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { record } = req.body;
    if (!record || !record.topic) {
      res.status(400).json({ error: 'بيانات المادة القانونية غير مكتملة' });
      return;
    }

    const fullRecord = {
      id: record.id || `kn_${Date.now()}`,
      category: record.category || 'عام',
      topic: record.topic,
      question: record.question || record.topic,
      answer: record.answer || record.content || '',
      source: record.source || 'تعليمات مصلحة الضرائب العقارية',
      approved: record.approved ?? true,
      lastUpdated: new Date().toISOString(),
      keywords: Array.isArray(record.keywords) ? record.keywords : [record.topic]
    };

    if (knowledgeService.upsertRecord) {
      await knowledgeService.upsertRecord(fullRecord);
    }

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'SAVE_KNOWLEDGE_RECORD',
      targetType: 'knowledge_record',
      targetId: fullRecord.id,
      details: `إضافة / تعديل مادة في قاعدة المعرفة: ${fullRecord.topic}`
    });

    res.json({ success: true, record: fullRecord });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل حفظ المادة القانونية' });
  }
});

router.post('/delete', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ error: 'معرف المادة مطلوب' });
      return;
    }

    if (knowledgeService.deleteRecord) {
      await knowledgeService.deleteRecord(id);
    }

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'DELETE_KNOWLEDGE_RECORD',
      targetType: 'knowledge_record',
      targetId: id,
      details: `حذف مادة من قاعدة المعرفة: ${id}`
    });

    res.json({ success: true, message: 'تم حذف المادة بنجاح' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل حذف المادة' });
  }
});

router.post('/switch-source', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { source, spreadsheetId, sheetTitle, records } = req.body;

    if (source === 'sheets' && spreadsheetId && Array.isArray(records)) {
      knowledgeManager.switchToGoogleSheets(spreadsheetId, sheetTitle || 'جداول الضرائب', records);
    } else {
      knowledgeManager.switchToDemo();
    }

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'SWITCH_KNOWLEDGE_SOURCE',
      targetType: 'system',
      details: `تبديل مصدر المعرفة إلى: ${source === 'sheets' ? 'Google Sheets' : 'Demo Base'}`
    });

    const allRecords = await knowledgeService.getAllRecords();

    res.json({
      success: true,
      currentSource: knowledgeService.providerName,
      totalRecords: allRecords.length
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تغيير مصدر قاعدة المعرفة' });
  }
});

export default router;
