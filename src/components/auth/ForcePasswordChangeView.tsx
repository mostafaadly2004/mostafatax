/**
 * Force Password Change View
 * Egyptian Real Estate Tax Authority - Official Institutional AI Copilot
 * Enforces mandatory first-login password change before granting access.
 */

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  LogOut,
  ArrowRight
} from 'lucide-react';
import { TaxAuthorityLogo } from '../common/TaxAuthorityLogo.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { ThemeToggle } from '../common/ThemeToggle.tsx';

export const ForcePasswordChangeView: React.FC = () => {
  const { userProfile, changePassword, logout } = useAuth();
  const { isLight, isHighContrast } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('يرجى إدخال كلمة المرور المؤقتة الحالية.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف أو أرقام.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور المؤقتة.');
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || 'فشل تغيير كلمة المرور. يرجى التأكد من صحة كلمة المرور الحالية والمحاولة مجدداً.');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع أثناء تغيير كلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`min-h-screen flex flex-col items-center justify-center p-4 relative ${
        isLight ? 'bg-slate-100 text-slate-900' : isHighContrast ? 'bg-black text-white' : 'bg-[#090d16] text-slate-100'
      }`} 
      dir="rtl"
    >
      {/* Theme toggle */}
      <div className="absolute top-4 left-4 z-20">
        <ThemeToggle />
      </div>

      <div className={`max-w-md w-full rounded-2xl p-6 sm:p-8 border space-y-6 relative z-10 shadow-xl ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900'
          : isHighContrast
          ? 'bg-black border-2 border-white text-white'
          : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}>
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <TaxAuthorityLogo className="w-18 h-18 mx-auto shadow-md rounded-full" />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 mb-2">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>إجراء أمني إلزامي: تعيين كلمة المرور لأول مرة</span>
            </div>
            <h1 className={`text-base sm:text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              مرحباً بك، {userProfile?.displayName || 'زميلنا الموظف'}
            </h1>
            <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              وفقاً للوائح الأمن السيبراني لمصلحة الضرائب العقارية، يجب تغيير كلمة المرور المؤقتة وتعيين كلمة مرور شخصية جديدة لتفعيل حسابك بالكامل.
            </p>
          </div>
        </div>

        {/* User Badge Info */}
        <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/60 border-slate-800 text-slate-300'
        }`}>
          <div>
            <span className="text-[10px] text-slate-500 block">اسم المستخدم الوظيفي:</span>
            <span className="font-mono font-bold">{userProfile?.username || 'Employee'}</span>
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-500 block">الدور الوظيفي:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">موظف مصلحة الضرائب</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className={`p-3 rounded-lg border flex items-center gap-2 text-xs ${
            isLight
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}>
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className={`p-3 rounded-lg border flex items-center gap-2 text-xs ${
            isLight
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">تم تحديث كلمة المرور بنجاح! جاري فتح المنظومة...</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Current / Temporary Password */}
          <div>
            <label className={`block font-bold mb-1 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              كلمة المرور المؤقتة الحالية:
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور التي تم تزويدك بها"
                className={`w-full rounded-lg py-2 pr-9 pl-9 text-xs outline-none font-normal border transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-700'
                    : isHighContrast
                    ? 'bg-black border border-white text-white focus:border-white'
                    : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                }`}
                dir="ltr"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className={`block font-bold mb-1 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              كلمة المرور الجديدة:
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="6 أحرف أو أرقام على الأقل"
                className={`w-full rounded-lg py-2 pr-9 pl-9 text-xs outline-none font-normal border transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-700'
                    : isHighContrast
                    ? 'bg-black border border-white text-white focus:border-white'
                    : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                }`}
                dir="ltr"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className={`block font-bold mb-1 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              تأكيد كلمة المرور الجديدة:
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور الجديدة"
                className={`w-full rounded-lg py-2 pr-9 pl-9 text-xs outline-none font-normal border transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-700'
                    : isHighContrast
                    ? 'bg-black border border-white text-white focus:border-white'
                    : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                }`}
                dir="ltr"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword && confirmPassword && (
              <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                {newPassword === confirmPassword ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    كلمتا المرور متطابقتان
                  </span>
                ) : (
                  <span className="text-rose-500 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    كلمتا المرور غير متطابقتين بعد
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (newPassword.length >= 6 && confirmPassword.length >= 6 && newPassword !== confirmPassword)}
            className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg border border-emerald-900 shadow-2xs transition-colors cursor-pointer disabled:opacity-60 text-xs flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>جاري الحفظ والتأمين...</span>
            ) : (
              <>
                <span>تعيين كلمة المرور والدخول للمنظومة</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </>
            )}
          </button>
        </form>

        {/* Cancel / Logout Option */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-500">لست مستعداً الآن؟</span>
          <button
            type="button"
            onClick={logout}
            className="text-slate-500 hover:text-rose-500 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج والعودة لاحقاً</span>
          </button>
        </div>
      </div>
    </div>
  );
};
