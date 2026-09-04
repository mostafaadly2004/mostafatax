import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  ClipboardPaste,
  Presentation,
  File
} from 'lucide-react';
import type { MonthlyKpiDataset, IngestionItem } from '../../../types.ts';
import { apiFetch } from '../../../lib/api-client.ts';

interface Props {
  onIngestionComplete: (dataset: MonthlyKpiDataset) => void;
  onCancel: () => void;
  defaultMonth?: number;
  defaultYear?: number;
}

const MONTHS = [
  { value: 1, name: 'يناير' },
  { value: 2, name: 'فبراير' },
  { value: 3, name: 'مارس' },
  { value: 4, name: 'أبريل' },
  { value: 5, name: 'مايو' },
  { value: 6, name: 'يونيو' },
  { value: 7, name: 'يوليو' },
  { value: 8, name: 'أغسطس' },
  { value: 9, name: 'سبتمبر' },
  { value: 10, name: 'أكتوبر' },
  { value: 11, name: 'نوفمبر' },
  { value: 12, name: 'ديسمبر' }
];

const YEARS = [2025, 2026, 2027];

function getFileCategory(file: File): 'image' | 'excel' | 'word' | 'presentation' | 'pdf' | 'text' {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (type.startsWith('image/') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp')) {
    return 'image';
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv') || type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
    return 'excel';
  }
  if (name.endsWith('.docx') || name.endsWith('.doc') || type.includes('word') || type.includes('officedocument.wordprocessingml')) {
    return 'word';
  }
  if (name.endsWith('.pptx') || name.endsWith('.ppt') || type.includes('presentation') || type.includes('powerpoint')) {
    return 'presentation';
  }
  if (name.endsWith('.pdf') || type.includes('pdf')) {
    return 'pdf';
  }
  return 'text';
}

async function processFileToIngestionItem(file: File): Promise<IngestionItem> {
  const fileCategory = getFileCategory(file);

  if (fileCategory === 'image') {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 2048;
          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
            const base64 = compressedDataUrl.split(',')[1] || '';
            resolve({
              id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: file.name,
              size: Math.round((base64.length * 3) / 4),
              mimeType: 'image/jpeg',
              data: base64,
              fileType: 'image'
            });
            return;
          }

          const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          resolve({
            id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'image/jpeg',
            data: rawBase64,
            fileType: 'image'
          });
        };
        img.onerror = () => {
          const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          resolve({
            id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'image/jpeg',
            data: rawBase64,
            fileType: 'image'
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  // Non-image files (Excel, Word, PPTX, PDF, Text)
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve({
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        data: base64,
        fileType: fileCategory
      });
    };
    reader.readAsDataURL(file);
  });
}

