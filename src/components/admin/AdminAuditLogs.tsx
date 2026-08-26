/**
 * Admin Audit Logs Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  Clock, 
  User, 
  FileSpreadsheet, 
  Database,
  Lock
} from 'lucide-react';
import { AuditLog } from '../../types.ts';
import { apiFetch } from '../../lib/api-client.ts';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, ok } = await apiFetch<{ logs: AuditLog[] }>('/api/admin/audit-logs');
      if (ok && data && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.userName?.toLowerCase().includes(q) ||
      l.details?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200" dir="rtl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>سجل الرقابة والتدقيق الأمني (Audit Trail)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            توثيق غير قابل للتعديل لكافة الإجراءات الإدارية، تعديل القواعد، والمزامنة
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
          title="تحديث"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="البحث في سجل التدقيق..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-slate-800 rounded-xl text-xs py-2.5 pr-9 pl-3 outline-none text-slate-900 placeholder:text-slate-400 shadow-2xs"
        />
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3">الوقت والتاريخ</th>
              <th className="p-3">المستخدم / الدور</th>
              <th className="p-3">الإجراء المنفذ</th>
              <th className="p-3">التفاصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">جاري التحميل...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">لا توجد سجلات مطابقة</td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('ar-EG')}
                  </td>
                  <td className="p-3 font-semibold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.userName || 'النظام'}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-md border border-slate-200 text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 text-[11px] leading-relaxed">
                    {log.details || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
