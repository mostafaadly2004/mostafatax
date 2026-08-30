/**
 * Employee Main Chat Area Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * Enterprise-grade Call-Center Supervisor Workstation
 */

import React, { useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  RefreshCw, 
  Mic, 
  MicOff, 
  Square, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Loader2,
  Building2,
  FileText,
  CreditCard,
  Scale,
  Users,
  ShieldCheck
} from 'lucide-react';
import { Conversation } from '../../types.ts';
import { ChatMessageItem } from './ChatMessageItem.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useGoogleSheets } from '../../context/GoogleSheetsContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.ts';

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
  const { isLight, isHighContrast } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Speech-to-Text hook
  const {
    isSupported,
    isListening,
    isProcessing,
    durationSeconds,
    errorMessage: voiceError,
    successMessage: voiceSuccess,
    toggleListening,
    stopListening,
    clearMessages: clearVoiceMessages
  } = useSpeechRecognition({
    getCurrentText: () => inputMessage,
    onTranscriptChange: (newText) => {
      setInputMessage(newText);
      if (inputRef.current) {
        inputRef.current.scrollTop = inputRef.current.scrollHeight;
      }
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, isLoading]);

  const quickPrompts = [
    {
      title: 'موقف استرداد ومطالبة بمدير',
      desc: 'العميلة دفعت 200ج ومعفاة وعايزة تاخدهم ومش مقتنعة وعايزة المدير',
      icon: Scale,
      query: 'العميلة محتاجة مدير علشان دفعت 200ج وهى معفاة وعايزة تاخدهم وضحت لها بان الفلوس هترجع على المحفظة داخل الابليكشن او لجنة الحصر هترجعهم لحضرتك هي مش مقتنعة وقالتلي عايزة المدير، نرد عليها إزاي ونسجل إيه على الـ CRM؟'
    },
    {
      title: 'مشكلة كود التحقق OTP',
      desc: 'العميل بيسجل ومش بيوصله كود التأكيد على الموبايل وكرر المحاولة',
      icon: CreditCard,
      query: 'العميل بيحاول يسجل على البوابة ومش بيوصله كود OTP على الموبايل وجرب أكتر من 3 مرات ومفيش فايدة، إيه الخطوات وهل أحوله للدعم الفني؟'
    },
    {
      title: 'وحدة ورثة أو شراكة على الشيوع',
      desc: 'كيفية تسجيل وحدة الورثة أو الشركاء وطلب الإعفاء على النظام',
      icon: Users,
      query: 'في حالة استفسار العميل أنه لديه وحدة ورثة يريد أن يقوم بتسجيل الوحدة ويريد الحصول على الإعفاء ومين المفروض يقدم الإقرار؟'
    },
    {
      title: 'إعفاء السكن الخاص واسترداد المسدد',
      desc: 'سداد تحت الحساب واسترداد الزيادة وحد الإعفاء 100 ألف',
      icon: FileText,
      query: 'في حالة استفسار العميل عن أنه قام بسداد مبلغ تحت حساب الضريبة والوحدة سكن خاص أي معفاة، كيف يسترد المبلغ وما نسبة الخصم؟'
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
      if (isListening) {
        stopListening();
      }
      onSendMessage();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) {
      stopListening();
    }
    onSendMessage(e);
  };

  const formatDuration = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const messages = conversation?.messages || [];

  return (
    <div className={`flex-1 flex flex-col h-full min-w-0 select-text ${
      isLight ? 'text-slate-900 bg-slate-50/40' : isHighContrast ? 'text-white bg-black' : 'text-slate-100 bg-[#090d16]'
    }`} dir="rtl">
      
      {/* Subheader Status Line */}
      <div className={`px-4 py-2 border-b flex items-center justify-between shrink-0 text-xs ${
        isLight
          ? 'bg-slate-50 border-slate-200 text-slate-700'
          : isHighContrast
          ? 'bg-black border-b-2 border-white text-white'
          : 'bg-slate-900/90 border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-bold text-xs text-emerald-700 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>المشرف التشغيلي الذكي (AI Supervisor)</span>
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
            قاعدة المعرفة معتمدة ومطابقة لتعليمات مصلحة الضرائب العقارية
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {conversation && (
            <span className="text-slate-500 hidden sm:inline">
              المحادثة الحالية: <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>{conversation.title}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto my-auto py-6 sm:py-10 space-y-6 text-center animate-in fade-in duration-150">
            {/* Welcome Banner */}
            <div className="space-y-2">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto border shadow-2xs ${
                isLight 
                  ? 'bg-emerald-800 text-white border-emerald-900' 
                  : 'bg-emerald-950 text-emerald-200 border-emerald-800'
              }`}>
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  المساعد التشغيلي لمأموري الضرائب وخدمة العملاء
                </h2>
                <p className={`text-xs max-w-md mx-auto mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  اكتب موقف العميل بالعامية أو اضغط على أحد السيناريوهات المقترحة أدناه للحصول الفوري على خطة العمل وتصنيف الـ CRM.
                </p>
              </div>
            </div>

            {/* Quick Prompts Grid */}
            <div className="text-right space-y-2 pt-2">
              <div className={`text-xs font-bold px-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                سيناريوهات واقعية شائعة للبدء:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {quickPrompts.map((p, idx) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickPromptClick(p.query)}
                      className={`p-3 rounded-lg text-right transition-colors group cursor-pointer border flex items-start gap-2.5 ${
                        isLight
                          ? 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-600 shadow-2xs text-slate-800'
                          : isHighContrast
                          ? 'bg-black text-white border border-white hover:bg-zinc-900 font-bold'
                          : 'bg-slate-900/80 border-slate-800 hover:border-emerald-600 hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <div className={`p-1.5 rounded shrink-0 mt-0.5 border ${
                        isLight
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className={`font-bold text-xs ${
                          isLight ? 'text-slate-900 group-hover:text-emerald-800' : 'text-white group-hover:text-emerald-300'
                        }`}>
                          {p.title}
                        </div>
                        <p className={`text-[11px] line-clamp-2 leading-relaxed ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {p.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                userName={userProfile?.displayName || 'مأمور الضرائب'}
                onSelectSuggested={(q) => {
                  setInputMessage(q);
                  if (inputRef.current) inputRef.current.focus();
                }}
              />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className={`flex gap-2.5 text-xs items-center p-3 rounded-lg border max-w-sm ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                  : isHighContrast
                  ? 'bg-black border border-white text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">جارٍ استرجاع القواعد المعتمدة وتحليل الموقف...</span>
                  <p className="text-[10px] text-slate-500">تجهيز التوجيهات التشغيلية وتصنيف الـ CRM</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom Input Area */}
      <div className={`p-3 border-t shrink-0 ${
        isLight ? 'bg-white border-slate-200' : isHighContrast ? 'bg-black border-white' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="max-w-3xl mx-auto space-y-2">
          
          {/* Voice Error/Success Banners */}
          {voiceError && (
            <div className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs border ${
              isLight
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{voiceError}</span>
              </div>
              <button
                type="button"
                onClick={clearVoiceMessages}
                className="p-1 hover:bg-rose-200/50 rounded transition-colors cursor-pointer"
                title="إغلاق التنبيه"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {voiceSuccess && (
            <div className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs border ${
              isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{voiceSuccess}</span>
              </div>
              <button
                type="button"
                onClick={clearVoiceMessages}
                className="p-1 hover:bg-emerald-200/50 rounded transition-colors cursor-pointer"
                title="إغلاق التنبيه"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Recording State Bar */}
          {isListening && (
            <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs border ${
              isLight
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping inline-block" />
                <span className="font-semibold">جارٍ الاستماع والتسجيل الصوتي ({formatDuration(durationSeconds)})...</span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-700 text-white hover:bg-rose-800 transition-colors font-medium cursor-pointer text-[11px]"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>إيقاف التسجيل</span>
              </button>
            </div>
          )}

          {/* Main Composer Form */}
          <form
            onSubmit={handleFormSubmit}
            className={`flex items-end gap-1.5 rounded-lg p-1.5 transition-all border ${
              isListening
                ? 'border-rose-400 ring-1 ring-rose-400/20 bg-white dark:bg-slate-950'
                : isLight
                ? 'bg-slate-50 border-slate-300 focus-within:bg-white focus-within:border-emerald-700 focus-within:ring-1 focus-within:ring-emerald-700/20'
                : isHighContrast
                ? 'bg-black border-2 border-white focus-within:border-white'
                : 'bg-slate-950 border-slate-700 focus-within:border-emerald-500'
            }`}
          >
            {/* Voice Input Button */}
            <div className="shrink-0">
              <button
                type="button"
                id="btn-voice-input"
                onClick={toggleListening}
                disabled={isLoading}
                aria-label={isListening ? 'إيقاف التسجيل الصوتي' : 'الإملاء الصوتي'}
                title={
                  !isSupported
                    ? 'الإملاء الصوتي غير متاح على هذا المتصفح'
                    : isListening
                    ? 'اضغط لإيقاف التسجيل الصوتي'
                    : isProcessing
                    ? 'جارٍ معالجة الصوت...'
                    : 'اضغط للتحدث بالصوت (إملاء باللغة العربية)'
                }
                className={`p-2 rounded font-medium transition-colors cursor-pointer border flex items-center justify-center ${
                  !isSupported
                    ? 'opacity-40 cursor-not-allowed border-slate-300 text-slate-400'
                    : isListening
                    ? 'bg-rose-700 text-white border-rose-800'
                    : isProcessing
                    ? 'bg-amber-600 text-white border-amber-700'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : isHighContrast
                    ? 'bg-zinc-900 text-white border-white'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-700'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : isListening ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : !isSupported ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Textarea Input */}
            <textarea
              ref={inputRef}
              id="input-chat-query"
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? 'جارٍ الاستماع... تحدث بوضوح وسيتم تحويل صوتك لنص هنا...'
                  : 'اكتب سؤالك أو موقف المواطن بالعامية، أو اضغط الميكروفون للتحدث...'
              }
              className={`flex-1 max-h-32 min-h-[36px] py-1.5 px-2 bg-transparent text-xs outline-none resize-none leading-relaxed font-normal ${
                isLight ? 'text-slate-900 placeholder:text-slate-400' : 'text-slate-100 placeholder:text-slate-500'
              }`}
            />

            {/* Send Button */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="submit"
                id="btn-send-chat"
                disabled={!inputMessage.trim() || isLoading}
                aria-label="إرسال الاستفسار"
                className="p-2 rounded font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-900 shadow-2xs"
                title="إرسال الاستفسار"
              >
                <Send className="w-4 h-4 -rotate-90" />
              </button>
            </div>
          </form>

          {/* Footer Metadata */}
          <div className={`flex items-center justify-between text-[10px] px-1 ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}>
            <span>مصلحة الضرائب العقارية • وزارة المالية</span>
            <span>اضغط Enter للإرسال و Shift+Enter لسطر جديد</span>
          </div>
        </div>
      </div>
    </div>
  );
};

