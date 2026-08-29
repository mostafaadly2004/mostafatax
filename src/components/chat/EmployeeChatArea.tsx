/**
 * Employee Main Chat Area Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * 
 * Features:
 * - Real voice input (Speech-to-Text) with Arabic support (ar-EG)
 * - Safe live transcription directly into the composer
 * - Edit before sending
 * - RTL balanced, Apple-like clean aesthetics
 * - Complete failure isolation
 */

import React, { useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  RefreshCw, 
  Scale, 
  Mic, 
  MicOff, 
  Square, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Loader2
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
  const { theme, isDark, isLight, isHighContrast } = useTheme();
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
      title: 'وحدة ورثة أو شراكة على الشيوع',
      desc: 'كيفية تسجيل وحدة الورثة أو الشركاء وطلب الإعفاء؟',
      query: 'في حالة استفسار العميل أنه لديه وحدة ورثة يريد أن يقوم بتسجيل الوحدة ويريد الحصول على الإعفاء؟'
    },
    {
      title: 'إعفاء السكن الخاص والخصم 30%',
      desc: 'حد الإعفاء 100 ألف وقيمة الاسترداد ونسبة الخصم',
      query: 'في حالة استفسار العميل عن أنه قام بسداد مبلغ تحت حساب الضريبة والوحدة سكن خاص أي معفاة؟'
    },
    {
      title: 'تسهيلات الطعون والقرارات الجديدة',
      desc: 'إلغاء طعون المناطق وفقاً للقانون رقم 3 لسنة 2026',
      query: 'في حال استفسار العميل أنه قد قدم طعناً على مبلغ الضريبة وعند الاستعلام من المأمورية وجد المبلغ أعلى من الذي تم الطعن عليه؟'
    },
    {
      title: 'طريقة حساب الضريبة ونسب الخصم',
      desc: 'المعادلة الرسمية ونسبة حافز الإقرار 25% وخصم السداد 5%',
      query: 'ما هو سعر الضريبة العقارية وكيف يتم حسابها بالتفصيل من القيمة السوقية والإيجارية؟'
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
                    type="button"
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

            {/* Simple Loading Indicator */}
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
          
          {/* Subtle Voice Feedback Banner */}
          {voiceError && (
            <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs border animate-fadeIn ${
              isLight
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-rose-950/40 border-rose-800/40 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{voiceError}</span>
              </div>
              <button
                type="button"
                onClick={clearVoiceMessages}
                className="p-1 hover:bg-rose-200/50 dark:hover:bg-rose-900/50 rounded-lg transition-colors cursor-pointer"
                title="إغلاق التنبيه"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {voiceSuccess && (
            <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs border animate-fadeIn ${
              isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{voiceSuccess}</span>
              </div>
              <button
                type="button"
                onClick={clearVoiceMessages}
                className="p-1 hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50 rounded-lg transition-colors cursor-pointer"
                title="إغلاق التنبيه"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Recording State Bar */}
          {isListening && (
            <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs border shadow-xs animate-pulse ${
              isLight
                ? 'bg-red-50/90 border-red-200 text-red-700'
                : 'bg-red-950/40 border-red-800/50 text-red-300'
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping inline-block" />
                <span className="font-semibold">جارٍ الاستماع والتسجيل الصوتي ({formatDuration(durationSeconds)})...</span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium cursor-pointer text-[11px]"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>إيقاف المايك</span>
              </button>
            </div>
          )}

          {/* Main Composer Form */}
          <form
            onSubmit={handleFormSubmit}
            className={`relative flex items-end gap-2 rounded-2xl p-2 transition-all shadow-xs border ${
              isListening
                ? isLight
                  ? 'bg-white border-red-400 ring-2 ring-red-400/20'
                  : 'bg-white/5 border-red-500/80 ring-2 ring-red-500/20'
                : isLight
                ? 'bg-white border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20'
                : isHighContrast
                ? 'bg-black border-2 border-white focus-within:border-yellow-400'
                : 'bg-white/5 border-white/10 focus-within:border-emerald-500/80 focus-within:ring-2 focus-within:ring-emerald-500/20 backdrop-blur-xl shadow-lg'
            }`}
          >
            {/* Voice Input Button */}
            <div className="shrink-0 pb-1">
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
                className={`p-2.5 rounded-xl font-medium transition-all border active:scale-95 cursor-pointer min-w-[42px] min-h-[42px] flex items-center justify-center ${
                  !isSupported
                    ? 'opacity-40 cursor-not-allowed border-slate-300 text-slate-400 dark:border-white/10'
                    : isListening
                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-md shadow-red-600/30 animate-pulse'
                    : isProcessing
                    ? 'bg-amber-500 text-white border-amber-500'
                    : isLight
                    ? 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border-slate-200 hover:border-emerald-300'
                    : isHighContrast
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-white border border-white'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10 hover:border-emerald-400/50 hover:text-emerald-400'
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
                  : 'اكتب سؤالك الضريبي أو اضغط على الميكروفون للتحدث...'
              }
              className={`flex-1 max-h-32 min-h-[38px] p-2 bg-transparent text-xs outline-none resize-none leading-relaxed font-medium ${
                isLight ? 'text-slate-900 placeholder:text-slate-400' : isHighContrast ? 'text-white placeholder:text-zinc-400' : 'text-slate-100 placeholder:text-slate-500'
              }`}
            />

            {/* Send Button */}
            <div className="flex items-center gap-1 shrink-0 pb-1">
              <button
                type="submit"
                id="btn-send-chat"
                disabled={!inputMessage.trim() || isLoading}
                aria-label="إرسال الاستفسار"
                className={`p-2.5 rounded-xl font-bold transition-all border active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-w-[42px] min-h-[42px] flex items-center justify-center ${
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

          {/* Footer Metadata */}
          <div className={`flex items-center justify-between text-[10px] px-2 ${
            isLight ? 'text-slate-500 font-medium' : 'text-slate-400'
          }`}>
            <span className="flex items-center gap-1.5">
              <span>مصلحة الضرائب العقارية</span>
              <span>•</span>
              <span className="hidden sm:inline">إدخال نصي أو إملاء صوتي عربي 🎙️</span>
            </span>
            <span>اضغط Enter للإرسال و Shift+Enter لسطر جديد</span>
          </div>
        </div>
      </div>
    </div>
  );
};
