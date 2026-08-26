/**
 * Employee Main Chat Area Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 */

import React, { useRef, useEffect } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  ShieldCheck, 
  FileSpreadsheet, 
  HelpCircle,
  Send,
  RefreshCw,
  Info,
  Scale,
  Building,
  CheckCircle2
} from 'lucide-react';
import { Conversation, Message } from '../../types.ts';
import { ChatMessageItem } from './ChatMessageItem.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useGoogleSheets } from '../../context/GoogleSheetsContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';

interface EmployeeChatAreaProps {
  conversation: Conversation | null;
  inputMessage: string;
  setInputMessage: (val: string) => void;
  onSendMessage: (e?: React.FormEvent) => void;
  isLoading: boolean;
  onOpenSheetsModal: () => void;
}

export const EmployeeChatArea: React.FC<EmployeeChatAreaProps> = ({
  conversation,
  inputMessage,
  setInputMessage,
  onSendMessage,
  isLoading,
  onOpenSheetsModal
}) => {
  const { userProfile } = useAuth();
  const { config, isConnected } = useGoogleSheets();
  const { theme, isDark, isLight, isHighContrast } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, isLoading]);

  const quickPrompts = [
    {
      title: 'إعفاء السكن الخاص',
      desc: 'ما هي شروط وحد إعفاء السكن الخاص وفقاً لقانون 196؟',
      query: 'ما هي شروط وإجراءات الحصول على إعفاء السكن الخاص للأسرة حتى 24 ألف جنيه وفقاً للقانون 196 لسنة 2008؟'
    },
    {
      title: 'إجراءات الطعن على التقدير',
      desc: 'كيفية تقديم طعن على نموذج 3 ضريبة عقارية والمواعيد؟',
      query: 'ما هي خطوات ومواعيد تقديم الطعن على تقديرات القيمة الإيجارية بنموذج 3 واللجان المختصة؟'
    },
    {
      title: 'إنهاء المنازعات (قانون 187)',
      desc: 'تقديم طلب إنهاء المنازعات الضريبية ولجان التوفيق؟',
      query: 'ما هي المستندات المطلوبة لتقديم طلب إنهاء منازعة ضريبية وفقاً لقانون 187 لسنة 2023؟'
    },
    {
      title: 'حساب الضريبة للمحال التجارية',
      desc: 'نسبة مصاريف الصيانة وسعر الضريبة للمنشآت غير السكنية',
      query: 'كيف يتم حساب الضريبة العقارية على المحال التجارية وما هي نسبة مصاريف الصيانة المستنزلة؟'
    }
  ];

  const handleQuickPromptClick = (query: string) => {
    setInputMessage(query);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const messages = conversation?.messages || [];

  return (
    <div className={`flex-1 flex flex-col h-full min-w-0 transition-colors duration-200 ${
      isLight ? 'text-slate-900 bg-white/40' : isHighContrast ? 'text-white bg-black' : 'text-slate-100 bg-transparent'
    }`} dir="rtl">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto py-8 sm:py-12 space-y-6 text-center">
            {/* Welcome Banner */}
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
                <Scale className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  مرحباً بك في المساعد الذكي لمصلحة الضرائب العقارية
                </h2>
                <p className={`text-xs max-w-md mx-auto mt-1 leading-relaxed ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                  نظام استرشادي فوري لموظفي المصلحة مدعوم بقواعد البيانات الرسمية، القوانين، ونماذج الطعون واللجان المعتمدة.
                </p>
              </div>
            </div>

            {/* Quick Prompts Grid */}
            <div className="text-right space-y-2 pt-2">
              <div className={`text-xs font-bold px-1 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                استفسارات شائعة مقترحة للبدء:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickPromptClick(p.query)}
                    className={`p-4 rounded-2xl text-right transition-all group cursor-pointer space-y-1.5 shadow-2xs border ${
                      isLight
                        ? 'bg-white hover:bg-emerald-50/50 border-slate-200 hover:border-emerald-400 text-slate-800'
                        : isHighContrast
                        ? 'bg-black text-white border-2 border-white hover:border-yellow-400 font-bold'
                        : 'bg-white/5 backdrop-blur-xl border-white/10 hover:border-emerald-500/50 hover:bg-white/[0.08] shadow-lg shadow-black/20'
                    }`}
                  >
                    <div className={`font-bold text-xs flex items-center justify-between ${
                      isLight ? 'text-slate-900 group-hover:text-emerald-800' : 'text-white group-hover:text-emerald-300'
                    }`}>
                      <span>{p.title}</span>
                      <Sparkles className={`w-3.5 h-3.5 ${
                        isLight ? 'text-emerald-600' : isHighContrast ? 'text-yellow-400' : 'text-slate-500 group-hover:text-emerald-400'
                      }`} />
                    </div>
                    <p className={`text-[11px] line-clamp-2 leading-relaxed ${
                      isLight ? 'text-slate-600 font-normal' : 'text-slate-400'
                    }`}>
                      {p.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                userName={userProfile?.displayName || 'موظف الضرائب'}
                onSelectSuggested={(q) => {
                  setInputMessage(q);
                  if (inputRef.current) inputRef.current.focus();
                }}
              />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className={`flex gap-3 text-xs items-center p-3.5 rounded-2xl border shadow-sm max-w-xs animate-pulse ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-800'
                  : isHighContrast
                  ? 'bg-black border-2 border-white text-white'
                  : 'bg-white/5 backdrop-blur-xl border-white/10 text-slate-300 shadow-lg'
              }`}>
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                  AI
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                  <span>جاري استرجاع القوانين وتجهيز الإجابة...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom Input Area */}
      <div className={`p-3 sm:p-4 border-t shrink-0 ${
        isLight ? 'bg-white/90 border-slate-200' : isHighContrast ? 'bg-black border-white' : 'bg-slate-950/40 backdrop-blur-2xl border-white/10'
      }`}>
        <div className="max-w-3xl mx-auto space-y-2">
          <form
            onSubmit={onSendMessage}
            className={`relative flex items-end gap-2 rounded-2xl p-2 transition-all shadow-xs border ${
              isLight
                ? 'bg-white border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20'
                : isHighContrast
                ? 'bg-black border-2 border-white focus-within:border-yellow-400'
                : 'bg-white/5 border-white/10 focus-within:border-emerald-500/80 focus-within:ring-2 focus-within:ring-emerald-500/20 backdrop-blur-xl shadow-lg'
            }`}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اطرح استفسارك الضريبي هنا (مثال: شروط إعفاء السكن الخاص، مهلة الطعن بنموذج 3...)"
              className={`flex-1 max-h-32 min-h-[38px] p-2 bg-transparent text-xs outline-none resize-none leading-relaxed font-medium ${
                isLight ? 'text-slate-900 placeholder:text-slate-400' : isHighContrast ? 'text-white placeholder:text-zinc-400' : 'text-slate-100 placeholder:text-slate-500'
              }`}
            />

            <div className="flex items-center gap-1 shrink-0 pb-1">
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className={`p-2.5 rounded-xl font-bold transition-all border active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isLight
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                    : isHighContrast
                    ? 'bg-white text-black border-2 border-white font-bold hover:bg-zinc-200'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/30 shadow-lg shadow-emerald-950/50'
                }`}
                title="إرسال الاستفسار"
              >
                <Send className="w-4 h-4 -rotate-90" />
              </button>
            </div>
          </form>

          <div className={`flex items-center justify-between text-[10px] px-2 ${
            isLight ? 'text-slate-500 font-medium' : 'text-slate-400'
          }`}>
            <span>مصلحة الضرائب العقارية • وزارة المالية • جمهورية مصر العربية</span>
            <span>اضغط Enter للإرسال و Shift+Enter لسطر جديد</span>
          </div>
        </div>
      </div>
    </div>
  );
};

