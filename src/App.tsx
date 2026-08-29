/**
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * Enterprise Arabic AI assistant with Google Sheets & Drive sync, 
 * Law 196 calculator, and comprehensive admin management.
 * Enforces strict multi-user session & conversation isolation.
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { 
  getSavedConversations, 
  saveConversations,
  getActiveConversationId,
  setActiveConversationId 
} from './lib/storage.ts';
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

  // Track the current user UID with a ref to prevent race condition leaks
  const currentUidRef = useRef<string | null>(null);

  // Load and isolate conversations whenever user identity changes
  useEffect(() => {
    const currentUid = userProfile?.uid || null;
    currentUidRef.current = currentUid;

    if (!isAuthenticated || !currentUid) {
      // Clear all transient conversation state immediately on logout
      setConversations([]);
      setActiveConvId(null);
      return;
    }

    // 1. Load user-namespaced local cache instantly for zero-flicker UX
    const cached = getSavedConversations(currentUid);
    const lastActiveId = getActiveConversationId(currentUid);

    if (cached && cached.length > 0) {
      setConversations(cached);
      const matchedActive = cached.find(c => c.id === lastActiveId);
      setActiveConvId(matchedActive ? matchedActive.id : cached[0].id);
    } else {
      // Temporary initial conversation owned strictly by this user
      const initialConv: Conversation = {
        id: `conv_${Date.now()}`,
        ownerUid: currentUid,
        ownerName: userProfile.displayName || 'موظف الضرائب',
        ownerEmail: userProfile.email || '',
        title: 'استفسار ضريبي جديد',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: currentUid,
        userName: userProfile.displayName || 'موظف الضرائب',
        messages: []
      };
      setConversations([initialConv]);
      setActiveConvId(initialConv.id);
      saveConversations([initialConv], currentUid);
      setActiveConversationId(initialConv.id, currentUid);
    }

    // 2. Fetch authoritative user-specific conversations from the server
    let isCancelled = false;
    apiFetch<{ success: boolean; conversations: Conversation[] }>('/api/chat/conversations')
      .then(({ data, ok }) => {
        // Race-condition guard: make sure the response belongs to the still-authenticated user
        if (isCancelled || currentUidRef.current !== currentUid) return;

        if (ok && data?.conversations) {
          if (data.conversations.length > 0) {
            setConversations(data.conversations);
            saveConversations(data.conversations, currentUid);

            // Re-validate active conversation
            setActiveConvId(prevId => {
              const stillExists = data.conversations.some(c => c.id === prevId);
              const nextId = stillExists ? prevId : data.conversations[0].id;
              setActiveConversationId(nextId, currentUid);
              return nextId;
            });
          }
        }
      })
      .catch(err => {
        console.warn('Failed to fetch user conversations from server:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [userProfile?.uid, isAuthenticated]);

  const activeConversation = conversations.find(c => c.id === activeConvId) || null;

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    if (userProfile?.uid) {
      setActiveConversationId(id, userProfile.uid);
    }
  };

  const handleNewChat = () => {
    if (!userProfile?.uid) return;
    const currentUid = userProfile.uid;

    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      ownerUid: currentUid,
      ownerName: userProfile.displayName || 'موظف الضرائب',
      ownerEmail: userProfile.email || '',
      title: 'استفسار ضريبي جديد',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: currentUid,
      userName: userProfile.displayName || 'موظف الضرائب',
      messages: []
    };

    const updated = [newConv, ...conversations];
    setConversations(updated);
    setActiveConvId(newConv.id);
    saveConversations(updated, currentUid);
    setActiveConversationId(newConv.id, currentUid);

    // Save asynchronously to backend
    apiFetch('/api/chat/conversations/save', {
      method: 'POST',
      body: JSON.stringify({ conversation: newConv })
    }).catch(err => console.warn('Could not save new conversation:', err));
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userProfile?.uid) return;
    const currentUid = userProfile.uid;

    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    saveConversations(updated, currentUid);

    if (activeConvId === id) {
      const nextId = updated.length > 0 ? updated[0].id : null;
      setActiveConvId(nextId);
      setActiveConversationId(nextId, currentUid);
    }

    // Delete from backend with IDOR enforcement
    try {
      await apiFetch(`/api/chat/conversations/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Failed to delete conversation on server:', err);
    }
  };

  const handleTogglePinConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userProfile?.uid) return;
    const currentUid = userProfile.uid;

    const updated = conversations.map(c => 
      c.id === id ? { ...c, pinned: !c.pinned } : c
    );
    setConversations(updated);
    saveConversations(updated, currentUid);

    const target = updated.find(c => c.id === id);
    if (target) {
      apiFetch('/api/chat/conversations/save', {
        method: 'POST',
        body: JSON.stringify({ conversation: target })
      }).catch(err => console.warn('Could not update pinned status:', err));
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    if (!userProfile?.uid) return;
    const currentUid = userProfile.uid;

    const updated = conversations.map(c => 
      c.id === id ? { ...c, title: newTitle } : c
    );
    setConversations(updated);
    saveConversations(updated, currentUid);

    const target = updated.find(c => c.id === id);
    if (target) {
      apiFetch('/api/chat/conversations/save', {
        method: 'POST',
        body: JSON.stringify({ conversation: target })
      }).catch(err => console.warn('Could not update conversation title:', err));
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isLoading || !userProfile?.uid) return;

    const currentUid = userProfile.uid;
    const userText = inputMessage.trim();
    setInputMessage('');

    let currentConv = activeConversation;
    let updatedConversations = [...conversations];

    if (!currentConv) {
      currentConv = {
        id: `conv_${Date.now()}`,
        ownerUid: currentUid,
        ownerName: userProfile.displayName || 'موظف الضرائب',
        ownerEmail: userProfile.email || '',
        title: userText.slice(0, 30),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: currentUid,
        userName: userProfile.displayName || 'موظف الضرائب',
        messages: []
      };
      updatedConversations = [currentConv, ...updatedConversations];
      setActiveConvId(currentConv.id);
      setActiveConversationId(currentConv.id, currentUid);
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
    saveConversations(updatedConversations, currentUid);
    setIsLoading(true);

    try {
      const { data, ok } = await apiFetch<any>('/api/chat/ask', {
        method: 'POST',
        body: JSON.stringify({
          query: userText,
          message: userText,
          conversationId: currentConv.id,
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

      // Only apply if user hasn't switched accounts during generation
      if (currentUidRef.current === currentUid) {
        setConversations(finalConversations);
        saveConversations(finalConversations, currentUid);
      }
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

      if (currentUidRef.current === currentUid) {
        setConversations(finalConversations);
        saveConversations(finalConversations, currentUid);
      }
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
      {/* Ambient Orbs */}
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
          onSelectConversation={handleSelectConversation}
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
