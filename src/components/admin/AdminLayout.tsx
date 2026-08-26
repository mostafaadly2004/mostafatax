/**
 * Admin Central Dashboard Layout Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 */

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Database, 
  FileText, 
  Users, 
  MessageSquare, 
  HelpCircle, 
  FlaskConical, 
  ShieldCheck, 
  Settings, 
  ArrowRight,
  LogOut,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { ThemeToggle } from '../common/ThemeToggle.tsx';
import { AdminOverview } from './AdminOverview.tsx';
import { AdminGoogleSheets } from './AdminGoogleSheets.tsx';
import { AdminDatabaseStudio } from './AdminDatabaseStudio.tsx';
import { AdminKnowledge } from './AdminKnowledge.tsx';
import { AdminUsers } from './AdminUsers.tsx';
import { AdminConversations } from './AdminConversations.tsx';
import { AdminUnanswered } from './AdminUnanswered.tsx';
import { AdminTesting } from './AdminTesting.tsx';
import { AdminAuditLogs } from './AdminAuditLogs.tsx';
import { AdminSettings } from './AdminSettings.tsx';

interface AdminLayoutProps {
  onBackToChat: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onBackToChat }) => {
  const { userProfile, logout } = useAuth();
  const { theme, isDark, isLight, isHighContrast } = useTheme();
  const [activeTab, setActiveTab] = useState<string>('overview');

  const navItems = [
    { id: 'overview', label: 'نظرة عامة ومؤشرات', icon: LayoutDashboard },
    { id: 'sheets', label: 'Google Sheets والمزامنة', icon: FileSpreadsheet, highlight: true },
    { id: 'database', label: 'استوديو البيانات (DB)', icon: Database },
    { id: 'knowledge', label: 'قواعد المعرفة والمستندات', icon: FileText },
    { id: 'users', label: 'إدارة الموظفين', icon: Users },
    { id: 'conversations', label: 'مراقبة المحادثات', icon: MessageSquare },
    { id: 'unanswered', label: 'استفسارات معلقة', icon: HelpCircle },
    { id: 'testing', label: 'حزمة الاختبارات (8 Tests)', icon: FlaskConical },
    { id: 'audit', label: 'سجل التدقيق (Audit)', icon: ShieldCheck },
    { id: 'settings', label: 'الإعدادات والنسب', icon: Settings },
  ];

  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-x-hidden ${
      isLight
        ? 'bg-slate-100 text-slate-900'
        : isHighContrast
        ? 'bg-black text-white'
        : 'bg-[#020617] text-slate-100'
    }`} dir="rtl">
      {/* Frosted Glass Glowing Ambient Orbs for dark mode */}
      {!isLight && !isHighContrast && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-600/20 rounded-full blur-[130px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/15 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute top-[35%] right-[25%] w-[35%] h-[35%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        </>
      )}

      {/* Admin Top Navbar */}
      <header className={`border-b px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between sticky top-0 z-30 shadow-sm ${
        isLight
          ? 'bg-white/90 backdrop-blur-md border-slate-200 text-slate-900'
          : isHighContrast
          ? 'bg-black border-2 border-white text-white'
          : 'bg-slate-950/60 backdrop-blur-2xl border-white/10 text-white shadow-lg'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
            R
          </div>
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
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 backdrop-blur-md'
              }`}>
                Admin Center
              </span>
            </div>
            <p className={`text-[10px] hidden sm:block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              التحكم في نماذج الذكاء الاصطناعي وتكامل Google Workspace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={onBackToChat}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isLight
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs'
                : isHighContrast
                ? 'bg-white hover:bg-zinc-200 text-black border-2 border-white font-bold'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/50 border border-emerald-400/30 backdrop-blur-md'
            }`}
          >
            <span>العودة لشاشة الموظف</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-3 sm:p-5 gap-5 relative z-10">
        {/* Navigation Sidebar */}
        <aside className={`w-full md:w-64 rounded-3xl border p-2.5 sm:p-3 shadow-md shrink-0 self-start ${
          isLight
            ? 'bg-white border-slate-200 shadow-slate-200/50'
            : isHighContrast
            ? 'bg-black border-2 border-white text-white'
            : 'bg-white/5 backdrop-blur-2xl border-white/10 shadow-2xl'
        }`}>
          <div className={`hidden md:block px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}>
            أقسام الإدارة والرقابة
          </div>
          <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible gap-1.5 md:space-y-1 pb-1 md:pb-0 no-scrollbar">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-right shrink-0 md:shrink md:w-full
                    ${isActive
                      ? isLight
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : isHighContrast
                        ? 'bg-white text-black font-bold border-2 border-white'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/40 border border-emerald-400/30 font-bold backdrop-blur-md'
                      : item.highlight
                      ? isLight
                        ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-bold'
                        : isHighContrast
                        ? 'bg-black text-emerald-300 hover:bg-zinc-900 border-2 border-emerald-400 font-bold'
                        : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 font-bold'
                      : isLight
                      ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                      : isHighContrast
                      ? 'text-white hover:bg-zinc-900 hover:text-white border-2 border-transparent hover:border-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10 backdrop-blur-md'}
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${
                      isActive 
                        ? isHighContrast ? 'text-black' : 'text-white' 
                        : item.highlight 
                        ? (isLight ? 'text-emerald-700' : 'text-emerald-400') 
                        : (isLight ? 'text-slate-500' : 'text-slate-400')
                    }`} />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </div>
                  {item.highlight && !isActive && (
                    <span className="hidden md:inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2"></span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content Workspace */}
        <main className="flex-1 min-w-0">
          {activeTab === 'overview' && <AdminOverview onNavigateTab={setActiveTab} />}
          {activeTab === 'sheets' && <AdminGoogleSheets />}
          {activeTab === 'database' && <AdminDatabaseStudio />}
          {activeTab === 'knowledge' && <AdminKnowledge />}
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'conversations' && <AdminConversations />}
          {activeTab === 'unanswered' && <AdminUnanswered />}
          {activeTab === 'testing' && <AdminTesting />}
          {activeTab === 'audit' && <AdminAuditLogs />}
          {activeTab === 'settings' && <AdminSettings />}
        </main>
      </div>
    </div>
  );
};
