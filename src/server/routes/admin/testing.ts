/**
 * Admin Automated Testing API Route
 */

import { Router } from 'express';
import type { Response } from 'express';
import { requireAdmin } from '../../auth-middleware.ts';
import type { AuthenticatedRequest } from '../../auth-middleware.ts';
import { executeTest } from '../../services/testRunnerService.ts';
import type { SingleTestResult } from '../../services/testRunnerService.ts';

const router = Router();

const ALL_TEST_IDS = [
  'test-1',
  'test-2',
  'test-3',
  'test-4',
  'test-5',
  'test-6',
  'test-7',
  'test-8',
  'test-9',
  'test-10',
  'test-11',
  'test-12',
  'test-13',
  'test-14'
];

router.post('/run-single', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { testId } = req.body;
    if (!testId) {
      res.status(400).json({ error: 'معرف الاختبار مطلوب' });
      return;
    }

    const result = await executeTest(testId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      error: 'فشل تنفيذ الاختبار',
      details: err.message,
      passed: false
    });
  }
});

router.post('/run-all', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const results: SingleTestResult[] = [];
    for (const id of ALL_TEST_IDS) {
      const res = await executeTest(id);
      results.push(res);
    }
    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تشغيل حزمة الاختبارات' });
  }
});

export default router;
