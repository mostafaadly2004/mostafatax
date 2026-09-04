import React from 'react';
import {
  X,
  User,
  Building2,
  Briefcase,
  PhoneCall,
  Activity,
  Award,
  AlertTriangle,
  Calendar,
  FileCheck,
  Edit3,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Info
} from 'lucide-react';
import type { EmployeeKpiRecord, MonthlyKpiDataset } from '../../../types.ts';

interface Props {
  employee: EmployeeKpiRecord;
  dataset: MonthlyKpiDataset;
  onClose: () => void;
  onEditMetric?: (field: keyof EmployeeKpiRecord, currentValue: number) => void;
}

export const KpiEmployeeDetailModal: React.FC<Props> = ({
  employee,
  dataset,
  onClose,
  onEditMetric
}) => {
  const { username, employeeName, department, jobTitle, derived, validationFlags } = employee;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-l from-emerald-800 to-slate-900 text-white p-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white text-xl font-bold shadow-inner">
              {employeeName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-white">{employeeName}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  {username}
                </span>
                {employee.matchStatus === 'matched' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> مطابق للمنظومة
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> معرف غير مقترن
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-300">
                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-emerald-400" /> {department}</span>
                <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-emerald-400" /> {jobTitle}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-emerald-400" /> كشف شهر {dataset.monthLabel} (الإصدار {dataset.version})</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">

          {/* Validation Warnings Banner if any */}
          {validationFlags.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">ملاحظات التدقيق والتحقق لهذا الموظف:</h4>
                <ul className="text-xs space-y-1 mt-1 text-amber-800 list-disc list-inside">
                  {validationFlags.map((flag, idx) => (
                    <li key={idx}>
                      {flag === 'MISSING_FROM_UTILIZATION' && 'الموظف غير مدرج في كشف تقرير الاستغلال والإشغال لهذا الشهر.'}
                      {flag === 'MISSING_FROM_CALLS' && 'الموظف غير مدرج في كشف المكالمات الواردة والمنجزة لهذا الشهر.'}
                      {flag === 'DATA_ANOMALY' && 'تنبيه: عدد المكالمات المنجزة يتجاوز إجمالي المكالمات الواردة.'}
                      {flag === 'UNKNOWN_EMPLOYEE' && 'اسم المستخدم غير مطابق لأي حساب موظف مسجل رسمياً في النظام.'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Section 1: Raw Report Ingested Metrics (Exact Source Traceability) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                البيانات المستخرجة من التقارير المصورة (المصدر الخام)
              </h4>
              <span className="text-xs text-slate-500">القيم كما وردت في الكشوف الرسمية دون تقريب أو استنتاج</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Utilization */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm relative group">
                <div className="flex justify-between items-start text-xs text-slate-500 mb-1">
                  <span>نسبة الاستغلال (Utli %)</span>
                  {onEditMetric && (
                    <button
                      onClick={() => onEditMetric('utilization', employee.utilization?.value || 0)}
                      className="opacity-0 group-hover:opacity-100 text-emerald-600 hover:text-emerald-800 transition-opacity"
                      title="تعديل القيمة"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-xl font-bold text-slate-800">
                  {employee.utilization ? `${employee.utilization.value}%` : <span className="text-slate-400 text-sm">غير متوفر</span>}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  المصدر: {employee.utilization?.sourceFile || 'غير مدرج'}
                </div>
              </div>

              {/* Occupancy */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm relative group">
                <div className="flex justify-between items-start text-xs text-slate-500 mb-1">
                  <span>نسبة الإشغال (Occu %)</span>
                  {onEditMetric && (
                    <button
                      onClick={() => onEditMetric('occupancy', employee.occupancy?.value || 0)}
                      className="opacity-0 group-hover:opacity-100 text-emerald-600 hover:text-emerald-800 transition-opacity"
                      title="تعديل القيمة"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-xl font-bold text-slate-800">
                  {employee.occupancy ? `${employee.occupancy.value}%` : <span className="text-slate-400 text-sm">غير متوفر</span>}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  المصدر: {employee.occupancy?.sourceFile || 'غير مدرج'}
                </div>
              </div>

              {/* Presented Calls */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm relative group">
                <div className="flex justify-between items-start text-xs text-slate-500 mb-1">
                  <span>المكالمات الواردة (Presented)</span>
                  {onEditMetric && (
                    <button
                      onClick={() => onEditMetric('callsPresented', employee.callsPresented?.value || 0)}
                      className="opacity-0 group-hover:opacity-100 text-emerald-600 hover:text-emerald-800 transition-opacity"
                      title="تعديل القيمة"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-xl font-bold text-slate-800">
                  {employee.callsPresented ? employee.callsPresented.value : <span className="text-slate-400 text-sm">0</span>}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  المصدر: {employee.callsPresented?.sourceFile || 'غير مدرج'}
                </div>
              </div>

              {/* Handled Calls */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm relative group">
                <div className="flex justify-between items-start text-xs text-slate-500 mb-1">
                  <span>المكالمات المنجزة (Handled)</span>
                  {onEditMetric && (
                    <button
                      onClick={() => onEditMetric('callsHandled', employee.callsHandled?.value || 0)}
                      className="opacity-0 group-hover:opacity-100 text-emerald-600 hover:text-emerald-800 transition-opacity"
                      title="تعديل القيمة"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-xl font-bold text-slate-800">
                  {employee.callsHandled ? employee.callsHandled.value : <span className="text-slate-400 text-sm">0</span>}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  المصدر: {employee.callsHandled?.sourceFile || 'غير مدرج'}
                </div>
              </div>

              {/* % IR */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm relative group">
                <div className="flex justify-between items-start text-xs text-slate-500 mb-1">
                  <span>معدل الاستجابة (% Of IR)</span>
                  {onEditMetric && (
                    <button
                      onClick={() => onEditMetric('ir', employee.ir?.value || 0)}
                      className="opacity-0 group-hover:opacity-100 text-emerald-600 hover:text-emerald-800 transition-opacity"
                      title="تعديل القيمة"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-xl font-bold text-slate-800">
                  {employee.ir ? `${employee.ir.value}%` : <span className="text-slate-400 text-sm">100%</span>}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  المصدر: {employee.ir?.sourceFile || 'غير مدرج'}
                </div>
              </div>

              {/* % Mistakes */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm relative group">
                <div className="flex justify-between items-start text-xs text-slate-500 mb-1">
                  <span>نسبة الأخطاء (% Mistakes)</span>
                  {onEditMetric && (
                    <button
                      onClick={() => onEditMetric('mistakes', employee.mistakes?.value || 0)}
                      className="opacity-0 group-hover:opacity-100 text-emerald-600 hover:text-emerald-800 transition-opacity"
                      title="تعديل القيمة"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-xl font-bold text-rose-600">
                  {employee.mistakes ? `${employee.mistakes.value}%` : <span className="text-slate-400 text-sm">0%</span>}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  المصدر: {employee.mistakes?.sourceFile || 'غير مدرج'}
                </div>
              </div>

              {/* Attendance: Emergency */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm relative group">
                <div className="flex justify-between items-start text-xs text-slate-500 mb-1">
                  <span>إجازات طارئة (Emergency)</span>
                  {onEditMetric && (
                    <button
                      onClick={() => onEditMetric('emergency', employee.emergency?.value || 0)}
                      className="opacity-0 group-hover:opacity-100 text-emerald-600 hover:text-emerald-800 transition-opacity"
                      title="تعديل القيمة"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-xl font-bold text-slate-800">
                  {employee.emergency ? `${employee.emergency.value} يوم` : '0 يوم'}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  المصدر: {employee.emergency?.sourceFile || 'كشف الحضور'}
                </div>
              </div>

              {/* Attendance: Sick & Tardy */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm relative group">
                <div className="flex justify-between items-start text-xs text-slate-500 mb-1">
                  <span>مرضي / تأخيرات</span>
                  {onEditMetric && (
                    <button
                      onClick={() => onEditMetric('sick', employee.sick?.value || 0)}
                      className="opacity-0 group-hover:opacity-100 text-emerald-600 hover:text-emerald-800 transition-opacity"
                      title="تعديل القيمة"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-xl font-bold text-slate-800">
                  {employee.sick?.value || 0} مرضي / {employee.tardy?.value || 0} تأخير
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  المصدر: {employee.sick?.sourceFile || 'كشف الحضور'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Deterministically Derived Application Metrics */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                المؤشرات المشتقة والمحسوبة برمجياً (Application Logic)
              </h4>
              <span className="text-xs text-slate-500">تم حسابها حصرياً بواسطة الكود البرمجي (Deterministic Code)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Call Handling Rate */}
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100">
                <div className="text-xs font-semibold text-blue-800 mb-1">معدل إنجاز المكالمات (Call Handling Rate)</div>
                <div className="text-2xl font-black text-blue-900">
                  {derived.callHandlingRate !== null ? `${derived.callHandlingRate}%` : 'غير محدد (N/A)'}
                </div>
                <div className="text-[11px] text-blue-700 mt-1">
                  معادلة الحساب: (المنجز / الوارد) × 100
                </div>
              </div>

              {/* Accuracy Rate */}
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
                <div className="text-xs font-semibold text-emerald-800 mb-1">نسبة الدقة وجودة المعالجة (Accuracy Rate)</div>
                <div className="text-2xl font-black text-emerald-900">
                  {derived.accuracyRate !== null ? `${derived.accuracyRate}%` : '100%'}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  معادلة الحساب: 100 - نسبة الأخطاء
                </div>
              </div>

              {/* Calculated Errors Count */}
              <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-100">
                <div className="text-xs font-semibold text-purple-800 mb-1">عدد المعاملات التي شابتها أخطاء تقديرية</div>
                <div className="text-2xl font-black text-purple-900">
                  {derived.calculatedErrorsCount !== null ? `${derived.calculatedErrorsCount} معاملة` : '0 معاملة'}
                </div>
                <div className="text-[11px] text-purple-700 mt-1">
                  معادلة الحساب: المنجز × (نسبة الخطأ / 100)
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Official Score & Ranking Status */}
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-800">حالة التقييم والترتيب العام:</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
                  {derived.scoreFormulaStatus === 'configured' ? `مجموع الدرجات: ${derived.score}/100 (${derived.overallRating})` : 'الترتيب والتقييم غير مُفعّل (يتطلب صيغة معتمدة من الإدارة)'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                التزاماً بسياسات مصلحة الضرائب العقارية لضمان العدالة والشفافية، لا يتم احتساب درجات أو ترتيب تنافسي للموظفين إلا بناءً على معادلة أوزان معتمدة رسمياً ومحددة من قِبل المشرف.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            تاريخ الاعتماد: {dataset.approvedAt ? new Date(dataset.approvedAt).toLocaleDateString('ar-EG') : 'قيد المراجعة'}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold transition-colors"
          >
            إغلاق البطاقة
          </button>
        </div>

      </div>
    </div>
  );
};
