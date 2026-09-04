/**
 * Employee Self-Performance & KPI Modal
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * 
 * Displays the authenticated employee's monthly evaluation cards,
 * error rate breakdown, accuracy percentage, source reports, and deterministic KPI metrics.
 */

import React, { useState } from 'react';
import { X, Award, BarChart3, FileCheck2 } from 'lucide-react';
import { EmployeeKpiPage } from './EmployeeKpiPage.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';

interface MyPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MyPerformanceModal: React.FC<MyPerformanceModalProps> = ({ isOpen, onClose }) => {
  const { isLight, isHighContrast } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div
        className={`relative rounded-3xl border max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-right font-sans ${
          isLight
            ? 'bg-slate-50 border-slate-200 text-slate-900'
            : isHighContrast
            ? 'bg-black border-2 border-white text-white'
            : 'bg-[#0f172a] border-slate-800 text-slate-100'
        }`}
        dir="rtl"
      >
        {/* Modal Top Bar */}
        <div className={`sticky top-0 z-20 px-6 py-4 border-b flex items-center justify-between backdrop-blur-md ${
          isLight
            ? 'bg-white/90 border-slate-200/90'
            : isHighContrast
            ? 'bg-black border-white'
            : 'bg-[#0f172a]/90 border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-2xl">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>أدائي الشهري المعتمد (KPI)</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                  معتمد وموثق
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                بيانات الأداء المعتمدة الخاصة بك من إدارة التفتيش والرقابة بالتعاون مع المساعد الذكي
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Embeds the full EmployeeKpiPage */}
        <div className="p-4 sm:p-6">
          <EmployeeKpiPage isModal={true} />
        </div>
      </div>
    </div>
  );
};
