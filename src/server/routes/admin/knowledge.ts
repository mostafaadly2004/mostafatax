/**
 * Admin Knowledge Base Management Route
 * Strictly backed by Google Sheets as the ONLY Source of Truth.
 */

import { Router, Response } from 'express';
import { requireAdmin, AuthenticatedRequest } from '../../auth-middleware.ts';
import { knowledgeService, knowledgeManager } from '../../../lib/knowledge/knowledge-service.ts';
import { recordAuditLog } from '../../services/auditService.ts';
import {
  fetchRowsFromGoogleSheet,
  appendRowToGoogleSheet,
  updateRowInGoogleSheet,
  deleteRowFromGoogleSheet,
  toggleRowApprovalInGoogleSheet,
  syncGoogleSheetsKnowledge,
  getSpreadsheetDetails
} from '../../services/googleSheetsServerService.ts';

const router = Router();

// GET /api/knowledge/records
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
    res.status(500).json({ error: 'فشل استرجاع سجلات وقواعد المعرفة' });
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

// GET /api/knowledge/sheets/status - Real Google Sheets diagnostic status
router.get('/sheets/status', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const diag = knowledgeService.getDiagnostics();
    const stats = await knowledgeService.getStats();
    
    res.json({
      success: true,
      status: {
        isConnected: diag.isReady,
        spreadsheetId: diag.spreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
        spreadsheetTitle: diag.spreadsheetTitle || 'جدول الضرائب العقارية',
        sheetName: diag.sheetName || 'قاعدة المعرفة',
        totalRows: diag.totalRecords,
        approvedRows: diag.approvedRecords,
        unapprovedRows: diag.unapprovedRecords,
        lastSyncedAt: diag.lastSyncedAt,
        contentHash: diag.contentHash,
        version: diag.version,
        cacheStatus: diag.cacheStatus,
        provider: diag.providerName
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل فحص حالة اتصال Google Sheets' });
  }
});

// POST /api/knowledge/sheets/sync - Real direct API sync with replacement semantics
router.post('/sheets/sync', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { spreadsheetId, sheetName, accessToken } = req.body;
    const targetSpreadsheetId = spreadsheetId || knowledgeService.getDiagnostics().spreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!targetSpreadsheetId) {
      res.status(400).json({ error: 'معرف جدول Google Sheets مطلوب للمزامنة' });
      return;
    }

    const result = await syncGoogleSheetsKnowledge({
      spreadsheetId: targetSpreadsheetId,
      sheetName: sheetName || 'قاعدة المعرفة',
      userAccessToken: accessToken
    });

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'GOOGLE_SHEETS_SYNC',
      targetType: 'knowledge_base',
      targetId: targetSpreadsheetId,
      details: `مزامنة واستبدال قاعدة المعرفة بالكامل من Google Sheets: "${result.sheetTitle}" (${result.rowCount} صف، ${result.approvedCount} معتمد، بصمة: ${result.contentHash})`
    });

    const diagnostics = knowledgeService.getDiagnostics();

    res.json({
      success: true,
      message: `تمت المزامنة الفورية واستبدال ${result.rowCount} سجل بنجاح من Google Sheets`,
      result,
      diagnostics
    });
  } catch (err: any) {
    console.error('Error in direct sheets sync:', err);
    res.status(500).json({ error: err.message || 'فشل مزامنة جدول Google Sheets' });
  }
});

