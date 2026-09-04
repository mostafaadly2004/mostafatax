/**
 * Chat Message Item Component
 * Senior Call-Center Support Supervisor Copilot View
 * Tax Support AI - Egyptian Real Estate Tax Authority
 */

import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  BookOpen, 
  User, 
  ShieldCheck, 
  PhoneCall,
  ClipboardList,
  MessageSquareQuote,
  Layers,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { TaxAuthorityLogo } from '../common/TaxAuthorityLogo.tsx';
import { Message } from '../../types.ts';
import { useTheme } from '../../context/ThemeContext.tsx';
import Markdown from 'react-markdown';

interface ChatMessageItemProps {
  message: Message;
  userName?: string;
  onSelectSuggested?: (query: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  userName = 'الـ Agent',
  onSelectSuggested
}) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const { isLight, isHighContrast } = useTheme();
  const isUser = message.role === 'user';
  const guidance = message.supervisorGuidance;

  const handleCopyScript = (scriptText: string) => {
    navigator.clipboard.writeText(scriptText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div
      className="flex gap-2.5 sm:gap-3.5 text-xs group justify-start transition-opacity select-text"
      dir="rtl"
    >
      {/* Avatar */}
      {isUser ? (
        <div
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border mt-0.5 ${
            isLight
              ? 'bg-slate-700 text-white border-slate-600'
              : isHighContrast
              ? 'bg-white text-black border-white font-bold'
              : 'bg-slate-800 text-slate-200 border-slate-700'
          }`}
        >
          <User className="w-3.5 h-3.5" />
        </div>
      ) : (
        <TaxAuthorityLogo className="w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-2xs shrink-0 mt-0.5" />
      )}

      {/* Message Content & Structured Cards */}
      <div className="space-y-2 max-w-[96%] sm:max-w-[88%] flex-1">
        {/* Author Label & Timestamp */}
        <div className="flex items-center justify-between pb-0.5">
          <div className="flex items-center gap-2">
            <span className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              {isUser ? userName : 'المشرف التشغيلي'}
            </span>
            {!isUser && guidance && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                guidance.caseClassification.urgency === 'escalation'
                  ? isLight ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-amber-950/60 text-amber-200 border-amber-800'
                  : isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
              }`}>
                {guidance.caseClassification.urgency === 'escalation' ? 'إجراء تحويل مطلوب' : 'إجراء معتمد'}
              </span>
            )}
          </div>
          <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
        </div>

        {/* User Message Bubble */}
        {isUser && (
          <div
            className={`
              p-3 rounded-lg leading-relaxed whitespace-pre-wrap text-xs border
              ${isLight
                ? 'bg-slate-100/90 text-slate-900 border-slate-200'
                : isHighContrast
                ? 'bg-black text-white border border-white font-medium'
                : 'bg-slate-800 text-slate-100 border-slate-700'}
            `}
          >
            {message.content}
          </div>
        )}

        {/* Assistant View: Structured Supervisor Copilot Card */}
        {!isUser && guidance && (
          <div className="space-y-2.5">
            {/* 1. Situation Diagnosis Card */}
            <div className={`p-3 rounded-lg border text-xs ${
              isLight 
                ? 'bg-slate-50 border-slate-200 text-slate-900' 
                : isHighContrast 
                ? 'bg-zinc-900 border border-white text-white' 
                : 'bg-slate-900 border-slate-800 text-slate-200'
            }`}>
              <div className={`flex items-center gap-1.5 font-bold mb-1 text-[11px] ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                <FileCheck className="w-3.5 h-3.5" />
                <span>تشخيص الحالة: {guidance.caseClassification.subType || guidance.caseClassification.caseType}</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <strong className={isLight ? 'text-slate-900' : 'text-slate-100'}>موقف العميل: </strong> 
                {guidance.caseClassification.customerSituation}
              </p>
            </div>

            {/* 2. Transfer Routing Box (if required) */}
            {guidance.transferInfo?.needsTransfer && (
              <div className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                isLight 
                  ? 'bg-amber-50/90 border-amber-300 text-amber-950' 
                  : isHighContrast 
                  ? 'bg-black border border-amber-400 text-amber-200' 
                  : 'bg-amber-950/40 border-amber-800 text-amber-100'
              }`}>
                <div className="flex items-start gap-2.5 min-w-0">
                  <PhoneCall className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1 min-w-0">
                    <div className="font-bold flex items-center gap-2 flex-wrap">
                      <span>إجراء التحويل: {guidance.transferInfo.transferDestination}</span>
                      {guidance.transferInfo.transferNumber && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[11px] font-bold">
                          رقم: {guidance.transferInfo.transferNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      {guidance.transferInfo.instruction || 'يرجى إبلاغ العميل بالرقم وخطوات التحويل.'}
                    </p>
                  </div>
                </div>
                {guidance.transferInfo.transferNumber && (
                  <button
                    onClick={() => handleCopyPhone(guidance.transferInfo!.transferNumber!)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors shrink-0 flex items-center gap-1 cursor-pointer border ${
                      isLight
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                        : 'bg-amber-900/60 hover:bg-amber-900 text-amber-200 border-amber-700'
                    }`}
                    title="نسخ رقم التحويل"
                  >
                    {copiedPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPhone ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                )}
              </div>
            )}

            {/* 3. Operational Action Steps */}
            <div className={`p-3.5 rounded-lg border text-xs space-y-2 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-900 shadow-2xs' 
                : isHighContrast 
                ? 'bg-black border border-white text-white' 
                : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}>
              <div className={`flex items-center gap-1.5 font-bold text-xs ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                <ClipboardList className="w-3.5 h-3.5" />
                <span>توجيهات العمل للموظف:</span>
              </div>
              <ul className="space-y-1.5 text-[11px] pr-1">
                {guidance.employeeSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border ${
                      isLight 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 4. CRM Directives */}
            <div className={`p-3 rounded-lg border text-[11px] space-y-1.5 ${
              isLight 
                ? 'bg-slate-50 border-slate-200 text-slate-800' 
                : isHighContrast 
                ? 'bg-zinc-900 border border-zinc-700 text-white' 
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-400">
                <Layers className="w-3.5 h-3.5" />
                <span>بيانات التسجيل على الـ CRM:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                <div>
                  <span className="font-semibold text-slate-600 dark:text-slate-400">التصنيف الأساسي: </span>
                  <span className="font-medium">{guidance.crmDetails.crmMainCategory}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600 dark:text-slate-400">التصنيف الفرعي: </span>
                  <span className="font-medium">{guidance.crmDetails.crmSubCategory}</span>
                </div>
              </div>
              {guidance.crmDetails.requiredCustomerData && (
                <div className="pt-0.5">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">البيانات المطلوبة: </span>
                  <span>{guidance.crmDetails.requiredCustomerData}</span>
                </div>
              )}
            </div>

            {/* 5. Customer Script Box */}
            <div className={`p-3.5 rounded-lg border text-xs space-y-2 ${
              isLight 
                ? 'bg-emerald-50/70 border-emerald-200 text-slate-900' 
                : isHighContrast 
                ? 'bg-black border-2 border-emerald-400 text-white' 
                : 'bg-emerald-950/40 border-emerald-800 text-emerald-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 font-bold text-xs ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>
                  <MessageSquareQuote className="w-3.5 h-3.5" />
                  <span>الرد المقترح للعميل:</span>
                </div>
                <button
                  onClick={() => handleCopyScript(guidance.customerScript)}
                  className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border ${
                    copiedScript
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : isLight
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800'
                      : 'bg-emerald-800 hover:bg-emerald-700 text-white border-emerald-700'
                  }`}
                  title="نسخ نص الرد للعميل"
                >
                  {copiedScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedScript ? 'تم النسخ' : 'نسخ الرد'}</span>
                </button>
              </div>

              <div className={`p-2.5 rounded border text-[12px] leading-relaxed font-normal ${
                isLight 
                  ? 'bg-white border-emerald-100 text-slate-800' 
                  : 'bg-black/40 border-emerald-900 text-emerald-100'
              }`}>
                "{guidance.customerScript}"
              </div>
            </div>
          </div>
        )}

        {/* Fallback Text Bubble */}
        {!isUser && !guidance && (
          <div
            className={`
              p-3.5 rounded-lg leading-relaxed text-xs border
              ${isLight
                ? 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                : isHighContrast
                ? 'bg-black border border-white text-white'
                : 'bg-slate-900 border-slate-800 text-slate-100'}
            `}
          >
            <div className="markdown-body space-y-2 text-xs leading-relaxed overflow-x-auto">
              <Markdown>{message.content}</Markdown>
            </div>

            <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] ${
              isLight ? 'border-slate-100 text-slate-500' : 'border-slate-800 text-slate-400'
            }`}>
              <span>مصلحة الضرائب العقارية</span>
              <button
                onClick={handleCopyAll}
                className={`flex items-center gap-1 p-1 rounded cursor-pointer ${
                  isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-400'
                }`}
                title="نسخ النص"
              >
                {copiedAll ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedAll ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Grounding Legal Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className={`rounded-lg p-2.5 space-y-1.5 text-[11px] border ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-800'
              : 'bg-slate-950 border-slate-800 text-slate-300'
          }`}>
            <div className={`flex items-center gap-1 font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
              <BookOpen className="w-3 h-3 shrink-0" />
              <span>السند والمراجع القانونية المعتمدة:</span>
            </div>
            <div className="space-y-1 pr-1">
              {message.sources.map((src, i) => (
                <div key={i} className="flex items-start gap-1 text-[10px]">
                  <span className="text-emerald-600 font-bold">•</span>
                  <div>
                    <strong className={isLight ? 'text-slate-900' : 'text-slate-200'}>{src.topic}: </strong>
                    <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>({src.source})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contextual Follow-Up Suggestions */}
        {message.followUps && message.followUps.length > 0 && onSelectSuggested && (
          <div className="space-y-1 pt-1">
            <span className={`text-[10px] font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              استفسارات مرتبطة:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {message.followUps.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onSelectSuggested(q)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors text-right border cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
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

