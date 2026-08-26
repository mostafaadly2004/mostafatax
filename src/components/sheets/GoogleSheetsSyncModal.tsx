/**
 * Google Sheets Synchronization Modal Component
 * Connect Google account, create new sheets, pick existing drive spreadsheets,
 * view live sync status, and toggle automatic background sync.
 */

import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  RefreshCw,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  Download,
  FolderOpen,
  Check,
  Globe,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useGoogleSheets } from '../../context/GoogleSheetsContext.tsx';
import { GoogleDriveFile } from '../../types.ts';
import { useTheme } from '../../context/ThemeContext.tsx';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    isConnected,
    config,
    isSyncing,
    syncError,
    driveFiles,
    loadingDriveFiles,
    syncLogs,
    connectGoogle,
    disconnectGoogle,
    loadDriveFiles,
    createNewKnowledgeSheet,
    connectExistingSheet,
    syncWithSheet,
    exportToSheet,
    toggleAutoSync,
    clearError
  } = useGoogleSheets();

  const { theme, isDark, isLight, isHighContrast } = useTheme();
  const [activeTab, setActiveTab] = useState<'status' | 'drive' | 'create' | 'logs'>('status');
  const [customSheetTitle, setCustomSheetTitle] = useState('قاعدة معرفة مصلحة الضرائب العقارية - Tax Support AI');
  const [manualSheetId, setManualSheetId] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const notifySuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const sheetId = await createNewKnowledgeSheet(customSheetTitle.trim());
    if (sheetId) {
      notifySuccess('تم إنشاء جدول Google Sheets وربطه بنجاح ومزامنة السجلات!');
      setActiveTab('status');
    }
  };

  const handleConnectExisting = async (fileId: string) => {
    const ok = await connectExistingSheet(fileId);
    if (ok) {
      notifySuccess('تم ربط جدول البيانات واستيراد السجلات بنجاح!');
      setActiveTab('status');
    }
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSheetId.trim()) return;
    const ok = await connectExistingSheet(manualSheetId.trim());
    if (ok) {
      notifySuccess('تم الاتصال بالجدول بنجاح!');
      setManualSheetId('');
      setActiveTab('status');
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md ${
      isLight ? 'bg-slate-900/40' : 'bg-slate-950/70'
    }`} dir="rtl">
      <div className={`rounded-3xl border shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900'
          : isHighContrast
          ? 'bg-black border-2 border-white text-white'
          : 'bg-slate-950/90 border-white/15 text-slate-100 backdrop-blur-2xl'
      }`}>
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : isHighContrast ? 'bg-black border-white' : 'bg-white/[0.03] border-white/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  مزامنة جداول بيانات Google Sheets
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isLight
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : isHighContrast
                    ? 'bg-black text-emerald-300 border-2 border-emerald-400'
                    : 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40 backdrop-blur-md'
                }`}>
                  Google Workspace
                </span>
              </div>
              <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                تحديث قاعدة المعرفة الضريبية واستيراد وتصدير السجلات مباشرة من Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer border ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-transparent'
                : 'text-slate-400 hover:text-white hover:bg-white/10 border-transparent hover:border-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications & Error alerts */}
        {syncError && (
          <div className="mx-5 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-semibold">{syncError}</span>
            </div>
            <button onClick={clearError} className="text-rose-400 hover:text-rose-200 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="mx-5 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 flex items-center gap-2 backdrop-blur-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className={`px-5 pt-3 border-b flex items-center gap-2 overflow-x-auto shrink-0 bg-transparent ${
          isLight ? 'border-slate-200' : isHighContrast ? 'border-white' : 'border-white/10'
        }`}>
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'status'
                ? isLight
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-emerald-400 text-emerald-300'
                : isLight
                ? 'border-transparent text-slate-500 hover:text-slate-800'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            حالة الاتصال والجدول
          </button>
          <button
            onClick={() => {
              setActiveTab('drive');
              loadDriveFiles();
            }}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'drive'
                ? isLight
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-emerald-400 text-emerald-300'
                : isLight
                ? 'border-transparent text-slate-500 hover:text-slate-800'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            اختيار من Google Drive
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? isLight
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-emerald-400 text-emerald-300'
                : isLight
                ? 'border-transparent text-slate-500 hover:text-slate-800'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            + إنشاء جدول جديد
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'logs'
                ? isLight
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-emerald-400 text-emerald-300'
                : isLight
                ? 'border-transparent text-slate-500 hover:text-slate-800'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            سجل المزامنة ({syncLogs.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: STATUS & ACTIVE SHEET */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* Google Account OAuth Status Box */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : isHighContrast
                  ? 'bg-black border-2 border-white'
                  : 'border-white/10 bg-white/5 backdrop-blur-md'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
                    isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white/10 border-white/10 text-slate-300'
                  }`}>
                    <Globe className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                  </div>
                  <div>
                    <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {isConnected ? 'حساب Google متصل ومفوّض' : 'غير متصل بحساب Google'}
                    </div>
                    <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {isConnected
                        ? 'الصلاحيات مفعلة لجداول البيانات وملفات Google Drive'
                        : 'انقر لتسجيل الدخول بتفويض Google Identity Services'}
                    </div>
                  </div>
                </div>

                {isConnected ? (
                  <button
                    onClick={disconnectGoogle}
                    className={`px-3 py-1.5 border rounded-xl font-semibold transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                        : isHighContrast
                        ? 'bg-black hover:bg-zinc-800 text-white border-2 border-white'
                        : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 backdrop-blur-md'
                    }`}
                  >
                    قطع الاتصال
                  </button>
                ) : (
                  <button
                    onClick={connectGoogle}
                    disabled={isSyncing}
                    className={`px-4 py-2 rounded-xl font-bold transition-all border flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                      isLight
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                        : isHighContrast
                        ? 'bg-white hover:bg-zinc-200 text-black border-2 border-white font-bold'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/50 border-emerald-400/30 backdrop-blur-md'
                    }`}
                  >
                    {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                    <span>تسجيل الدخول بـ Google</span>
                  </button>
                )}
              </div>

              {/* Active Connected Spreadsheet Card */}
              {config?.spreadsheetId ? (
                <div className={`p-4 rounded-2xl border space-y-3 shadow-md ${
                  isLight
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : isHighContrast
                    ? 'bg-black border-2 border-yellow-400'
                    : 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-teal-950/30 backdrop-blur-xl'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{config.spreadsheetTitle}</h4>
                      </div>
                      <p className={`text-[11px] mt-1 font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        ID: {config.spreadsheetId}
                      </p>
                    </div>

                    <a
                      href={config.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-colors border ${
                        isLight
                          ? 'bg-white hover:bg-slate-50 text-emerald-800 border-emerald-300'
                          : isHighContrast
                          ? 'bg-black text-yellow-300 border-2 border-yellow-400'
                          : 'bg-white/10 hover:bg-white/15 text-emerald-300 border-emerald-500/30 backdrop-blur-md'
                      }`}
                    >
                      <span>فتح في Google Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Sync Metrics */}
                  <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t text-[11px] ${
                    isLight ? 'border-emerald-200' : isHighContrast ? 'border-yellow-400' : 'border-emerald-500/30'
                  }`}>
                    <div className={`p-2.5 rounded-xl border ${
                      isLight ? 'bg-white border-emerald-200' : isHighContrast ? 'bg-black border border-white' : 'bg-white/5 border-white/10 backdrop-blur-md'
                    }`}>
                      <span className={`block text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>عدد السجلات</span>
                      <span className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{config.rowCount || 0} سجل</span>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${
                      isLight ? 'bg-white border-emerald-200' : isHighContrast ? 'bg-black border border-white' : 'bg-white/5 border-white/10 backdrop-blur-md'
                    }`}>
                      <span className={`block text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>ورقة العمل</span>
                      <span className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{config.sheetName || 'قاعدة المعرفة'}</span>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${
                      isLight ? 'bg-white border-emerald-200' : isHighContrast ? 'bg-black border border-white' : 'bg-white/5 border-white/10 backdrop-blur-md'
                    }`}>
                      <span className={`block text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>آخر مزامنة</span>
                      <span className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {config.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleTimeString('ar-EG') : 'الآن'}
                      </span>
                    </div>
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      isLight ? 'bg-white border-emerald-200' : isHighContrast ? 'bg-black border border-white' : 'bg-white/5 border-white/10 backdrop-blur-md'
                    }`}>
                      <div>
                        <span className={`block text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>مزامنة تلقائية</span>
                        <span className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {config.autoSync ? 'مفعلة (5 دقائق)' : 'معطلة'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.autoSync}
                        onChange={(e) => toggleAutoSync(e.target.checked)}
                        className="w-4 h-4 text-emerald-500 accent-emerald-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 2-Way Sync Actions */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={syncWithSheet}
                      disabled={isSyncing}
                      className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all border cursor-pointer disabled:opacity-60 ${
                        isLight
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                          : isHighContrast
                          ? 'bg-white hover:bg-zinc-200 text-black border-2 border-white font-bold'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/40 border-emerald-400/30 backdrop-blur-md'
                      }`}
                    >
                      <Download className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                      <span>مزامنة واستيراد التحديثات من Sheet</span>
                    </button>

                    <button
                      onClick={() => exportToSheet()}
                      disabled={isSyncing}
                      className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 border ${
                        isLight
                          ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                          : isHighContrast
                          ? 'bg-black hover:bg-zinc-800 text-white border-2 border-white'
                          : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 backdrop-blur-md'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>تصدير السجلات الحالية إلى Sheet</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`p-6 rounded-2xl border border-dashed text-center space-y-3 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300'
                    : isHighContrast
                    ? 'bg-black border-2 border-white'
                    : 'bg-white/5 border-white/15 backdrop-blur-md'
                }`}>
                  <FileSpreadsheet className={`w-10 h-10 mx-auto ${isLight ? 'text-slate-400' : 'text-slate-400'}`} />
                  <div>
                    <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>لا يوجد جدول Google Sheets متصل حالياً</h4>
                    <p className={`text-[11px] max-w-md mx-auto mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      يمكنك إنشاء جدول معتمد جديد بضغطة زر واحدة، أو ربط جدول بيانات موجود في حساب Google Drive الخاص بك.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => setActiveTab('create')}
                      className={`px-4 py-2 font-bold rounded-xl flex items-center gap-1.5 border cursor-pointer ${
                        isLight
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                          : isHighContrast
                          ? 'bg-white hover:bg-zinc-200 text-black border-2 border-white font-bold'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/40 border-emerald-400/30 backdrop-blur-md'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>إنشاء جدول جديد الآن</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('drive');
                        loadDriveFiles();
                      }}
                      className={`px-4 py-2 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer border ${
                        isLight
                          ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                          : isHighContrast
                          ? 'bg-black hover:bg-zinc-800 text-white border-2 border-white'
                          : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 backdrop-blur-md'
                      }`}
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>اختيار من Drive</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SELECT FROM GOOGLE DRIVE */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>جداول البيانات في حساب Google Drive الخاص بك</h4>
                  <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>اختر الجدول الذي يحتوي على قواعد المعرفة للربط والمزامنة</p>
                </div>
                <button
                  onClick={loadDriveFiles}
                  disabled={loadingDriveFiles}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1 text-xs font-semibold cursor-pointer border ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      : isHighContrast
                      ? 'bg-black hover:bg-zinc-800 text-white border-2 border-white'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 backdrop-blur-md'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDriveFiles ? 'animate-spin' : ''}`} />
                  <span>تحديث القائمة</span>
                </button>
              </div>

              {/* Direct ID input */}
              <form onSubmit={handleManualConnect} className={`flex items-center gap-2 p-3 rounded-2xl border ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : isHighContrast
                  ? 'bg-black border-2 border-white'
                  : 'bg-white/5 border-white/10 backdrop-blur-md'
              }`}>
                <input
                  type="text"
                  placeholder="أو أدخل معرف الجدول (Spreadsheet ID) مباشرة..."
                  value={manualSheetId}
                  onChange={(e) => setManualSheetId(e.target.value)}
                  className={`flex-1 border rounded-xl px-3 py-1.5 font-mono text-xs outline-none ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600'
                      : isHighContrast
                      ? 'bg-black border-2 border-white text-white'
                      : 'bg-slate-900 border-white/10 text-white placeholder-slate-500 focus:border-emerald-500/80'
                  }`}
                  dir="ltr"
                />
                <button
                  type="submit"
                  disabled={!manualSheetId.trim() || isSyncing}
                  className={`px-4 py-1.5 font-bold rounded-xl cursor-pointer disabled:opacity-50 border ${
                    isLight
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                      : isHighContrast
                      ? 'bg-white hover:bg-zinc-200 text-black border-2 border-white font-bold'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/30'
                  }`}
                >
                  ربط
                </button>
              </form>

              {/* Drive files list */}
              {loadingDriveFiles ? (
                <div className={`py-12 text-center flex flex-col items-center gap-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                  <span>جاري البحث في Google Drive...</span>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className={`py-8 text-center rounded-2xl border ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-600'
                    : isHighContrast
                    ? 'bg-black border-2 border-white text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 backdrop-blur-md'
                }`}>
                  <FolderOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold">لم يتم العثور على جداول بيانات أو يلزم تسجيل الدخول</p>
                  <button
                    onClick={connectGoogle}
                    className={`mt-3 px-4 py-1.5 rounded-xl font-bold border ${
                      isLight
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                        : isHighContrast
                        ? 'bg-white hover:bg-zinc-200 text-black border-2 border-white'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400/30'
                    }`}
                  >
                    تسجيل الدخول بـ Google
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {driveFiles.map((file) => {
                    const isCurrent = config?.spreadsheetId === file.id;
                    return (
                      <div
                        key={file.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                          isCurrent
                            ? isLight
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                              : isHighContrast
                              ? 'bg-black border-2 border-emerald-400 text-white font-bold'
                              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-bold backdrop-blur-md'
                            : isLight
                            ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                            : isHighContrast
                            ? 'bg-black hover:bg-zinc-800 border-2 border-white text-white'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 backdrop-blur-md'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileSpreadsheet className={`w-4 h-4 shrink-0 ${isCurrent ? (isLight ? 'text-emerald-700' : 'text-emerald-400') : (isLight ? 'text-slate-500' : 'text-slate-400')}`} />
                          <div className="truncate">
                            <span className={`block truncate font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{file.name}</span>
                            <span className={`text-[10px] font-mono block truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              ID: {file.id}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isCurrent ? (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                              isLight
                                ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                                : isHighContrast
                                ? 'text-emerald-300 bg-black border-2 border-emerald-400'
                                : 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40'
                            }`}>
                              <Check className="w-3.5 h-3.5" />
                              متصل حالياً
                            </span>
                          ) : (
                            <button
                              onClick={() => handleConnectExisting(file.id)}
                              disabled={isSyncing}
                              className={`px-3 py-1.5 rounded-xl font-bold border transition-colors cursor-pointer ${
                                isLight
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                                  : isHighContrast
                                  ? 'bg-white hover:bg-zinc-200 text-black border-2 border-white'
                                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/30'
                              }`}
                            >
                              ربط واستيراد
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CREATE NEW OFFICIAL SHEET */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateNew} className={`space-y-4 p-4 rounded-2xl border ${
              isLight
                ? 'bg-slate-50 border-slate-200'
                : isHighContrast
                ? 'bg-black border-2 border-white'
                : 'bg-white/5 border-white/10 backdrop-blur-md'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                }`}>
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>إنشاء جدول بيانات رسمي جديد لقواعد المعرفة</h4>
                  <p className={`text-[11px] mt-0.5 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    سيقوم النظام بإنشاء ملف Google Spreadsheet جديد في حسابك على Google Drive مهيأ بالأعمدة والسجلات المعتمدة للضرائب العقارية تلقائياً.
                  </p>
                </div>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>عنوان جدول البيانات في Google Drive:</label>
                <input
                  type="text"
                  required
                  value={customSheetTitle}
                  onChange={(e) => setCustomSheetTitle(e.target.value)}
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-xs outline-none font-medium ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                      : isHighContrast
                      ? 'bg-black border-2 border-white text-white'
                      : 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 backdrop-blur-md'
                  }`}
                />
              </div>

              <div className={`p-3 rounded-xl border space-y-1.5 text-[11px] ${
                isLight ? 'bg-white border-slate-200 text-slate-700' : isHighContrast ? 'bg-black border border-white text-zinc-300' : 'bg-white/5 border-white/10 text-slate-300 backdrop-blur-md'
              }`}>
                <span className={`font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>الهيكل التلقائي للأعمدة:</span>
                <p className={`leading-relaxed font-mono text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  ID | Category (التصنيف) | Topic (الموضوع) | Question (السؤال) | Answer (الإجابة والمستندات) | Source (المصدر) | Approved (معتمد) | LastUpdated (التاريخ) | Keywords (الكلمات)
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSyncing || !customSheetTitle.trim()}
                  className={`px-5 py-2.5 font-bold rounded-xl border flex items-center gap-2 cursor-pointer disabled:opacity-60 transition-all ${
                    isLight
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                      : isHighContrast
                      ? 'bg-white hover:bg-zinc-200 text-black border-2 border-white font-bold'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/40 border-emerald-400/30 backdrop-blur-md'
                  }`}
                >
                  {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>إنشاء الجدول وربطه فوراً</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: SYNC LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-2">
              <div className={`flex items-center justify-between pb-2 border-b ${
                isLight ? 'border-slate-200' : isHighContrast ? 'border-white' : 'border-white/10'
              }`}>
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>سجل أحداث المزامنة مع Google Sheets</span>
                <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>آخر 30 عملية</span>
              </div>

              {syncLogs.length === 0 ? (
                <div className={`py-8 text-center ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>لا توجد عمليات سابقة</div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {syncLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] ${
                        isLight
                          ? 'bg-white border-slate-200'
                          : isHighContrast
                          ? 'bg-black border border-white'
                          : 'border-white/10 bg-white/5 backdrop-blur-md'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {log.type === 'pull' || log.type === 'create' ? (
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                        ) : log.type === 'error' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : (
                          <Clock className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                        )}
                        <span className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{log.message}</span>
                      </div>
                      <span className={`font-mono text-[10px] shrink-0 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {log.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : isHighContrast ? 'bg-black border-white' : 'bg-white/[0.02] border-white/10'
        }`}>
          <div className={`flex items-center gap-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>بروتوكول التكامل: Google Sheets API v4 & Google Drive API v3</span>
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 font-bold rounded-xl cursor-pointer transition-colors border ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
                : isHighContrast
                ? 'bg-black hover:bg-zinc-800 text-white border-2 border-white'
                : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/10 backdrop-blur-md'
            }`}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

