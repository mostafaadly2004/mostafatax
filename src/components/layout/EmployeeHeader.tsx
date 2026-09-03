/**
 * Employee Header Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * Enterprise-grade institutional call-center header
 */
import React from 'react';
import { 
  User, 
  LayoutDashboard, 
  Menu, 
  Plus, 
  FileSpreadsheet,
  LogOut,
  RefreshCw,
  Sparkles
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
    <header className={`h-15 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0 select-none border-b transition-colors ${
      isLight
        ? 'bg-white border-slate-200/90 text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
        : isHighContrast
        ? 'bg-black border-b-2 border-white text-white'
        : 'bg-[#0f172a] border-slate-800/90 text-slate-100'
    }`} dir="rtl">
      
      {/* Right Side: Institution Branding & Sidebar Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className={`lg:hidden p-2 rounded-lg transition-colors cursor-pointer border ${
            isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              : isHighContrast
              ? 'text-white border-2 border-white'
              : 'text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700'
          }`}
          title="سجل الاستفسارات"
          aria-label="القائمة الجانبية"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <TaxAuthorityLogo className="w-9 h-9 rounded-full shrink-0 ring-1 ring-slate-200 dark:ring-slate-700" />
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className={`text-xs sm:text-sm font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                مصلحة الضرائب العقارية
              </span>
              <span className={`hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                isLight 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : isHighContrast
                  ? 'bg-white text-black font-bold'
                  : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
              }`}>
                المساعد التشغيلي
              </span>
            </div>
            <p className={`text-[11px] font-medium leading-none mt-1 hidden md:block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              منظومة الدعم المعتمدة لمأموري الفحص وخدمة العملاء
            </p>
          </div>
        </div>
      </div>

      {/* Center: Current Chat Context Title */}
      <div className="hidden lg:flex items-center justify-center max-w-md px-4">
        {currentTitle && currentTitle !== 'استفسار ضريبي جديد' && currentTitle !== 'محادثة استفسار ضريبي جديدة' && (
          <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-lg border max-w-sm truncate ${
            isLight
              ? 'bg-slate-50 text-slate-700 border-slate-200'
              : isHighContrast
              ? 'bg-black text-white border border-white'
              : 'bg-slate-900 text-slate-300 border-slate-800'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="truncate">{currentTitle}</span>
          </div>
        )}
      </div>

      {/* Left Side: Actions, Theme Switcher & Authenticated Profile */}
      <div className="flex items-center gap-2.5">
        {/* Contrast / Theme Mode Toggle */}
        <ThemeToggle />

        {/* Google Sheets Sync Indicator (Visible to Admin) */}
        {userRole === 'admin' && (
          <button
            onClick={onOpenSheetsModal}
            className={`hidden md:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              config?.spreadsheetId
                ? isLight
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-semibold'
                  : isHighContrast
                  ? 'bg-black text-white border-2 border-white'
                  : 'bg-emerald-950/50 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50'
                : isLight
                ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title={config?.spreadsheetId ? `متصل بـ Google Sheets: ${config.spreadsheetTitle}` : 'ربط جداول Google Sheets'}
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${config?.spreadsheetId ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
            <span className="truncate max-w-[120px]">
              {config?.spreadsheetId ? config.spreadsheetTitle : 'ربط Sheets'}
            </span>
            {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-emerald-600 dark:text-emerald-400 mr-0.5" />}
          </button>
        )}

        {/* New Query Action */}
        <button
          onClick={onNewChat}
          className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95 shadow-xs ${
            isHighContrast
              ? 'bg-white text-black border-2 border-white'
              : 'bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-900'
          }`}
          title="بدء استفسار ضريبي جديد"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">استفسار جديد</span>
        </button>

        {/* Admin Console Button */}
        {userRole === 'admin' && (
          <button
            onClick={onOpenAdmin}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer active:scale-95 ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                : isHighContrast
                ? 'bg-black text-white border-2 border-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="لوحة الإشراف والمراقبة المركزية"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">لوحة الإدارة</span>
          </button>
        )}

        {/* Authenticated User & Logout */}
        <div className={`flex items-center gap-2.5 pr-2.5 border-r ${isLight ? 'border-slate-200' : isHighContrast ? 'border-white' : 'border-slate-800'}`}>
          <div className={`w-8 h-8 rounded-lg border font-bold text-xs flex items-center justify-center shrink-0 ${
            isLight
              ? 'bg-slate-100 text-slate-800 border-slate-200'
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
                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200'
                : isHighContrast
                ? 'text-white hover:border-rose-400'
                : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30'
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


