/**
 * Developer Real-Time Database Studio
 * Tax Support AI - Egyptian Real Estate Tax Authority
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Search,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Layers,
  Code,
  Table as TableIcon,
  Grid,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Users,
  MessageSquare,
  HelpCircle,
  FileText,
  Settings,
  FlaskConical,
  X,
  Check,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

interface CollectionMeta {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  count: number;
  isSystem: boolean;
}

interface DocumentItem {
  _id: string;
  id: string;
  updatedAt?: string;
  [key: string]: any;
}

export const AdminDatabaseStudio: React.FC = () => {
  const [collections, setCollections] = useState<CollectionMeta[]>([]);
  const [selectedCol, setSelectedCol] = useState<string>('users');
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [colSearch, setColSearch] = useState('');

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docSearch, setDocSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'json'>('table');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [isNewDoc, setIsNewDoc] = useState(false);
  const [docEditorMode, setDocEditorMode] = useState<'form' | 'json'>('form');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [savingDoc, setSavingDoc] = useState(false);
  const [formFields, setFormFields] = useState<Array<{ key: string; value: any; type: string }>>([]);

  const [showDeleteModal, setShowDeleteModal] = useState<DocumentItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showBanner = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchCollections = async () => {
    setLoadingCollections(true);
    try {
      const res = await fetch('/api/admin/db/collections', {
        headers: { 'x-user-role': 'admin' }
      });
      const data = await res.json();
      if (data.collections) {
        setCollections(data.collections);
      }
    } catch (err) {
      console.error('Failed to load collections', err);
    } finally {
      setLoadingCollections(false);
    }
  };

  const fetchDocuments = async (colName: string = selectedCol) => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/admin/db/${colName}`, {
        headers: { 'x-user-role': 'admin' }
      });
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch collection documents', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    if (selectedCol) {
      fetchDocuments(selectedCol);
    }
  }, [selectedCol]);

  const filteredCollections = useMemo(() => {
    if (!colSearch.trim()) return collections;
    const q = colSearch.toLowerCase();
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [collections, colSearch]);

  const filteredDocuments = useMemo(() => {
    if (!docSearch.trim()) return documents;
    const q = docSearch.toLowerCase();
    return documents.filter((d) => JSON.stringify(d).toLowerCase().includes(q));
  }, [documents, docSearch]);

  const currentCollectionMeta = collections.find((c) => c.id === selectedCol) || {
    id: selectedCol,
    name: selectedCol,
    title: selectedCol,
    description: 'مجموعة بيانات',
    icon: 'Database',
    count: documents.length,
    isSystem: false
  };

  const tableColumns = useMemo(() => {
    if (documents.length === 0) return ['id'];
    const keys = new Set<string>();
    keys.add('id');
    documents.forEach((doc) => {
      Object.keys(doc).forEach((k) => {
        if (k !== '_id' && k !== 'password') {
          keys.add(k);
        }
      });
    });
    return Array.from(keys).slice(0, 6);
  }, [documents]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users':
        return Users;
      case 'Database':
        return Database;
      case 'MessageSquare':
        return MessageSquare;
      case 'HelpCircle':
        return HelpCircle;
      case 'FileSpreadsheet':
        return FileSpreadsheet;
      case 'FlaskConical':
        return FlaskConical;
      case 'Settings':
        return Settings;
      case 'FileText':
        return FileText;
      default:
        return Layers;
    }
  };

  const handleOpenDocEditor = (docItem: DocumentItem | null = null) => {
    setJsonError(null);
    if (docItem) {
      setIsNewDoc(false);
      setEditingDoc(docItem);
      const cleanDoc = { ...docItem };
      delete cleanDoc._id;
      setJsonInput(JSON.stringify(cleanDoc, null, 2));

      const fields: Array<{ key: string; value: any; type: string }> = [];
      Object.entries(cleanDoc).forEach(([k, v]) => {
        let typeStr: string = typeof v;
        if (v === null || v === undefined) typeStr = 'string';
        else if (Array.isArray(v)) typeStr = 'array';
        else if (typeof v === 'object') typeStr = 'object';
        else if (typeof v === 'boolean') typeStr = 'boolean';
        else if (typeof v === 'number') typeStr = 'number';
        fields.push({ key: k, value: v, type: typeStr });
      });
      setFormFields(fields);
    } else {
      setIsNewDoc(true);
      const defaultId = `doc_${Date.now()}`;
      const template = { id: defaultId, title: 'عنصر جديد', active: true, createdAt: new Date().toISOString() };
      setEditingDoc(template);
      setJsonInput(JSON.stringify(template, null, 2));
      const fields: Array<{ key: string; value: any; type: string }> = [];
      Object.entries(template).forEach(([k, v]) => {
        fields.push({ key: k, value: v, type: typeof v });
      });
      setFormFields(fields);
    }
    setDocEditorMode('form');
  };

  const handleSaveDocument = async () => {
    setSavingDoc(true);
    setJsonError(null);
    let docPayload: any = {};
    try {
      if (docEditorMode === 'json') {
        docPayload = JSON.parse(jsonInput);
      } else {
        formFields.forEach((f) => {
          if (!f.key.trim()) return;
          let val = f.value;
          if (f.type === 'array' && typeof val === 'string') {
            try {
              val = JSON.parse(val);
            } catch {
              val = val.split(',').map((s: string) => s.trim());
            }
          }
          docPayload[f.key.trim()] = val;
        });
      }

      if (!docPayload.id && !docPayload._id) {
        docPayload.id = `doc_${Date.now()}`;
      }

      const res = await fetch(`/api/admin/db/${selectedCol}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify(docPayload)
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'فشل حفظ المستند');
      }

      showBanner(isNewDoc ? 'تم إنشاء المستند بنجاح' : 'تم تحديث المستند بنجاح');
      setEditingDoc(null);
      fetchDocuments(selectedCol);
      fetchCollections();
    } catch (err: any) {
      setJsonError(err.message || 'خطأ في حفظ المستند');
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!showDeleteModal) return;
    setDeleteLoading(true);
    try {
      const docId = showDeleteModal.id || showDeleteModal._id;
      const res = await fetch(`/api/admin/db/${selectedCol}/${docId}`, {
        method: 'DELETE',
        headers: { 'x-user-role': 'admin' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الحذف');

      showBanner(`تم حذف المستند (${docId}) بنجاح`);
      setShowDeleteModal(null);
      fetchDocuments(selectedCol);
      fetchCollections();
    } catch (err: any) {
      showBanner(err.message || 'خطأ أثناء الحذف', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200" dir="rtl">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.msg}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/5 rounded-lg cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Studio Header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                استوديو قواعد البيانات المباشر (DB Studio)
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Data</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              فحص وتعديل وحذف مستندات المجموعات والجداول في الوقت الفعلي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto text-xs">
          <button
            onClick={() => fetchDocuments(selectedCol)}
            disabled={loadingDocs}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5 font-medium transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs ? 'animate-spin text-emerald-400' : ''}`} />
            <span>تحديث</span>
          </button>
          <button
            onClick={() => handleOpenDocEditor(null)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>مستند جديد</span>
          </button>
        </div>
      </div>

      {/* Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Collections Navigator (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>المجموعات النشطة ({collections.length})</span>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="البحث في المجموعات..."
              value={colSearch}
              onChange={(e) => setColSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl text-xs py-2 pr-8 pl-3 outline-none text-slate-800 placeholder:text-slate-400"
            />
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-0.5">
            {filteredCollections.map((col) => {
              const IconComp = getIcon(col.icon);
              const isSelected = selectedCol === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => setSelectedCol(col.id)}
                  className={`w-full text-right p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-slate-800 text-emerald-400' : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-xs truncate block">{col.title}</span>
                      <span className="text-[10px] block font-mono truncate text-slate-400">
                        /{col.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pr-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {col.count}
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-slate-300 group-hover:text-slate-500'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Documents Workspace (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">{currentCollectionMeta.title}</h3>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {documents.length} مستند
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{currentCollectionMeta.description}</p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
                title="عرض الجدول"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'cards' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
                title="عرض البطاقات"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'json' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
                title="عرض JSON الخام"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="البحث داخل المستندات..."
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl text-xs py-2 pr-8 pl-3 outline-none text-slate-800 placeholder:text-slate-400"
            />
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Table View */}
          {loadingDocs ? (
            <div className="py-20 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              <span>جاري تحميل البيانات...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <Database className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">لا توجد بيانات مسجلة في هذه المجموعة</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">معرف المستند (ID)</th>
                    {tableColumns
                      .filter((col) => col !== 'id')
                      .map((col) => (
                        <th key={col} className="p-3 font-mono text-[11px]">
                          {col}
                        </th>
                      ))}
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocuments.map((doc) => {
                    const docId = doc.id || doc._id;
                    return (
                      <tr key={docId} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="p-3 font-mono font-bold text-slate-900 text-[11px]">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-slate-800">
                            {docId}
                          </span>
                        </td>
                        {tableColumns
                          .filter((col) => col !== 'id')
                          .map((col) => (
                            <td key={col} className="p-3 text-slate-700 truncate max-w-xs">
                              {typeof doc[col] === 'object'
                                ? JSON.stringify(doc[col])
                                : String(doc[col] ?? '')}
                            </td>
                          ))}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenDocEditor(doc)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="تعديل"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setShowDeleteModal(doc)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredDocuments.map((doc) => {
                const docId = doc.id || doc._id;
                return (
                  <div
                    key={docId}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-mono font-bold text-xs text-slate-900">{docId}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenDocEditor(doc)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(doc)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <pre className="text-[10px] text-slate-600 overflow-x-auto bg-white p-2 rounded-lg border border-slate-100 max-h-32">
                      {JSON.stringify(doc, null, 2)}
                    </pre>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto max-h-[500px]" dir="ltr">
              <pre>{JSON.stringify(filteredDocuments, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 text-xs space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {isNewDoc ? 'إنشاء مستند جديد' : `تعديل مستند (${editingDoc.id || editingDoc._id})`}
              </h3>
              <button onClick={() => setEditingDoc(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {jsonError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <textarea
                rows={12}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full bg-slate-900 text-emerald-400 font-mono text-xs p-3 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 border border-slate-800 leading-relaxed"
                dir="ltr"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={savingDoc}
                onClick={handleSaveDocument}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {savingDoc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>حفظ التغييرات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 text-xs space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <Trash2 className="w-6 h-6" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">تأكيد حذف المستند</h3>
                <p className="text-slate-400 text-[11px]">لا يمكن التراجع عن هذا الإجراء</p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
              ID: {showDeleteModal.id || showDeleteModal._id}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteDocument}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg"
              >
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
