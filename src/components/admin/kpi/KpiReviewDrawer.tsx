import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Edit3,
  UserCheck,
  ShieldCheck,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  Settings,
  Sparkles,
  Download,
  Filter,
  Search,
  Trash2,
  X
} from 'lucide-react';
import type { MonthlyKpiDataset, EmployeeKpiRecord, UserProfile } from '../../../types.ts';
import { KpiEditCellModal } from './KpiEditCellModal.tsx';
import { KpiMapUserModal } from './KpiMapUserModal.tsx';
import { KpiEmployeeDetailModal } from './KpiEmployeeDetailModal.tsx';
import { apiFetch } from '../../../lib/api-client.ts';

interface Props {
  dataset: MonthlyKpiDataset;
  users: UserProfile[];
  onDatasetUpdated: (updatedDataset: MonthlyKpiDataset) => void;
  onBackToOverview: () => void;
  onDatasetDiscarded?: () => void;
}

export const KpiReviewDrawer: React.FC<Props> = ({
  dataset,
  users,
  onDatasetUpdated,
  onBackToOverview,
  onDatasetDiscarded
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'warnings' | 'unknown'>('all');
  const [editingCell, setEditingCell] = useState<{
    employee: EmployeeKpiRecord;
    field: keyof Omit<EmployeeKpiRecord, 'employeeUid' | 'username' | 'employeeName' | 'department' | 'jobTitle' | 'matchStatus' | 'derived' | 'validationFlags' | 'notes'>;
    currentValue: number;
  } | null>(null);
  const [mappingUser, setMappingUser] = useState<string | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<EmployeeKpiRecord | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const employeeList = Object.values(dataset.employees);

  const filteredEmployees = employeeList.filter(emp => {
    const matchesSearch = 
      emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.username.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'warnings') {
      return emp.validationFlags.length > 0 || emp.matchStatus !== 'matched';
    }
    if (filterType === 'unknown') {
      return emp.matchStatus === 'unknown_employee';
    }
    return true;
  });

  const unknownCount = employeeList.filter(e => e.matchStatus === 'unknown_employee').length;
  const anomalyCount = employeeList.filter(e => e.validationFlags.includes('DATA_ANOMALY')).length;
  const missingCount = employeeList.filter(e => e.validationFlags.some(f => f.startsWith('MISSING_'))).length;

  const handleSaveCell = async (field: string, newValue: number, reason: string) => {
    if (!editingCell) return;
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

  const handleMapUser = async (unknownUsername: string, targetUid: string) => {
    const res = await apiFetch<{ success: boolean; dataset: MonthlyKpiDataset }>('/api/admin/performance/kpi/map-unknown', {
      method: 'POST',
      body: JSON.stringify({
        monthKey: dataset.monthKey,
        unknownUsername,
        targetUserUid: targetUid
      })
    });

    if (res.ok && res.data?.dataset) {
      onDatasetUpdated(res.data.dataset);
      setActionNotice(`تم ربط المعرف ${unknownUsername} بنجاح.`);
      setTimeout(() => setActionNotice(null), 3000);
    } else {
      throw new Error(res.error || 'فشل ربط الموظف');
    }
  };

  const handleApproveDataset = async () => {
    setIsApproving(true);
    try {
      const res = await apiFetch<{ success: boolean; dataset: MonthlyKpiDataset }>('/api/admin/performance/kpi/approve', {
        method: 'POST',
        body: JSON.stringify({
          monthKey: dataset.monthKey
        })
      });

      if (res.ok && res.data?.dataset) {
        onDatasetUpdated(res.data.dataset);
        setActionNotice(`تم اعتماد كشف شهر ${dataset.monthLabel} رسمياً ونشره للمنظومة.`);
      } else {
        throw new Error(res.error || 'فشل اعتماد التقرير');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء الاعتماد.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDiscardDataset = async () => {
    setIsDiscarding(true);
    try {
      const res = await apiFetch<{ success: boolean; message: string }>('/api/admin/performance/kpi/discard', {
        method: 'POST',
        body: JSON.stringify({
          monthKey: dataset.monthKey
        })
      });

      if (res.ok) {
        setShowDiscardConfirm(false);
        if (onDatasetDiscarded) {
          onDatasetDiscarded();
        } else {
          onBackToOverview();
        }
      } else {
        throw new Error(res.error || 'فشل إلغاء واستبعاد الكشف');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء الإلغاء.');
    } finally {
      setIsDiscarding(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Top Banner with Actions */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              بانتظار المراجعة والاعتماد (Needs Review)
            </span>
            <span className="text-xs text-slate-400">
              الإصدار {dataset.version} • شهر {dataset.monthLabel}
            </span>
          </div>
          <h2 className="text-xl font-black text-white">
            شاشة المراجعة البشرية والتدقيق (Human-in-the-Loop Review)
          </h2>
          <p className="text-xs text-slate-400">
            راجع البيانات المستخرجة من الصور، وصحح أي قيم شاذة، واعتمد الكشف ليصبح هو المصدر المعتمد لكافة شاشات المنظومة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowDiscardConfirm(true)}
            disabled={isDiscarding || isApproving}
            className="px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="إلغاء وحذف البيانات المستخرجة من الصور المرفوعة"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>إلغاء واستبعاد المرفوع</span>
          </button>

          <button
            onClick={onBackToOverview}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            العودة للوحة المؤشرات
          </button>

          <button
            onClick={handleApproveDataset}
            disabled={isApproving || isDiscarding}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isApproving ? 'جارٍ الاعتماد...' : 'اعتماد الكشف رسمياً ونشره'}</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs p-3.5 rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Validation Status Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">إجمالي الموظفين المستخرجين</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{employeeList.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">من {dataset.sourceFiles.length} كشوفات مصورة</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">معرفات مجهولة (Unknown)</div>
          <div className={`text-2xl font-black mt-1 ${unknownCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {unknownCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {unknownCount > 0 ? 'تتطلب ربطاً يدوياً' : 'جميع المعرفات مطابقة'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">قيم شاذة (Anomalies)</div>
          <div className={`text-2xl font-black mt-1 ${anomalyCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {anomalyCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {anomalyCount > 0 ? 'المنجز يتجاوز الوارد' : 'لا توجد شواهد غير منطقية'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">نواقص الكشوف (Missing)</div>
          <div className={`text-2xl font-black mt-1 ${missingCount > 0 ? 'text-blue-600' : 'text-slate-600'}`}>
            {missingCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">غياب الموظف عن بعض التقارير</div>
        </div>
      </div>

      {/* Warnings Banner if any */}
      {dataset.validationWarnings.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>تنبيهات التدقيق والتحقق الآلي ({dataset.validationWarnings.length} تنبيه):</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {dataset.validationWarnings.slice(0, 6).map((warn) => (
              <div key={warn.id} className="bg-white/80 p-2.5 rounded-lg border border-amber-200/80 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-slate-700">{warn.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Review Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Table Filters & Search */}
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
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              الكل ({employeeList.length})
            </button>
            <button
              onClick={() => setFilterType('warnings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'warnings'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              به تنبيهات ({unknownCount + anomalyCount + missingCount})
            </button>
            <button
              onClick={() => setFilterType('unknown')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'unknown'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              معرفات غير مقترنة ({unknownCount})
            </button>
          </div>
        </div>

        {/* Dense Editable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">الموظف / المعرف</th>
                <th className="py-3 px-3 text-center">الوارد</th>
                <th className="py-3 px-3 text-center">المنجز</th>
                <th className="py-3 px-3 text-center bg-blue-50/50 text-blue-900">معدل الإنجاز</th>
                <th className="py-3 px-3 text-center">استغلال (Utli)</th>
                <th className="py-3 px-3 text-center">إشغال (Occu)</th>
                <th className="py-3 px-3 text-center">% IR</th>
                <th className="py-3 px-3 text-center text-rose-700">% أخطاء</th>
                <th className="py-3 px-3 text-center bg-emerald-50/50 text-emerald-900">الدقة</th>
                <th className="py-3 px-3 text-center">حضور / إجازات</th>
                <th className="py-3 px-3 text-center">الحالة والتدقيق</th>
                <th className="py-3 px-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredEmployees.map((emp, index) => {
                const isAnomaly = emp.validationFlags.includes('DATA_ANOMALY');
                const isUnknown = emp.matchStatus === 'unknown_employee';

                return (
                  <tr
                    key={emp.username}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isAnomaly ? 'bg-rose-50/40' : isUnknown ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono text-slate-400">{index + 1}</td>

                    {/* Employee & Username */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{emp.employeeName}</div>
                      <div className="font-mono text-[10px] text-slate-500">{emp.username}</div>
                    </td>

                    {/* Calls Presented (Clickable cell) */}
                    <td
                      onClick={() => setEditingCell({ employee: emp, field: 'callsPresented', currentValue: emp.callsPresented?.value || 0 })}
                      className="py-2.5 px-3 text-center font-semibold cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 transition-colors title='اضغط لتعديل الرقم'"
                    >
                      <span className="flex items-center justify-center gap-1">
                        {emp.callsPresented?.value ?? '-'}
                        {emp.callsPresented?.isEdited && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="تم تعديلها يدوياً" />}
                      </span>
                    </td>

                    {/* Calls Handled (Clickable cell) */}
                    <td
                      onClick={() => setEditingCell({ employee: emp, field: 'callsHandled', currentValue: emp.callsHandled?.value || 0 })}
                      className={`py-2.5 px-3 text-center font-bold cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 transition-colors ${
                        isAnomaly ? 'text-rose-600 underline' : 'text-slate-900'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1">
                        {emp.callsHandled?.value ?? '-'}
                        {emp.callsHandled?.isEdited && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="تم تعديلها يدوياً" />}
                      </span>
                    </td>

                    {/* Derived Handling Rate */}
                    <td className="py-2.5 px-3 text-center font-bold bg-blue-50/30 text-blue-900 font-mono">
                      {emp.derived.callHandlingRate !== null ? `${emp.derived.callHandlingRate}%` : 'N/A'}
                    </td>

                    {/* Utilization */}
                    <td
                      onClick={() => setEditingCell({ employee: emp, field: 'utilization', currentValue: emp.utilization?.value || 0 })}
                      className="py-2.5 px-3 text-center font-mono cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      {emp.utilization ? `${emp.utilization.value}%` : <span className="text-slate-400 text-[10px]">غير مدرج</span>}
                    </td>

                    {/* Occupancy */}
                    <td
                      onClick={() => setEditingCell({ employee: emp, field: 'occupancy', currentValue: emp.occupancy?.value || 0 })}
                      className="py-2.5 px-3 text-center font-mono cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      {emp.occupancy ? `${emp.occupancy.value}%` : <span className="text-slate-400 text-[10px]">غير مدرج</span>}
                    </td>

                    {/* % IR */}
                    <td
                      onClick={() => setEditingCell({ employee: emp, field: 'ir', currentValue: emp.ir?.value || 100 })}
                      className="py-2.5 px-3 text-center font-mono cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      {emp.ir ? `${emp.ir.value}%` : '100%'}
                    </td>

                    {/* % Mistakes */}
                    <td
                      onClick={() => setEditingCell({ employee: emp, field: 'mistakes', currentValue: emp.mistakes?.value || 0 })}
                      className="py-2.5 px-3 text-center font-mono font-bold text-rose-600 cursor-pointer hover:bg-emerald-50 transition-colors"
                    >
                      {emp.mistakes ? `${emp.mistakes.value}%` : '0%'}
                    </td>

                    {/* Derived Accuracy Rate */}
                    <td className="py-2.5 px-3 text-center font-bold bg-emerald-50/30 text-emerald-900 font-mono">
                      {emp.derived.accuracyRate !== null ? `${emp.derived.accuracyRate}%` : '100%'}
                    </td>

                    {/* Attendance */}
                    <td className="py-2.5 px-3 text-center text-[11px] text-slate-600">
                      {emp.emergency?.value || 0} ط / {emp.sick?.value || 0} م
                    </td>

                    {/* Status & Validation Badges */}
                    <td className="py-2.5 px-3 text-center">
                      {isUnknown ? (
                        <button
                          onClick={() => setMappingUser(emp.username)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 transition-colors"
                        >
                          ربط مستخدم ⚠️
                        </button>
                      ) : isAnomaly ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          شذوذ أرقام ⚠️
                        </span>
                      ) : emp.validationFlags.length > 0 ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-100 text-blue-800">
                          ناقص كشف
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-100 text-emerald-800">
                          سليم ✓
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setDetailEmployee(emp)}
                        className="p-1 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
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

      {/* Bottom Sticky Action Footer */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          هل انتهيت من التدقيق؟ يمكنك اعتماد الكشف أو إلغاء ما تم رفعه والعودة للوحة المؤشرات.
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowDiscardConfirm(true)}
            disabled={isDiscarding || isApproving}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>إلغاء واستبعاد المرفوع</span>
          </button>

          <button
            onClick={onBackToOverview}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            العودة للوحة المؤشرات
          </button>

          <button
            onClick={handleApproveDataset}
            disabled={isApproving || isDiscarding}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isApproving ? 'جارٍ الاعتماد...' : 'اعتماد الكشف رسمياً ونشره'}</span>
          </button>
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                إلغاء واستبعاد الكشف المرفوع
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                هل أنت متأكد من رغبتك في إلغاء واستبعاد البيانات المستخرجة لكشف شهر <span className="font-bold text-slate-800">{dataset.monthLabel}</span>؟ سيتم حذف هذه المسودة والعودة مباشرة إلى لوحة المؤشرات.
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>هذا الإجراء سيقوم بإلغاء التقرير المستخرج الحالي بالكامل ولن يتم اعتماده أو تطبيقه.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                disabled={isDiscarding}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex-1"
              >
                تراجع
              </button>
              <button
                onClick={handleDiscardDataset}
                disabled={isDiscarding}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 flex-1 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDiscarding ? 'جارٍ الإلغاء...' : 'تأكيد الإلغاء والحذف'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cell Editing Modal */}
      {editingCell && (
        <KpiEditCellModal
          monthKey={dataset.monthKey}
          employee={editingCell.employee}
          field={editingCell.field}
          currentValue={editingCell.currentValue}
          onClose={() => setEditingCell(null)}
          onSave={handleSaveCell}
        />
      )}

      {/* Map User Modal */}
      {mappingUser && (
        <KpiMapUserModal
          monthKey={dataset.monthKey}
          unknownUsername={mappingUser}
          users={users}
          onClose={() => setMappingUser(null)}
          onMap={handleMapUser}
        />
      )}

      {/* Detail Modal */}
      {detailEmployee && (
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

    </div>
  );
};
