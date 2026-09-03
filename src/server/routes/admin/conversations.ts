/**
 * Admin Conversations Monitoring Route
 */

import { Router } from 'express';
import type { Response } from 'express';
import { requireAdmin } from '../../auth-middleware.ts';
import type { AuthenticatedRequest } from '../../auth-middleware.ts';
import { getAllConversationsForAdmin, deleteConversation } from '../../services/conversationService.ts';

const router = Router();

router.get('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversations = await getAllConversationsForAdmin();
    res.json({ success: true, conversations });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحميل سجل المحادثات' });
  }
});

router.post('/delete', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { id, conversationId } = req.body;
    const targetId = id || conversationId;
    if (!targetId) {
      res.status(400).json({ error: 'معرف المحادثة مطلوب' });
      return;
    }

    await deleteConversation(targetId, actor);
    res.json({ success: true, message: 'تم حذف المحادثة بنجاح' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل حذف المحادثة' });
  }
});

export default router;
