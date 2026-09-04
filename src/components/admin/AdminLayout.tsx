/**
 * Admin Central Dashboard Layout Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 */

import React, { useState, Suspense, lazy } from 'react';
import { 
  LayoutDashboard, 
  Database, 
  FileText, 
  Users, 
  HelpCircle, 
  ShieldCheck, 
  Settings, 
  ArrowRight,
  Loader2,
  Award
} from 'lucide-react';
import { TaxAuthorityLogo } from '../common/TaxAuthorityLogo.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { ThemeToggle } from '../common/ThemeToggle.tsx';

// Lazy-load individual admin sub-modules so they do not block the main thread
const AdminOverview = lazy(() => import('./AdminOverview.tsx').then(m => ({ default: m.AdminOverview })));
const AdminPerformance = lazy(() => import('./AdminPerformance.tsx').then(m => ({ default: m.AdminPerformance })));
const AdminDatabaseStudio = lazy(() => import('./AdminDatabaseStudio.tsx').then(m => ({ default: m.AdminDatabaseStudio })));
const AdminKnowledge = lazy(() => import('./AdminKnowledge.tsx').then(m => ({ default: m.AdminKnowledge })));
const AdminUsers = lazy(() => import('./AdminUsers.tsx').then(m => ({ default: m.AdminUsers })));
const AdminUnanswered = lazy(() => import('./AdminUnanswered.tsx').then(m => ({ default: m.AdminUnanswered })));
const AdminAuditLogs = lazy(() => import('./AdminAuditLogs.tsx').then(m => ({ default: m.AdminAuditLogs })));
const AdminSettings = lazy(() => import('./AdminSettings.tsx').then(m => ({ default: m.AdminSettings })));

interface AdminLayoutProps {
  onBackToChat: () => void;
}

const TabFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
    <span className="text-xs">جاري تحميل لوحة التحكم...</span>
  </div>
);

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onBackToChat }) => {
  const { userProfile, logout } = useAuth();
  const { theme, isDark, isLight, isHighContrast } = useTheme();
  const [activeTab, setActiveTab] = useState<string>('overview');

  interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
  }

  const navItems: NavItem[] = [
    { id: 'overview', label: 'لوحة التحكم والمؤشرات', icon: LayoutDashboard },
    { id: 'performance', label: 'تقييم وأداء الموظفين (KPIs)', icon: Award },
    { id: 'users', label: 'إدارة الموظفين', icon: Users },
    { id: 'knowledge', label: 'قاعدة المعرفة الضريبية', icon: FileText },
    { id: 'unanswered', label: 'استفسارات معلقة', icon: HelpCircle },
    { id: 'audit', label: 'سجل التدقيق (Audit)', icon: ShieldCheck },
    { id: 'database', label: 'استوديو البيانات (DB)', icon: Database },
    { id: 'settings', label: 'إعدادات النظام', icon: Settings },
  ];

  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-x-hidden ${
      isLight
        ? 'bg-slate-100 text-slate-900'
        : isHighContrast
        ? 'bg-black text-white'
        : 'bg-[#020617] text-slate-100'
    }`} dir="rtl">
      {/* Admin Top Navbar */}
      <header className={`border-b px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between sticky top-0 z-30 ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900 shadow-2xs'
          : isHighContrast
          ? 'bg-black border-2 border-white text-white'
          : 'bg-[#0f172a] border-slate-800 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <TaxAuthorityLogo className="w-9 h-9 rounded-full shrink-0 ring-1 ring-slate-200 dark:ring-slate-700" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xs sm:text-sm font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                لوحة إدارة مصلحة الضرائب العقارية
              </h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                isLight
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : isHighContrast
                  ? 'bg-black text-emerald-300 border-2 border-emerald-400'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
              }`}>
                Admin Center
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <button
            onClick={onBackToChat}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isLight
                ? 'bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-900 shadow-2xs'
                : isHighContrast
                ? 'bg-white hover:bg-zinc-200 text-black border-2 border-white font-bold'
                : 'bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-700'
            }`}
          >
            <span>العودة لشاشة الموظف</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-3 sm:p-5 gap-5 relative z-10">
        {/* Navigation Sidebar */}
        <aside className={`w-full md:w-64 rounded-xl border p-2.5 sm:p-3 shrink-0 self-start ${
          isLight
            ? 'bg-white border-slate-200 shadow-2xs'
            : isHighContrast
            ? 'bg-black border-2 border-white text-white'
            : 'bg-[#111827] border-slate-800'
        }`}>
          <div className={`hidden md:block px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}>
            أقسام الإدارة والرقابة
          </div>
          <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible gap-1 pb-1 md:pb-0 no-scrollbar">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-right shrink-0 md:shrink md:w-full
                    ${isActive
                      ? isLight
                        ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                        : isHighContrast
                        ? 'bg-white text-black font-bold border-2 border-white'
                        : 'bg-emerald-800 text-white font-bold border border-emerald-700'
                      : item.highlight
                      ? isLight
                        ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200 font-bold'
                        : isHighContrast
                        ? 'bg-black text-emerald-300 hover:bg-zinc-900 border-2 border-emerald-400 font-bold'
                        : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/70 border border-emerald-800 font-bold'
                      : isLight
                      ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                      : isHighContrast
                      ? 'text-white hover:bg-zinc-900 hover:text-white border-2 border-transparent hover:border-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'}
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${
                      isActive 
                        ? isHighContrast ? 'text-black' : 'text-white' 
                        : item.highlight 
                        ? (isLight ? 'text-emerald-800' : 'text-emerald-400') 
                        : (isLight ? 'text-slate-500' : 'text-slate-400')
                    }`} />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </div>
                  {item.highlight && !isActive && (
                    <span className="hidden md:inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content Workspace */}
        <main className="flex-1 min-w-0">
          <Suspense fallback={<TabFallback />}>
            {activeTab === 'overview' && <AdminOverview onNavigateTab={setActiveTab} />}
            {activeTab === 'performance' && <AdminPerformance />}
            {activeTab === 'users' && <AdminUsers />}
            {activeTab === 'knowledge' && <AdminKnowledge />}
            {activeTab === 'unanswered' && <AdminUnanswered />}
            {activeTab === 'audit' && <AdminAuditLogs />}
            {activeTab === 'database' && <AdminDatabaseStudio />}
            {activeTab === 'settings' && <AdminSettings />}
          </Suspense>
        </main>
      </div>
    </div>
  );
};
