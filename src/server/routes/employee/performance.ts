/**
 * Employee Self-Performance API Routes
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * 
 * Allows authenticated employees to view their own KPI evaluations,
 * accuracy, error rates, and supervisor recommendations in strict multi-tenant isolation.
 */

import { Router } from 'express';
import type { Response } from 'express';
import { requireAuth } from '../../auth-middleware.ts';
import type { AuthenticatedRequest } from '../../auth-middleware.ts';
import { getEmployeePerformance } from '../../services/performanceService.ts';
import { getApprovedEmployeeKpiSummary } from '../../services/kpiIngestionService.ts';

const router = Router();

/**
 * GET /api/employee/performance/kpi/my-kpi
 * GET /api/employee/performance/kpi/me
 * GET /api/employee/performance/kpi
 * 
 * Returns ONLY the authenticated employee's approved monthly KPI records from ingested reports.
 * STRICT ISOLATION: Derives identity purely from verified auth session, never trusts client params.
 */
router.get(['/kpi/my-kpi', '/kpi/me', '/kpi', '/my-kpi'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const summary = await getApprovedEmployeeKpiSummary(user);
    res.json(summary);
  } catch (err: any) {
    console.error('[EmployeePerformance] Failed to load my KPI data:', err);
    res.status(500).json({ error: 'فشل استرجاع مؤشرات الأداء المعتمدة الخاصة بك', details: err.message });
  }
});

/**
 * GET /api/employee/performance/my-performance
 * Returns the current authenticated employee's performance evaluations.
 */
router.get(['/', '/my-performance'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const records = await getEmployeePerformance(user.uid);
    res.json({
      success: true,
      records,
      employee: {
        uid: user.uid,
        displayName: user.displayName,
        username: user.username,
        department: user.department,
        jobTitle: user.jobTitle
      }
    });
  } catch (err: any) {
    console.error('[EmployeePerformance] Failed to load my performance:', err);
    res.status(500).json({ error: 'فشل تحميل مؤشرات الأداء الخاصة بك', details: err.message });
  }
});

export default router;

