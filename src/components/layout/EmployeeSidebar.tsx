/**
 * Employee Sidebar Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * Professional Call-Center Chat History & Navigation
 */

import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Search, 
  Trash2, 
  Pin, 
  ShieldCheck, 
  X, 
  Edit2,
  LogOut,
  FileSpreadsheet
} from 'lucide-react';
import { TaxAuthorityLogo } from '../common/TaxAuthorityLogo.tsx';
import { Conversation } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useGoogleSheets } from '../../context/GoogleSheetsContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';

interface EmployeeSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onTogglePinConversation: (id: string, e: React.MouseEvent) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenAdmin: () => void;
  onOpenSheetsModal: () => void;
}

export const EmployeeSidebar: React.FC<EmployeeSidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onTogglePinConversation,
  onRenameConversation,
  isOpen,
  onClose,
  onOpenAdmin,
  onOpenSheetsModal
}) => {
  const { userProfile, userRole, logout } = useAuth();
  const { config } = useGoogleSheets();
  const { isLight, isHighContrast } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Filter conversations
  const filtered = conversations.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.messages?.some(m => m.content.toLowerCase().includes(q))
    );
  });

  // Group by time
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;

  const pinnedConvs = filtered.filter(c => c.pinned);
  const todayConvs = filtered.filter(c => !c.pinned && (now - c.updatedAt < oneDay));
  const yesterdayConvs = filtered.filter(c => !c.pinned && (now - c.updatedAt >= oneDay && now - c.updatedAt < 2 * oneDay));
  const pastWeekConvs = filtered.filter(c => !c.pinned && (now - c.updatedAt >= 2 * oneDay && now - c.updatedAt < oneWeek));
  const olderConvs = filtered.filter(c => !c.pinned && (now - c.updatedAt >= oneWeek));

  const startRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const saveRename = (id: string) => {
    if (editTitle.trim() && onRenameConversation) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const renderConvItem = (conv: Conversation) => {
    const isActive = conv.id === activeId;
    const isEditing = conv.id === editingId;

    return (
      <div
        key={conv.id}
        onClick={() => {
          if (!isEditing) {
            onSelectConversation(conv.id);
            onClose();
          }
        }}
        className={`
          group relative flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-xs select-none
          ${isActive 
            ? isLight
              ? 'bg-emerald-50 text-emerald-950 font-semibold border border-emerald-300'
              : isHighContrast
              ? 'bg-white text-black font-bold border border-white'
              : 'bg-emerald-950/50 text-emerald-100 font-semibold border border-emerald-800/60' 
            : isLight
            ? 'text-slate-700 hover:bg-slate-100 border border-transparent'
            : isHighContrast
            ? 'text-white hover:bg-zinc-900 border border-transparent hover:border-white'
            : 'text-slate-300 hover:bg-slate-800 border border-transparent'}
        `}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${
            isActive 
              ? isLight ? 'text-emerald-700' : isHighContrast ? 'text-black' : 'text-emerald-400' 
              : isLight ? 'text-slate-400' : 'text-slate-500'
          }`} />
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              autoFocus
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => saveRename(conv.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRename(conv.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className={`border rounded px-1.5 py-0.5 text-xs outline-none w-full ${
                isLight 
                  ? 'bg-white border-emerald-600 text-slate-900' 
                  : isHighContrast
                  ? 'bg-black border border-white text-white'
                  : 'bg-slate-900 border-emerald-500 text-white'
              }`}
            />
          ) : (
            <span className="truncate">{conv.title || 'محادثة جديدة'}</span>
          )}
        </div>

        {/* Action icons on hover */}
        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => onTogglePinConversation(conv.id, e)}
              className={`p-1 rounded transition-colors ${
                isLight
                  ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                  : 'hover:bg-slate-700 text-slate-400 hover:text-white'
              } ${conv.pinned ? (isLight ? 'opacity-100 text-emerald-700' : 'opacity-100 text-emerald-400') : ''}`}
              title={conv.pinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى'}
            >
              <Pin className={`w-3 h-3 ${conv.pinned ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={(e) => startRename(conv, e)}
              className={`p-1 rounded transition-colors ${
                isLight ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-900' : 'hover:bg-slate-700 text-slate-400 hover:text-white'
              }`}
              title="إعادة تسمية"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => onDeleteConversation(conv.id, e)}
              className={`p-1 rounded transition-colors ${
                isLight ? 'hover:bg-rose-100 text-slate-500 hover:text-rose-700' : 'hover:bg-rose-950 text-slate-400 hover:text-rose-400'
              }`}
              title="حذف المحادثة"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed lg:static inset-y-0 right-0 z-50
          w-68 sm:w-72 flex flex-col h-full transition-all duration-150 ease-out shadow-lg lg:shadow-none
          ${isLight
            ? 'bg-slate-50 border-l border-slate-200 text-slate-800'
            : isHighContrast
            ? 'bg-black border-l-2 border-white text-white'
            : 'bg-slate-950 border-l border-slate-800 text-slate-100'}
          ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Top Header / New Chat */}
        <div className={`p-3 space-y-2.5 border-b shrink-0 ${isLight ? 'border-slate-200' : isHighContrast ? 'border-white' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between lg:hidden pb-1">
            <div className="flex items-center gap-1.5">
              <TaxAuthorityLogo className="w-5 h-5 rounded-full shadow-2xs" />
              <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>سجل الاستفسارات</span>
            </div>
            <button onClick={onClose} className={`p-1 ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-900 shadow-2xs transition-colors cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>استفسار جديد</span>
          </button>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="البحث في المحادثات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full text-xs py-1.5 pr-7 pl-2.5 rounded-lg outline-none transition-all ${
                isLight
                  ? 'bg-white border border-slate-300 focus:border-emerald-700 text-slate-900 placeholder:text-slate-400'
                  : isHighContrast
                  ? 'bg-black border border-white text-white placeholder:text-zinc-400'
                  : 'bg-slate-900 border border-slate-700 focus:border-emerald-500 text-slate-100 placeholder:text-slate-500'
              }`}
            />
            <Search className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600`}
              >
                مسح
              </button>
            )}
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {conversations.length === 0 ? (
            <div className="text-center py-10 px-3 space-y-1.5">
              <MessageSquare className={`w-6 h-6 mx-auto ${isLight ? 'text-slate-300' : 'text-slate-700'}`} />
              <p className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>لا توجد محادثات سابقة</p>
              <p className={`text-[11px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>اطرح أول استفسار ضريبي للبدء</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className={`text-center py-6 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              لا توجد نتائج تطابق "{searchQuery}"
            </div>
          ) : (
            <>
              {/* Pinned */}
              {pinnedConvs.length > 0 && (
                <div className="space-y-0.5">
                  <div className={`px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                    <Pin className="w-2.5 h-2.5 fill-current" />
                    <span>المثبتة</span>
                  </div>
                  {pinnedConvs.map(renderConvItem)}
                </div>
              )}

              {/* Today */}
              {todayConvs.length > 0 && (
                <div className="space-y-0.5">
                  <div className={`px-2.5 py-1 text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>اليوم</div>
                  {todayConvs.map(renderConvItem)}
                </div>
              )}

              {/* Yesterday */}
              {yesterdayConvs.length > 0 && (
                <div className="space-y-0.5">
                  <div className={`px-2.5 py-1 text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>أمس</div>
                  {yesterdayConvs.map(renderConvItem)}
                </div>
              )}

              {/* Past Week */}
              {pastWeekConvs.length > 0 && (
                <div className="space-y-0.5">
                  <div className={`px-2.5 py-1 text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>الأسبوع الماضي</div>
                  {pastWeekConvs.map(renderConvItem)}
                </div>
              )}

              {/* Older */}
              {olderConvs.length > 0 && (
                <div className="space-y-0.5">
                  <div className={`px-2.5 py-1 text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>سابقة</div>
                  {olderConvs.map(renderConvItem)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer: Authenticated Profile */}
        <div className={`p-2.5 border-t shrink-0 ${
          isLight ? 'bg-slate-100/70 border-slate-200' : isHighContrast ? 'bg-black border-white' : 'border-slate-800 bg-slate-900/40'
        }`}>
          <div className={`flex items-center justify-between p-2 rounded-lg border ${
            isLight
              ? 'bg-white border-slate-200 text-slate-900 shadow-2xs'
              : isHighContrast
              ? 'bg-black border border-white text-white'
              : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-md border flex items-center justify-center font-bold text-xs shrink-0 ${
                isLight
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : isHighContrast
                  ? 'bg-white text-black border border-white'
                  : 'bg-slate-800 border-slate-700 text-slate-100'
              }`}>
                {userProfile?.displayName?.charAt(0) || 'م'}
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {userProfile?.displayName || 'مصطفى عدلي'}
                </div>
                <div className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {userRole === 'admin' ? 'مدير النظام (Admin)' : (userProfile?.jobTitle || 'مأمور ضرائب')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              {userRole === 'admin' && (
                <button
                  onClick={() => {
                    onOpenAdmin();
                    onClose();
                  }}
                  className={`p-1 rounded transition-colors border cursor-pointer ${
                    isLight
                      ? 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 border-slate-200'
                      : 'text-slate-300 hover:text-emerald-400 hover:bg-slate-800 border-slate-700'
                  }`}
                  title="لوحة الإدارة"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => logout()}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  isLight
                    ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                    : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950'
                }`}
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};