export const KpiIngestionUploader: React.FC<Props> = ({
  onIngestionComplete,
  onCancel,
  defaultMonth = 8,
  defaultYear = 2026
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'text'>('files');
  const [targetMonth, setTargetMonth] = useState<number>(defaultMonth);
  const [targetYear, setTargetYear] = useState<number>(defaultYear);
  const [items, setItems] = useState<IngestionItem[]>([]);
  const [pastedText, setPastedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    setProcessStep('جارٍ قراءة وتجهيز الملفات المرفوعة...');
    const processed = await Promise.all(Array.from(files).map(processFileToIngestionItem));

    setItems(prev => [...prev, ...processed]);
    setProcessStep('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleAddPastedTextAsItem = () => {
    if (!pastedText.trim()) return;
    const newItem: IngestionItem = {
      id: `txt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `نص منسوخ (${new Date().toLocaleTimeString('ar-EG')})`,
      size: pastedText.length,
      mimeType: 'text/plain',
      data: '',
      rawText: pastedText.trim(),
      fileType: 'text'
    };
    setItems(prev => [...prev, newItem]);
    setPastedText('');
    setActiveTab('files');
  };

  const handleStartIngestion = async () => {
    // If text tab has text, include it if not already in items
    const currentItems = [...items];
    if (pastedText.trim()) {
      const alreadyHasExactText = currentItems.some(it => it.rawText === pastedText.trim());
      if (!alreadyHasExactText) {
        currentItems.push({
          id: `txt_${Date.now()}`,
          name: 'نص منسوخ مدخل مباشراً',
          size: pastedText.length,
          mimeType: 'text/plain',
          data: '',
          rawText: pastedText.trim(),
          fileType: 'text'
        });
      }
    }

    if (currentItems.length === 0 && !pastedText.trim()) {
      setErrorMsg('يرجى إضافة ملف واحد على الأقل (صور، إكسيل، وورد، برزنتيشن، PDF) أو لصق نص الكشف.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setProcessStep('جارٍ تحليل الكشوفات واستخراج البيانات عبر محرك الذكاء الاصطناعي متعدد الأنماط...');

    try {
      const payload = {
        month: targetMonth,
        year: targetYear,
        items: currentItems,
        pastedText: pastedText.trim() || undefined
      };

      const res = await apiFetch<{ success: boolean; dataset: MonthlyKpiDataset; message: string }>('/api/admin/performance/kpi/ingest', {
        method: 'POST',
        body: JSON.stringify(payload),
        timeoutMs: 180000
      });

      if (res.ok && res.data?.dataset) {
        setProcessStep('تم الاستخراج بنجاح! جارٍ تحويلك إلى شاشة التدقيق والمراجعة...');
        setTimeout(() => {
          onIngestionComplete(res.data!.dataset);
        }, 600);
      } else {
        throw new Error(res.error || 'فشل استخراج بيانات التقارير.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ غير متوقع أثناء معالجة التقارير.');
      setIsProcessing(false);
    }
  };

  const getItemIcon = (type?: string) => {
    switch (type) {
      case 'excel':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'word':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'presentation':
        return <Presentation className="w-5 h-5 text-amber-600" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-600" />;
      case 'text':
        return <ClipboardPaste className="w-5 h-5 text-indigo-600" />;
      default:
        return <ImageIcon className="w-5 h-5 text-purple-600" />;
    }
  };

  const getItemTypeBadge = (type?: string) => {
    switch (type) {
      case 'excel':
        return <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">Excel</span>;
      case 'word':
        return <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded">Word</span>;
      case 'presentation':
        return <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded">PowerPoint</span>;
      case 'pdf':
        return <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded">PDF</span>;
      case 'text':
        return <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded">نص منسوخ</span>;
      default:
        return <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded">صورة كشف</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden" dir="rtl">
      
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">استيراد تقارير الأداء الشهرية المتعددة</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              يدعم استخراج البيانات آلياً من الصور، ملفات Excel، Word، العروض التقديمية، أو النصوص المنسوخة
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">

        {/* Period Selector */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>حدد الشهر والسنة المستهدفة للكشف:</span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={targetMonth}
              onChange={(e) => setTargetMonth(parseInt(e.target.value, 10))}
              disabled={isProcessing}
              className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
            >
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>

            <select
              value={targetYear}
              onChange={(e) => setTargetYear(parseInt(e.target.value, 10))}
              disabled={isProcessing}
              className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
            >
              {YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Switcher: Files vs Paste Text */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'files'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>رفع ملفات (صور، إكسيل، وورد، برزنتيشن، PDF)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'text'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>لصق نص / جدول منسوخ مباشرة</span>
          </button>
        </div>

        {/* Tab 1: Upload Files */}
        {activeTab === 'files' && (
          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isProcessing
                ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFilesSelected(e.target.files)}
              multiple
              accept="image/*,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.docx,.doc,.pptx,.ppt,.pdf,.txt"
              className="hidden"
              disabled={isProcessing}
            />
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-3">
              <Upload className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              اضغط لاختيار كشوفات الأداء أو اسحب وأفلت الملفات هنا
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              يدعم كشوفات الاستغلال والإشغال، المكالمات، الحضور، ونسب الأخطاء والـ IR
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-[11px] text-slate-400">
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Excel (.xlsx, .xls, .csv)</span>
              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Word (.docx)</span>
              <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">PowerPoint (.pptx)</span>
              <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">صور (PNG, JPG, WebP)</span>
              <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">PDF</span>
            </div>
          </div>
        )}

        {/* Tab 2: Paste Raw Text */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>الصق محتوى الكشف أو الجدول المنسوخ من بريد إلكتروني أو محادثة أو جدول:</span>
              {pastedText.trim() && (
                <button
                  type="button"
                  onClick={() => setPastedText('')}
                  className="text-rose-600 hover:text-rose-700"
                >
                  مسح النص
                </button>
              )}
            </div>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="الصق هنا بيانات الكشف (مثال: Ext-Ahmed_ElSayed	92.4%	1050 مكالمة...)"
              disabled={isProcessing}
              rows={6}
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none resize-y"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                سيقوم النموذج الذكي بالتعرف على الموظفين والأرقام ونوع الكشف تلقائياً.
              </span>
              <button
                type="button"
                onClick={handleAddPastedTextAsItem}
                disabled={!pastedText.trim() || isProcessing}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                إضافة النص كملف كشف
              </button>
            </div>
          </div>
        )}

        {/* Uploaded Items List */}
        {items.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>الكشوفات والملفات المجهزة للتحليل ({items.length} ملفات):</span>
              <button
                type="button"
                onClick={() => setItems([])}
                disabled={isProcessing}
                className="text-rose-600 hover:text-rose-700 transition-colors"
              >
                مسح الكل
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 group relative overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.fileType === 'image' && item.data ? (
                        <img
                          src={`data:${item.mimeType};base64,${item.data}`}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getItemIcon(item.fileType)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="text-xs font-semibold text-slate-800 truncate" title={item.name}>
                          {item.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {getItemTypeBadge(item.fileType)}
                        <span className="text-[10px] text-slate-400">
                          {Math.round((item.size || 0) / 1024) || 1} كيلوبايت
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isProcessing && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing State Indicator */}
        {isProcessing && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3 animate-in fade-in">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">جارٍ تحليل واستخراج المؤشرات...</h4>
              <p className="text-xs text-emerald-700 mt-1">{processStep}</p>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">فشل إكمال عملية الاستخراج:</div>
              <div className="mt-0.5 text-rose-700">{errorMsg}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            إلغاء والعودة
          </button>

          <button
            type="button"
            onClick={handleStartIngestion}
            disabled={isProcessing || (items.length === 0 && !pastedText.trim())}
            className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>بدء الاستخراج والتحليل الذكي</span>
          </button>
        </div>

      </div>
    </div>
  );
};
