/**
 * Admin Employee Performance & KPI Ingestion Panel
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * 
 * Features:
 * - Multi-report image upload & Gemini Vision extraction
 * - Deterministic KPI calculation in application code
 * - Mandatory human review & editing before approval
 * - Monthly analytics & employee comparisons (MoM)
 * - Traceable audit logging & version control
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client.ts';
import type { MonthlyKpiDataset, UserProfile } from '../../types.ts';
import { KpiOverviewAnalytics } from './kpi/KpiOverviewAnalytics.tsx';
import { KpiIngestionUploader } from './kpi/KpiIngestionUploader.tsx';
import { KpiReviewDrawer } from './kpi/KpiReviewDrawer.tsx';
import { RefreshCw, AlertCircle } from 'lucide-react';

export const AdminPerformance: React.FC = () => {
  // Selected Month & Year (defaults to August 2026 for benchmark records)
  const [selectedMonth, setSelectedMonth] = useState<number>(8);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Datasets state
  const [currentDataset, setCurrentDataset] = useState<MonthlyKpiDataset | null>(null);
  const [allDatasets, setAllDatasets] = useState<MonthlyKpiDataset[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active View State: 'overview' | 'uploader' | 'review'
  const [activeView, setActiveView] = useState<'overview' | 'uploader' | 'review'>('overview');

  // Load all datasets and users
  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dsRes, userRes] = await Promise.all([
        apiFetch<{ success: boolean; datasets: MonthlyKpiDataset[] }>('/api/admin/performance/kpi/datasets'),
        apiFetch<{ success: boolean; users: UserProfile[] }>('/api/admin/users')
      ]);

      if (dsRes.ok && dsRes.data?.datasets) {
        setAllDatasets(dsRes.data.datasets);
      }
      if (userRes.ok && userRes.data?.users) {
        setUsers(userRes.data.users);
      }
    } catch (err: any) {
      console.error('[AdminPerformance] Failed to load data:', err);
      setError('فشل تحميل كشوفات ومؤشرات الأداء.');
    } finally {
      setLoading(false);
    }
  };

  // Load dataset for currently selected month/year
  const loadMonthDataset = async (month: number, year: number) => {
    try {
      const res = await apiFetch<{ success: boolean; dataset: MonthlyKpiDataset }>(
        `/api/admin/performance/kpi/dataset?month=${month}&year=${year}`
      );
      if (res.ok && res.data?.dataset) {
        setCurrentDataset(res.data.dataset);
      } else {
        setCurrentDataset(null);
      }
    } catch (err) {
      setCurrentDataset(null);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadMonthDataset(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const handleMonthYearChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const handleIngestionComplete = (newDataset: MonthlyKpiDataset) => {
    setCurrentDataset(newDataset);
    setSelectedMonth(newDataset.month);
    setSelectedYear(newDataset.year);
    setAllDatasets(prev => {
      const filtered = prev.filter(d => d.monthKey !== newDataset.monthKey);
      return [newDataset, ...filtered];
    });
    setActiveView('review');
  };

  const handleDatasetUpdated = (updatedDataset: MonthlyKpiDataset) => {
    setCurrentDataset(updatedDataset);
    setAllDatasets(prev => {
      const filtered = prev.filter(d => d.monthKey !== updatedDataset.monthKey);
      return [updatedDataset, ...filtered];
    });
  };

  const handleDatasetDiscarded = async () => {
    await loadInitialData();
    await loadMonthDataset(selectedMonth, selectedYear);
    setActiveView('overview');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 space-y-3" dir="rtl">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        <div className="text-sm font-bold text-slate-800">جارٍ تحميل لوحة مؤشرات الأداء والتقارير...</div>
        <div className="text-xs text-slate-500">استرجاع الكشوفات المعتمدة وقاعدة بيانات الموظفين</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl text-center space-y-3 m-4" dir="rtl">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <div className="font-bold text-sm">{error}</div>
        <button
          onClick={loadInitialData}
          className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {activeView === 'uploader' && (
        <KpiIngestionUploader
          defaultMonth={selectedMonth}
          defaultYear={selectedYear}
          onIngestionComplete={handleIngestionComplete}
          onCancel={() => setActiveView('overview')}
        />
      )}

      {activeView === 'review' && currentDataset && (
        <KpiReviewDrawer
          dataset={currentDataset}
          users={users}
          onDatasetUpdated={handleDatasetUpdated}
          onBackToOverview={() => setActiveView('overview')}
          onDatasetDiscarded={handleDatasetDiscarded}
        />
      )}

      {activeView === 'overview' && (
        <KpiOverviewAnalytics
          dataset={currentDataset}
          allDatasets={allDatasets}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthYearChange={handleMonthYearChange}
          onOpenUploader={() => setActiveView('uploader')}
          onOpenReview={() => setActiveView('review')}
          onDatasetUpdated={handleDatasetUpdated}
          users={users}
        />
      )}
    </div>
  );
};
