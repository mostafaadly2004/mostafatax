/**
 * Admin Unanswered Questions & Knowledge Gaps Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 */

import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Plus, 
  FileSpreadsheet, 
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { UnansweredQuestion } from '../../types.ts';
import { useGoogleSheets } from '../../context/GoogleSheetsContext.tsx';
import { apiFetch } from '../../lib/api-client.ts';

export const AdminUnanswered: React.FC = () => {
  const [questions, setQuestions] = useState<UnansweredQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [answeringQ, setAnsweringQ] = useState<UnansweredQuestion | null>(null);
  const [answerInput, setAnswerInput] = useState('');
  const [sourceInput, setSourceInput] = useState('تعليمات تنفيذية - مصلحة الضرائب العقارية');
  const [categoryInput, setCategoryInput] = useState('إجراءات عامة');
  const [topicInput, setTopicInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { config, isConnected } = useGoogleSheets();

  const fetchUnanswered = async () => {
    setLoading(true);
    try {
      const { data } = await apiFetch<{ questions: UnansweredQuestion[] }>('/api/admin/unanswered');
      if (data?.questions) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.error('Failed to load unanswered questions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnanswered();
  }, []);

  const handleResolveAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answeringQ || !answerInput.trim()) return;
    setSubmitting(true);
    try {
      const { data, ok } = await apiFetch('/api/admin/unanswered/resolve', {
        method: 'POST',
        body: JSON.stringify({
          id: answeringQ.id,
          questionId: answeringQ.id,
          query: answeringQ.query || answeringQ.question,
          topic: topicInput || (answeringQ.query || answeringQ.question || '').slice(0, 40),
          category: categoryInput,
          resolutionText: answerInput,
          source: sourceInput,
          addToKnowledgeBase: true,
          newRecord: {
            topic: topicInput || (answeringQ.query || answeringQ.question || '').slice(0, 40),
            content: answerInput,
            lawNumber: 'قانون 196 لسنة 2008',
            articleNumber: 'تعليمات تنفيذية معتمدة',
            keywords: [(answeringQ.query || answeringQ.question || '').slice(0, 20)],
            source: sourceInput
          }
        })
      });
      if (ok && data?.success) {
        setAnsweringQ(null);
        setAnswerInput('');
        fetchUnanswered();
      }
    } catch (err) {
      console.error('Failed to resolve question', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = questions.filter(q => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      q.question.toLowerCase().includes(query) ||
      q.askedBy?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200" dir="rtl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>استفسارات غير مجابة وتطوير قاعدة المعرفة</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            الأسئلة التي لم يجد لها المساعد الذكي إجابة واضحة لتضمينها في القواعد المعتمدة
          </p>
        </div>

        <button
          onClick={fetchUnanswered}
          disabled={loading}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
          title="تحديث"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Answer Modal */}
      {answeringQ && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleResolveAndAdd}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 text-xs space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                اعتماد إجابة رسمية وإضافتها لقاعدة المعرفة
              </h3>
              <button type="button" onClick={() => setAnsweringQ(null)} className="text-slate-400 hover:text-slate-600">
                ×
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold block">سؤال الموظف:</span>
              <p className="font-semibold text-slate-800">{answeringQ.question}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الموضوع الرئيسي *</label>
                <input
                  type="text"
                  required
                  value={topicInput}
                  onChange={e => setTopicInput(e.target.value)}
                  placeholder="مثال: إجراءات تقسيط الضريبة"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">التصنيف *</label>
                <input
                  type="text"
                  required
                  value={categoryInput}
                  onChange={e => setCategoryInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">الإجابة المعتمدة والمستندات المطلوبة *</label>
              <textarea
                rows={4}
                required
                value={answerInput}
                onChange={e => setAnswerInput(e.target.value)}
                placeholder="اكتب الإجابة الرسمية المفصلة..."
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:border-slate-800 leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">السند القانوني / التعليمات *</label>
              <input
                type="text"
                required
                value={sourceInput}
                onChange={e => setSourceInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAnsweringQ(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer font-semibold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'جاري الاعتماد...' : 'اعتماد وحفظ بالقاعدة'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">جاري التحميل...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            لا توجد استفسارات معلقة حالياً
          </div>
        ) : (
          filtered.map(q => (
            <div
              key={q.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{q.question}</span>
                  <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                    معلق
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  سُئل بواسطة: {q.askedBy || 'موظف ضرائب'} • {new Date(q.timestamp).toLocaleDateString('ar-EG')}
                </p>
              </div>

              <button
                onClick={() => {
                  setAnsweringQ(q);
                  setTopicInput(q.question.slice(0, 35));
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>توثيق الإجابة المعتمدة</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
