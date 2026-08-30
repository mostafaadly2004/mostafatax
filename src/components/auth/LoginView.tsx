/**
 * Login & Employee Portal Entrance View
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * Official Institutional Call-Center Copilot
 */

import React, { useState } from 'react';
import { 
  Building2, 
  User, 
  Lock, 
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { ThemeToggle } from '../common/ThemeToggle.tsx';

export const LoginView: React.FC = () => {
  const { login, loginWithGoogle, error: contextError, clearError } = useAuth();
  const { isLight, isHighContrast } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const displayError = localError || contextError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    setLoading(true);
    try {
      const ok = await login(username.trim(), password);
      if (!ok && !contextError) {
        setLocalError('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err: any) {
      setLocalError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    clearError();
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setLocalError(err.message || 'فشل تسجيل الدخول عبر Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative ${
      isLight ? 'bg-slate-100 text-slate-900' : isHighContrast ? 'bg-black text-white' : 'bg-[#090d16] text-slate-100'
    }`} dir="rtl">
      
      {/* Top right theme toggle */}
      <div className="absolute top-4 left-4 z-20">
        <ThemeToggle />
      </div>

      <div className={`max-w-md w-full rounded-2xl p-6 sm:p-8 border text-xs space-y-6 relative z-10 shadow-lg ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900'
          : isHighContrast
          ? 'bg-black border-2 border-white text-white'
          : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}>
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white flex items-center justify-center mx-auto border border-emerald-900 shadow-2xs">
            <Building2 className="w-6 h-6 text-emerald-100" />
          </div>
          <div>
            <h1 className={`text-base sm:text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              مصلحة الضرائب العقارية المصرية
            </h1>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              منظومة المساعد التشغيلي لمأموري الضرائب وخدمة العملاء
            </p>
          </div>
        </div>

        {displayError && (
          <div className={`p-3 rounded-lg border flex items-center gap-2 text-xs ${
            isLight
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}>
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{displayError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block font-bold mb-1 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              اسم المستخدم أو البريد الإلكتروني:
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Mostafa"
                className={`w-full rounded-lg py-2 pr-9 pl-3 text-xs outline-none font-normal border transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-700'
                    : isHighContrast
                    ? 'bg-black border border-white text-white focus:border-white'
                    : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                }`}
                dir="ltr"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className={`block font-bold mb-1 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              كلمة المرور:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
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
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg border border-emerald-900 shadow-2xs transition-colors cursor-pointer disabled:opacity-60 text-xs"
          >
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول للمنظومة'}
          </button>

          {/* Google Sign-in Option */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full py-2 rounded-lg font-semibold border flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 text-xs ${
              isLight
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>تسجيل الدخول عبر Google Workspace</span>
          </button>
        </form>

        {/* Quick Instant Login Buttons */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-center text-[11px] text-slate-500 font-medium">تسجيل دخول فوري للتجربة السريعة:</p>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={async () => {
                setUsername('Mostafa');
                setPassword('mostafaadly011');
                setLocalError(null);
                clearError();
                setLoading(true);
                await login('Mostafa', 'mostafaadly011');
                setLoading(false);
              }}
              disabled={loading}
              className={`p-2.5 rounded-lg border text-right transition-colors cursor-pointer text-[11px] flex items-center justify-between ${
                isLight
                  ? 'bg-slate-50 hover:bg-emerald-50 text-slate-800 border-slate-200 hover:border-emerald-300'
                  : 'bg-slate-800 hover:bg-emerald-950 text-slate-200 border-slate-700 hover:border-emerald-800'
              }`}
            >
              <div>
                <div className="font-bold text-emerald-700 dark:text-emerald-400">حساب المشرف (Admin)</div>
                <span className="text-[10px] text-slate-500 block">Mostafa</span>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

