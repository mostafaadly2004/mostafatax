/**
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * Enterprise Arabic AI assistant with Google Sheets & Drive sync, 
 * Law 196 calculator, and comprehensive admin management.
 * Enforces strict multi-user session & conversation isolation.
 */

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { GoogleSheetsProvider, useGoogleSheets } from './context/GoogleSheetsContext.tsx';
import { EmployeeHeader } from './components/layout/EmployeeHeader.tsx';
import { EmployeeSidebar } from './components/layout/EmployeeSidebar.tsx';
import { EmployeeChatArea } from './components/chat/EmployeeChatArea.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { ForcePasswordChangeView } from './components/auth/ForcePasswordChangeView.tsx';
import { Conversation, Message } from './types.ts';
import { 
  getSavedConversations, 
  saveConversations,
  getActiveConversationId,
  setActiveConversationId 
} from './lib/storage.ts';
import { apiFetch } from './lib/api-client.ts';
import { Loader2 } from 'lucide-react';

// Code-split heavy Admin views and performance modal so they never block employee startup
const AdminLayout = lazy(() => import('./components/admin/AdminLayout.tsx').then(m => ({ default: m.AdminLayout })));
const MyPerformanceModal = lazy(() => import('./components/employee/MyPerformanceModal.tsx').then(m => ({ default: m.MyPerformanceModal })));

