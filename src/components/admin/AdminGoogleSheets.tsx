/**
 * Admin Google Sheets Control Center Component
 * Complete administrative interface for Google Sheets integration, 2-way synchronization,
 * sheet record inspection, and automatic synchronization settings.
 */

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Globe,
  RefreshCw,
  Plus,
  Upload,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  FolderOpen,
  Check,
  Search,
  Database,
  ArrowRight,
  ShieldCheck,
  Settings,
  Trash2,
  Edit3
} from 'lucide-react';
import { useGoogleSheets } from '../../context/GoogleSheetsContext.tsx';
import { KnowledgeRecord } from '../../lib/knowledge/types.ts';

export const AdminGoogleSheets: React.FC = () => {
  const {
    isConnected,
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
    toggleAutoSync,
    clearError
  } = useGoogleSheets();

  const [newTitle, setNewTitle] = useState('قاعدة معرفة مصلحة الضرائب العقارية - Tax Support AI');
  const [showCreateBox, setShowCreateBox] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [manualIdInput, setManualIdInput] = useState('');
  const [recordSearch, setRecordSearch] = useState('');
  const [banner, setBanner] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setBanner({ text, type });
    setTimeout(() => setBanner(null), 4500);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = await createNewKnowledgeSheet(newTitle.trim());
    if (id) {
      showNotification('تم إنشاء جدول Google Sheets جديد وتهيئته ومزامنته بنجاح!');
      setShowCreateBox(false);
    }
  };

  const handleSelectDriveFile = async (fileId: string) => {
    const ok = await connectExistingSheet(fileId);
    if (ok) {
      showNotification('تم ربط جدول البيانات واستيراد السجلات بنجاح!');
      setShowDrivePicker(false);
    }
  };

  const filteredRecords = sheetRecords.filter(r => {
    if (!recordSearch.trim()) return true;
    const q = recordSearch.toLowerCase();
    return (
      r.topic.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.question.toLowerCase().includes(q) ||
      r.answer.toLowerCase().includes(q) ||
      r.keywords.some(k => k.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* Banner Alert */}
      {banner && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xs ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button onClick={() => setBanner(null)} className="p-1 hover:bg-black/5 rounded">
            ×
          </button>
        </div>
      )}

      {syncError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{syncError}</span>
          </div>
          <button onClick={clearError} className="p-1 hover:bg-rose-100 rounded">
            ×
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-xs">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-white">
                مركز إدارة وتكامل Google Sheets
              </h2>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Google Workspace
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              مزامنة حية ثنائية الاتجاه مع جداول بيانات Google Drive لدعم موظفي الضرائب بالبيانات الرسمية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto text-xs">
          {isConnected ? (
            <button
              onClick={disconnectGoogle}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 font-medium transition-colors cursor-pointer"
            >
              قطع اتصال Google
            </button>
          ) : (
            <button
              onClick={connectGoogle}
              disabled={isSyncing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              <span>تسجيل الدخول بـ Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Connected Status + Right Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Status & Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Connection Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-sm">حالة جدول البيانات الحالي</span>
              <span className="text-[10px] font-mono text-slate-400">
                {config?.spreadsheetId ? 'متصل ومفعل' : 'قيد الانتظار'}
              </span>
            </div>

            {config?.spreadsheetId ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-emerald-950 text-xs">{config.spreadsheetTitle}</h4>
                      <p className="text-[10px] text-emerald-800 font-mono mt-0.5 truncate max-w-[220px]">
                        ID: {config.spreadsheetId}
                      </p>
                    </div>
                    <a
                      href={config.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-white text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-300 transition-colors shadow-2xs"
                      title="فتح في Google Sheets"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 text-[10px] text-emerald-900">
                    <div>
                      <span className="text-emerald-700 block">السجلات المستوردة:</span>
                      <strong className="font-bold text-xs">{sheetRecords.length} سجل معتمد</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 block">آخر مزامنة:</span>
                      <strong className="font-mono text-xs">
                        {config.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleTimeString('ar-EG') : 'الآن'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Auto Sync Switch */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 block">المزامنة التلقائية الخلفية</span>
                    <span className="text-[10px] text-slate-500 block">تحديث كل 5 دقائق تلقائياً</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoSync}
                      onChange={(e) => toggleAutoSync(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded accent-emerald-600"
                    />
                  </label>
                </div>

                {/* 2-Way Sync Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={syncWithSheet}
                    disabled={isSyncing}
                    className="p-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
                  >
                    <Download className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>سحب من Sheet</span>
                  </button>

                  <button
                    onClick={() => exportToSheet()}
                    disabled={isSyncing}
                    className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>تصدير إلى Sheet</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 space-y-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 text-xs">لا يوجد جدول متصل حالياً</p>
                <p className="text-[11px] text-slate-400">اختر من الخيارات أدناه للربط الفوري</p>
              </div>
            )}

            {/* Quick Change / Create Buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={() => {
                  setShowCreateBox(true);
                  setShowDrivePicker(false);
                }}
                className="flex-1 p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إنشاء جدول رسمي</span>
              </button>
              <button
                onClick={() => {
                  setShowDrivePicker(true);
                  setShowCreateBox(false);
                  loadDriveFiles();
                }}
                className="flex-1 p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>اختيار من Drive</span>
              </button>
            </div>
          </div>

          {/* Sync History Logs Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-900">سجل أحداث المزامنة</span>
              <span className="text-[10px] text-slate-400 font-mono">Real-time Logs</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
              {syncLogs.length === 0 ? (
                <div className="text-center py-4 text-slate-400">لا توجد عمليات سابقة</div>
              ) : (
                syncLogs.slice(0, 15).map((log) => (
                  <div
                    key={log.id}
                    className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {log.type === 'pull' || log.type === 'create' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : log.type === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="text-slate-800 truncate font-medium">{log.message}</span>
                    </div>
                    <span className="font-mono text-[9px] text-slate-400 shrink-0 pr-1">{log.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Records & Interactive Explorer (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Create Box Modal/Section if opened */}
          {showCreateBox && (
            <form onSubmit={handleCreate} className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3 text-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-emerald-950 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>إنشاء جدول Google Sheets رسمي جديد</span>
                </h4>
                <button type="button" onClick={() => setShowCreateBox(false)} className="text-emerald-700 hover:text-emerald-950">
                  ×
                </button>
              </div>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="عنوان ملف الجدول..."
                className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-700 text-slate-900"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBox(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-emerald-100 rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer disabled:opacity-60"
                >
                  إنشاء وربط
                </button>
              </div>
            </form>
          )}

          {/* Drive Picker Box if opened */}
          {showDrivePicker && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-slate-600" />
                  <span>اختر جدولاً من Google Drive</span>
                </h4>
                <button type="button" onClick={() => setShowDrivePicker(false)} className="text-slate-400 hover:text-slate-600">
                  ×
                </button>
              </div>

              {loadingDriveFiles ? (
                <div className="py-6 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>جاري قراءة ملفات Google Drive...</span>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="text-center py-4 text-slate-500">
                  لم يتم العثور على جداول بيانات. يرجى تسجيل الدخول أو إدخال المعرف مباشرة.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {driveFiles.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => handleSelectDriveFile(file.id)}
                      className="w-full text-right p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="truncate">
                        <span className="font-bold text-slate-900 block truncate">{file.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{file.id}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        اختيار
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Records Table Explorer Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  السجلات المتزامنة مع Google Sheets ({filteredRecords.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  معاينة مباشرة لكافة القواعد والتعليمات الضريبية المحملة من الجداول
                </p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="البحث في السجلات..."
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl py-1.5 pr-8 pl-3 text-xs outline-none w-48 text-slate-900 placeholder:text-slate-400"
                />
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[500px] overflow-y-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3">الموضوع والتصنيف</th>
                    <th className="p-3">السؤال والإجابة المعتمدة</th>
                    <th className="p-3">المصدر القانوني</th>
                    <th className="p-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        لا توجد سجلات مطابقة للبحث
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 align-top min-w-[180px]">
                          <div className="font-bold text-slate-900">{rec.topic}</div>
                          <span className="inline-block mt-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                            {rec.category}
                          </span>
                        </td>
                        <td className="p-3 align-top min-w-[260px] space-y-1">
                          <p className="font-semibold text-slate-800 text-[11px]">{rec.question}</p>
                          <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                            {rec.answer}
                          </p>
                        </td>
                        <td className="p-3 align-top text-[11px] text-slate-500 min-w-[150px]">
                          {rec.source}
                        </td>
                        <td className="p-3 align-top text-center">
                          {rec.approved ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              معتمد
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              مسودة
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
