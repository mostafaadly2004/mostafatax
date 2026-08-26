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
    aiModel: 'gemini-2.5-flash'
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
            <span>إعدادات النظام والنسب القانونية</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ضبط نسب مصاريف الصيانة وحدود الإعفاء المعتمدة ونموذج الذكاء الاصطناعي
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {/* Box 1: Legal Thresholds */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-slate-900 text-xs pb-2 border-b border-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>المعايير والنسب القانونية (قانون 196)</span>
          </h3>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              حد إعفاء السكن الخاص السنوي (صافي القيمة الإيجارية - جنيه):
            </label>
            <input
              type="number"
              value={settings.primaryExemptionLimit}
              onChange={e => setSettings({ ...settings, primaryExemptionLimit: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none text-slate-900 focus:border-slate-800 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                مصاريف صيانة السكني (%):
              </label>
              <input
                type="number"
                value={settings.maintenanceExpenseRate}
                onChange={e => setSettings({ ...settings, maintenanceExpenseRate: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none text-slate-900 focus:border-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                مصاريف غير السكني (%):
              </label>
              <input
                type="number"
                value={settings.nonResidentialExpenseRate}
                onChange={e => setSettings({ ...settings, nonResidentialExpenseRate: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none text-slate-900 focus:border-slate-800 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              سعر الضريبة الموحد (%):
            </label>
            <input
              type="number"
              value={settings.taxRate}
              onChange={e => setSettings({ ...settings, taxRate: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none text-slate-900 focus:border-slate-800 font-mono"
            />
          </div>
        </div>

        {/* Box 2: AI & Google Sheets Sync */}
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none text-slate-900 focus:border-slate-800 font-mono"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (موصى به - فائق السرعة والدقة)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (تحليلات معمقة)</option>
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