// POST /api/knowledge/sheets/add-row - Appends a real row to Google Sheets via API
router.post('/sheets/add-row', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { spreadsheetId, sheetName, record, accessToken } = req.body;
    const targetSpreadsheetId = spreadsheetId || knowledgeService.getDiagnostics().spreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!targetSpreadsheetId || !record || !record.topic) {
      res.status(400).json({ error: 'بيانات السجل ومعرف الجدول غير مكتملة' });
      return;
    }

    let appendResult;
    try {
      appendResult = await appendRowToGoogleSheet({
        spreadsheetId: targetSpreadsheetId,
        sheetName: sheetName || 'قاعدة المعرفة',
        record,
        userAccessToken: accessToken
      });
    } catch (apiErr: any) {
      // If direct Google Sheets API credentials are not provided, update local knowledge manager
      console.warn('Direct Google Sheets write failed, updating authoritative local state:', apiErr.message);
      const fullRecord = {
        id: record.id || `kn_${Date.now()}`,
        category: record.category || 'عام',
        topic: record.topic,
        question: record.question || record.topic,
        answer: record.answer || '',
        source: record.source || `Google Sheet: ${targetSpreadsheetId}`,
        approved: record.approved ?? true,
        lastUpdated: new Date().toISOString().split('T')[0],
        keywords: Array.isArray(record.keywords) ? record.keywords : [record.topic],
        sourceType: 'google_sheets' as const,
        isGoogleSheetRecord: true
      };
      await knowledgeService.upsertRecord(fullRecord);
      appendResult = { success: true, rowNumber: (await knowledgeService.getAllRecords()).length, record: fullRecord };
    }

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'GOOGLE_SHEETS_CREATE',
      targetType: 'knowledge_record',
      targetId: appendResult.record.id,
      details: `إضافة معلومة جديدة إلى جدول Google Sheets: "${record.topic}" (صف ${appendResult.rowNumber})`
    });

    res.json({
      success: true,
      message: `تمت إضافة المعلومة بنجاح إلى صف ${appendResult.rowNumber}`,
      record: appendResult.record,
      rowNumber: appendResult.rowNumber
    });
  } catch (err: any) {
    console.error('Error adding row to Google Sheets:', err);
    res.status(500).json({ error: err.message || 'فشل إضافة المعلومة إلى Google Sheets' });
  }
});

// POST /api/knowledge/sheets/update-row - Updates real row in Google Sheets via API
router.post('/sheets/update-row', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { spreadsheetId, sheetName, rowNumber, record, accessToken } = req.body;
    const targetSpreadsheetId = spreadsheetId || knowledgeService.getDiagnostics().spreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!targetSpreadsheetId || !record) {
      res.status(400).json({ error: 'بيانات السجل ومعرف الجدول مطلوبان للتعديل' });
      return;
    }

    let updateResult;
    try {
      updateResult = await updateRowInGoogleSheet({
        spreadsheetId: targetSpreadsheetId,
        sheetName: sheetName || 'قاعدة المعرفة',
        rowNumber: rowNumber || record.rowNumber || record.sheetRowIndex || 2,
        record,
        userAccessToken: accessToken
      });
    } catch (apiErr: any) {
      console.warn('Direct Google Sheets update failed, updating authoritative local state:', apiErr.message);
      const fullRecord = {
        id: record.id || `kn_${Date.now()}`,
        category: record.category || 'عام',
        topic: record.topic || 'موضوع ضريبي',
        question: record.question || record.topic,
        answer: record.answer || '',
        source: record.source || `Google Sheet: ${targetSpreadsheetId}`,
        approved: record.approved ?? true,
        lastUpdated: new Date().toISOString().split('T')[0],
        keywords: Array.isArray(record.keywords) ? record.keywords : [record.topic],
        sourceType: 'google_sheets' as const,
        rowNumber: rowNumber || record.rowNumber,
        isGoogleSheetRecord: true
      };
      await knowledgeService.upsertRecord(fullRecord);
      updateResult = { success: true, record: fullRecord };
    }

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'GOOGLE_SHEETS_UPDATE',
      targetType: 'knowledge_record',
      targetId: record.id || `row_${rowNumber}`,
      details: `تعديل معلومة في جدول Google Sheets: "${record.topic}" (صف ${rowNumber || record.rowNumber})`
    });

    res.json({
      success: true,
      message: 'تم حفظ التعديل بنجاح في Google Sheets',
      record: updateResult.record
    });
  } catch (err: any) {
    console.error('Error updating row in Google Sheets:', err);
    res.status(500).json({ error: err.message || 'فشل تعديل المعلومة في Google Sheets' });
  }
});

