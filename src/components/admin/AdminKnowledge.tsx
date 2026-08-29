/**
 * Admin Knowledge Records Manager Component
 * Real-time inspection and management of Google Sheets Knowledge Base.
 * Enforces Google Sheets as the ONLY Source of Truth.
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  CheckCircle2, 
  ShieldAlert, 
  Tag, 
  RefreshCw, 
  FileSpreadsheet,
  Trash2,
  ExternalLink,
  Zap,
  Activity,
  Layers,
  Clock,
  Plus,
  Edit3,
  X,
  Check
} from 'lucide-react';
import { KnowledgeRecord, KnowledgeBaseStats, KnowledgeBaseDiagnostics } from '../../lib/knowledge/types.ts';
import { useGoogleSheets } from '../../context/GoogleSheetsContext.tsx';
import { apiFetch } from '../../lib/api-client.ts';

export const AdminKnowledge: React.FC = () => {
  const [records, setRecords] = useState<KnowledgeRecord[]>([]);
  const [diagnostics, setDiagnostics] = useState<KnowledgeBaseDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterApproved, setFilterApproved] = useState<'all' | 'approved' | 'unapproved'>('all');
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [resettingCache, setResettingCache] = useState(false);
  const [banner, setBanner] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Partial<KnowledgeRecord> | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const { config, isConnected, exportToSheet, syncWithSheet, isSyncing, resetKnowledgeCache } = useGoogleSheets();

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setBanner({ text, type });
    setTimeout(() => setBanner(null), 4500);
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const recRes = await apiFetch<{
        records: KnowledgeRecord[];
        diagnostics: KnowledgeBaseDiagnostics;
      }>('/api/knowledge/records');

      if (recRes.data) {
        setRecords(recRes.data.records || []);
        if (recRes.data.diagnostics) {
          setDiagnostics(recRes.data.diagnostics);
        }
      }
    } catch (err) {
      console.error('Failed to load knowledge records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleToggleApproval = async (id: string, currentApproved: boolean, rowNumber?: number) => {
    setToggleLoading(id);
    try {
      const { data, ok } = await apiFetch<{ success: boolean }>('/api/knowledge/sheets/toggle-approval', {
        method: 'POST',
        body: JSON.stringify({
          id,
          rowNumber,
          approved: !currentApproved,
          spreadsheetId: config?.spreadsheetId
        })
      });
      if (ok && data?.success) {
        setRecords(prev => prev.map(r => r.id === id ? { ...r, approved: !currentApproved } : r));
        fetchRecords();
        showNotification(`تم ${!currentApproved ? 'اعتماد' : 'إلغاء اعتماد'} السجل بنجاح`);
      }
    } catch (e) {
      console.error('Failed to toggle approval', e);
      showNotification('فشل تعديل حالة الاعتماد', 'error');
    } finally {
      setToggleLoading(null);
    }
  };

  const handleSyncFresh = async () => {
    if (!config?.spreadsheetId) {
      showNotification('يرجى ربط جدول Google Sheets أولاً من تبويب جداول البيانات', 'error');
      return;
    }
    const ok = await syncWithSheet();
    if (ok) {
      await fetchRecords();
      showNotification('تمت مزامنة واستبدال السجلات بنجاح من Google Sheets');
    }
  };

  const handleResetCache = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في تفريغ ومسح الذاكرة المؤقتة لقاعدة المعرفة؟')) {
      return;
    }
    setResettingCache(true);
    try {
      const ok = await resetKnowledgeCache();
      if (ok) {
        await fetchRecords();
        showNotification('تم تفريغ ومسح الذاكرة المؤقتة لقاعدة المعرفة بنجاح');
      }
    } finally {
      setResettingCache(false);
    }
  };

  const handleDeleteRecord = async (id: string, rowNumber?: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل نهائياً من قاعدة المعرفة وجدول Google Sheets؟')) {
      return;
    }
    try {
      const res = await apiFetch('/api/knowledge/sheets/delete-row', {
        method: 'POST',
        body: JSON.stringify({
          recordId: id,
          rowNumber,
          spreadsheetId: config?.spreadsheetId
        })
      });
      if (res.ok) {
        setRecords(prev => prev.filter(r => r.id !== id));
        fetchRecords();
        showNotification('تم حذف السجل بنجاح');
      }
    } catch (err) {
      showNotification('فشل حذف السجل', 'error');
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !editingRecord.topic || !editingRecord.answer) {
      showNotification('يرجى ملء الموضوع والإجابة على الأقل', 'error');
      return;
    }

    setModalLoading(true);
    try {
      const isNew = !editingRecord.id;
      const endpoint = isNew ? '/api/knowledge/sheets/add-row' : '/api/knowledge/sheets/update-row';
      const res = await apiFetch<{ success: boolean; record: KnowledgeRecord }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          spreadsheetId: config?.spreadsheetId,
          sheetName: config?.sheetName || 'قاعدة المعرفة',
          rowNumber: editingRecord.rowNumber,
          record: editingRecord
        })
      });

      if (res.ok) {
        setShowModal(false);
        setEditingRecord(null);
        await fetchRecords();
        showNotification(isNew ? 'تمت إضافة السجل بنجاح إلى جدول Google Sheets' : 'تم تعديل السجل بنجاح');
      } else {
        showNotification('فشل حفظ السجل', 'error');
      }
    } catch (err) {
      showNotification('فشل حفظ السجل في Google Sheets', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const filtered = records.filter(r => {
    if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
    if (filterApproved === 'approved' && !r.approved) return false;
    if (filterApproved === 'unapproved' && r.approved) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.topic.toLowerCase().includes(q) ||
      r.question.toLowerCase().includes(q) ||
      r.answer.toLowerCase().includes(q) ||
      (r.keywords && r.keywords.some(k => k.toLowerCase().includes(q)))
    );
  });

  const categories = Array.from(new Set(records.map(r => r.category))).filter(Boolean);

  return (
    <div className="space-y-5 animate-in fade-in duration-200" dir="rtl">
      {/* Banner */}
      {banner && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xs ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} className="p-1 hover:bg-black/5 rounded">×</button>
        </div>
      )}

      {/* Diagnostics Card */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  بيانات مصدر المعرفة المعتمد (Google Sheets)
                </h2>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  المصدر الوحيد للحقيقة
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {diagnostics?.isReady 
                  ? `متصل بالجدول: "${diagnostics.spreadsheetTitle || diagnostics.spreadsheetId}"` 
                  : 'لم يتم مزامنة جدول Google Sheets بعد'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setEditingRecord({
                  category: 'ضرائب عقارية',
                  topic: '',
                  question: '',
                  answer: '',
                  source: 'جدول مصلحة الضرائب العقارية',
                  approved: true,
                  keywords: []
                });
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة معلومة جديدة</span>
            </button>

            {config?.spreadsheetId && (
              <button
                onClick={handleSyncFresh}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-2 rounded-xl font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>إعادة مزامنة فورية من Sheet</span>
              </button>
            )}

            <button
              onClick={handleResetCache}
              disabled={resettingCache}
              className="inline-flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-100 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer disabled:opacity-60"
              title="مسح الذاكرة المؤقتة لقاعدة المعرفة"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح الذاكرة المؤقتة</span>
            </button>
          </div>
        </div>

        {/* Diagnostics Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-1">إجمالي السجلات المستوردة</span>
            <div className="text-base font-bold text-white flex items-center gap-1.5">
              <span>{diagnostics?.totalRecords ?? records.length}</span>
              <span className="text-[11px] text-slate-400 font-normal">سجل</span>
            </div>
          </div>

          <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-1">السجلات المعتمدة للذكاء</span>
            <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
              <span>{diagnostics?.approvedRecords ?? records.filter(r => r.approved).length}</span>
              <span className="text-[11px] text-emerald-500 font-normal">معتمد</span>
            </div>
          </div>

          <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-1">بصمة المحتوى الحالية</span>
            <div className="text-xs font-mono font-bold text-amber-300 truncate" title={diagnostics?.contentHash || 'لا يوجد'}>
              {diagnostics?.contentHash || 'لا توجد بيانات'}
            </div>
          </div>

          <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-1">حالة الذاكرة المؤقتة</span>
            <div className="text-xs font-bold flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${diagnostics?.cacheStatus === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className="text-slate-200">{diagnostics?.cacheStatus || 'UNINITIALIZED'} (v{diagnostics?.version || 0})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Records Container */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        {/* Toolbar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              سجلات قاعدة المعرفة الحالية ({filtered.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              كافة الحقائق المعروضة مستخرجة ومطابقة حصرياً مع جدول Google Sheets الحالي
            </p>
          </div>

          <div className="flex items-center gap-2">
            {config?.spreadsheetId && (
              <button
                onClick={() => exportToSheet(records)}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-2 rounded-xl font-bold transition-colors cursor-pointer"
                title="تصدير التغييرات إلى Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>حفظ التعديلات في Sheet</span>
              </button>
            )}
            <button
              onClick={fetchRecords}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث العرض</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          <div className="sm:col-span-6 relative">
            <input
              type="text"
              placeholder="البحث في القواعد والأسئلة والمستندات..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl text-xs py-2 pr-8 pl-3 outline-none text-slate-900 placeholder:text-slate-400"
            />
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs py-2 px-3 outline-none text-slate-900"
            >
              <option value="all">كافة التصنيفات ({categories.length})</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={filterApproved}
              onChange={e => setFilterApproved(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs py-2 px-3 outline-none text-slate-900"
            >
              <option value="all">كافة الحالات</option>
              <option value="approved">معتمد فقط</option>
              <option value="unapproved">مسودة (غير معتمد)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Record Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>جاري قراءة السجلات...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-xs text-slate-400 space-y-2">
            <p className="font-bold text-slate-700">لا توجد سجلات مطابقة</p>
            <p className="text-[11px] text-slate-400">
              {records.length === 0 
                ? 'يرجى ربط جدول Google Sheets ومزامنته لبدء تغذية المساعد بالبيانات الرسمية.'
                : 'جرب تغيير معايير البحث أو تصفية التصنيفات.'}
            </p>
          </div>
        ) : (
          filtered.map(rec => (
            <div
              key={rec.id}
              className={`
                bg-white p-5 rounded-2xl border transition-all text-xs space-y-3 shadow-2xs
                ${rec.approved 
                  ? 'border-slate-200 hover:border-slate-800' 
                  : 'border-amber-300 bg-amber-50/30'}
              `}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900">
                    {rec.topic}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                    {rec.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">
                    صف {rec.rowNumber || rec.sheetRowIndex || '—'}
                  </span>
                  {rec.approved ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      معتمد رسمياً
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      مسودة (غير مفعل)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => {
                      setEditingRecord({ ...rec });
                      setShowModal(true);
                    }}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    title="تعديل السجل"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>

                  <button
                    onClick={() => handleDeleteRecord(rec.id, rec.rowNumber || rec.sheetRowIndex)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    title="حذف السجل"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>

                  <button
                    onClick={() => handleToggleApproval(rec.id, rec.approved, rec.rowNumber || rec.sheetRowIndex)}
                    disabled={toggleLoading === rec.id}
                    className={`
                      px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border cursor-pointer
                      ${rec.approved
                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700'}
                    `}
                  >
                    {toggleLoading === rec.id 
                      ? 'جاري التحديث...' 
                      : rec.approved ? 'تعطيل الاعتماد' : 'اعتماد السجل'}
                  </button>
                </div>
              </div>

              {/* Question & Answer Boxes */}
              <div className="space-y-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">السؤال الاسترشادي:</span>
                  <p className="text-slate-900 font-medium leading-relaxed">
                    {rec.question}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">الإجابة المعتمدة والمستندات:</span>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {rec.answer}
                  </p>
                </div>
              </div>

              {/* Keywords & Metadata */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {rec.keywords && rec.keywords.map((kw, i) => (
                    <span key={i} className="bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded-md text-[10px]">
                      {kw}
                    </span>
                  ))}
                </div>
                <span className="font-mono text-[10px] text-slate-500">
                  {rec.source} • {rec.lastUpdated}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Knowledge Modal */}
      {showModal && editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{editingRecord.id ? 'تعديل معلومة في Google Sheets' : 'إضافة معلومة جديدة إلى Google Sheets'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">التصنيف</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.category || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, category: e.target.value })}
                    placeholder="مثال: التصرفات العقارية"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-slate-800 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الموضوع الرئيسي</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.topic || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, topic: e.target.value })}
                    placeholder="مثال: رسوم المعاينة والتثمين"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-slate-800 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">السؤال الشائع</label>
                <input
                  type="text"
                  required
                  value={editingRecord.question || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, question: e.target.value })}
                  placeholder="مثال: كم تبلغ رسوم المعاينة الميدانية للعقار؟"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-slate-800 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الإجابة المعتمدة والمستندات المطلوبة</label>
                <textarea
                  rows={4}
                  required
                  value={editingRecord.answer || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, answer: e.target.value })}
                  placeholder="اكتب الإجابة الرسمية والنسبة والمستندات الدقيقة هنا..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-slate-800 text-slate-900 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">السند القانوني والمصدر</label>
                  <input
                    type="text"
                    value={editingRecord.source || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, source: e.target.value })}
                    placeholder="مثال: قانون 196 لسنة 2008 مادة 14"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-slate-800 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الكلمات المفتاحية (مفصولة بفواصل)</label>
                  <input
                    type="text"
                    value={Array.isArray(editingRecord.keywords) ? editingRecord.keywords.join(', ') : ''}
                    onChange={e => setEditingRecord({ ...editingRecord, keywords: e.target.value.split(/[,،]+/).map(s => s.trim()).filter(Boolean) })}
                    placeholder="معاينة, رسوم, تثمين"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-slate-800 text-slate-900"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">حالة الاعتماد (تفعيل للشات)</span>
                  <span className="text-[10px] text-slate-500 block">إذا كانت معتمدة، ستظهر وتستخدم فوراً بواسطة المساعد الذكي</span>
                </div>
                <input
                  type="checkbox"
                  checked={editingRecord.approved ?? true}
                  onChange={e => setEditingRecord({ ...editingRecord, approved: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                >
                  {modalLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>حفظ في Google Sheets</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
