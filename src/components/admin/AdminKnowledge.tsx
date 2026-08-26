/**
 * Admin Knowledge Records Manager Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  CheckCircle2, 
  ShieldAlert, 
  Tag, 
  RefreshCw, 
  Plus,
  FileSpreadsheet,
  ExternalLink,
  Edit3,
  Trash2
} from 'lucide-react';
import { KnowledgeRecord, KnowledgeBaseStats } from '../../lib/knowledge/types.ts';
import { useGoogleSheets } from '../../context/GoogleSheetsContext.tsx';

export const AdminKnowledge: React.FC = () => {
  const [records, setRecords] = useState<KnowledgeRecord[]>([]);
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterApproved, setFilterApproved] = useState<'all' | 'approved' | 'unapproved'>('all');
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const { config, isConnected, exportToSheet, syncWithSheet } = useGoogleSheets();

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [recRes, statRes] = await Promise.all([
        fetch('/api/knowledge/records', { headers: { 'x-user-role': 'admin' } }),
        fetch('/api/knowledge/stats')
      ]);
      const recData = await recRes.json();
      const statData = await statRes.json();
      setRecords(recData.records || []);
      setStats(statData);
    } catch (err) {
      console.error('Failed to load knowledge records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleToggleApproval = async (id: string, currentApproved: boolean) => {
    setToggleLoading(id);
    try {
      const res = await fetch('/api/knowledge/toggle-approval', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({ id, approved: !currentApproved })
      });
      const data = await res.json();
      if (data.success) {
        setRecords(prev => prev.map(r => r.id === id ? { ...r, approved: !currentApproved } : r));
        fetchRecords();
      }
    } catch (e) {
      console.error('Failed to toggle approval', e);
    } finally {
      setToggleLoading(null);
    }
  };

  const filtered = records.filter(r => {
    if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
    if (filterApproved === 'approved' && !r.approved) return false;
    if (filterApproved === 'unapproved' && r.approved) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.topic.toLowerCase().includes(q) ||
      r.question.toLowerCase().includes(q) ||
      r.answer.toLowerCase().includes(q) ||
      r.keywords.some(k => k.toLowerCase().includes(q));
  });

  const categories = Array.from(new Set(records.map(r => r.category)));

  return (
    <div className="space-y-5 animate-in fade-in duration-200" dir="rtl">
      {/* Header & Google Sheets Quick Sync Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              قواعد المعرفة والمستندات الضريبية الرسمية
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مجموع {records.length} سجل معتمد للمصلحة • {stats?.isGoogleSheetsActive ? 'متصل ومزامن مع Google Sheets' : 'قاعدة البيانات التوضيحية'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {config?.spreadsheetId && (
              <button
                onClick={() => exportToSheet(records)}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-2 rounded-xl font-bold transition-colors cursor-pointer"
                title="تحديث جدول Google Sheets بكافة التغييرات"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>حفظ في Google Sheet</span>
              </button>
            )}
            <button
              onClick={fetchRecords}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
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
            <span>جاري تحميل السجلات...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
            لا توجد سجلات تطابق الفلتر الحالي
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

                <button
                  onClick={() => handleToggleApproval(rec.id, rec.approved)}
                  disabled={toggleLoading === rec.id}
                  className={`
                    px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all self-start sm:self-auto border cursor-pointer
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
                  {rec.keywords.map((kw, i) => (
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
    </div>
  );
};
