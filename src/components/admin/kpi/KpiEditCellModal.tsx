import React, { useState } from 'react';
import { X, Check, Edit3, AlertCircle } from 'lucide-react';
import type { EmployeeKpiRecord } from '../../../types.ts';

interface Props {
  monthKey: string;
  employee: EmployeeKpiRecord;
  field: keyof Omit<EmployeeKpiRecord, 'employeeUid' | 'username' | 'employeeName' | 'department' | 'jobTitle' | 'matchStatus' | 'derived' | 'validationFlags' | 'notes'>;
  currentValue: number;
  onClose: () => void;
  onSave: (field: string, newValue: number, reason: string) => Promise<void>;
}

const FIELD_LABELS: Record<string, string> = {
  utilization: 'نسبة الاستغلال (Utli %)',
  occupancy: 'نسبة الإشغال (Occu %)',
  callsPresented: 'المكالمات الواردة (Presented)',
  callsHandled: 'المكالمات المنجزة (Handled)',
  emergency: 'إجازات طارئة (أيام)',
  sick: 'إجازات مرضية (أيام)',
  tardy: 'تأخيرات (مرات)',
  ir: 'معدل الاستجابة (% Of IR)',
  mistakes: 'نسبة الأخطاء (% Mistakes)'
};

export const KpiEditCellModal: React.FC<Props> = ({
  monthKey,
  employee,
  field,
  currentValue,
  onClose,
  onSave
}) => {
  const [val, setVal] = useState<string>(String(currentValue));
  const [reason, setReason] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(val);
    if (isNaN(num)) {
      setErr('يرجى إدخال قيمة رقمية صحيحة.');
      return;
    }

    try {
      setSaving(true);
      setErr(null);
      await onSave(String(field), num, reason.trim() || 'تصحيح ومراجعة المشرف');
      onClose();
    } catch (error: any) {
      setErr(error.message || 'فشل حفظ التعديل');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">تعديل قيمة في كشف الأداء</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
            <div><span className="font-semibold text-slate-900">الموظف:</span> {employee.employeeName} ({employee.username})</div>
            <div><span className="font-semibold text-slate-900">الحقل المستهدف:</span> {FIELD_LABELS[String(field)] || String(field)}</div>
            <div><span className="font-semibold text-slate-900">القيمة الحالية:</span> {currentValue}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              القيمة الجديدة المصححة
            </label>
            <input
              type="number"
              step="any"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              سبب التعديل / الملاحظات التدقيقية
            </label>
            <input
              type="text"
              placeholder="مثال: تصحيح خطأ بصري في قراءة الـ OCR / مطابقة رسمية مع كشف المأمورية"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>

          {err && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? 'جارٍ الحفظ...' : 'حفظ وإعادة الحساب فورياً'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
