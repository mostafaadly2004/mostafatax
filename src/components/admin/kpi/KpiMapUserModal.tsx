import React, { useState } from 'react';
import { X, Check, UserCheck, AlertTriangle } from 'lucide-react';
import type { UserProfile } from '../../../types.ts';

interface Props {
  monthKey: string;
  unknownUsername: string;
  users: UserProfile[];
  onClose: () => void;
  onMap: (unknownUsername: string, targetUid: string) => Promise<void>;
}

export const KpiMapUserModal: React.FC<Props> = ({
  monthKey,
  unknownUsername,
  users,
  onClose,
  onMap
}) => {
  const [selectedUid, setSelectedUid] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUid) {
      setErr('يرجى اختيار الموظف المطابق من القائمة.');
      return;
    }

    try {
      setSaving(true);
      setErr(null);
      await onMap(unknownUsername, selectedUid);
      onClose();
    } catch (error: any) {
      setErr(error.message || 'فشل ربط الموظف');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">ربط معرف موظف مجهول بحساب مسجل</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              المعرف المستخرج من الصورة:
            </div>
            <div className="font-mono text-sm bg-white/80 p-2 rounded-lg border border-amber-200 text-slate-800">
              {unknownUsername}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              اختر الموظف الرسمي المطابق من قاعدة البيانات (35 موظفاً):
            </label>
            <select
              value={selectedUid}
              onChange={(e) => setSelectedUid(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              required
            >
              <option value="">-- اضغط للاختيار من قائمة الموظفين --</option>
              {users.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.displayName} ({u.username}) - {u.jobTitle || 'مأمور ضرائب'}
                </option>
              ))}
            </select>
          </div>

          {err && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
              {err}
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
              disabled={saving || !selectedUid}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? 'جارٍ الربط...' : 'تأكيد الربط والاعتماد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
