/**
 * Admin Performance Management API Routes
 * Tax Support AI - Egyptian Real Estate Tax Authority
 */

import { Router } from 'express';
import type { Response } from 'express';
import { requireAdmin } from '../../auth-middleware.ts';
import type { AuthenticatedRequest } from '../../auth-middleware.ts';
import {
  getAllPerformance,
  savePerformanceRecords,
  deletePerformanceRecord,
  analyzePerformanceWithGemini,
  getAugustBenchmarkRecords
} from '../../services/performanceService.ts';
import {
  getMonthlyKpiDataset,
  listAllKpiDatasets,
  processAndValidateMonthlyReports,
  editKpiMetricCell,
  approveMonthlyKpiDataset,
  reopenMonthlyKpiDataset,
  mapUnknownKpiEmployee,
  formatMonthKey,
  calculateDerivedMetrics
} from '../../services/kpiIngestionService.ts';

const router = Router();

/**
 * GET /api/admin/performance/kpi/datasets
 * Returns list of all monthly KPI datasets (both approved and in review)
 */
router.get('/kpi/datasets', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const datasets = await listAllKpiDatasets();
    res.json({ success: true, datasets });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل استرجاع كشوفات تقييم الأداء', details: err.message });
  }
});

/**
 * GET /api/admin/performance/kpi/dataset
 * Returns a specific monthly KPI dataset with full employee rows and validation warnings
 */
router.get('/kpi/dataset', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const month = parseInt(req.query.month as string, 10) || 8;
    const year = parseInt(req.query.year as string, 10) || 2026;

    const dataset = await getMonthlyKpiDataset(year, month);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: `لا توجد بيانات KPI معتمدة أو مسجلة لشهر ${month}/${year}.`
      });
    }

    res.json({ success: true, dataset });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحميل كشف الشهر المحدد', details: err.message });
  }
});

/**
 * POST /api/admin/performance/kpi/ingest
 * Ingests multi-image monthly reports, parses with Gemini Vision, cross-validates,
 * and deterministically calculates derived KPIs.
 */
router.post('/kpi/ingest', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { month, year, images } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: 'يرجى تحديد الشهر والسنة المستهدفة للتقارير.' });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'يرجى إرفاق صور التقارير بصيغة (PNG, JPG, WebP) لتحليلها.' });
    }

    const actor = {
      uid: req.user?.uid || 'usr_admin',
      displayName: req.user?.displayName || 'مشرف النظام'
    };

    const dataset = await processAndValidateMonthlyReports({
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      images,
      actor
    });

    res.json({
      success: true,
      dataset,
      message: `تم استخراج بيانات ${Object.keys(dataset.employees).length} موظفاً بنجاح من ${images.length} تقارير مصورة. الحالة: بانتظار المراجعة والاعتماد.`
    });
  } catch (err: any) {
    console.error('[AdminPerformance] Ingestion error:', err);
    res.status(500).json({
      error: err.message || 'فشل استخراج وتحليل بيانات تقارير الأداء'
    });
  }
});

/**
 * POST /api/admin/performance/kpi/edit-cell
 * Human-in-the-loop: Edit a single extracted cell before or after approval
 */
router.post('/kpi/edit-cell', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { monthKey, username, field, newValue, reason } = req.body;

    if (!monthKey || !username || !field || newValue === undefined) {
      return res.status(400).json({ error: 'بيانات التعديل غير مكتملة.' });
    }

    const actor = {
      uid: req.user?.uid || 'usr_admin',
      displayName: req.user?.displayName || 'مشرف النظام'
    };

    const updatedDataset = await editKpiMetricCell({
      monthKey,
      username,
      field,
      newValue: Number(newValue),
      actor,
      reason
    });

    res.json({
      success: true,
      dataset: updatedDataset,
      message: `تم تعديل قيمة الحقل ${field} للموظف ${username} بنجاح.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل تعديل القيمة' });
  }
});

/**
 * POST /api/admin/performance/kpi/approve
 * Approves the monthly KPI dataset, making it the authoritative source of truth
 */
router.post('/kpi/approve', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { monthKey, formulaConfig } = req.body;

    if (!monthKey) {
      return res.status(400).json({ error: 'يرجى تحديد كشف الشهر للاعتماد.' });
    }

    const actor = {
      uid: req.user?.uid || 'usr_admin',
      displayName: req.user?.displayName || 'مشرف النظام'
    };

    const approvedDataset = await approveMonthlyKpiDataset({
      monthKey,
      actor,
      formulaConfig
    });

    res.json({
      success: true,
      dataset: approvedDataset,
      message: `تم اعتماد تقرير مؤشرات الأداء لشهر ${approvedDataset.monthLabel} رسمياً.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل اعتماد التقرير' });
  }
});

