import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  ArrowLeft
} from 'lucide-react';
import type { MonthlyKpiDataset } from '../../../types.ts';
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

async function processAndOptimizeImage(file: File): Promise<{ name: string; size: number; mimeType: string; data: string }> {
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
            name: file.name,
            size: Math.round((base64.length * 3) / 4),
            mimeType: 'image/jpeg',
            data: base64
          });
          return;
        }

        const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve({
          name: file.name,
          size: file.size,
          mimeType: file.type || 'image/jpeg',
          data: rawBase64
        });
      };
      img.onerror = () => {
        const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve({
          name: file.name,
          size: file.size,
          mimeType: file.type || 'image/jpeg',
          data: rawBase64
        });
      };
      img.src = dataUrl;
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
  const [targetMonth, setTargetMonth] = useState<number>(defaultMonth);
  const [targetYear, setTargetYear] = useState<number>(defaultYear);
  const [images, setImages] = useState<{ id: string; name: string; size: number; mimeType: string; data: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    const validFiles = Array.from(files).filter(f => 
      f.type.startsWith('image/') || f.name.endsWith('.png') || f.name.endsWith('.jpg') || f.name.endsWith('.jpeg') || f.name.endsWith('.webp')
    );

    if (validFiles.length === 0) {
      setErrorMsg('يرجى اختيار ملفات صور صالحة بصيغة PNG أو JPG أو WebP.');
      return;
    }

    setProcessStep('جارٍ قراءة وتجهيز الصور...');
    const processed = await Promise.all(validFiles.map(processAndOptimizeImage));

    setImages(prev => [
      ...prev,
      ...processed.map(p => ({
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: p.name,
        size: p.size,
        mimeType: p.mimeType,
        data: p.data
      }))
    ]);
    setProcessStep('');
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleStartIngestion = async () => {
    if (images.length === 0) {
      setErrorMsg('يرجى إضافة صورة واحدة على الأقل من تقارير الأداء الشهرية.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setProcessStep('جارٍ قراءة واستخراج البيانات الجدولية...');

    try {
      const payload = {
        month: targetMonth,
        year: targetYear,
        images: images.map(img => ({
          name: img.name,
          mimeType: img.mimeType,
          data: img.data
        }))
      };

      setProcessStep('جارٍ تحليل الصور واستخراج البيانات الجدولية عبر الذكاء الاصطناعي...');
      
      const res = await apiFetch<{ success: boolean; dataset: MonthlyKpiDataset; message: string }>('/api/admin/performance/kpi/ingest', {
        method: 'POST',
        body: JSON.stringify(payload),
        timeoutMs: 180000 // 3 minutes timeout for multi-image vision analysis
      });

      if (res.ok && res.data?.dataset) {
        setProcessStep('تم الاستخراج بنجاح! جارٍ تحويلك إلى شاشة المراجعة...');
        setTimeout(() => {
          onIngestionComplete(res.data!.dataset);
        }, 600);
      } else {
        throw new Error(res.error || 'فشل استخراج بيانات التقارير.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ غير متوقع أثناء معالجة الصور.');
      setIsProcessing(false);
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
            <h3 className="text-lg font-bold text-white">استيراد تقارير الأداء الشهرية المصورة</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              استخراج البيانات الجدولية من صور وتقارير المشرفين آلياً عبر محرك الرؤية البصرية
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

        {/* Drag & Drop Box */}
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
            accept="image/*,.png,.jpg,.jpeg,.webp"
            className="hidden"
            disabled={isProcessing}
          />
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-3">
            <Upload className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            اضغط لاختيار صور الكشوفات أو اسحب وأفلت الملفات هنا
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            يدعم رفع كشوفات متعددة معاً (كشف الاستغلال والإشغال، كشف المكالمات، كشف الحضور، كشف نسب الأخطاء)
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-slate-400">
            <span>الصيغ المدعومة: PNG, JPG, WebP</span>
            <span>•</span>
            <span>الحد الأقصى: 10 ملفات</span>
          </div>
        </div>

        {/* Uploaded Images List */}
        {images.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>الصور المرفوعة المجهزة للتحليل ({images.length} ملفات):</span>
              <button
                type="button"
                onClick={() => setImages([])}
                disabled={isProcessing}
                className="text-rose-600 hover:text-rose-700 transition-colors"
              >
                مسح الكل
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 group relative overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 overflow-hidden">
                      <img
                        src={`data:${img.mimeType};base64,${img.data}`}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate" title={img.name}>
                        {img.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {Math.round(img.size / 1024)} كيلوبايت
                      </div>
                    </div>
                  </div>

                  {!isProcessing && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
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
            disabled={isProcessing || images.length === 0}
            className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>بدء الاستخراج والتحليل البصري</span>
          </button>
        </div>

      </div>
    </div>
  );
};
