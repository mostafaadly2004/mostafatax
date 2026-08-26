/**
 * Admin Staff Conversations Monitor Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 */

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  RefreshCw, 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Conversation, Message } from '../../types.ts';
import { apiFetch } from '../../lib/api-client.ts';

export const AdminConversations: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data, ok } = await apiFetch<{ conversations: Conversation[] }>('/api/admin/conversations');
      if (ok && data && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        if (data.conversations.length > 0 && !selectedConv) {
          setSelectedConv(data.conversations[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load staff conversations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const filtered = conversations.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.userName?.toLowerCase().includes(q) ||
      c.messages?.some(m => m.content.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200" dir="rtl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-700" />
            <span>مراقبة محادثات واستفسارات الموظفين</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة جودة الإجابات والتحقق من التزام المساعد الذكي بالقوانين والتعليمات المعتمدة
          </p>
        </div>

        <button
          onClick={fetchConversations}
          disabled={loading}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
          title="تحديث"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grid: Master List (5 cols) & Conversation Detail (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Master List */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="البحث في المحادثات أو أسماء الموظفين..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl text-xs py-2 pr-8 pl-3 outline-none text-slate-900 placeholder:text-slate-400"
            />
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-0.5">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">لا توجد محادثات مطابقة</div>
            ) : (
              filtered.map(c => {
                const isSelected = selectedConv?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConv(c)}
                    className={`w-full text-right p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200/80'
                    }`}
                  >
                    <div className="min-w-0 flex-1 truncate space-y-1">
                      <div className="font-bold text-xs truncate">{c.title || 'استفسار ضريبي'}</div>
                      <div className="flex items-center gap-2 text-[10px] opacity-70">
                        <span>{c.userName || 'موظف ضرائب'}</span>
                        <span>•</span>
                        <span>{c.messages?.length || 0} رسائل</span>
                      </div>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col h-[650px]">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">{selectedConv.title || 'محادثة'}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    بواسطة: {selectedConv.userName || 'موظف'} • التحديث: {new Date(selectedConv.updatedAt).toLocaleString('ar-EG')}
                  </p>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-slate-600">
                  {selectedConv.id}
                </span>
              </div>

              {/* Messages Flow */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {selectedConv.messages?.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={idx}
                      className={`flex gap-3 text-xs ${isUser ? 'justify-start' : 'justify-start'}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          isUser
                            ? 'bg-slate-800 text-white'
                            : 'bg-emerald-700 text-white'
                        }`}
                      >
                        {isUser ? 'U' : 'AI'}
                      </div>

                      <div className="space-y-1.5 max-w-[85%]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[11px] text-slate-900">
                            {isUser ? (selectedConv.userName || 'الموظف') : 'المساعد الضريبي الذكي'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('ar-EG') : ''}
                          </span>
                        </div>

                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                            isUser
                              ? 'bg-slate-100 text-slate-900 rounded-tr-none'
                              : 'bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 rounded-tr-none shadow-2xs'
                          }`}
                        >
                          {msg.content}
                        </div>

                        {/* If AI sources exists */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[10px] space-y-1">
                            <span className="font-bold text-slate-700 block">المصادر الرسمية المعتمدة:</span>
                            {msg.sources.map((src, sIdx) => (
                              <div key={sIdx} className="text-slate-500 font-medium">
                                • {src.topic} ({src.source})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              اختر محادثة لعرض تفاصيلها
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
