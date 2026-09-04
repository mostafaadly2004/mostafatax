import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  Upload,
  BarChart3,
  Search,
  Filter,
  Download,
  Eye,
  Edit3,
  Calendar,
  Layers,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Users,
  Activity,
  PhoneCall,
  Clock,
  History,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import type { MonthlyKpiDataset, EmployeeKpiRecord, UserProfile } from '../../../types.ts';
import { KpiEmployeeDetailModal } from './KpiEmployeeDetailModal.tsx';
import { KpiEditCellModal } from './KpiEditCellModal.tsx';
import { KpiComparisonModal } from './KpiComparisonModal.tsx';
import { apiFetch } from '../../../lib/api-client.ts';

interface Props {
  dataset: MonthlyKpiDataset | null;
  allDatasets: MonthlyKpiDataset[];
  selectedMonth: number;
  selectedYear: number;
  onMonthYearChange: (month: number, year: number) => void;
  onOpenUploader: () => void;
  onOpenReview: () => void;
  onDatasetUpdated: (updatedDataset: MonthlyKpiDataset) => void;
  users: UserProfile[];
}

const MONTHS = [
  { value: 1, name: 'يناير' },
  { value: 2, name: 'فبراير' },
  { value: 3, name: 'مارس' },
  { value: 4, name: 'أبريل' },
  { value: 5, name: 'مايو' },
  { value: 6, name: 'يونيو' },
  { value: 7, name: 'يوليو' },
  { value: 8, name: 'أغسطس' },
  { value: 9, name: 'سبتمبر' },
  { value: 10, name: 'أكتوبر' },
  { value: 11, name: 'نوفمبر' },
  { value: 12, name: 'ديسمبر' }
];

const YEARS = [2025, 2026, 2027];

