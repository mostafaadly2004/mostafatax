import React, { useState } from 'react';
import {
  X,
  Users,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  Building2
} from 'lucide-react';
import type { MonthlyKpiDataset, EmployeeKpiRecord } from '../../../types.ts';

interface Props {
  dataset: MonthlyKpiDataset;
  allDatasets: MonthlyKpiDataset[];
  onClose: () => void;
}

export const KpiComparisonModal: React.FC<Props> = ({
  dataset,
  allDatasets,
  onClose
}) => {
  const [tab, setTab] = useState<'employees' | 'mom'>('employees');

  // Multi-Employee comparison state
  const employeeList = Object.values(dataset.employees);
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>(
    employeeList.slice(0, 3).map(e => e.username)
  );

  // MoM comparison state
  const [targetUsername, setTargetUsername] = useState<string>(employeeList[0]?.username || '');
  const [monthAKey, setMonthAKey] = useState<string>(dataset.monthKey);
  const [monthBKey, setMonthBKey] = useState<string>(allDatasets[1]?.monthKey || dataset.monthKey);

  const toggleEmployeeSelect = (uname: string) => {
    if (selectedUsernames.includes(uname)) {
      if (selectedUsernames.length > 1) {
        setSelectedUsernames(prev => prev.filter(u => u !== uname));
      }
    } else {
      if (selectedUsernames.length < 4) {
        setSelectedUsernames(prev => [...prev, uname]);
      }
    }
  };

  const selectedRecords = selectedUsernames
    .map(u => dataset.employees[u])
    .filter(Boolean) as EmployeeKpiRecord[];

  // MoM Data calculation
  const dsA = allDatasets.find(d => d.monthKey === monthAKey);
  const dsB = allDatasets.find(d => d.monthKey === monthBKey);
  const empA = dsA?.employees[targetUsername];
  const empB = dsB?.employees[targetUsername];

  const renderDelta = (valA?: number | null, valB?: number | null, isPercentagePoint = false, reverseGood = false) => {
    if (valA === undefined || valA === null || valB === undefined || valB === null) {
      return <span className="text-slate-400 text-xs">-</span>;
    }

    const diff = Number((valB - valA).toFixed(1));
    if (diff === 0) {
      return <span className="text-slate-500 text-xs flex items-center gap-0.5"><Minus className="w-3 h-3" /> لا تغيير</span>;
    }

    const isPositive = diff > 0;
    const isGood = reverseGood ? !isPositive : isPositive;

    return (
      <span className={`text-xs font-bold flex items-center gap-0.5 ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {isPositive ? `+${diff}` : `${diff}`} {isPercentagePoint ? 'نقطة مئوية' : ''}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              أداة المقارنة المتقدمة للمؤشرات (KPI Comparison Engine)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              مقارنة دقيقة ومحسوبة برمجياً بين الموظفين أو التغير الزمني الشهري (MoM)
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center gap-2">
          <button
            onClick={() => setTab('employees')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'employees'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مقارنة بين الموظفين (نفس الشهر)
          </button>
          <button
            onClick={() => setTab('mom')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'mom'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تتبع التغير الشهري (Month-over-Month MoM)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {tab === 'employees' ? (
            <div className="space-y-4">
              
              {/* Employee Selection Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  اختر من 2 إلى 4 موظفين للمقارنة الفورية:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {employeeList.map(emp => {
                    const isSelected = selectedUsernames.includes(emp.username);
                    return (
                      <button
                        key={emp.username}
                        onClick={() => toggleEmployeeSelect(emp.username)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {emp.employeeName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Side-by-Side Comparison Matrix */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3 w-1/4">المؤشر / المقياس</th>
                      {selectedRecords.map(rec => (
                        <th key={rec.username} className="p-3 text-center border-r border-slate-200 bg-slate-50">
                          <div className="font-bold text-slate-900">{rec.employeeName}</div>
                          <div className="font-mono text-[10px] text-slate-500">{rec.username}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    
                    {/* Presented Calls */}
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-700">المكالمات الواردة (Presented)</td>
                      {selectedRecords.map(rec => (
                        <td key={rec.username} className="p-3 text-center border-r border-slate-200 font-mono">
                          {rec.callsPresented?.value ?? '-'}
                        </td>
                      ))}
                    </tr>

                    {/* Handled Calls */}
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-700">المكالمات المنجزة (Handled)</td>
                      {selectedRecords.map(rec => (
                        <td key={rec.username} className="p-3 text-center border-r border-slate-200 font-bold font-mono text-emerald-700">
                          {rec.callsHandled?.value ?? '-'}
                        </td>
                      ))}
                    </tr>

                    {/* Call Handling Rate */}
                    <tr className="hover:bg-slate-50 bg-blue-50/30">
                      <td className="p-3 font-bold text-blue-950">معدل إنجاز المكالمات (Handling Rate)</td>
                      {selectedRecords.map(rec => (
                        <td key={rec.username} className="p-3 text-center border-r border-slate-200 font-bold font-mono text-blue-900">
                          {rec.derived.callHandlingRate !== null ? `${rec.derived.callHandlingRate}%` : 'N/A'}
                        </td>
                      ))}
                    </tr>

                    {/* Utilization */}
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-700">نسبة الاستغلال (Utli %)</td>
                      {selectedRecords.map(rec => (
                        <td key={rec.username} className="p-3 text-center border-r border-slate-200 font-mono">
                          {rec.utilization ? `${rec.utilization.value}%` : '-'}
                        </td>
                      ))}
                    </tr>

                    {/* Occupancy */}
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-700">نسبة الإشغال (Occu %)</td>
                      {selectedRecords.map(rec => (
                        <td key={rec.username} className="p-3 text-center border-r border-slate-200 font-mono">
                          {rec.occupancy ? `${rec.occupancy.value}%` : '-'}
                        </td>
                      ))}
                    </tr>

                    {/* IR */}
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-700">معدل الاستجابة (% Of IR)</td>
                      {selectedRecords.map(rec => (
                        <td key={rec.username} className="p-3 text-center border-r border-slate-200 font-mono">
                          {rec.ir ? `${rec.ir.value}%` : '100%'}
                        </td>
                      ))}
                    </tr>

                    {/* % Mistakes */}
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-rose-700">نسبة الأخطاء (% Mistakes)</td>
                      {selectedRecords.map(rec => (
                        <td key={rec.username} className="p-3 text-center border-r border-slate-200 font-bold font-mono text-rose-600">
                          {rec.mistakes ? `${rec.mistakes.value}%` : '0%'}
                        </td>
                      ))}
                    </tr>

                    {/* Accuracy Rate */}
                    <tr className="hover:bg-slate-50 bg-emerald-50/30">
                      <td className="p-3 font-bold text-emerald-950">نسبة الدقة (Accuracy Rate)</td>
                      {selectedRecords.map(rec => (
                        <td key={rec.username} className="p-3 text-center border-r border-slate-200 font-bold font-mono text-emerald-900">
                          {rec.derived.accuracyRate !== null ? `${rec.derived.accuracyRate}%` : '100%'}
                        </td>
                      ))}
                    </tr>

                    {/* Absence Days */}
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-700">إجمالي أيام الغياب (طارئ + مرضي)</td>
                      {selectedRecords.map(rec => (
                        <td key={rec.username} className="p-3 text-center border-r border-slate-200 font-mono">
                          {rec.derived.totalAbsenceDays} يوم
                        </td>
                      ))}
                    </tr>

                    {/* Tardy Count */}
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-700">مرات التأخير</td>
                      {selectedRecords.map(rec => (
                        <td key={rec.username} className="p-3 text-center border-r border-slate-200 font-mono">
                          {rec.derived.totalTardyCount}
                        </td>
                      ))}
                    </tr>

                  </tbody>
                </table>
              </div>

            </div>
          ) : (
            <div className="space-y-6">
              
              {/* MoM Selectors */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    اختر الموظف:
                  </label>
                  <select
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {employeeList.map(emp => (
                      <option key={emp.username} value={emp.username}>
                        {emp.employeeName} ({emp.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الشهر الأساس (الفترة السابقة):
                  </label>
                  <select
                    value={monthAKey}
                    onChange={(e) => setMonthAKey(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {allDatasets.map(d => (
                      <option key={d.monthKey} value={d.monthKey}>{d.monthLabel}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    شهر المقارنة (الفترة اللاحقة):
                  </label>
                  <select
                    value={monthBKey}
                    onChange={(e) => setMonthBKey(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {allDatasets.map(d => (
                      <option key={d.monthKey} value={d.monthKey}>{d.monthLabel}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* MoM Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">المؤشر</th>
                      <th className="p-3 text-center">{dsA?.monthLabel || monthAKey}</th>
                      <th className="p-3 text-center">{dsB?.monthLabel || monthBKey}</th>
                      <th className="p-3 text-center bg-slate-200/50">الفارق / التغير (Delta)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    
                    {/* Utilization */}
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold">نسبة الاستغلال (Utli %)</td>
                      <td className="p-3 text-center font-mono">{empA?.utilization?.value ? `${empA.utilization.value}%` : '-'}</td>
                      <td className="p-3 text-center font-mono">{empB?.utilization?.value ? `${empB.utilization.value}%` : '-'}</td>
                      <td className="p-3 text-center font-mono bg-slate-50">
                        {renderDelta(empA?.utilization?.value, empB?.utilization?.value, true)}
                      </td>
                    </tr>

                    {/* Occupancy */}
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold">نسبة الإشغال (Occu %)</td>
                      <td className="p-3 text-center font-mono">{empA?.occupancy?.value ? `${empA.occupancy.value}%` : '-'}</td>
                      <td className="p-3 text-center font-mono">{empB?.occupancy?.value ? `${empB.occupancy.value}%` : '-'}</td>
                      <td className="p-3 text-center font-mono bg-slate-50">
                        {renderDelta(empA?.occupancy?.value, empB?.occupancy?.value, true)}
                      </td>
                    </tr>

                    {/* Handled Calls */}
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold">المكالمات المنجزة (Handled)</td>
                      <td className="p-3 text-center font-mono">{empA?.callsHandled?.value ?? '-'}</td>
                      <td className="p-3 text-center font-mono">{empB?.callsHandled?.value ?? '-'}</td>
                      <td className="p-3 text-center font-mono bg-slate-50">
                        {renderDelta(empA?.callsHandled?.value, empB?.callsHandled?.value)}
                      </td>
                    </tr>

                    {/* Handling Rate */}
                    <tr className="hover:bg-slate-50 bg-blue-50/30">
                      <td className="p-3 font-bold text-blue-950">معدل إنجاز المكالمات (%)</td>
                      <td className="p-3 text-center font-mono">{empA?.derived.callHandlingRate ? `${empA.derived.callHandlingRate}%` : '-'}</td>
                      <td className="p-3 text-center font-mono">{empB?.derived.callHandlingRate ? `${empB.derived.callHandlingRate}%` : '-'}</td>
                      <td className="p-3 text-center font-mono bg-blue-100/30">
                        {renderDelta(empA?.derived.callHandlingRate, empB?.derived.callHandlingRate, true)}
                      </td>
                    </tr>

                    {/* Mistakes */}
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-rose-700">نسبة الأخطاء (% Mistakes)</td>
                      <td className="p-3 text-center font-mono text-rose-600">{empA?.mistakes?.value !== undefined ? `${empA.mistakes.value}%` : '-'}</td>
                      <td className="p-3 text-center font-mono text-rose-600">{empB?.mistakes?.value !== undefined ? `${empB.mistakes.value}%` : '-'}</td>
                      <td className="p-3 text-center font-mono bg-slate-50">
                        {renderDelta(empA?.mistakes?.value, empB?.mistakes?.value, true, true)}
                      </td>
                    </tr>

                    {/* Accuracy Rate */}
                    <tr className="hover:bg-slate-50 bg-emerald-50/30">
                      <td className="p-3 font-bold text-emerald-950">نسبة الدقة (Accuracy Rate %)</td>
                      <td className="p-3 text-center font-mono">{empA?.derived.accuracyRate !== null ? `${empA?.derived.accuracyRate}%` : '-'}</td>
                      <td className="p-3 text-center font-mono">{empB?.derived.accuracyRate !== null ? `${empB?.derived.accuracyRate}%` : '-'}</td>
                      <td className="p-3 text-center font-mono bg-emerald-100/30">
                        {renderDelta(empA?.derived.accuracyRate, empB?.derived.accuracyRate, true)}
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