/**
 * POST /api/admin/performance/kpi/reopen
 * Reopens an approved monthly dataset for corrections, creating a new draft version
 */
router.post('/kpi/reopen', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { monthKey, reason } = req.body;
    if (!monthKey) {
      return res.status(400).json({ error: 'يرجى تحديد كشف الشهر لإعادة الفتح.' });
    }

    const actor = {
      uid: req.user?.uid || 'usr_admin',
      displayName: req.user?.displayName || 'مشرف النظام'
    };

    const reopenedDataset = await reopenMonthlyKpiDataset({
      monthKey,
      actor,
      reason
    });

    res.json({
      success: true,
      dataset: reopenedDataset,
      message: `تمت إعادة فتح كشف ${reopenedDataset.monthLabel} للمراجعة (الإصدار ${reopenedDataset.version}).`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل إعادة فتح التقرير' });
  }
});

/**
 * POST /api/admin/performance/kpi/map-unknown
 * Manually maps an unknown employee username to a known system user
 */
router.post('/kpi/map-unknown', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { monthKey, unknownUsername, targetUserUid } = req.body;
    if (!monthKey || !unknownUsername || !targetUserUid) {
      return res.status(400).json({ error: 'بيانات الربط غير مكتملة.' });
    }

    const actor = {
      uid: req.user?.uid || 'usr_admin',
      displayName: req.user?.displayName || 'مشرف النظام'
    };

    const updatedDataset = await mapUnknownKpiEmployee({
      monthKey,
      unknownUsername,
      targetUserUid,
      actor
    });

    res.json({
      success: true,
      dataset: updatedDataset,
      message: `تم ربط الموظف ${unknownUsername} بنجاح.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل ربط الموظف' });
  }
});

/**
 * GET /api/admin/performance/benchmark-august
 * Returns the official August 2026 dataset extracted from supervisor charts for 20 employees.
 */
router.get('/benchmark-august', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const records = getAugustBenchmarkRecords();
    res.json({ success: true, records });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل استرجاع بيانات كشف أغسطس', details: err.message });
  }
});

/**
 * GET /api/admin/performance
 * Fetch performance records, optionally filtered by month and year.
 */
router.get('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

    const records = await getAllPerformance(month, year);
    res.json({ success: true, records });
  } catch (err: any) {
    console.error('[AdminPerformance] Failed to load records:', err);
    res.status(500).json({ error: 'فشل تحميل سجلات تقييم الأداء', details: err.message });
  }
});

/**
 * POST /api/admin/performance/analyze
 * Legacy upload route preserved for compatibility
 */
router.post('/analyze', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { month, year, images, textData } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: 'يرجى تحديد الشهر والسنة المستهدفة للتقييم.' });
    }

    if ((!images || images.length === 0) && (!textData || !textData.trim())) {
      return res.status(400).json({ error: 'يرجى إرفاق صور كشف الأداء أو إدخال البيانات النصية / الجداول لتحليلها.' });
    }

    const analyzedRecords = await analyzePerformanceWithGemini({
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      images: Array.isArray(images) ? images : [],
      textData: typeof textData === 'string' ? textData : ''
    });

    res.json({
      success: true,
      records: analyzedRecords,
      message: `تم تحليل بيانات ${analyzedRecords.length} موظفاً بنجاح عبر الذكاء الاصطناعي.`
    });
  } catch (err: any) {
    console.error('[AdminPerformance] AI analysis error:', err);
    res.status(500).json({
      error: err.message || 'فشل تحليل كشف أداء الموظفين بالذكاء الاصطناعي'
    });
  }
});

/**
 * POST /api/admin/performance/save
 * Approve & commit an array of evaluated performance records.
 */
router.post('/save', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'لا توجد سجلات تقييم للاعتماد.' });
    }

    const saved = await savePerformanceRecords(records, req.user);
    res.json({
      success: true,
      records: saved,
      message: `تم اعتماد وحفظ تقييمات ${saved.length} موظفاً بنجاح.`
    });
  } catch (err: any) {
    console.error('[AdminPerformance] Save error:', err);
    res.status(500).json({ error: 'فشل حفظ سجلات التقييم', details: err.message });
  }
});

/**
 * DELETE /api/admin/performance/:id
 * Delete a specific performance evaluation record.
 */
router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await deletePerformanceRecord(id);
    if (!deleted) {
      return res.status(404).json({ error: 'سجل التقييم غير موجود' });
    }
    res.json({ success: true, message: 'تم حذف سجل التقييم بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل حذف سجل التقييم', details: err.message });
  }
});

export default router;