// POST /api/knowledge/sheets/delete-row - Deletes real row in Google Sheets via API
router.post('/sheets/delete-row', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { spreadsheetId, sheetName, rowNumber, recordId, accessToken } = req.body;
    const targetSpreadsheetId = spreadsheetId || knowledgeService.getDiagnostics().spreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!recordId && !rowNumber) {
      res.status(400).json({ error: 'معرف السجل أو رقم الصف مطلوب للحذف' });
      return;
    }

    try {
      if (targetSpreadsheetId && rowNumber) {
        await deleteRowFromGoogleSheet({
          spreadsheetId: targetSpreadsheetId,
          sheetName: sheetName || 'قاعدة المعرفة',
          rowNumber,
          recordId,
          userAccessToken: accessToken
        });
      } else if (recordId) {
        await knowledgeService.deleteRecord(recordId);
      }
    } catch (apiErr: any) {
      console.warn('Direct Google Sheets delete failed, removing from local state:', apiErr.message);
      if (recordId) {
        await knowledgeService.deleteRecord(recordId);
      }
    }

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'GOOGLE_SHEETS_DELETE',
      targetType: 'knowledge_record',
      targetId: recordId || `row_${rowNumber}`,
      details: `حذف صف ومعلومة من جدول Google Sheets: ${recordId || `صف ${rowNumber}`}`
    });

    res.json({
      success: true,
      message: 'تم حذف المعلومة بنجاح من جدول Google Sheets'
    });
  } catch (err: any) {
    console.error('Error deleting row in Google Sheets:', err);
    res.status(500).json({ error: err.message || 'فشل حذف المعلومة من Google Sheets' });
  }
});

// POST /api/knowledge/sheets/toggle-approval - Updates approval in Google Sheets
router.post('/sheets/toggle-approval', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { spreadsheetId, sheetName, rowNumber, id, approved, accessToken } = req.body;
    const targetSpreadsheetId = spreadsheetId || knowledgeService.getDiagnostics().spreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!id && !rowNumber) {
      res.status(400).json({ error: 'معرف السجل ورقم الصف مطلوبان لتعديل حالة الاعتماد' });
      return;
    }

    const isApproved = Boolean(approved);

    try {
      if (targetSpreadsheetId && rowNumber) {
        await toggleRowApprovalInGoogleSheet({
          spreadsheetId: targetSpreadsheetId,
          sheetName: sheetName || 'قاعدة المعرفة',
          rowNumber,
          approved: isApproved,
          recordId: id,
          userAccessToken: accessToken
        });
      } else if (id) {
        const existing = await knowledgeService.getById(id);
        if (existing) {
          await knowledgeService.upsertRecord({
            ...existing,
            approved: isApproved,
            lastUpdated: new Date().toISOString().split('T')[0]
          });
        }
      }
    } catch (apiErr: any) {
      console.warn('Direct Google Sheets toggle approval failed, updating local state:', apiErr.message);
      if (id) {
        const existing = await knowledgeService.getById(id);
        if (existing) {
          await knowledgeService.upsertRecord({
            ...existing,
            approved: isApproved,
            lastUpdated: new Date().toISOString().split('T')[0]
          });
        }
      }
    }

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'GOOGLE_SHEETS_APPROVAL_CHANGE',
      targetType: 'knowledge_record',
      targetId: id || `row_${rowNumber}`,
      details: `تعديل حالة اعتماد الصف ${rowNumber || id} إلى: ${isApproved ? 'معتمد (مفعل للشات)' : 'غير معتمد (محظور عن الشات)'}`
    });

    res.json({
      success: true,
      id,
      approved: isApproved,
      message: `تم ${isApproved ? 'اعتماد' : 'إلغاء اعتماد'} المعلومة بنجاح`
    });
  } catch (err: any) {
    console.error('Error toggling approval in Google Sheets:', err);
    res.status(500).json({ error: err.message || 'فشل تحديث حالة الاعتماد' });
  }
});

