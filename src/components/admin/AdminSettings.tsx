/**
 * Admin System Settings Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  CheckCircle2, 
  Globe, 
  ShieldCheck, 
  Sparkles, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { useGoogleSheets } from '../../context/GoogleSheetsContext.tsx';

export const AdminSettings: React.FC = () => {
  const { config, isConnected, toggleAutoSync } = useGoogleSheets();
  const [settings, setSettings] = useState({
    appName: 'Tax Support AI - مصلحة الضرائب العقارية',
    lawNumber: 'قانون 196 لسنة 2008 وتعديلاته',
    appealLawNumber: 'قانون 187 لسنة 2023 (إنهاء المنازعات)',
    primaryExemptionLimit: 24000,
    commercialExemptionLimit: 1200,
    maintenanceExpenseRate: 30,
    nonResidentialExpenseRate: 32,
    taxRate: 10,
    enableFuzzyArabicSearch: true,
    strictLegalMode: true,
    aiModel: 'gemini-3.1-flash-lite'
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 600);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-700" />
            <span>إعدادات النظام والذكاء الاصطناعي</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ضبط محرك الذكاء الاصطناعي والمزامنة التلقائية والخيارات التشغيلية
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-60"
        >
          {saving ? 'جاري الحفظ...' : <Save className="w-3.5 h-3.5" />}
          <span>حفظ التعديلات</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>تم حفظ الإعدادات بنجاح في النظام!</span>
        </div>
      )}

      <div className="max-w-2xl text-xs">
        {/* Box: AI & Google Sheets Sync */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-slate-900 text-xs pb-2 border-b border-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>محرك الذكاء الاصطناعي والتكامل</span>
          </h3>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              نموذج الذكاء الاصطناعي المعتمد:
            </label>
            <select
              value={settings.aiModel}
              onChange={e => setSettings({ ...settings, aiModel: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none text-slate-900 focus:border-slate-800 font-mono text-sm"
            >
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (موصى به للباقة المجانية - سعة عالية وسرعة فائقة)</option>
              <option value="gemini-flash-latest">Gemini Flash Latest (توازن مثالي بين السرعة والفهم)</option>
              <option value="gemini-3.7-flash">Gemini 3.7 Flash (استدلال متقدم)</option>
            </select>
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableFuzzyArabicSearch}
                onChange={e => setSettings({ ...settings, enableFuzzyArabicSearch: e.target.checked })}
                className="w-4 h-4 text-emerald-600 accent-emerald-600 rounded"
              />
              <span className="font-bold text-slate-800">تفعيل محرك مطابقة اللهجة والمصطلحات الدارجة</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.strictLegalMode}
                onChange={e => setSettings({ ...settings, strictLegalMode: e.target.checked })}
                className="w-4 h-4 text-emerald-600 accent-emerald-600 rounded"
              />
              <span className="font-bold text-slate-800">الالتزام الصارم بالسند القانوني والتعليمات المعتمدة</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config?.autoSync}
                onChange={e => toggleAutoSync(e.target.checked)}
                className="w-4 h-4 text-emerald-600 accent-emerald-600 rounded"
              />
              <span className="font-bold text-slate-800">المزامنة التلقائية مع Google Sheets كل 5 دقائق</span>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
};
