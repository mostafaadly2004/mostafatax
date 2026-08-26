/**
 * Employee Header Component
 * Clean enterprise header with real authenticated profile & role-aware navigation
 */
import React from 'react';
import { 
  Building2, 
  ShieldCheck, 
  User, 
  LayoutDashboard, 
  Menu, 
  Plus, 
  FileSpreadsheet,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useGoogleSheets } from '../../context/GoogleSheetsContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { ThemeToggle } from '../common/ThemeToggle.tsx';

interface EmployeeHeaderProps {
  currentTitle?: string;
  onOpenAdmin: () => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  onOpenSheetsModal: () => void;
}

export const EmployeeHeader: React.FC<EmployeeHeaderProps> = ({
  currentTitle,
  onOpenAdmin,
  onNewChat,
  onToggleSidebar,
  onOpenSheetsModal
}) => {
  const { userProfile, userRole, logout } = useAuth();
  const { config, isConnected, isSyncing, syncWithSheet } = useGoogleSheets();
  const { theme, isDark, isLight, isHighContrast } = useTheme();

  return (
    <header className={`h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0 select-none transition-colors duration-200 ${
      isLight
        ? 'bg-white/90 border-b border-slate-200/90 text-slate-900 shadow-2xs backdrop-blur-md'
        : isHighContrast
        ? 'bg-black border-b-2 border-white text-white'
        : 'bg-slate-950/60 border-b border-white/10 text-slate-100 backdrop-blur-2xl'
    }`}>
      {/* Right Side: Logo & System Identity */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className={`lg:hidden p-2 -mr-2 rounded-xl transition-colors cursor-pointer border ${
            isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              : isHighContrast
              ? 'text-white border-2 border-white'
              : 'text-slate-400 hover:text-white hover:bg-white/10 border-transparent hover:border-white/10'
          }`}
          title="القائمة الجانبية"
          aria-label="القائمة الجانبية"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-emerald-500/20 border border-emerald-400/30 shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-sm font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Tax Support AI
            </h1>
            <p className={`text-[11px] font-medium leading-none mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              المساعد الداخلي لمصلحة الضرائب العقارية
            </p>
          </div>
        </div>
      </div>

      {/* Center: Current Chat Context Title */}
      <div className="hidden md:flex items-center justify-center max-w-sm px-4">
        {currentTitle && currentTitle !== 'محادثة استفسار ضريبي جديدة' && currentTitle !== 'استفسار جديد' ? (
          <span className={`text-xs font-semibold truncate px-3.5 py-1 rounded-full border ${
            isLight
              ? 'bg-slate-100 text-slate-800 border-slate-200 shadow-2xs'
              : isHighContrast
              ? 'bg-black text-white border-2 border-white font-bold'
              : 'bg-white/5 text-slate-200 border-white/10 backdrop-blur-md'
          }`}>
            {currentTitle}
          </span>
        ) : null}
      </div>

      {/* Left Side: Actions, Theme Switcher & Employee Profile Menu */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Contrast / Theme Mode Toggle */}
        <ThemeToggle />

        {/* Google Sheets Sync Indicator (Visible ONLY to Admin) */}
        {userRole === 'admin' && (
          <button
            onClick={onOpenSheetsModal}
            className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              config?.spreadsheetId
                ? isLight
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs font-semibold'
                  : isHighContrast
                  ? 'bg-black text-emerald-300 border-2 border-emerald-400 font-bold'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 shadow-sm backdrop-blur-md'
                : isLight
                ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900 shadow-2xs'
                : isHighContrast
                ? 'bg-black text-white border-2 border-white hover:bg-zinc-900'
                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white backdrop-blur-md'
            }`}
            title={config?.spreadsheetId ? `متصل بـ Google Sheets: ${config.spreadsheetTitle}` : 'ربط ومزامنة جداول Google Sheets'}
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${config?.spreadsheetId ? 'text-emerald-500' : isLight ? 'text-slate-500' : 'text-slate-400'}`} />
            <span>
              {config?.spreadsheetId ? config.spreadsheetTitle.slice(0, 16) + (config.spreadsheetTitle.length > 16 ? '...' : '') : 'Google Sheets'}
            </span>
            {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-emerald-500 mr-1" />}
          </button>
        )}

        <button
          onClick={onNewChat}
          className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer ${
            isLight
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
              : isHighContrast
              ? 'bg-black text-white border-2 border-white hover:bg-zinc-800 font-bold'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md backdrop-blur-md'
          }`}
          title="استفسار جديد"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">استفسار جديد</span>
        </button>

        {/* Admin Console Entry (Visible ONLY to verified Admin role) */}
        {userRole === 'admin' && (
          <button
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-3 py-1.5 rounded-xl border border-emerald-400/30 shadow-md shadow-emerald-950/20 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            title="لوحة الإدارة الشاملة"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-emerald-200" />
            <span className="hidden sm:inline">لوحة الإدارة</span>
          </button>
        )}

        {/* Authenticated User Pill & Logout */}
        <div className={`flex items-center gap-2 pr-2 border-r ${isLight ? 'border-slate-200' : isHighContrast ? 'border-white' : 'border-white/10'}`}>
          <div className={`w-8 h-8 rounded-xl border font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs ${
            isLight
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
              : isHighContrast
              ? 'bg-white text-black border-2 border-white font-bold'
              : 'bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border-white/15 text-white'
          }`}>
            {userProfile?.displayName?.charAt(0) || 'م'}
          </div>
          <div className="hidden sm:block text-right">
            <div className={`text-xs font-bold leading-tight ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              {userProfile?.displayName || 'موظف الضرائب'}
            </div>
            <div className={`text-[10px] truncate max-w-[130px] ${isLight ? 'text-slate-500 font-medium' : 'text-slate-400'}`}>
              {userRole === 'admin' ? 'مشرف نظام (Admin)' : (userProfile?.jobTitle || 'مأمور ضرائب')}
            </div>
          </div>
          <button
            onClick={() => logout()}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer border ${
              isLight
                ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-200'
                : isHighContrast
                ? 'text-white border-2 border-transparent hover:border-rose-400'
                : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border-transparent hover:border-rose-500/20'
            }`}
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

