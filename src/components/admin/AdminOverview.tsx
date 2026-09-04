/**
 * Admin Overview KPI Dashboard Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  HelpCircle, 
  Users, 
  Activity, 
  ArrowUpRight, 
  ShieldCheck, 
  RefreshCw, 
  FileText,
  Award
} from 'lucide-react';
import { AdminOverviewStats } from '../../types.ts';
import { useTheme } from '../../context/ThemeContext.tsx';
import { apiFetch } from '../../lib/api-client.ts';

interface AdminOverviewProps {
  onNavigateTab: (tab: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { isLight, isHighContrast } = useTheme();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data } = await apiFetch<AdminOverviewStats>('/api/admin/overview');
      if (data) setStats(data);
    } catch (err) {
      console.error('Failed to load admin overview stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* Header Banner */}
      <div className={`p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border ${
        isLight
          ? 'bg-slate-900 text-white border-slate-800'
          : isHighContrast
          ? 'bg-black text-white border-2 border-white'
          : 'bg-white/5 text-white border-white/10 backdrop-blur-xl'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className={`text-xs font-medium ${isLight ? 'text-slate-300' : 'text-slate-400'}`}>مصلحة الضرائب العقارية المصرية</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">
            لوحة الإشراف المركزية
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            متابعة حالة المنظومة التشغيلية، إدارة قاعدة المعرفة الضريبية، وحسابات الموظفين وسجلات التدقيق.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchStats}
            disabled={loading}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer border flex items-center gap-2 text-xs font-bold ${
              isLight
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : isHighContrast
                ? 'bg-black text-white border-2 border-white hover:bg-zinc-900'
                : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/10'
            }`}
            title="تحديث المؤشرات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Knowledge Records */}
        <div className={`p-5 rounded-3xl border space-y-2 transition-all ${
          isLight
            ? 'bg-white border-slate-200 shadow-2xs'
            : isHighContrast
            ? 'bg-black border-2 border-white text-white'
            : 'bg-white/5 border-white/10 text-slate-100 backdrop-blur-xl'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>سجلات المعرفة المعتمدة</span>
            <Database className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {loading ? '...' : (stats?.totalRecords ?? 0)}
            </span>
            <span className="text-[11px] text-emerald-500 font-medium">
              ({stats?.approvedRecords ?? (stats?.totalRecords ?? 0)} معتمد)
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('knowledge')}
            className={`text-[11px] flex items-center gap-1 font-semibold pt-2 border-t w-full justify-between cursor-pointer ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 border-slate-100'
                : 'text-slate-400 hover:text-white border-white/10'
            }`}
          >
            <span>استعراض قاعدة المعرفة</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: Questions Today */}
        <div className={`p-5 rounded-3xl border space-y-2 transition-all ${
          isLight
            ? 'bg-white border-slate-200 shadow-2xs'
            : isHighContrast
            ? 'bg-black border-2 border-white text-white'
            : 'bg-white/5 border-white/10 text-slate-100 backdrop-blur-xl'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>استفسارات اليوم</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {loading ? '...' : (stats?.questionsToday ?? 0)}
            </span>
            <span className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              استفسار مسجل
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('audit')}
            className={`text-[11px] flex items-center gap-1 font-semibold pt-2 border-t w-full justify-between cursor-pointer ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 border-slate-100'
                : 'text-slate-400 hover:text-white border-white/10'
            }`}
          >
            <span>عرض سجل العمليات</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Unanswered / Clarifications */}
        <div className={`p-5 rounded-3xl border space-y-2 transition-all ${
          isLight
            ? 'bg-white border-slate-200 shadow-2xs'
            : isHighContrast
            ? 'bg-black border-2 border-white text-white'
            : 'bg-white/5 border-white/10 text-slate-100 backdrop-blur-xl'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>استفسارات معلقة</span>
            <HelpCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-500">
              {loading ? '...' : (stats?.unansweredQuestionsCount ?? 0)}
            </span>
            <span className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              تحتاج مراجعة
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('unanswered')}
            className={`text-[11px] flex items-center gap-1 font-semibold pt-2 border-t w-full justify-between cursor-pointer ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 border-slate-100'
                : 'text-slate-400 hover:text-white border-white/10'
            }`}
          >
            <span>مراجعة وتوثيق الإجابات</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 4: Active Staff Users */}
        <div className={`p-5 rounded-3xl border space-y-2 transition-all ${
          isLight
            ? 'bg-white border-slate-200 shadow-2xs'
            : isHighContrast
            ? 'bg-black border-2 border-white text-white'
            : 'bg-white/5 border-white/10 text-slate-100 backdrop-blur-xl'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>حسابات الموظفين</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {loading ? '...' : (stats?.activeUsersCount ?? 0)}
            </span>
            <span className="text-[11px] text-emerald-500 font-medium">
              موظف مفعل
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('users')}
            className={`text-[11px] flex items-center gap-1 font-semibold pt-2 border-t w-full justify-between cursor-pointer ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 border-slate-100'
                : 'text-slate-400 hover:text-white border-white/10'
            }`}
          >
            <span>إدارة الموظفين</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Action Matrix */}
      <div className={`rounded-3xl border p-5 space-y-4 ${
        isLight
          ? 'bg-white border-slate-200 shadow-2xs'
          : isHighContrast
          ? 'bg-black border-2 border-white text-white'
          : 'bg-white/5 border-white/10 text-slate-100 backdrop-blur-xl'
      }`}>
        <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
          الوصول السريع للأدوات الإدارية
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div 
            onClick={() => onNavigateTab('performance')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-1.5 group ${
              isLight
                ? 'border-emerald-300 hover:border-emerald-600 bg-emerald-50/60 hover:bg-emerald-100/70 shadow-2xs'
                : isHighContrast
                ? 'border-2 border-emerald-400 bg-black hover:bg-zinc-900'
                : 'border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/30 hover:bg-emerald-950/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-bold flex items-center gap-1.5 ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
                <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>تقييم وأداء الموظفين</span>
              </span>
            </div>
            <p className={`text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>رفع تقارير الأداء وتحليل أخطاء ودقة الموظفين بالـ AI.</p>
          </div>

          <div 
            onClick={() => onNavigateTab('knowledge')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-1.5 group ${
              isLight
                ? 'border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50'
                : isHighContrast
                ? 'border-2 border-white bg-black hover:bg-zinc-900'
                : 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                <FileText className="w-4 h-4 text-slate-500" />
                <span>قاعدة المعرفة الضريبية</span>
              </span>
            </div>
            <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>إضافة وتعديل وحذف التعليمات والقوانين الضريبية.</p>
          </div>

          <div 
            onClick={() => onNavigateTab('database')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-1.5 group ${
              isLight
                ? 'border-slate-200 hover:border-slate-800 bg-slate-50 hover:bg-white'
                : isHighContrast
                ? 'border-2 border-white bg-black hover:bg-zinc-900'
                : 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                <Database className="w-4 h-4 text-slate-400" />
                <span>استوديو البيانات (DB Studio)</span>
              </span>
            </div>
            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>فحص وتعديل المجموعات والجداول في الوقت الفعلي.</p>
          </div>

          <div 
            onClick={() => onNavigateTab('audit')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-1.5 ${
              isLight
                ? 'border-slate-200 hover:border-slate-800 bg-slate-50 hover:bg-white'
                : isHighContrast
                ? 'border-2 border-white bg-black hover:bg-zinc-900'
                : 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className={`font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>سجل التدقيق (Audit)</span>
            </div>
            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>مراجعة العمليات الإدارية وتفاعلات النظام.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

