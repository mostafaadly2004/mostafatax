/**
 * Login & Employee Portal Entrance View
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * Official Institutional Call-Center Copilot
 */

import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { TaxAuthorityLogo } from '../common/TaxAuthorityLogo.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { ThemeToggle } from '../common/ThemeToggle.tsx';

export const LoginView: React.FC = () => {
  const { login, error: contextError, clearError } = useAuth();
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
        <div className="text-center space-y-3">
          <TaxAuthorityLogo className="w-20 h-20 mx-auto shadow-md rounded-full" />
          <div>
            <h1 className={`text-base sm:text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              مصلحة الضرائب العقارية المصرية
            </h1>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              منظومة المساعد التشغيلي للـ Agents وخدمة العملاء
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
        </form>
      </div>
    </div>
  );
};

