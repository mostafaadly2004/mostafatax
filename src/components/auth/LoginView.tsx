/**
 * Login & Employee Portal Entrance View
 * Tax Support AI - Egyptian Real Estate Tax Authority
 */

import React, { useState } from 'react';
import { 
  Scale, 
  User, 
  Lock, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const LoginView: React.FC = () => {
  const { login, loginWithGoogle, error: contextError, clearError } = useAuth();
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
    <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Frosted Glass Ambient Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-emerald-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[35%] right-[25%] w-[35%] h-[35%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full bg-white/5 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 text-xs space-y-6 relative z-10 animate-in fade-in duration-200">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
            <Scale className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              بوابة مصلحة الضرائب العقارية
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              نظام الدعم الفوري ومساعد القوانين الذكي (Tax Support AI)
            </p>
          </div>
        </div>

        {displayError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 flex items-center gap-2 backdrop-blur-md">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{displayError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold text-slate-300 mb-1">اسم المستخدم أو البريد:</label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Mostafa أو البريد الإلكتروني"
                className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 rounded-xl py-2.5 pr-9 pl-3 text-xs outline-none text-white placeholder-slate-500 font-medium backdrop-blur-md transition-all"
                dir="ltr"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">كلمة المرور:</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="mostafaadly011"
                className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 rounded-xl py-2.5 pr-9 pl-9 text-xs outline-none text-white placeholder-slate-500 font-medium backdrop-blur-md transition-all"
                dir="ltr"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/50 border border-emerald-400/30 backdrop-blur-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 text-xs"
          >
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول للمنظومة'}
          </button>

          {/* Google Sign-in Option (Firebase Auth Free Tier) */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/20 backdrop-blur-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 text-xs shadow-sm"
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
            <span>تسجيل الدخول باستخدام Google (Firebase Auth)</span>
          </button>
        </form>

        {/* Quick Instant Login Buttons */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <p className="text-center text-[11px] text-slate-400 font-medium">تسجيل دخول فوري للتجربة السريعة:</p>
          <div className="grid grid-cols-2 gap-2">
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
              className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-[11px] font-bold active:scale-[0.97]"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>دخول المشرف (Mostafa)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">Mostafa / mostafaadly011</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                setUsername('reta');
                setPassword('password123');
                setLocalError(null);
                clearError();
                setLoading(true);
                await login('reta', 'password123');
                setLoading(false);
              }}
              disabled={loading}
              className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-300 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-[11px] font-bold active:scale-[0.97]"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>دخول موظف الضرائب</span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">reta / password123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
