/**
 * Chat Message Item Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 */

import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  BookOpen, 
  ExternalLink, 
  Sparkles, 
  FileSpreadsheet, 
  FileText, 
  User, 
  ShieldCheck, 
  Building 
} from 'lucide-react';
import { Message } from '../../types.ts';
import { useTheme } from '../../context/ThemeContext.tsx';

interface ChatMessageItemProps {
  message: Message;
  userName?: string;
  onSelectSuggested?: (query: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  userName = 'موظف الضرائب',
  onSelectSuggested
}) => {
  const [copied, setCopied] = useState(false);
  const { theme, isDark, isLight, isHighContrast } = useTheme();
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex gap-3 sm:gap-4 text-xs group animate-in fade-in duration-150 ${
        isUser ? 'justify-start' : 'justify-start'
      }`}
      dir="rtl"
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
          isUser
            ? isLight
              ? 'bg-emerald-700 text-white shadow-emerald-900/10'
              : isHighContrast
              ? 'bg-white text-black border-2 border-white font-bold'
              : 'bg-gradient-to-br from-indigo-500/30 to-blue-500/30 border border-white/20 text-white'
            : isLight
            ? 'bg-slate-900 text-white shadow-slate-900/20'
            : isHighContrast
            ? 'bg-black text-white border-2 border-white'
            : 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white border border-emerald-400/30 shadow-emerald-500/20'
        }`}
      >
        {isUser ? userName.charAt(0) || 'U' : 'AI'}
      </div>

      {/* Content Bubble & Metadata */}
      <div className="space-y-2 max-w-[90%] sm:max-w-[80%]">
        {/* Header Name & Timestamp */}
        <div className="flex items-center gap-2">
          <span className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {isUser ? userName : 'المساعد الضريبي الذكي'}
          </span>
          <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
        </div>

        {/* Message Body */}
        <div
          className={`
            p-4 rounded-2xl leading-relaxed whitespace-pre-wrap text-xs shadow-md
            ${isUser
              ? isLight
                ? 'bg-emerald-700 text-white rounded-tr-none font-medium'
                : isHighContrast
                ? 'bg-black text-white border-2 border-emerald-400 rounded-tr-none font-medium'
                : 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 text-slate-100 border border-emerald-500/30 rounded-tr-none backdrop-blur-xl'
              : isLight
              ? 'bg-white border border-slate-200 text-slate-800 rounded-tr-none shadow-xs'
              : isHighContrast
              ? 'bg-black border-2 border-white text-white rounded-tr-none'
              : 'bg-white/[0.05] border border-white/10 text-slate-100 rounded-tr-none backdrop-blur-xl'}
          `}
        >
          {message.content}

          {/* Copy Button for Assistant responses */}
          {!isUser && (
            <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[10px] ${
              isLight ? 'border-slate-100 text-slate-500' : isHighContrast ? 'border-white text-slate-300' : 'border-white/10 text-slate-400'
            }`}>
              <span className="italic">مصلحة الضرائب العقارية - وزارة المالية</span>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 transition-colors p-1 rounded-lg cursor-pointer ${
                  isLight
                    ? 'hover:text-slate-900 hover:bg-slate-100 text-slate-600'
                    : 'hover:text-white hover:bg-white/10'
                }`}
                title="نسخ الإجابة"
              >
                {copied ? <Check className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Sources Box if available */}
        {message.sources && message.sources.length > 0 && (
          <div className={`rounded-2xl p-3.5 space-y-2 text-[11px] border shadow-xs ${
            isLight
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : isHighContrast
              ? 'bg-black border-2 border-yellow-400 text-white'
              : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-100 backdrop-blur-xl'
          }`}>
            <div className={`flex items-center gap-1.5 font-bold ${
              isLight ? 'text-emerald-900' : isHighContrast ? 'text-yellow-300' : 'text-emerald-300'
            }`}>
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>المصادر والمراجع القانونية المعتمدة:</span>
            </div>
            <div className="space-y-1.5 pr-2">
              {message.sources.map((src, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className={`font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>•</span>
                  <div>
                    <strong className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{src.topic}:</strong>{' '}
                    <span className={`text-[10px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-300'}`}>({src.source})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up Questions Suggestions */}
        {message.followUps && message.followUps.length > 0 && onSelectSuggested && (
          <div className="space-y-1.5 pt-1">
            <span className={`text-[10px] font-bold block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              أسئلة استرشادية ذات صلة:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {message.followUps.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onSelectSuggested(q)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all text-right shadow-2xs border cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-emerald-500'
                      : isHighContrast
                      ? 'bg-black text-white border-2 border-white hover:bg-zinc-800 font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border-white/10 hover:border-emerald-500/50 backdrop-blur-md'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

