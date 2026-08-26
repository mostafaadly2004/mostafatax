/**
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * Enterprise Arabic AI assistant with Google Sheets & Drive sync, 
 * Law 196 calculator, and comprehensive admin management.
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { GoogleSheetsProvider, useGoogleSheets } from './context/GoogleSheetsContext.tsx';
import { EmployeeHeader } from './components/layout/EmployeeHeader.tsx';
import { EmployeeSidebar } from './components/layout/EmployeeSidebar.tsx';
import { EmployeeChatArea } from './components/chat/EmployeeChatArea.tsx';
import { GoogleSheetsSyncModal } from './components/sheets/GoogleSheetsSyncModal.tsx';
import { AdminLayout } from './components/admin/AdminLayout.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { Conversation, Message } from './types.ts';
import { getStoredConversations, setStoredConversations } from './lib/storage.ts';
import { apiFetch } from './lib/api-client.ts';

const MainApp: React.FC = () => {
  const { userProfile, isAuthenticated, userRole } = useAuth();
  const { config } = useGoogleSheets();
  const { theme, isDark, isLight, isHighContrast } = useTheme();

  const [activeView, setActiveView] = useState<'chat' | 'admin'>('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    const saved = getStoredConversations();
    if (saved && saved.length > 0) {
      setConversations(saved);
      setActiveConvId(saved[0].id);
    } else {
      // Create initial conversation
      const initConv: Conversation = {
        id: `conv_${Date.now()}`,
        title: 'استفسار ضريبي جديد',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: userProfile?.uid || 'user-1',
        userName: userProfile?.displayName || 'موظف الضرائب',
        messages: []
      };
      setConversations([initConv]);
      setActiveConvId(initConv.id);
      setStoredConversations([initConv]);
    }
  }, [userProfile?.uid]);

  const activeConversation = conversations.find(c => c.id === activeConvId) || null;

  const handleNewChat = () => {
    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'استفسار ضريبي جديد',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: userProfile?.uid || 'user-1',
      userName: userProfile?.displayName || 'موظف الضرائب',
      messages: []
    };
    const updated = [newConv, ...conversations];
    setConversations(updated);
    setActiveConvId(newConv.id);
    setStoredConversations(updated);
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    setStoredConversations(updated);
    if (activeConvId === id) {
      setActiveConvId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleTogglePinConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = conversations.map(c => 
      c.id === id ? { ...c, pinned: !c.pinned } : c
    );
    setConversations(updated);
    setStoredConversations(updated);
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    const updated = conversations.map(c => 
      c.id === id ? { ...c, title: newTitle } : c
    );
    setConversations(updated);
    setStoredConversations(updated);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage('');

    let currentConv = activeConversation;
    let updatedConversations = [...conversations];

    if (!currentConv) {
      currentConv = {
        id: `conv_${Date.now()}`,
        title: userText.slice(0, 30),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: userProfile?.uid || 'user-1',
        userName: userProfile?.displayName || 'موظف الضرائب',
        messages: []
      };
      updatedConversations = [currentConv, ...updatedConversations];
      setActiveConvId(currentConv.id);
    }

    const userMsg: Message = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: userText,
      timestamp: Date.now()
    };

    const newMessages = [...currentConv.messages, userMsg];
    const isFirstMsg = currentConv.messages.length === 0;
    const convTitle = isFirstMsg ? (userText.length > 35 ? userText.slice(0, 35) + '...' : userText) : currentConv.title;

    const updatedCurrentConv = {
      ...currentConv,
      title: convTitle,
      updatedAt: Date.now(),
      messages: newMessages
    };

    updatedConversations = updatedConversations.map(c => 
      c.id === currentConv!.id ? updatedCurrentConv : c
    );

    setConversations(updatedConversations);
    setStoredConversations(updatedConversations);
    setIsLoading(true);

    try {
      const { data, ok } = await apiFetch<any>('/api/chat/ask', {
        method: 'POST',
        body: JSON.stringify({
          query: userText,
          message: userText,
          conversationId: currentConv.id,
          userName: userProfile?.displayName || 'موظف الضرائب',
          userId: userProfile?.uid || 'user-1',
          history: currentConv.messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const assistantMsg: Message = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: data?.answer || data?.answerText || data?.content || 'عذراً، لم نتمكن من العثور على إجابة.',
        status: data?.status || (ok ? 'verified' : 'error'),
        sources: data?.sources || [],
        followUps: data?.followUps || data?.suggestedFollowUps || [],
        usedRecords: data?.usedRecords || [],
        timestamp: Date.now()
      };

      const finalMessages = [...newMessages, assistantMsg];
      const finalizedConv = {
        ...updatedCurrentConv,
        updatedAt: Date.now(),
        messages: finalMessages
      };

      const finalConversations = updatedConversations.map(c => 
        c.id === finalizedConv.id ? finalizedConv : c
      );

      setConversations(finalConversations);
      setStoredConversations(finalConversations);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: Message = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: 'تعذر الاتصال بخدمة الذكاء الاصطناعي. يرجى التحقق من الاتصال والمحاولة مرة أخرى.',
        timestamp: Date.now()
      };

      const finalMessages = [...newMessages, errorMsg];
      const finalizedConv = {
        ...updatedCurrentConv,
        updatedAt: Date.now(),
        messages: finalMessages
      };

      const finalConversations = updatedConversations.map(c => 
        c.id === finalizedConv.id ? finalizedConv : c
      );

      setConversations(finalConversations);
      setStoredConversations(finalConversations);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <LoginView />;
  }

  if (activeView === 'admin' && userRole === 'admin') {
    return <AdminLayout onBackToChat={() => setActiveView('chat')} />;
  }

  return (
    <div 
      className={`flex flex-col h-screen overflow-hidden font-sans select-none relative transition-colors duration-200 ${
        isLight
          ? 'bg-slate-50 text-slate-900'
          : isHighContrast
          ? 'bg-black text-white'
          : 'bg-[#020617] text-slate-100'
      }`} 
      dir="rtl"
    >
      {/* Ambient Orbs (Visible in standard dark mode, subtle in light mode, hidden in high contrast) */}
      {!isHighContrast && (
        <>
          <div className={`absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full blur-[130px] pointer-events-none z-0 ${
            isLight ? 'bg-blue-300/25' : 'bg-blue-600/20'
          }`} />
          <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] pointer-events-none z-0 ${
            isLight ? 'bg-emerald-300/20' : 'bg-emerald-600/15'
          }`} />
          <div className={`absolute top-[40%] right-[30%] w-[35%] h-[35%] rounded-full blur-[120px] pointer-events-none z-0 ${
            isLight ? 'bg-teal-300/15' : 'bg-purple-600/10'
          }`} />
        </>
      )}

      {/* Main Employee Navigation Header */}
      <EmployeeHeader
        currentTitle={activeConversation?.title}
        onOpenAdmin={() => setActiveView('admin')}
        onNewChat={handleNewChat}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
      />

      {/* Main Workspace Area: Sidebar + Chat */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        <EmployeeSidebar
          conversations={conversations}
          activeId={activeConvId}
          onSelectConversation={(id) => setActiveConvId(id)}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onTogglePinConversation={handleTogglePinConversation}
          onRenameConversation={handleRenameConversation}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenAdmin={() => setActiveView('admin')}
          onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        />

        <EmployeeChatArea
          conversation={activeConversation}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        />
      </div>

      {/* Google Sheets Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GoogleSheetsProvider>
          <MainApp />
        </GoogleSheetsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