export const KpiOverviewAnalytics: React.FC<Props> = ({
  dataset,
  allDatasets,
  selectedMonth,
  selectedYear,
  onMonthYearChange,
  onOpenUploader,
  onOpenReview,
  onDatasetUpdated,
  users
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'anomalies' | 'missing'>('all');
  const [detailEmployee, setDetailEmployee] = useState<EmployeeKpiRecord | null>(null);
  const [editingCell, setEditingCell] = useState<{
    employee: EmployeeKpiRecord;
    field: any;
    currentValue: number;
  } | null>(null);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const employeeList = dataset ? Object.values(dataset.employees) : [];

  // Deterministic Analytics Calculation (Application Logic Only)
  const totalEmployees = employeeList.length;

  const validUtilization = employeeList.map(e => e.utilization?.value).filter((v): v is number => v !== undefined && v !== null);
  const avgUtilization = validUtilization.length > 0 ? Number((validUtilization.reduce((a, b) => a + b, 0) / validUtilization.length).toFixed(1)) : 0;

  const validOccupancy = employeeList.map(e => e.occupancy?.value).filter((v): v is number => v !== undefined && v !== null);
  const avgOccupancy = validOccupancy.length > 0 ? Number((validOccupancy.reduce((a, b) => a + b, 0) / validOccupancy.length).toFixed(1)) : 0;

  const totalPresentedCalls = employeeList.reduce((sum, e) => sum + (e.callsPresented?.value || 0), 0);
  const totalHandledCalls = employeeList.reduce((sum, e) => sum + (e.callsHandled?.value || 0), 0);
  const overallHandlingRate = totalPresentedCalls > 0 ? Number(((totalHandledCalls / totalPresentedCalls) * 100).toFixed(1)) : 0;

  const validMistakes = employeeList.map(e => e.mistakes?.value).filter((v): v is number => v !== undefined && v !== null);
  const avgMistakeRate = validMistakes.length > 0 ? Number((validMistakes.reduce((a, b) => a + b, 0) / validMistakes.length).toFixed(1)) : 0;
  const overallAccuracyRate = Number(Math.max(0, 100 - avgMistakeRate).toFixed(1));

  const totalEmergencyDays = employeeList.reduce((sum, e) => sum + (e.emergency?.value || 0), 0);
  const totalSickDays = employeeList.reduce((sum, e) => sum + (e.sick?.value || 0), 0);
  const totalTardyOccurrences = employeeList.reduce((sum, e) => sum + (e.tardy?.value || 0), 0);

  const filteredEmployees = employeeList.filter(emp => {
    const matchesSearch =
      emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.username.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'anomalies') {
      return emp.validationFlags.includes('DATA_ANOMALY');
    }
    if (statusFilter === 'missing') {
      return emp.validationFlags.some(f => f.startsWith('MISSING_'));
    }

    return true;
  });

  const handleSaveCell = async (field: string, newValue: number, reason: string) => {
    if (!editingCell || !dataset) return;
    const res = await apiFetch<{ success: boolean; dataset: MonthlyKpiDataset }>('/api/admin/performance/kpi/edit-cell', {
      method: 'POST',
      body: JSON.stringify({
        monthKey: dataset.monthKey,
        username: editingCell.employee.username,
        field,
        newValue,
        reason
      })
    });

    if (res.ok && res.data?.dataset) {
      onDatasetUpdated(res.data.dataset);
      setActionNotice(`تم تعديل قيمة "${field}" للموظف ${editingCell.employee.username} بنجاح.`);
      setTimeout(() => setActionNotice(null), 3000);
    } else {
      throw new Error(res.error || 'فشل حفظ التعديل');
    }
  };

  const handleReopenDataset = async () => {
    if (!dataset) return;
    if (!window.confirm('هل أنت متأكد من إعادة فتح هذا الكشف للمراجعة والتعديل؟ سيتم ترقية رقم الإصدار.')) {
      return;
    }

    setIsReopening(true);
    try {
      const res = await apiFetch<{ success: boolean; dataset: MonthlyKpiDataset }>('/api/admin/performance/kpi/reopen', {
        method: 'POST',
        body: JSON.stringify({
          monthKey: dataset.monthKey,
          reason: 'إعادة فتح للمراجعة من قبل المشرف'
        })
      });

      if (res.ok && res.data?.dataset) {
        onDatasetUpdated(res.data.dataset);
        onOpenReview();
      } else {
        throw new Error(res.error || 'فشل إعادة فتح التقرير');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ.');
    } finally {
      setIsReopening(false);
    }
  };

  const handleExportCsv = () => {
    if (!dataset) return;
    const headers = [
      'المعرف',
      'اسم الموظف',
      'المكالمات الواردة',
      'المكالمات المنجزة',
      'معدل إنجاز المكالمات (%)',
      'نسبة الاستغلال (%)',
      'نسبة الإشغال (%)',
      'معدل الاستجابة IR (%)',
      'نسبة الأخطاء (%)',
      'نسبة الدقة (%)',
      'إجازات طارئة',
      'إجازات مرضي',
      'تأخيرات',
      'حالة التدقيق'
    ];

    const rows = employeeList.map(emp => [
      emp.username,
      `"${emp.employeeName}"`,
      emp.callsPresented?.value ?? '',
      emp.callsHandled?.value ?? '',
      emp.derived.callHandlingRate !== null ? `${emp.derived.callHandlingRate}%` : '',
      emp.utilization?.value ? `${emp.utilization.value}%` : '',
      emp.occupancy?.value ? `${emp.occupancy.value}%` : '',
      emp.ir?.value ? `${emp.ir.value}%` : '',
      emp.mistakes?.value !== undefined ? `${emp.mistakes.value}%` : '',
      emp.derived.accuracyRate !== null ? `${emp.derived.accuracyRate}%` : '',
      emp.emergency?.value || 0,
      emp.sick?.value || 0,
      emp.tardy?.value || 0,
      emp.validationFlags.join(' | ') || 'سليم'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `كشف_مؤشرات_أداء_${dataset.monthLabel.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Top Header & Period Selector */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        
        {/* Left: Title & Status */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
              لوحة مؤشرات وتقييم أداء الموظفين (KPI Analytics)
            </h2>
            
            {dataset ? (
              dataset.status === 'approved' ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  معتمد
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  بانتظار المراجعة
                </span>
              )
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                لا توجد بيانات مسجلة
              </span>
            )}
          </div>
        </div>

        {/* Right: Controls & Period Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Month & Year Dropdowns */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500 mr-1" />
            <select
              value={selectedMonth}
              onChange={(e) => onMonthYearChange(parseInt(e.target.value, 10), selectedYear)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer py-1"
            >
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => onMonthYearChange(selectedMonth, parseInt(e.target.value, 10))}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer py-1"
            >
              {YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Upload New Reports Button */}
          <button
            onClick={onOpenUploader}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>استيراد كشوفات جديدة</span>
          </button>

          {/* Comparison Tool Button */}
          {dataset && (
            <button
              onClick={() => setShowComparisonModal(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>مقارنة الموظفين</span>
            </button>
          )}

          {/* Export Button */}
          {dataset && (
            <button
              onClick={handleExportCsv}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
              title="تصدير كملف CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* History Button */}
          {dataset && dataset.history.length > 0 && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
              title="سجل التعديلات والاعتماد"
            >
              <History className="w-4 h-4" />
            </button>
          )}

          {/* Reopen Button if approved */}
          {dataset && dataset.status === 'approved' && (
            <button
              onClick={handleReopenDataset}
              disabled={isReopening}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
              title="إعادة فتح الكشف للتعديل"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة فتح</span>
            </button>
          )}

          {/* Go to Review Button if needs review */}
          {dataset && dataset.status === 'needs_review' && (
            <button
              onClick={onOpenReview}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>شاشة المراجعة والاعتماد</span>
            </button>
          )}
        </div>

      </div>

      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs p-3.5 rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Dataset Presentation Condition */}
      {!dataset ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              لا توجد بيانات KPI معتمدة لشهر {MONTHS.find(m => m.value === selectedMonth)?.name} {selectedYear}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              يمكنك رفع صور وتقارير الأداء الشهرية لهذا الشهر ليقوم النظام باستخراجها ومطابقتها وحساب المؤشرات برمجياً.
            </p>
          </div>
          <button
            onClick={onOpenUploader}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>استيراد كشوفات هذا الشهر الآن</span>
          </button>
        </div>
      ) : (
        <>
          {/* Metric Summary Cards (Deterministic Application Calculations) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            
            {/* Total Employees */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">إجمالي الموظفين</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalEmployees}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">موظف بالكشف المعتمد</div>
            </div>

            {/* Total Handled Calls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">المكالمات المنجزة</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">{totalHandledCalls}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">من أصل {totalPresentedCalls} واردة</div>
            </div>

            {/* Overall Handling Rate */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-blue-800">معدل الإنجاز العام</div>
              <div className="text-2xl font-black text-blue-900 mt-1">{overallHandlingRate}%</div>
              <div className="text-[10px] text-blue-600 mt-0.5">(المنجز / الوارد) × 100</div>
            </div>

            {/* Avg Utilization */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">متوسط الاستغلال (Utli)</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{avgUtilization}%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">استغلال ساعات العمل</div>
            </div>

            {/* Avg Occupancy */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">متوسط الإشغال (Occu)</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{avgOccupancy}%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">نسبة الانشغال بالخدمة</div>
            </div>

            {/* Avg Mistakes */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-rose-700">متوسط نسبة الأخطاء</div>
              <div className="text-2xl font-black text-rose-600 mt-1">{avgMistakeRate}%</div>
              <div className="text-[10px] text-emerald-700 mt-0.5">نسبة دقة عامة: {overallAccuracyRate}%</div>
            </div>

            {/* Attendance Days */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">الغياب والتأخير</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{totalEmergencyDays + totalSickDays} <span className="text-xs font-normal text-slate-500">يوم</span></div>
              <div className="text-[10px] text-slate-400 mt-0.5">{totalEmergencyDays} طارئة • {totalSickDays} مرضي</div>
            </div>

          </div>

          {/* Main Employee KPI Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* Table Search & Filter Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث باسم الموظف أو المعرف (Ext-...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  الكل ({employeeList.length})
                </button>
                <button
                  onClick={() => setStatusFilter('anomalies')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === 'anomalies'
                      ? 'bg-rose-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  شذوذ أرقام ({employeeList.filter(e => e.validationFlags.includes('DATA_ANOMALY')).length})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">الموظف</th>
                    <th className="py-3 px-3">المعرف (Username)</th>
                    <th className="py-3 px-3 text-center">الوارد</th>
                    <th className="py-3 px-3 text-center">المنجز</th>
                    <th className="py-3 px-3 text-center bg-blue-50/50 text-blue-900">معدل الإنجاز</th>
                    <th className="py-3 px-3 text-center">الاستغلال (Utli)</th>
                    <th className="py-3 px-3 text-center">الإشغال (Occu)</th>
                    <th className="py-3 px-3 text-center">% IR</th>
                    <th className="py-3 px-3 text-center text-rose-700">% أخطاء</th>
                    <th className="py-3 px-3 text-center bg-emerald-50/50 text-emerald-900">الدقة</th>
                    <th className="py-3 px-3 text-center">الغياب (ط/م)</th>
                    <th className="py-3 px-3 text-center">حالة التدقيق</th>
                    <th className="py-3 px-3 text-center">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {filteredEmployees.map((emp, index) => {
                    const isAnomaly = emp.validationFlags.includes('DATA_ANOMALY');

                    return (
                      <tr
                        key={emp.username}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isAnomaly ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-400">{index + 1}</td>

                        {/* Name */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{emp.employeeName}</div>
                          <div className="text-[10px] text-slate-500">{emp.jobTitle}</div>
                        </td>

                        {/* Username */}
                        <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                          {emp.username}
                        </td>

                        {/* Presented Calls */}
                        <td className="py-2.5 px-3 text-center font-semibold font-mono">
                          {emp.callsPresented?.value ?? '-'}
                        </td>

                        {/* Handled Calls */}
                        <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-900">
                          {emp.callsHandled?.value ?? '-'}
                        </td>

                        {/* Derived Handling Rate */}
                        <td className="py-2.5 px-3 text-center font-bold font-mono bg-blue-50/30 text-blue-900">
                          {emp.derived.callHandlingRate !== null ? `${emp.derived.callHandlingRate}%` : 'N/A'}
                        </td>

                        {/* Utilization */}
                        <td className="py-2.5 px-3 text-center font-mono">
                          {emp.utilization ? `${emp.utilization.value}%` : '-'}
                        </td>

                        {/* Occupancy */}
                        <td className="py-2.5 px-3 text-center font-mono">
                          {emp.occupancy ? `${emp.occupancy.value}%` : '-'}
                        </td>

                        {/* IR */}
                        <td className="py-2.5 px-3 text-center font-mono">
                          {emp.ir ? `${emp.ir.value}%` : '100%'}
                        </td>

                        {/* % Mistakes */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600">
                          {emp.mistakes ? `${emp.mistakes.value}%` : '0%'}
                        </td>

                        {/* Accuracy */}
                        <td className="py-2.5 px-3 text-center font-bold font-mono bg-emerald-50/30 text-emerald-900">
                          {emp.derived.accuracyRate !== null ? `${emp.derived.accuracyRate}%` : '100%'}
                        </td>

                        {/* Attendance */}
                        <td className="py-2.5 px-3 text-center text-[11px] text-slate-600">
                          {emp.emergency?.value || 0} ط / {emp.sick?.value || 0} م
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 text-center">
                          {isAnomaly ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              شذوذ أرقام ⚠️
                            </span>
                          ) : emp.validationFlags.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-100 text-blue-800">
                              ملاحظات ({emp.validationFlags.length})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-100 text-emerald-800">
                              سليم ✓
                            </span>
                          )}
                        </td>

                        {/* Detail View Action */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => setDetailEmployee(emp)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                            title="عرض الملف الكامل للموظف"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        </>
      )}

      {/* Comparison Modal */}
      {showComparisonModal && dataset && (
        <KpiComparisonModal
          dataset={dataset}
          allDatasets={allDatasets}
          onClose={() => setShowComparisonModal(false)}
        />
      )}

      {/* History Modal */}
      {showHistoryModal && dataset && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">سجل الاعتمادات والتعديلات لكشف شهر {dataset.monthLabel}</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {dataset.history.map((h, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      الإصدار {h.version} • {h.action === 'approved' ? 'اعتماد رسمي' : h.action === 'edited' ? 'تعديل قيمة' : h.action === 'reopened' ? 'إعادة فتح' : 'استيراد أولي'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {new Date(h.timestamp).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <div className="text-slate-600 pr-3.5">{h.details}</div>
                  <div className="text-[10px] text-slate-400 pr-3.5">بواسطة: {h.actorName}</div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-100 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailEmployee && dataset && (
        <KpiEmployeeDetailModal
          employee={detailEmployee}
          dataset={dataset}
          onClose={() => setDetailEmployee(null)}
          onEditMetric={(field, val) => {
            setDetailEmployee(null);
            setEditingCell({ employee: detailEmployee, field: field as any, currentValue: val });
          }}
        />
      )}

      {/* Edit Cell Modal */}
      {editingCell && dataset && (
        <KpiEditCellModal
          monthKey={dataset.monthKey}
          employee={editingCell.employee}
          field={editingCell.field}
          currentValue={editingCell.currentValue}
          onClose={() => setEditingCell(null)}
          onSave={handleSaveCell}
        />
      )}

    </div>
  );
};
