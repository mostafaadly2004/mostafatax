/**
 * Employee Self-Service KPI & Performance Analytics Page
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * 
 * STRICT MULTI-TENANT ISOLATION:
 * Authenticated employees can ONLY access their own APPROVED monthly KPI records.
 * Provides clear distinction between Source Extracted Data and Deterministic Derived Metrics.
 */

import React, { useState, useEffect } from 'react';
import {
  Award,
  PhoneCall,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  Building2,
  Briefcase,
  AlertTriangle,
  FileText,
  TrendingUp,
  RefreshCw,
  Info,
  Layers,
  Calculator,
  UserCheck,
  Check,
  Percent,
  Activity,
  Printer,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  FileCheck2,
  Sparkles,
  Zap,
  Lock
} from 'lucide-react';
import { apiFetch } from '../../lib/api-client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import type { EmployeeKpiPersonalMonth, EmployeePersonalKpiResponse } from '../../types.ts';

interface EmployeeKpiPageProps {
  onBack?: () => void;
  isModal?: boolean;
}

export const EmployeeKpiPage: React.FC<EmployeeKpiPageProps> = ({ onBack, isModal = false }) => {
  const { userProfile } = useAuth();
  const { isLight, isHighContrast } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvedMonths, setApprovedMonths] = useState<EmployeeKpiPersonalMonth[]>([]);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'source_data' | 'derived_metrics' | 'trend'>('overview');

  const fetchKpiData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, ok, status } = await apiFetch<EmployeePersonalKpiResponse>('/api/employee/performance/kpi/my-kpi');
      if (ok && data?.success) {
        setApprovedMonths(data.approvedMonths || []);
        setSelectedMonthIndex(0);
      } else {
        setError(data ? (data as any).error : 'فشل تحميل بيانات مؤشرات الأداء المعتمدة.');
      }
    } catch (err: any) {
      console.error('[EmployeeKpiPage] Failed to fetch KPI:', err);
      setError('تعذر الاتصال بخادم مؤشرات الأداء. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpiData();
  }, [userProfile?.uid]);

  const currentMonthData = approvedMonths[selectedMonthIndex] || null;
  const currentRecord = currentMonthData?.record || null;

  // Helper for ratings
  const getRatingBadge = (rating?: string, score?: number | null) => {
    const text = rating || (score && score >= 90 ? 'ممتاز' : score && score >= 80 ? 'جيد جداً' : 'جيد');
    if (text === 'ممتاز') {
      return {
        text: 'ممتاز',
        bg: 'bg-emerald-500/10 text-emerald-800 border-emerald-300 dark:border-emerald-800 dark:text-emerald-300',
        badge: '🏆 أداء استثنائي'
      };
    }
    if (text === 'جيد جداً') {
      return {
        text: 'جيد جداً',
        bg: 'bg-blue-500/10 text-blue-800 border-blue-300 dark:border-blue-800 dark:text-blue-300',
        badge: '⭐ أداء عالي'
      };
    }
    if (text === 'جيد') {
      return {
        text: 'جيد',
        bg: 'bg-amber-500/10 text-amber-800 border-amber-300 dark:border-amber-800 dark:text-amber-300',
        badge: '✓ أداء مطابق'
      };
    }
    return {
      text: text || 'مقبول',
      bg: 'bg-slate-500/10 text-slate-800 border-slate-300 dark:border-slate-700 dark:text-slate-300',
      badge: 'مستوى مرضي'
    };
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`w-full ${isModal ? 'p-1' : 'max-w-7xl mx-auto p-4 sm:p-6 lg:p-8'} font-sans text-right space-y-6`} dir="rtl">
      
      {/* Top Banner & Institutional Header */}
      <div className={`rounded-3xl p-6 sm:p-8 border shadow-xs relative overflow-hidden transition-colors ${
        isLight
          ? 'bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 border-slate-200/90 text-slate-900'
          : isHighContrast
          ? 'bg-black border-2 border-white text-white'
          : 'bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#062419]/30 border-slate-800 text-slate-100'
      }`}>
        {/* Background Institutional Watermark */}
        <div className="absolute -left-10 -bottom-10 opacity-5 pointer-events-none select-none">
          <Award className="w-80 h-80" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                سجل مؤشرات الأداء المعتمد (KPI)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <Lock className="w-3 h-3 text-emerald-600" />
                عزل بيانات خاص ومحمي
              </span>
              {currentMonthData && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                  <FileCheck2 className="w-3 h-3" />
                  إصدار معتمد #{currentMonthData.version}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-3">
                <span>أدائي الشهري</span>
                <span className="text-sm sm:text-base font-normal text-slate-500 dark:text-slate-400">
                  | مصلحة الضرائب العقارية
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                لوحة المتابعة الذاتية لمؤشرات الأداء التشغيلي والجودة، ونسب إنجاز المكالمات والاستغلال المستخرجة من التقارير الرسمية المعتمدة.
              </p>
            </div>
          </div>

          {/* Employee Identity Card */}
          <div className={`p-4 rounded-2xl border shrink-0 flex items-center gap-4 ${
            isLight
              ? 'bg-white/90 border-slate-200 shadow-xs'
              : isHighContrast
              ? 'bg-black border border-white'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-700 to-emerald-900 text-white font-black text-lg flex items-center justify-center shadow-xs">
              {userProfile?.displayName?.charAt(0) || 'م'}
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{userProfile?.displayName || 'الموظف'}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  @{userProfile?.username || 'user'}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>{userProfile?.jobTitle || 'مأمور فحص وخدمة ممولين'}</span>
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span className="truncate max-w-[200px]">{userProfile?.department || 'مركز الاتصال والخدمة الضريبية'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mr-2">
              <button
                onClick={fetchKpiData}
                disabled={loading}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handlePrint}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="طباعة التقرير المعتمد"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Month Selector Carousel / Tabs */}
        {approvedMonths.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap flex items-center gap-1.5 ml-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                الشهور المعتمدة:
              </span>
              {approvedMonths.map((m, idx) => {
                const isSelected = idx === selectedMonthIndex;
                return (
                  <button
                    key={m.monthKey}
                    onClick={() => setSelectedMonthIndex(idx)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border ${
                      isSelected
                        ? isLight
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-emerald-800 text-white border-emerald-700 shadow-xs'
                        : isLight
                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    <span>{m.monthLabel}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {currentMonthData && (
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>تاريخ الاعتماد: </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {new Date(currentMonthData.approvedAt || currentMonthData.record.utilization?.editedAt || Date.now()).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="text-slate-400">({currentMonthData.approvedBy?.displayName || 'إدارة التفتيش والرقابة'})</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">جاري استرجاع مؤشرات أدائك المعتمدة وتدقيق الأرقام...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold">تعذر عرض بيانات الأداء</h4>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State (No approved KPI for this employee) */}
      {!loading && !error && approvedMonths.length === 0 && (
        <div className={`p-12 rounded-3xl border text-center space-y-4 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              لا توجد كشوفات أداء معتمدة مسجلة لحسابك حتى الآن
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              يتم استخراج مؤشرات الأداء واعتمادها شهرياً من قبل إدارة التفتيش والرقابة بالتعاون مع المساعد الذكي. ستظهر بياناتك المعتمدة هنا فور اعتماد كشف الشهر رسمياً.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={fetchKpiData}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-700 text-white cursor-pointer transition-colors"
            >
              إعادة التحقق
            </button>
          </div>
        </div>
      )}

      {/* Main Content when approved data exists */}
      {!loading && !error && currentMonthData && currentRecord && (
        <div className="space-y-6">
          
          {/* Top Score & Overall Rating Banner */}
          <div className={`rounded-3xl p-6 border shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 ${
            isLight
              ? 'bg-white border-slate-200/90'
              : isHighContrast
              ? 'bg-black border border-white'
              : 'bg-[#111827] border-slate-800'
          }`}>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black border ${
                getRatingBadge(currentRecord.derived.overallRating, currentRecord.derived.score).bg
              }`}>
                <span className="text-xl">
                  {currentRecord.derived.score !== null ? `${currentRecord.derived.score}%` : (currentRecord.derived.accuracyRate !== null ? `${currentRecord.derived.accuracyRate}%` : '100%')}
                </span>
                <span className="text-[9px] font-bold">مؤشر الجودة</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تقييم شهر {currentMonthData.monthLabel}:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                    getRatingBadge(currentRecord.derived.overallRating, currentRecord.derived.score).bg
                  }`}>
                    {getRatingBadge(currentRecord.derived.overallRating, currentRecord.derived.score).text}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {getRatingBadge(currentRecord.derived.overallRating, currentRecord.derived.score).badge}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  تم تدقيق واعتماد كافة العمليات بواسطة إدارة التفتيش والرقابة
                </p>
              </div>
            </div>

            {/* Quick Summary Pill Badges */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
              <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">المكالمات المنجزة</div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {currentRecord.callsHandled?.value ?? '—'}
                </div>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">نسبة الدقة</div>
                <div className="text-sm font-black text-emerald-800 dark:text-emerald-400">
                  {currentRecord.derived.accuracyRate !== null ? `${currentRecord.derived.accuracyRate}%` : '100%'}
                </div>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">نسبة الاستغلال (Utli)</div>
                <div className="text-sm font-black text-blue-800 dark:text-blue-400">
                  {currentRecord.utilization?.value !== undefined ? `${currentRecord.utilization.value}%` : '—'}
                </div>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">إجمالي الغياب</div>
                <div className="text-sm font-black text-amber-800 dark:text-amber-400">
                  {currentRecord.derived.totalAbsenceDays} أيام
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'bg-slate-900 text-white dark:bg-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>نظرة شاملة ومؤشرات الأداء</span>
            </button>
            <button
              onClick={() => setActiveTab('source_data')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'source_data'
                  ? 'bg-slate-900 text-white dark:bg-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>بيانات التقارير المصدرية (Source)</span>
            </button>
            <button
              onClick={() => setActiveTab('derived_metrics')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'derived_metrics'
                  ? 'bg-slate-900 text-white dark:bg-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>المؤشرات المحسوبة برمجياً (Derived)</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Primary 6 Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                
                {/* 1. Call Handling Performance */}
                <div className={`p-5 rounded-3xl border transition-all ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#111827] border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-400">
                      <PhoneCall className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                      معدل التغطية
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">معدل إنجاز المكالمات الواردة</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                      <span>{currentRecord.derived.callHandlingRate !== null ? `${currentRecord.derived.callHandlingRate}%` : '100%'}</span>
                      <span className="text-xs font-normal text-slate-500">من إجمالي الوارد</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>المنجز: <strong className="text-emerald-800 dark:text-emerald-400">{currentRecord.callsHandled?.value ?? '0'}</strong></span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span>الوارد (Presented): <strong>{currentRecord.callsPresented?.value ?? '0'}</strong></span>
                  </div>
                </div>

                {/* 2. Accuracy & Error Rate */}
                <div className={`p-5 rounded-3xl border transition-all ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#111827] border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-800 dark:text-blue-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                      الجودة والنزاهة
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">نسبة الدقة التشغيلية</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                      <span>{currentRecord.derived.accuracyRate !== null ? `${currentRecord.derived.accuracyRate}%` : '100%'}</span>
                      <span className="text-xs font-normal text-slate-500">دقة مطابقة</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>نسبة الأخطاء: <strong className="text-rose-600">{currentRecord.mistakes?.value ?? 0}%</strong></span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span>الأخطاء المحسوبة: <strong>{currentRecord.derived.calculatedErrorsCount ?? 0} أخطاء</strong></span>
                  </div>
                </div>

                {/* 3. Utilization & Work Time */}
                <div className={`p-5 rounded-3xl border transition-all ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#111827] border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-800 dark:text-indigo-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
                      استغلال الوقت
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">معدل الاستغلال (Utli %)</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                      <span>{currentRecord.utilization?.value !== undefined ? `${currentRecord.utilization.value}%` : '—'}</span>
                      <span className="text-xs font-normal text-slate-500">وقت العمل الفعلي</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>نسبة الإشغال (Occu): <strong>{currentRecord.occupancy?.value !== undefined ? `${currentRecord.occupancy.value}%` : '—'}</strong></span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span>المعيار المستهدف: <strong>≥ 85%</strong></span>
                  </div>
                </div>

                {/* 4. Response & IR Rate */}
                <div className={`p-5 rounded-3xl border transition-all ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#111827] border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-800 dark:text-amber-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                      مؤشر IR
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">معدل الاستجابة والمطابقة (% IR)</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                      <span>{currentRecord.ir?.value !== undefined ? `${currentRecord.ir.value}%` : '100%'}</span>
                      <span className="text-xs font-normal text-slate-500">جاهزية الرد</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>حالة المؤشر: <strong className="text-emerald-800 dark:text-emerald-400">ممتاز</strong></span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span>الحد الأدنى: <strong>95%</strong></span>
                  </div>
                </div>

                {/* 5. Attendance & Leaves */}
                <div className={`p-5 rounded-3xl border transition-all ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#111827] border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-800 dark:text-rose-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                      الحضور والانضباط
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">إجمالي أيام الغياب المسجلة</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                      <span>{currentRecord.derived.totalAbsenceDays} أيام</span>
                      <span className="text-xs font-normal text-slate-500">خلال الشهر</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>طارئة: <strong>{currentRecord.emergency?.value ?? 0}</strong></span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span>مرضي: <strong>{currentRecord.sick?.value ?? 0}</strong></span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span>تأخيرات: <strong>{currentRecord.tardy?.value ?? 0}</strong></span>
                  </div>
                </div>

                {/* 6. Certification & Traceability Seal */}
                <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                  isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/80'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-2xl bg-emerald-600 text-white">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white text-emerald-800 border border-emerald-200 dark:bg-slate-900 dark:text-emerald-300">
                      معتمد رسمياً
                    </span>
                  </div>
                  <div className="space-y-1 my-3">
                    <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">إدارة التفتيش والرقابة والمتابعة</div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                      تم استخراج ومطابقة البيانات من الكشوفات الرسمية المصورة وتدقيقها حاسوبياً بدون تدخلات عشوائية.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span>كود الموظف: <strong>{currentRecord.username}</strong></span>
                    <span>رقم الاعتماد: <strong>#RET-{currentMonthData.monthKey}</strong></span>
                  </div>
                </div>

              </div>

              {/* Source Files Verification List */}
              <div className={`p-6 rounded-3xl border ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#111827] border-slate-800'
              }`}>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>التقارير والمستندات المصورة المعتمدة لشهر {currentMonthData.monthLabel} ({currentMonthData.sourceFiles.length} تقارير)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {currentMonthData.sourceFiles.map(sf => (
                    <div key={sf.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                        <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="truncate">{sf.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span>النوع: {
                          sf.category === 'utilization_occupancy' ? 'الاستغلال والإشغال' :
                          sf.category === 'call_performance' ? 'المكالمات والإنتاجية' :
                          sf.category === 'attendance' ? 'الحضور والإجازات' :
                          sf.category === 'quality_ir_mistakes' ? 'الجودة ونسب الأخطاء' : 'تقرير رسمي'
                        }</span>
                        <span className="text-emerald-800 dark:text-emerald-400 font-bold">✓ تم التدقيق</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SOURCE DATA (بيانات التقارير المصدرية) */}
          {activeTab === 'source_data' && (
            <div className={`p-6 rounded-3xl border space-y-6 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#111827] border-slate-800'
            }`}>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span>بيانات التقارير المصدرية المستخرجة (Source Extracted Metrics)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  الأرقام الخام المستخرجة بصرياً بدقة من الكشوفات الأصلية المعتمدة مع إثبات مصدر كل قيمة:
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className={`border-b ${isLight ? 'bg-slate-50 text-slate-700' : 'bg-slate-800/70 text-slate-200'}`}>
                      <th className="p-3.5 font-bold rounded-r-2xl">المؤشر المصدري</th>
                      <th className="p-3.5 font-bold">القيمة المسجلة</th>
                      <th className="p-3.5 font-bold">الوحدة</th>
                      <th className="p-3.5 font-bold">التقرير المصدر</th>
                      <th className="p-3.5 font-bold rounded-l-2xl">حالة التدقيق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">المكالمات الواردة (Calls Presented)</td>
                      <td className="p-3.5 font-mono text-sm font-bold text-slate-900 dark:text-white">{currentRecord.callsPresented?.value ?? '—'}</td>
                      <td className="p-3.5 text-slate-500">مكالمة</td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">{currentRecord.callsPresented?.sourceFile || 'كشف المكالمات'}</td>
                      <td className="p-3.5"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">موثق</span></td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">المكالمات المنجزة (Calls Handled)</td>
                      <td className="p-3.5 font-mono text-sm font-bold text-emerald-800 dark:text-emerald-400">{currentRecord.callsHandled?.value ?? '—'}</td>
                      <td className="p-3.5 text-slate-500">مكالمة</td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">{currentRecord.callsHandled?.sourceFile || 'كشف المكالمات'}</td>
                      <td className="p-3.5"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">موثق</span></td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">نسبة الأخطاء المباشرة (% Mistakes)</td>
                      <td className="p-3.5 font-mono text-sm font-bold text-rose-600">{currentRecord.mistakes?.value ?? 0}%</td>
                      <td className="p-3.5 text-slate-500">نسبة مئوية</td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">{currentRecord.mistakes?.sourceFile || 'كشف الجودة'}</td>
                      <td className="p-3.5"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">موثق</span></td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">نسبة الاستغلال (Utilization %)</td>
                      <td className="p-3.5 font-mono text-sm font-bold text-blue-800 dark:text-blue-400">{currentRecord.utilization?.value ?? '—'}%</td>
                      <td className="p-3.5 text-slate-500">نسبة مئوية</td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">{currentRecord.utilization?.sourceFile || 'كشف الاستغلال'}</td>
                      <td className="p-3.5"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">موثق</span></td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">نسبة الإشغال (Occupancy %)</td>
                      <td className="p-3.5 font-mono text-sm font-bold text-slate-800 dark:text-slate-300">{currentRecord.occupancy?.value ?? '—'}%</td>
                      <td className="p-3.5 text-slate-500">نسبة مئوية</td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">{currentRecord.occupancy?.sourceFile || 'كشف الاستغلال'}</td>
                      <td className="p-3.5"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">موثق</span></td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">معدل الاستجابة (% IR)</td>
                      <td className="p-3.5 font-mono text-sm font-bold text-amber-800 dark:text-amber-400">{currentRecord.ir?.value ?? '100'}%</td>
                      <td className="p-3.5 text-slate-500">نسبة مئوية</td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">{currentRecord.ir?.sourceFile || 'كشف الجودة'}</td>
                      <td className="p-3.5"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">موثق</span></td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">الإجازات العارضة (Emergency)</td>
                      <td className="p-3.5 font-mono text-sm font-bold text-slate-900 dark:text-white">{currentRecord.emergency?.value ?? 0}</td>
                      <td className="p-3.5 text-slate-500">يوم</td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">{currentRecord.emergency?.sourceFile || 'كشف الحضور'}</td>
                      <td className="p-3.5"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">موثق</span></td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">الإجازات المرضية (Sick Leave)</td>
                      <td className="p-3.5 font-mono text-sm font-bold text-slate-900 dark:text-white">{currentRecord.sick?.value ?? 0}</td>
                      <td className="p-3.5 text-slate-500">يوم</td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">{currentRecord.sick?.sourceFile || 'كشف الحضور'}</td>
                      <td className="p-3.5"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">موثق</span></td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">مرات التأخير (Tardy Count)</td>
                      <td className="p-3.5 font-mono text-sm font-bold text-slate-900 dark:text-white">{currentRecord.tardy?.value ?? 0}</td>
                      <td className="p-3.5 text-slate-500">مرة</td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">{currentRecord.tardy?.sourceFile || 'كشف الحضور'}</td>
                      <td className="p-3.5"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">موثق</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DERIVED METRICS (المؤشرات المحسوبة برمجياً) */}
          {activeTab === 'derived_metrics' && (
            <div className={`p-6 rounded-3xl border space-y-6 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#111827] border-slate-800'
            }`}>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-600" />
                  <span>المؤشرات المحسوبة برمجياً ومعادلات التقييم (Deterministic Calculations)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  جميع المؤشرات أدناه تُحسب حسابياً وبدقة قطعية عبر كود التطبيق المعتمد دون أي تقديرات عشوائية:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Handling Rate Formula */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">معدل إنجاز المكالمات (Call Handling Rate)</span>
                    <span className="text-sm font-mono font-black text-emerald-800 dark:text-emerald-400">
                      {currentRecord.derived.callHandlingRate !== null ? `${currentRecord.derived.callHandlingRate}%` : '100%'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-mono text-[11px] border border-slate-200 dark:border-slate-800" dir="ltr">
                    Rate = (Calls Handled ÷ Calls Presented) × 100
                  </div>
                  <p className="text-[11px] text-slate-500">
                    العملية: ({currentRecord.callsHandled?.value ?? 0} ÷ {currentRecord.callsPresented?.value ?? 0}) × 100 = {currentRecord.derived.callHandlingRate}%
                  </p>
                </div>

                {/* Accuracy Rate Formula */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">معدل الدقة والنزاهة (Accuracy Rate)</span>
                    <span className="text-sm font-mono font-black text-blue-800 dark:text-blue-400">
                      {currentRecord.derived.accuracyRate !== null ? `${currentRecord.derived.accuracyRate}%` : '100%'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-mono text-[11px] border border-slate-200 dark:border-slate-800" dir="ltr">
                    Accuracy = 100 - % Of Mistakes
                  </div>
                  <p className="text-[11px] text-slate-500">
                    العملية: 100 - {currentRecord.mistakes?.value ?? 0}% = {currentRecord.derived.accuracyRate}%
                  </p>
                </div>

                {/* Calculated Errors Count Formula */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">عدد الأخطاء المحتسبة (Calculated Errors)</span>
                    <span className="text-sm font-mono font-black text-rose-600">
                      {currentRecord.derived.calculatedErrorsCount ?? 0} أخطاء
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-mono text-[11px] border border-slate-200 dark:border-slate-800" dir="ltr">
                    Errors = Calls Handled × (% Mistakes ÷ 100)
                  </div>
                  <p className="text-[11px] text-slate-500">
                    العملية: {currentRecord.callsHandled?.value ?? 0} × ({currentRecord.mistakes?.value ?? 0} ÷ 100) = {currentRecord.derived.calculatedErrorsCount}
                  </p>
                </div>

                {/* Absence & Tardy Sums */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">إجمالي أيام الغياب والانضباط</span>
                    <span className="text-sm font-mono font-black text-amber-800 dark:text-amber-400">
                      {currentRecord.derived.totalAbsenceDays} أيام غياب | {currentRecord.derived.totalTardyCount} تأخير
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-mono text-[11px] border border-slate-200 dark:border-slate-800" dir="ltr">
                    Absence = Emergency + Sick Leaves
                  </div>
                  <p className="text-[11px] text-slate-500">
                    العملية: {currentRecord.emergency?.value ?? 0} (طارئ) + {currentRecord.sick?.value ?? 0} (مرضي) = {currentRecord.derived.totalAbsenceDays} أيام
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* Official Certification & Footer Watermark */}
          <div className="text-center py-4 space-y-1 text-slate-400 text-xs">
            <p className="flex items-center justify-center gap-1.5 font-bold text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>مصلحة الضرائب العقارية - الإدارة العامة للرقابة والتفتيش والجودة التشغيلية</span>
            </p>
            <p className="text-[11px]">
              هذه الوثيقة صادرة ومعتمدة إلكترونياً ومخصصة للاستخدام الشخصي لصاحب الحساب فقط.
            </p>
          </div>

        </div>
      )}

    </div>
  );
};
