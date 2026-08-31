/**
 * Employee Header Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * Enterprise-grade institutional call-center header
 */
import React from 'react';
import { 
  ShieldCheck, 
  User, 
  LayoutDashboard, 
  Menu, 
  Plus, 
  FileSpreadsheet,
  LogOut,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { TaxAuthorityLogo } from '../common/TaxAuthorityLogo.tsx';
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
  const { config, isSyncing } = useGoogleSheets();
  const { isLight, isHighContrast } = useTheme();

  return (
    <header className={`h-14 px-3 sm:px-5 flex items-center justify-between sticky top-0 z-30 shrink-0 select-none transition-colors duration-150 ${
      isLight
        ? 'bg-white border-b border-slate-200 text-slate-900 shadow-xs'
        : isHighContrast
        ? 'bg-black border-b-2 border-white text-white'
        : 'bg-slate-900 border-b border-slate-800 text-slate-100'
    }`} dir="rtl">
      {/* Right Side: Institution Branding & Sidebar Toggle */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          className={`lg:hidden p-1.5 rounded-lg transition-colors cursor-pointer border ${
            isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              : isHighContrast
              ? 'text-white border-2 border-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800 border-slate-700'
          }`}
          title="القائمة الجانبية"
          aria-label="القائمة الجانبية"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <TaxAuthorityLogo className="w-9 h-9 rounded-full shadow-xs shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xs sm:text-sm font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                مصلحة الضرائب العقارية
              </h1>
              <span className={`hidden sm:inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                isLight 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
              }`}>
                المساعد الذكي
              </span>
            </div>
            <p className={`text-[10px] font-medium leading-none mt-0.5 hidden sm:block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              منظومة الدعم والرد التشغيلي المعتمدة لمأموري الفحص والخدمات
            </p>
          </div>
        </div>
      </div>

      {/* Center: Current Chat Context Title */}
      <div className="hidden md:flex items-center justify-center max-w-sm px-4">
        {currentTitle && currentTitle !== 'محادثة استفسار ضريبي جديدة' && currentTitle !== 'استفسار جديد' ? (
          <span className={`text-xs font-semibold truncate px-3 py-1 rounded-md border ${
            isLight
              ? 'bg-slate-50 text-slate-700 border-slate-200'
              : isHighContrast
              ? 'bg-black text-white border border-white'
              : 'bg-slate-800 text-slate-200 border-slate-700'
          }`}>
            {currentTitle}
          </span>
        ) : null}
      </div>

      {/* Left Side: Actions, Theme Switcher & Authenticated Profile */}
      <div className="flex items-center gap-2">
        {/* Contrast / Theme Mode Toggle */}
        <ThemeToggle />

        {/* Google Sheets Sync Indicator (Visible to Admin) */}
        {userRole === 'admin' && (
          <button
            onClick={onOpenSheetsModal}
            className={`hidden md:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
              config?.spreadsheetId
                ? isLight
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-semibold'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60'
                : isLight
                ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title={config?.spreadsheetId ? `متصل بـ Google Sheets: ${config.spreadsheetTitle}` : 'ربط جداول Google Sheets'}
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${config?.spreadsheetId ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="truncate max-w-[110px]">
              {config?.spreadsheetId ? config.spreadsheetTitle : 'Google Sheets'}
            </span>
            {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-emerald-600 mr-0.5" />}
          </button>
        )}

        <button
          onClick={onNewChat}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-900 shadow-2xs transition-colors cursor-pointer active:scale-95"
          title="استفسار جديد"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">استفسار جديد</span>
        </button>

        {/* Admin Console Button */}
        {userRole === 'admin' && (
          <button
            onClick={onOpenAdmin}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer active:scale-95 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="لوحة الإدارة الشاملة"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">لوحة الإدارة</span>
          </button>
        )}

        {/* Authenticated User Pill & Logout */}
        <div className={`flex items-center gap-2 pr-2 border-r ${isLight ? 'border-slate-200' : isHighContrast ? 'border-white' : 'border-slate-800'}`}>
          <div className={`w-7 h-7 rounded-lg border font-bold text-xs flex items-center justify-center shrink-0 ${
            isLight
              ? 'bg-slate-100 text-slate-800 border-slate-300'
              : isHighContrast
              ? 'bg-white text-black border border-white font-bold'
              : 'bg-slate-800 border-slate-700 text-slate-100'
          }`}>
            {userProfile?.displayName?.charAt(0) || 'م'}
          </div>
          <div className="hidden sm:block text-right">
            <div className={`text-xs font-bold leading-tight ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              {userProfile?.displayName || 'مصطفى عدلي'}
            </div>
            <div className={`text-[10px] truncate max-w-[120px] ${isLight ? 'text-slate-500 font-medium' : 'text-slate-400'}`}>
              {userRole === 'admin' ? 'مشرف نظام (Admin)' : (userProfile?.jobTitle || 'مأمور ضرائب')}
            </div>
          </div>
          <button
            onClick={() => logout()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer border border-transparent ${
              isLight
                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200'
                : isHighContrast
                ? 'text-white hover:border-rose-400'
                : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30'
            }`}
            title="تسجيل الخروج"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};


