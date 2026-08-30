/**
 * Admin Knowledge Records Manager Component
 * Real-time inspection and management of Cloud Firestore Knowledge Base.
 * Enforces Cloud Firestore as the ONLY Source of Truth for all AI operations.
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  CheckCircle2, 
  ShieldAlert, 
  Tag, 
  RefreshCw, 
  Trash2, 
  Sparkles, 
  Plus, 
  Edit3, 
  X, 
  Check, 
  Layers, 
  ShieldCheck,
  FileText,
  HelpCircle,
  Clock,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { KnowledgeRecord, KnowledgeBaseStats, KnowledgeBaseDiagnostics } from '../../lib/knowledge/types.ts';
import { apiFetch } from '../../lib/api-client.ts';

export const AdminKnowledge: React.FC = () => {
  const [records, setRecords] = useState<KnowledgeRecord[]>([]);
  const [diagnostics, setDiagnostics] = useState<KnowledgeBaseDiagnostics | null>(null);
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterApproved, setFilterApproved] = useState<'all' | 'approved' | 'unapproved'>('all');
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [resettingCache, setResettingCache] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [banner, setBanner] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Partial<KnowledgeRecord> | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setBanner({ text, type });
    setTimeout(() => setBanner(null), 4500);
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const recRes = await apiFetch<{
        records: KnowledgeRecord[];
        stats: KnowledgeBaseStats;
        diagnostics: KnowledgeBaseDiagnostics;
      }>('/api/admin/knowledge/records');

      if (recRes.data) {
        setRecords(recRes.data.records || []);
        if (recRes.data.stats) setStats(recRes.data.stats);
        if (recRes.data.diagnostics) setDiagnostics(recRes.data.diagnostics);
      }
    } catch (err) {
      console.error('Failed to load knowledge records', err);
      showNotification('فشل تحميل سجلات المعرفة من Firestore', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleToggleApproval = async (id: string, currentApproved: boolean) => {
    setToggleLoading(id);
    const nextState = !currentApproved;
    // Optimistic update
    setRecords(prev => prev.map(r => r.id === id ? { ...r, approved: nextState, version: (r.version || 1) + 1 } : r));

    try {
      const { data, ok } = await apiFetch<{ success: boolean; record: KnowledgeRecord }>('/api/admin/knowledge/toggle-approval', {
        method: 'POST',
        body: JSON.stringify({
          id,
          approved: nextState
        })
      });
      if (ok && data?.success) {
        fetchRecords();
        showNotification(`تم ${nextState ? 'اعتماد' : 'إلغاء اعتماد'} السجل بنجاح في Firestore`);
      } else {
        fetchRecords();
        showNotification('فشل تعديل حالة الاعتماد', 'error');
      }
    } catch (e) {
      console.error('Failed to toggle approval', e);
      fetchRecords();
      showNotification('فشل تعديل حالة الاعتماد', 'error');
    } finally {
      setToggleLoading(null);
    }
  };

  const handleResetCache = async () => {
    if (!window.confirm('هل أنت متأكد من تفريغ وإعادة مزامنة ذاكرة قاعدة المعرفة في Firestore؟')) {
      return;
    }
    setResettingCache(true);
    try {
      const res = await apiFetch<{ success: boolean }>('/api/admin/knowledge/reset-cache', {
        method: 'POST'
      });
      if (res.ok) {
        await fetchRecords();
        showNotification('تم تفريغ وإعادة مزامنة الذاكرة المؤقتة بنجاح');
      }
    } finally {
      setResettingCache(false);
    }
  };

  const handleSeedInitial = async () => {
    if (!window.confirm('هل أنت متأكد من إعادة تهيئة وزرع الـ 48 سؤال وضريبة رسمية معتمدة في Firestore؟')) {
      return;
    }
    setSeeding(true);
    try {
      const res = await apiFetch<{ success: boolean; count: number }>('/api/admin/knowledge/seed-initial', {
        method: 'POST'
      });
      if (res.ok) {
        await fetchRecords();
        showNotification(`تمت تهيئة وزرع ${res.data?.count || 48} سجل ضريبي رسمي بنجاح في Firestore`);
      }
    } catch (e) {
      showNotification('فشل تهيئة السجلات في Firestore', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل نهائياً من قاعدة معرفة Firestore؟')) {
      return;
    }
    try {
      const res = await apiFetch('/api/admin/knowledge/delete', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setRecords(prev => prev.filter(r => r.id !== id));
        fetchRecords();
        showNotification('تم حذف السجل نهائياً من Firestore والتحقق من الحذف');
      } else {
        showNotification('فشل حذف السجل', 'error');
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
      const endpoint = isNew ? '/api/admin/knowledge/create' : '/api/admin/knowledge/update';
      const res = await apiFetch<{ success: boolean; record: KnowledgeRecord }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(editingRecord)
      });

      if (res.ok) {
        setShowModal(false);
        setEditingRecord(null);
        await fetchRecords();
        showNotification(isNew ? 'تمت إضافة السجل بنجاح إلى Firestore' : 'تم حفظ تعديلات السجل في Firestore بنجاح');
      } else {
        showNotification('فشل حفظ السجل في Firestore', 'error');
      }
    } catch (err) {
      showNotification('فشل حفظ السجل في Firestore', 'error');
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
      (r.question && r.question.toLowerCase().includes(q)) ||
      r.answer.toLowerCase().includes(q) ||
      (r.crmSubCategory && r.crmSubCategory.toLowerCase().includes(q)) ||
      (r.keywords && r.keywords.some(k => k.toLowerCase().includes(q)))
    );
  });

  const categories = Array.from(new Set(records.map(r => r.category))).filter(Boolean);

  return (
    <div className="space-y-5 animate-in fade-in duration-200" dir="rtl">
      {/* Notification Banner */}
      {banner && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xs ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} className="p-1 hover:bg-black/5 rounded cursor-pointer">×</button>
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
                  قاعدة معرفة Cloud Firestore المعتمدة
                </h2>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  المصدر الحصري للحقائق والذكاء الاصطناعي
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تكامل مباشر مع مجموعة `knowledge` في Firestore ونموذج Gemini 3.7 Flash
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setEditingRecord({
                  category: 'استفسارات عن الضرائب العقاريه',
                  subcategory: 'الاعفاء الضريبي',
                  topic: '',
                  question: '',
                  answer: '',
                  crmMainCategory: 'استفسارات عن الضرائب العقاريه',
                  crmSubCategory: 'الاعفاء الضريبي',
                  requiredCustomerData: 'الاسم ثلاثي / رقم الموبايل / المحافظه',
                  routingAction: 'مساعدة إلكترونية',
                  sourceReference: 'قانون 196 لسنة 2008 وقانون 3 لسنة 2026',
                  approved: true,
                  keywords: []
                });
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 rounded-xl font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مستند معرفة جديد</span>
            </button>

            <button
              onClick={handleSeedInitial}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer disabled:opacity-60"
              title="إعادة تهيئة وزرع الأسئلة الرسمية الـ 48"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${seeding ? 'animate-spin' : ''}`} />
              <span>زرع الأسئلة الـ 48</span>
            </button>

            <button
              onClick={handleResetCache}
              disabled={resettingCache}
              className="inline-flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-100 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer disabled:opacity-60"
              title="تفريغ ومزامنة الذاكرة المؤقتة"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>تفريغ الذاكرة</span>
            </button>
          </div>
        </div>

        {/* Diagnostics Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-1">إجمالي المستندات في Firestore</span>
            <div className="text-base font-bold text-white flex items-center gap-1.5">
              <span>{stats?.totalRecords ?? records.length}</span>
              <span className="text-[11px] text-slate-400 font-normal">مستند</span>
            </div>
          </div>

          <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-1">المستندات المعتمدة للشات</span>
            <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
              <span>{stats?.approvedRecords ?? records.filter(r => r.approved).length}</span>
              <span className="text-[11px] text-emerald-500 font-normal">معتمد</span>
            </div>
          </div>

          <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-1">المسودات غير المعتمدة</span>
            <div className="text-base font-bold text-amber-300 flex items-center gap-1.5">
              <span>{stats?.unapprovedRecords ?? records.filter(r => !r.approved).length}</span>
              <span className="text-[11px] text-amber-400 font-normal">مسودة</span>
            </div>
          </div>

          <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-1">نموذج الاستدلال والنسخة</span>
            <div className="text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-200">Gemini 3.7 Flash (v{diagnostics?.version || 1})</span>
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
              كافة السجلات يتم استرجاعها مباشرة من Cloud Firestore وتنعكس في الشات فورياً
            </p>
          </div>

          <div className="flex items-center gap-2">
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
              placeholder="البحث في الأسئلة، الموضوعات، الإجابات، وتصنيفات CRM..."
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs py-2 px-3 outline-none text-slate-900 cursor-pointer"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs py-2 px-3 outline-none text-slate-900 cursor-pointer"
            >
              <option value="all">كافة الحالات</option>
              <option value="approved">معتمد فقط (يستخدم في الشات)</option>
              <option value="unapproved">مسودة (غير مفعل في الشات)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Record Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>جاري قراءة السجلات من Cloud Firestore...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-xs text-slate-400 space-y-3">
            <p className="font-bold text-slate-700 text-sm">لا توجد سجلات مطابقة</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {records.length === 0 
                ? 'قاعدة المعرفة في Firestore فارغة حالياً. يمكنك النقر على زر "زرع الأسئلة الـ 48" لتهيئة كافة الأسئلة الرسمية فوراً.'
                : 'جرب تغيير معايير البحث أو تصفية التصنيفات.'}
            </p>
            {records.length === 0 && (
              <button
                onClick={handleSeedInitial}
                disabled={seeding}
                className="inline-flex items-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl font-bold transition-all shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>زرع وتهيئة الأسئلة الـ 48 الآن</span>
              </button>
            )}
          </div>
        ) : (
          filtered.map(rec => (
            <div
              key={rec.id}
              className={`
                bg-white p-5 rounded-2xl border transition-all text-xs space-y-3 shadow-2xs
                ${rec.approved 
                  ? 'border-slate-200 hover:border-slate-800' 
                  : 'border-amber-300 bg-amber-50/20'}
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
                  {rec.subcategory && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 text-[10px] border border-slate-200">
                      {rec.subcategory}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono">
                    v{rec.version || 1}
                  </span>
                  {rec.approved ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      معتمد رسمياً للشات
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      مسودة (غير مفعل في الشات)
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
                    onClick={() => handleDeleteRecord(rec.id)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    title="حذف السجل"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>

                  <button
                    onClick={() => handleToggleApproval(rec.id, rec.approved)}
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
                  <span className="text-[10px] text-slate-500 font-bold block mb-0.5">السؤال الاسترشادي للمواطن / الموظف:</span>
                  <p className="text-slate-900 font-medium leading-relaxed">
                    {rec.question || rec.topic}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 font-bold block mb-0.5">الإجابة المعتمدة والمستندات والإجراءات:</span>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {rec.answer}
                  </p>
                </div>
              </div>

              {/* CRM and Required Data Details */}
              {(rec.crmMainCategory || rec.requiredCustomerData) && (
                <div className="p-2.5 bg-slate-100/70 rounded-xl border border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  {rec.crmMainCategory && (
                    <div className="flex items-center gap-1 text-slate-700">
                      <span className="font-bold text-slate-900">💡 تصنيف CRM:</span>
                      <span>{rec.crmMainCategory} {rec.crmSubCategory ? `(${rec.crmSubCategory})` : ''}</span>
                    </div>
                  )}
                  {rec.requiredCustomerData && (
                    <div className="flex items-center gap-1 text-slate-700">
                      <span className="font-bold text-slate-900">📋 البيانات المطلوبة:</span>
                      <span className="text-slate-600">{rec.requiredCustomerData}</span>
                    </div>
                  )}
                </div>
              )}

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
                <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                  <span>{rec.sourceReference || rec.source || 'قانون 196 لسنة 2008'}</span>
                  <span>•</span>
                  <span>{rec.updatedBy ? `بواسطة ${rec.updatedBy}` : ''}</span>
                  <span>•</span>
                  <span>{new Date(rec.updatedAt || rec.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
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
                <Database className="w-4 h-4 text-emerald-400" />
                <span>{editingRecord.id ? 'تعديل مستند في Firestore' : 'إضافة مستند معرفة جديد إلى Firestore'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">التصنيف الأساسي</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.category || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, category: e.target.value })}
                    placeholder="مثال: الإعفاءات السكنية والتجارية"
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
                    placeholder="مثال: تسجيل وحدة ورثة وطلب الإعفاء"
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
                  placeholder="مثال: في حالة استفسار العميل أنه لديه وحدة ورثة ويريد تسجيلها والحصول على الإعفاء؟"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-slate-800 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الإجابة المعتمدة والمستندات والإجراءات</label>
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
                  <label className="block text-slate-700 font-bold mb-1">تصنيف CRM الأساسي</label>
                  <input
                    type="text"
                    value={editingRecord.crmMainCategory || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, crmMainCategory: e.target.value })}
                    placeholder="استفسارات عن الضرائب العقاريه"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-slate-800 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تصنيف CRM الفرعي</label>
                  <input
                    type="text"
                    value={editingRecord.crmSubCategory || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, crmSubCategory: e.target.value, subcategory: e.target.value })}
                    placeholder="الاعفاء الضريبي"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-slate-800 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">البيانات المطلوبة من العميل</label>
                  <input
                    type="text"
                    value={editingRecord.requiredCustomerData || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, requiredCustomerData: e.target.value })}
                    placeholder="الاسم ثلاثي / رقم الموبايل / المحافظه"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-slate-800 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">السند القانوني والمصدر</label>
                  <input
                    type="text"
                    value={editingRecord.sourceReference || editingRecord.source || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, sourceReference: e.target.value, source: e.target.value })}
                    placeholder="قانون 196 لسنة 2008 وقانون 3 لسنة 2026"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-slate-800 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الكلمات المفتاحية (مفصولة بفواصل)</label>
                <input
                  type="text"
                  value={Array.isArray(editingRecord.keywords) ? editingRecord.keywords.join(', ') : ''}
                  onChange={e => setEditingRecord({ ...editingRecord, keywords: e.target.value.split(/[,،]+/).map(s => s.trim()).filter(Boolean) })}
                  placeholder="ورثة, شيوع, إعفاء, سكن خاص"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-slate-800 text-slate-900"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">حالة الاعتماد (تفعيل للشات)</span>
                  <span className="text-[10px] text-slate-500 block">إذا كانت معتمدة، سيتم استرجاعها واستخدامها بواسطة Gemini 3.7 Flash فوراً</span>
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
                  <span>حفظ في Firestore</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
