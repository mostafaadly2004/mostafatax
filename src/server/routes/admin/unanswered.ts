/**
 * Admin Unanswered Questions Management Route
 */

import { Router, Response } from 'express';
import { requireAdmin, AuthenticatedRequest } from '../../auth-middleware.ts';
import { getUnansweredQuestions, resolveUnansweredQuestion } from '../../services/unansweredService.ts';
import { knowledgeService } from '../../../lib/knowledge/knowledge-service.ts';

const router = Router();

router.get('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const questions = await getUnansweredQuestions();
    res.json({ success: true, questions });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحميل الاستفسارات غير المجابة' });
  }
});

router.post('/resolve', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { questionId, id, resolution, resolutionText, addToKnowledgeBase, newRecord } = req.body;
    const targetId = questionId || id;

    if (!targetId) {
      res.status(400).json({ error: 'معرف الاستفسار مطلوب' });
      return;
    }

    const text = resolution || resolutionText || 'تمت المراجعة والاعتماد';
    await resolveUnansweredQuestion(targetId, text, actor);

    // Optionally add new record to active knowledge base
    if (addToKnowledgeBase && newRecord && (newRecord.topic || newRecord.question) && (newRecord.answer || newRecord.content)) {
      if (knowledgeService.upsertRecord) {
        await knowledgeService.upsertRecord({
          id: `kn_${Date.now()}`,
          category: newRecord.category || 'عام',
          topic: newRecord.topic || newRecord.question || 'استفسار معتمد',
          question: newRecord.question || newRecord.topic || '',
          answer: newRecord.answer || newRecord.content || '',
          source: newRecord.source || 'اعتماد مشرف النظام',
          approved: true,
          lastUpdated: new Date().toISOString(),
          keywords: Array.isArray(newRecord.keywords) ? newRecord.keywords : [newRecord.topic || 'استفسار']
        });
      }
    }

    res.json({ success: true, message: 'تم حل واعتماد الاستفسار بنجاح' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل حل الاستفسار' });
  }
});

export default router;
