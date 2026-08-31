/**
 * Google Sheets Context & State Management
 * Strictly manages Google Workspace OAuth token, Drive spreadsheets listing,
 * live sheet sync state, and auto-sync background timers.
 * Enforces Google Sheets as the ONLY Knowledge Source.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  requestGoogleAccessToken,
  getCachedToken,
  clearCachedToken,
  listUserSpreadsheets,
  createTaxKnowledgeSpreadsheet,
  readRecordsFromGoogleSheet,
  writeRecordsToGoogleSheet
} from '../lib/google-sheets.ts';
import { GoogleDriveFile, GoogleSheetConfig } from '../types.ts';
import { KnowledgeRecord } from '../lib/knowledge/types.ts';
import { apiFetch } from '../lib/api-client.ts';

export interface SyncLogItem {
  id: string;
  timestamp: string;
  type: 'pull' | 'push' | 'create' | 'error' | 'connect';
  message: string;
  rowCount?: number;
}

interface GoogleSheetsContextType {
  isConnected: boolean;
  accessToken: string | null;
  config: GoogleSheetConfig | null;
  isSyncing: boolean;
  syncError: string | null;
  driveFiles: GoogleDriveFile[];
  loadingDriveFiles: boolean;
  syncLogs: SyncLogItem[];
  sheetRecords: KnowledgeRecord[];
  connectGoogle: () => Promise<boolean>;
  disconnectGoogle: () => void;
  loadDriveFiles: () => Promise<GoogleDriveFile[]>;
  createNewKnowledgeSheet: (title?: string) => Promise<string | null>;
  connectExistingSheet: (spreadsheetId: string) => Promise<boolean>;
  syncWithSheet: () => Promise<boolean>;
  exportToSheet: (recordsToExport?: KnowledgeRecord[]) => Promise<boolean>;
  resetKnowledgeCache: () => Promise<boolean>;
  toggleAutoSync: (enabled: boolean) => void;
  clearError: () => void;
}

const GoogleSheetsContext = createContext<GoogleSheetsContextType | undefined>(undefined);

const CONFIG_STORAGE_KEY = 'tax_support_sheets_config_v3';
const LOGS_STORAGE_KEY = 'tax_support_sheets_logs_v3';

export const GoogleSheetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(() => getCachedToken());
  const [config, setConfig] = useState<GoogleSheetConfig | null>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = useState<boolean>(false);
  const [sheetRecords, setSheetRecords] = useState<KnowledgeRecord[]>([]);

  const [syncLogs, setSyncLogs] = useState<SyncLogItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOGS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [
        {
          id: 'log_init',
          timestamp: new Date().toLocaleTimeString('ar-EG'),
          type: 'connect',
          message: 'جاهز للمزامنة مع جداول Google Sheets'
        }
      ];
    } catch {
      return [];
    }
  });

  const addLog = useCallback((type: SyncLogItem['type'], message: string, rowCount?: number) => {
    const item: SyncLogItem = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toLocaleTimeString('ar-EG'),
      type,
      message,
      rowCount
    };
    setSyncLogs(prev => {
      const updated = [item, ...prev.slice(0, 30)];
      try {
        localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Save config changes
  useEffect(() => {
    if (config) {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    }
  }, [config]);

  // Connect via Google OAuth
  const connectGoogle = async (): Promise<boolean> => {
    setSyncError(null);
    setIsSyncing(true);
    try {
      const token = await requestGoogleAccessToken();
      setAccessToken(token);
      addLog('connect', 'تم تسجيل الدخول بنجاح وتفويض صلاحيات Google Sheets و Drive');
      setIsSyncing(false);
      return true;
    } catch (err: any) {
      setSyncError(err.message || 'فشل الاتصال بحساب Google');
      addLog('error', `فشل الاتصال: ${err.message}`);
      setIsSyncing(false);
      return false;
    }
  };

  // Disconnect Google Account
  const disconnectGoogle = () => {
    clearCachedToken();
    setAccessToken(null);
    setConfig(null);
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    addLog('connect', 'تم قطع الاتصال بـ Google Sheets');
  };

  // Fetch Spreadsheets from Google Drive
  const loadDriveFiles = async (): Promise<GoogleDriveFile[]> => {
    setSyncError(null);
    let token = accessToken || getCachedToken();
    if (!token) {
      try {
        token = await requestGoogleAccessToken();
        setAccessToken(token);
      } catch (err: any) {
        setSyncError('يرجى تسجيل الدخول بحساب Google أولاً');
        return [];
      }
    }

    setLoadingDriveFiles(true);
    try {
      const files = await listUserSpreadsheets(token);
      setDriveFiles(files);
      return files;
    } catch (err: any) {
      setSyncError(err.message || 'فشل جلب ملفات Google Drive');
      return [];
    } finally {
      setLoadingDriveFiles(false);
    }
  };

  // Create brand new Tax Knowledge Sheet in Google Drive
  const createNewKnowledgeSheet = async (
    title: string = 'قاعدة معرفة مصلحة الضرائب العقارية - Tax Support AI'
  ): Promise<string | null> => {
    setSyncError(null);
    setIsSyncing(true);
    let token = accessToken || getCachedToken();
    if (!token) {
      try {
        token = await requestGoogleAccessToken();
        setAccessToken(token);
      } catch (err: any) {
        setSyncError('يرجى تسجيل الدخول بحساب Google');
        setIsSyncing(false);
        return null;
      }
    }

    try {
      const result = await createTaxKnowledgeSpreadsheet(token, title, []);
      
      const newConfig: GoogleSheetConfig = {
        spreadsheetId: result.spreadsheetId,
        spreadsheetTitle: title,
        spreadsheetUrl: result.spreadsheetUrl,
        sheetName: 'قاعدة المعرفة',
        lastSyncedAt: new Date().toISOString(),
        autoSync: true,
        syncIntervalMinutes: 5,
        rowCount: 0,
        isReadOnly: false
      };

      setConfig(newConfig);
      setSheetRecords([]);

      // Sync empty structure with server
      await apiFetch('/api/knowledge/sync-sheet', {
        method: 'POST',
        body: JSON.stringify({
          spreadsheetId: result.spreadsheetId,
          spreadsheetTitle: title,
          sheetName: 'قاعدة المعرفة',
          records: []
        })
      }).catch(() => {});

      addLog('create', `تم إنشاء جدول Google Sheets جديد بنجاح: "${title}"`, 0);
      return result.spreadsheetId;
    } catch (err: any) {
      setSyncError(err.message || 'فشل إنشاء جدول Google Sheets');
      addLog('error', `فشل إنشاء الجدول: ${err.message}`);
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  // Connect to an existing Google Spreadsheet
  const connectExistingSheet = async (spreadsheetId: string): Promise<boolean> => {
    if (!spreadsheetId) return false;
    setSyncError(null);
    setIsSyncing(true);
    let token = accessToken || getCachedToken();
    if (!token) {
      try {
        token = await requestGoogleAccessToken();
        setAccessToken(token);
      } catch (err: any) {
        setSyncError('يرجى تسجيل الدخول بحساب Google');
        setIsSyncing(false);
        return false;
      }
    }

    try {
      const { records, sheetTitle, sheetName } = await readRecordsFromGoogleSheet(token, spreadsheetId);
      
      const newConfig: GoogleSheetConfig = {
        spreadsheetId,
        spreadsheetTitle: sheetTitle || 'جدول الضرائب العقارية',
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        sheetName,
        lastSyncedAt: new Date().toISOString(),
        autoSync: true,
        syncIntervalMinutes: 5,
        rowCount: records.length,
        isReadOnly: false
      };

      setConfig(newConfig);
      setSheetRecords(records);

      // Sync with server knowledge manager (full atomic replacement)
      await apiFetch('/api/knowledge/sync-sheet', {
        method: 'POST',
        body: JSON.stringify({
          spreadsheetId,
          spreadsheetTitle: sheetTitle,
          sheetName,
          records
        })
      });

      addLog('pull', `تم الربط بجدول Google Sheets "${sheetTitle}" واستيراد ومزامنة ${records.length} سجل بنجاح`, records.length);
      return true;
    } catch (err: any) {
      setSyncError(err.message || 'فشل قراءة ومزامنة بيانات جدول Google Sheets');
      addLog('error', `فشل الاتصال بالجدول: ${err.message}`);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync now (Pull fresh data from Google Sheet)
  const syncWithSheet = async (): Promise<boolean> => {
    if (!config?.spreadsheetId) {
      setSyncError('لا يوجد جدول Google Sheets متصل حالياً.');
      return false;
    }

    setSyncError(null);
    setIsSyncing(true);
    let token = accessToken || getCachedToken();
    if (!token) {
      try {
        token = await requestGoogleAccessToken();
        setAccessToken(token);
      } catch (err: any) {
        setSyncError('انتهت صلاحية جلسة Google، يرجى إعادة تسجيل الدخول');
        setIsSyncing(false);
        return false;
      }
    }

    try {
      const { records, sheetTitle, sheetName } = await readRecordsFromGoogleSheet(token, config.spreadsheetId);
      
      setConfig(prev => prev ? ({
        ...prev,
        spreadsheetTitle: sheetTitle || prev.spreadsheetTitle,
        sheetName: sheetName || prev.sheetName,
        lastSyncedAt: new Date().toISOString(),
        rowCount: records.length
      }) : null);

      setSheetRecords(records);

      // Push to backend server for atomic replacement
      await apiFetch('/api/knowledge/sync-sheet', {
        method: 'POST',
        body: JSON.stringify({
          spreadsheetId: config.spreadsheetId,
          spreadsheetTitle: sheetTitle,
          sheetName,
          records
        })
      });

      addLog('pull', `تمت المزامنة والاستبدال الفوري بنجاح من Google Sheets (${records.length} سجل)`, records.length);
      return true;
    } catch (err: any) {
      setSyncError(err.message || 'فشل مزامنة البيانات مع Google Sheets');
      addLog('error', `فشل المزامنة: ${err.message}`);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Export / Push records to Google Sheet
  const exportToSheet = async (recordsToExport?: KnowledgeRecord[]): Promise<boolean> => {
    if (!config?.spreadsheetId) {
      setSyncError('لا يوجد جدول Google Sheets متصل لتصدير البيانات إليه.');
      return false;
    }

    setSyncError(null);
    setIsSyncing(true);
    let token = accessToken || getCachedToken();
    if (!token) {
      try {
        token = await requestGoogleAccessToken();
        setAccessToken(token);
      } catch (err: any) {
        setSyncError('يرجى إعادة تسجيل الدخول بحساب Google');
        setIsSyncing(false);
        return false;
      }
    }

    try {
      const records = recordsToExport || sheetRecords;
      await writeRecordsToGoogleSheet(token, config.spreadsheetId, records, config.sheetName || 'قاعدة المعرفة');
      
      setConfig(prev => prev ? ({
        ...prev,
        lastSyncedAt: new Date().toISOString(),
        rowCount: records.length
      }) : null);

      addLog('push', `تم تصدير وتحديث ${records.length} سجل بنجاح إلى Google Sheets`, records.length);
      return true;
    } catch (err: any) {
      setSyncError(err.message || 'فشل تصدير البيانات إلى Google Sheets');
      addLog('error', `فشل التصدير: ${err.message}`);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Reset Knowledge Cache
  const resetKnowledgeCache = async (): Promise<boolean> => {
    setIsSyncing(true);
    try {
      await apiFetch('/api/knowledge/reset-cache', { method: 'POST' });
      setSheetRecords([]);
      addLog('pull', 'تم تفريغ ومسح الذاكرة المؤقتة لقاعدة المعرفة بالكامل');
      return true;
    } catch (err: any) {
      setSyncError('فشل تفريغ الذاكرة المؤقتة');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle Auto Sync
  const toggleAutoSync = (enabled: boolean) => {
    setConfig(prev => prev ? ({ ...prev, autoSync: enabled }) : null);
    addLog('connect', enabled ? 'تم تفعيل المزامنة التلقائية' : 'تم تعطيل المزامنة التلقائية');
  };

  // Background Auto-sync effect (with initial delay to prevent startup blocking)
  useEffect(() => {
    if (!config?.autoSync || !config?.spreadsheetId || !accessToken) return;

    const intervalMs = Math.max((config.syncIntervalMinutes || 5) * 60 * 1000, 60000);
    let intervalId: any = null;
    const initialDelay = setTimeout(() => {
      syncWithSheet();
      intervalId = setInterval(() => {
        syncWithSheet();
      }, intervalMs);
    }, 20000);

    return () => {
      clearTimeout(initialDelay);
      if (intervalId) clearInterval(intervalId);
    };
  }, [config?.autoSync, config?.spreadsheetId, config?.syncIntervalMinutes, accessToken]);

  return (
    <GoogleSheetsContext.Provider
      value={{
        isConnected: !!accessToken,
        accessToken,
        config,
        isSyncing,
        syncError,
        driveFiles,
        loadingDriveFiles,
        syncLogs,
        sheetRecords,
        connectGoogle,
        disconnectGoogle,
        loadDriveFiles,
        createNewKnowledgeSheet,
        connectExistingSheet,
        syncWithSheet,
        exportToSheet,
        resetKnowledgeCache,
        toggleAutoSync,
        clearError: () => setSyncError(null)
      }}
    >
      {children}
    </GoogleSheetsContext.Provider>
  );
};

export const useGoogleSheets = (): GoogleSheetsContextType => {
  const context = useContext(GoogleSheetsContext);
  if (!context) {
    throw new Error('useGoogleSheets must be used within a GoogleSheetsProvider');
  }
  return context;
};