const MainApp: React.FC = () => {
  const { userProfile, isAuthenticated, userRole } = useAuth();
  const { isLight, isHighContrast } = useTheme();

  const [activeView, setActiveView] = useState<'chat' | 'admin'>('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Track the current user UID and fetch status to prevent race conditions & duplicate requests
  const currentUidRef = useRef<string | null>(null);
  const fetchedForUidRef = useRef<string | null>(null);

  // Stage 1: Fast local session hydration (< 2ms)
  // Stage 2: Asynchronous background conversation synchronization
  useEffect(() => {
    const currentUid = userProfile?.uid || null;
    currentUidRef.current = currentUid;

    if (!isAuthenticated || !currentUid) {
      setConversations([]);
      setActiveConvId(null);
      fetchedForUidRef.current = null;
      return;
    }

    // Step 1: Zero-latency instant load from local storage
    const cached = getSavedConversations(currentUid);
    const lastActiveId = getActiveConversationId(currentUid);

    if (cached && cached.length > 0) {
      setConversations(cached);
      const matchedActive = cached.find(c => c.id === lastActiveId);
      setActiveConvId(matchedActive ? matchedActive.id : cached[0].id);
    } else {
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

    // Prevent duplicate network calls for the same user session
    if (fetchedForUidRef.current === currentUid) {
      return;
    }
    fetchedForUidRef.current = currentUid;

    // Step 2: Background sync of authoritative conversations from server
    let isCancelled = false;
    apiFetch<{ success: boolean; conversations: Conversation[] }>('/api/chat/conversations')
      .then(({ data, ok }) => {
        if (isCancelled || currentUidRef.current !== currentUid) return;

        if (ok && data?.conversations && data.conversations.length > 0) {
          setConversations(data.conversations);
          saveConversations(data.conversations, currentUid);

          setActiveConvId(prevId => {
            const stillExists = data.conversations.some(c => c.id === prevId);
            const nextId = stillExists ? prevId : data.conversations[0].id;
            setActiveConversationId(nextId, currentUid);
            return nextId;
          });
        }
      })
      .catch(err => {
        console.warn('Non-blocking conversation sync completed with local cache fallback:', err);
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
      const { data, ok, status: httpStatus } = await apiFetch<any>('/api/chat/ask', {
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

      let assistantContent = '';
      let assistantStatus = data?.status || (ok ? 'verified' : 'error');

      if (!ok) {
        if (httpStatus === 401 || data?.code === 'UNAUTHORIZED') {
          assistantStatus = 'auth_error';
          assistantContent = 'جلسة العمل غير مصرح بها أو انتهت صلاحيتها. يرجى إعادة تسجيل الدخول.';
        } else if (httpStatus === 403 || data?.code === 'FORBIDDEN') {
          assistantStatus = 'auth_error';
          assistantContent = data?.error || 'غير مصرح لك بالوصول إلى هذه المحادثة.';
        } else if (data?.status === 'knowledge_error') {
          assistantStatus = 'knowledge_error';
          assistantContent = data?.answer || 'حدث خطأ أثناء الوصول إلى قاعدة المعرفة المعتمدة.';
        } else if (data?.status === 'ai_error') {
          assistantStatus = 'ai_error';
          assistantContent = data?.answer || 'تعذر الاتصال بمحرك الذكاء الاصطناعي مؤقتاً نظراً لضغط الخدمة.';
        } else {
          assistantStatus = 'error';
          assistantContent = data?.error || data?.answer || 'حدث خطأ غير متوقع أثناء معالجة الاستفسار.';
        }
      } else {
        if (data?.status === 'no_verified_data') {
          assistantContent = data?.answer || 'المعلومة المطلوبة غير مسجلة في قاعدة المعرفة المعتمدة الحالية لمصلحة الضرائب العقارية.';
        } else if (data?.status === 'knowledge_error') {
          assistantContent = data?.answer || 'حدث خطأ أثناء الوصول إلى قاعدة المعرفة المعتمدة.';
        } else if (data?.status === 'ai_error') {
          assistantContent = data?.answer || 'حصلت مشكلة مؤقتة في الاتصال بمحرك الذكاء الاصطناعي، يرجى إعادة المحاولة.';
        } else {
          assistantContent = data?.answer || data?.answerText || data?.content || 'تمت معالجة الاستفسار بنجاح.';
        }
      }

      const assistantMsg: Message = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: assistantContent,
        status: assistantStatus,
        sources: data?.sources || [],
        followUps: data?.followUps || data?.suggestedFollowUps || [],
        usedRecords: data?.usedRecords || [],
        understanding: data?.understanding,
        supervisorGuidance: data?.supervisorGuidance,
        latencyMs: data?.latencyMs,
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

        // Also sync full conversation to server for guaranteed Admin oversight & cross-device persistence
        apiFetch('/api/chat/conversations/save', {
          method: 'POST',
          body: JSON.stringify({ conversation: finalizedConv })
        }).catch(err => console.warn('Could not sync finalized conversation to server:', err));
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

  // Mandatory First-Login Password Change Barrier
  if (userProfile?.mustChangePassword) {
    return <ForcePasswordChangeView />;
  }

  if (activeView === 'admin' && userRole === 'admin') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="text-sm font-bold">جاري فتح لوحة الإدارة...</span>
        </div>
      }>
        <AdminLayout onBackToChat={() => setActiveView('chat')} />
      </Suspense>
    );
  }

  return (
    <div 
      className={`flex flex-col h-screen overflow-hidden font-sans select-none relative transition-colors duration-150 ${
        isLight
          ? 'bg-slate-50 text-slate-900'
          : isHighContrast
          ? 'bg-black text-white'
          : 'bg-[#0b0f19] text-slate-100'
      }`} 
      dir="rtl"
    >
      {/* Main Employee Navigation Header */}
      <EmployeeHeader
        currentTitle={activeConversation?.title}
        onOpenAdmin={() => setActiveView('admin')}
        onNewChat={handleNewChat}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenMyPerformance={() => setIsPerformanceModalOpen(true)}
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
          onOpenMyPerformance={() => setIsPerformanceModalOpen(true)}
        />

        <EmployeeChatArea
          conversation={activeConversation}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>

      {/* Employee My Performance Modal (Lazy Loaded) */}
      {isPerformanceModalOpen && (
        <Suspense fallback={null}>
          <MyPerformanceModal
            isOpen={isPerformanceModalOpen}
            onClose={() => setIsPerformanceModalOpen(false)}
          />
        </Suspense>
      )}
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