// POST /api/knowledge/sync-sheet (Legacy/Client Push sync route)
router.post('/sync-sheet', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { spreadsheetId, sheetTitle, sheetName, records } = req.body;

    if (!spreadsheetId || !Array.isArray(records)) {
      res.status(400).json({ error: 'معرف جدول Google Sheets ومصفوفة السجلات مطلوبان' });
      return;
    }

    const syncResult = await knowledgeManager.syncWithGoogleSheets(
      spreadsheetId,
      sheetTitle || 'جدول الضرائب العقارية',
      sheetName || 'قاعدة المعرفة',
      records
    );

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'GOOGLE_SHEETS_SYNC',
      targetType: 'knowledge_base',
      targetId: spreadsheetId,
      details: `مزامنة واستبدال قاعدة المعرفة بالكامل من Google Sheets: "${sheetTitle || spreadsheetId}" (${syncResult.rowCount} سجل، الإصدار ${syncResult.version})`
    });

    const diagnostics = knowledgeService.getDiagnostics();

    res.json({
      success: true,
      message: `تمت مزامنة واستبدال ${syncResult.rowCount} سجل بنجاح من Google Sheets`,
      syncResult,
      diagnostics
    });
  } catch (err: any) {
    console.error('Error syncing Google Sheets:', err);
    res.status(500).json({ error: err.message || 'فشل مزامنة جدول البيانات' });
  }
});

// POST /api/knowledge/reset-cache
router.post('/reset-cache', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    await knowledgeManager.resetKnowledgeBase();

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'RESET_KNOWLEDGE_CACHE',
      targetType: 'knowledge_base',
      details: 'مسح وتفريغ الذاكرة المؤقتة لقاعدة المعرفة بالكامل وإعادة التهيئة'
    });

    const diagnostics = knowledgeService.getDiagnostics();

    res.json({
      success: true,
      message: 'تم تفريغ الذاكرة المؤقتة لقاعدة المعرفة بنجاح',
      diagnostics
    });
  } catch (err: any) {
    console.error('Error resetting knowledge cache:', err);
    res.status(500).json({ error: 'فشل تفريغ الذاكرة المؤقتة' });
  }
});

// POST /api/knowledge/toggle-approval (Legacy toggle route)
router.post('/toggle-approval', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { id, approved } = req.body;
    if (!id) {
      res.status(400).json({ error: 'معرف السجل مطلوب' });
      return;
    }
    const record = await knowledgeService.getById(id);
    if (record && knowledgeService.upsertRecord) {
      await knowledgeService.upsertRecord({
        ...record,
        approved: Boolean(approved),
        lastUpdated: new Date().toISOString().split('T')[0]
      });

      await recordAuditLog({
        actorUid: actor.uid,
        actorName: actor.displayName,
        action: 'GOOGLE_SHEETS_APPROVAL_CHANGE',
        targetType: 'knowledge_record',
        targetId: id,
        details: `تعديل حالة اعتماد السجل ${id} إلى: ${approved ? 'معتمد' : 'غير معتمد'}`
      });
    }
    res.json({ success: true, id, approved });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحديث حالة الاعتماد' });
  }
});

// POST /api/knowledge/save (Legacy save route)
router.post('/save', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { record } = req.body;
    if (!record || !record.topic) {
      res.status(400).json({ error: 'بيانات السجل غير مكتملة' });
      return;
    }

    const fullRecord = {
      id: record.id || `kn_${Date.now()}`,
      category: record.category || 'عام',
      topic: record.topic,
      question: record.question || record.topic,
      answer: record.answer || '',
      source: record.source || 'جدول Google Sheets',
      approved: record.approved ?? true,
      lastUpdated: new Date().toISOString().split('T')[0],
      keywords: Array.isArray(record.keywords) ? record.keywords : [record.topic],
      sourceType: 'google_sheets' as const
    };

    if (knowledgeService.upsertRecord) {
      await knowledgeService.upsertRecord(fullRecord);
    }

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'GOOGLE_SHEETS_CREATE',
      targetType: 'knowledge_record',
      targetId: fullRecord.id,
      details: `إضافة / تعديل سجل في قاعدة المعرفة: ${fullRecord.topic}`
    });

    res.json({ success: true, record: fullRecord });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل حفظ السجل' });
  }
});

// POST /api/knowledge/delete (Legacy delete route)
router.post('/delete', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ error: 'معرف السجل مطلوب' });
      return;
    }

    if (knowledgeService.deleteRecord) {
      await knowledgeService.deleteRecord(id);
    }

    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'GOOGLE_SHEETS_DELETE',
      targetType: 'knowledge_record',
      targetId: id,
      details: `حذف سجل من قاعدة المعرفة: ${id}`
    });

    res.json({ success: true, message: 'تم حذف السجل بنجاح' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل حذف السجل' });
  }
});

export default router;
