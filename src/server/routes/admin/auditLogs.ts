/**
 * Admin Audit Logs API Route
 */

import { Router } from 'express';
import type { Response } from 'express';
import { requireAdmin, requireAuth } from '../../auth-middleware.ts';
import type { AuthenticatedRequest } from '../../auth-middleware.ts';
import { getAuditLogs, recordAuditLog } from '../../services/auditService.ts';

const router = Router();

/**
 * GET /api/admin/audit-logs
 */
router.get('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await getAuditLogs(150);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحميل سجلات التدقيق' });
  }
});

/**
 * POST /api/admin/activity/log
 */
router.post('/log', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { action, targetType, targetId, details, metadata } = req.body;

    const entry = await recordAuditLog({
      actorUid: user.uid,
      actorName: user.displayName,
      action: action || 'USER_ACTION',
      targetType,
      targetId,
      details,
      metadata
    });

    res.json({ success: true, log: entry });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تسجيل النشاط' });
  }
});

export default router;
