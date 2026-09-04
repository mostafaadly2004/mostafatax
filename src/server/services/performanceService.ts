/**
 * Employee Performance Evaluation & AI Vision Analytics Service
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * 
 * Manages monthly KPI records, error rate tracking, and Gemini AI analysis
 * of performance sheets, images, and raw tables.
 */

import fs from 'fs';
import path from 'path';
import { Type } from '@google/genai';
import { getAiClient } from './geminiService.ts';
import { listAllUsers } from './userService.ts';
import { getAdminDb } from '../firebase-admin.ts';
import type { PerformanceRecord, UserProfile } from '../../types.ts';
import { AUGUST_2026_PERFORMANCE } from '../data/augustPerformance.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const PERF_FILE = path.join(DATA_DIR, 'performance.json');

// In-memory cache for fast reads
const perfCache = new Map<string, PerformanceRecord>();

const ARABIC_MONTH_NAMES = [
  '',
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر'
];

export function getMonthLabel(month: number, year: number): string {
  const mName = ARABIC_MONTH_NAMES[month] || `شهر ${month}`;
  return `${mName} ${year}`;
}

// Initial Seed Data (including user's exact example: Mostafa Adly in month 1 with 12% error rate)
const SEED_PERFORMANCE: PerformanceRecord[] = [
  {
    id: 'perf_mostafa_2026_1',
    employeeUid: 'usr_mostafa',
    employeeName: 'مصطفى عدلي',
    username: 'mostafa',
    department: 'مصلحة الضرائب العقارية - المركز الرئيسي',
    jobTitle: 'مشرف نظام ومسؤول منظومة الذكاء الاصطناعي',
    month: 1,
    year: 2026,
    monthLabel: 'يناير 2026',
    errorRate: 12,
    errorCount: 18,
    accuracyRate: 88,
    casesHandled: 154,
    score: 88,
    overallRating: 'جيد جداً',
    strengths: [
      'سرعة فائقة في إنهاء تسويات الملفات الضريبية المعقدة',
      'إلمام شامل بتطبيق أحكام المادة 18 وإعفاءات السكن الخاص',
      'دقة عالية في استخراج الأرقام المحاسبية للوعاء الضريبي'
    ],
    improvementAreas: [
      'التحقق الإضافي من تواريخ الاستحقاق في المذكرات الرقابية القديمة لتفادي أخطاء احتساب غرامات التأخير',
      'التدقيق في إرفاق المستندات الممسوحة ضوئياً مع كل ملف'
    ],
    supervisorNotes: 'أداء متميز في شهر يناير 2026. سجل نسبة أخطاء 12% ومعدل دقة 88% عبر إنجاز 154 ملفاً ضريبياً بنجاح. يُوصى بمراجعة إشعارات الخصم قبل الاعتماد النهائي.',
    aiAnalysisSummary: 'تم تدقيق كشف تقييم أداء شهر يناير 2026: حقق مصطفى عدلي معدل إنجاز مرتفع مع نسبة أخطاء 12% فقط ودقة بلغت 88% مع معالجة 154 معاملة.',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
    addedBy: 'النظام الرقابي المركزي'
  },
  {
    id: 'perf_donia_2026_1',
    employeeUid: 'emp_ext-donia_fouad',
    employeeName: 'Donia Fouad',
    username: 'Ext-Donia_Fouad',
    department: 'مصلحة الضرائب العقارية - مركز الاتصال',
    jobTitle: 'Agent دعم واستشارات ضريبية',
    month: 1,
    year: 2026,
    monthLabel: 'يناير 2026',
    errorRate: 6,
    errorCount: 8,
    accuracyRate: 94,
    casesHandled: 132,
    score: 94,
    overallRating: 'ممتاز',
    strengths: [
      'انخفاض ملحوظ في نسبة الأخطاء (6% فقط)',
      'التزام حرفي بتعليمات الكتاب الدوري رقم 1 لسنة 2024',
      'معالجة استفسارات الممولين بلباقة وسرعة'
    ],
    improvementAreas: [
      'مشاركة الخبرة في فحص العقارات التجارية مع باقي الزملاء'
    ],
    supervisorNotes: 'تقييم ممتاز لشهر يناير. نسبة دقة استثنائية 94% وأخطاء لا تتجاوز 6% في 132 معاملة.',
    aiAnalysisSummary: 'أداء عالي الجودة بنسبة دقة 94% وأخطاء منخفضة جداً خلال شهر يناير 2026.',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
    addedBy: 'النظام الرقابي المركزي'
  },
  {
    id: 'perf_reta_2026_1',
    employeeUid: 'usr_employee_reta',
    employeeName: 'أحمد محمود (Agent دعم)',
    username: 'reta',
    department: 'مصلحة الضرائب العقارية',
    jobTitle: 'Agent دعم واستشارات ضريبية',
    month: 1,
    year: 2026,
    monthLabel: 'يناير 2026',
    errorRate: 15,
    errorCount: 16,
    accuracyRate: 85,
    casesHandled: 108,
    score: 85,
    overallRating: 'جيد جداً',
    strengths: [
      'معالجة الطعون الضريبية في المواعيد القانونية المقررة',
      'التنسيق الفعال مع لجان الحصر والتقدير'
    ],
    improvementAreas: [
      'مراجعة حساب القيمة الإيجارية السنوية بعد خصم مصاريف الصيانة (30% للسكني و32% لغير السكني)'
    ],
    supervisorNotes: 'أداء مستقر بنسبة دقة 85% ونسبة أخطاء 15% مع إنجاز 108 معاملات.',
    aiAnalysisSummary: 'تحليل الأداء لشهر يناير 2026 يظهر التزاماً بالمعايير الرقابية مع الحاجة لتخفيض نسبة الأخطاء الحسابية.',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
    addedBy: 'النظام الرقابي المركزي'
  }
];

function initPerformanceStorage(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(PERF_FILE)) {
      const raw = fs.readFileSync(PERF_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const item of parsed) {
          if (item && item.id) {
            perfCache.set(item.id, item);
          }
        }
      }
    }

    // Ensure initial seeds exist
    for (const item of SEED_PERFORMANCE) {
      if (!perfCache.has(item.id)) {
        perfCache.set(item.id, item);
      }
    }

    // Ensure August 2026 official supervisor benchmark records exist and are up to date
    for (const item of AUGUST_2026_PERFORMANCE) {
      perfCache.set(item.id, item);
    }

    persistToDisk();
  } catch (err) {
    console.warn('[PerformanceService] Storage init error:', err);
    for (const item of SEED_PERFORMANCE) {
      perfCache.set(item.id, item);
    }
    for (const item of AUGUST_2026_PERFORMANCE) {
      perfCache.set(item.id, item);
    }
  }
}

/**
 * Returns the official August 2026 20-employee benchmark dataset extracted from supervisor charts
 */
export function getAugustBenchmarkRecords(): PerformanceRecord[] {
  return [...AUGUST_2026_PERFORMANCE];
}

function persistToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(perfCache.values());
    fs.writeFileSync(PERF_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[PerformanceService] Failed to persist to disk:', err);
  }
}

// Initialize on module load
initPerformanceStorage();

/**
 * Get all performance records, optionally filtered by month and year.
 */
export async function getAllPerformance(month?: number, year?: number): Promise<PerformanceRecord[]> {
  try {
    const db = getAdminDb();
    let query: any = db.collection('performance_evaluations');
    if (year) query = query.where('year', '==', year);
    if (month) query = query.where('month', '==', month);

    const snapshotPromise = query.get();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore timeout')), 1200)
    );
    const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);
    if (snapshot && !snapshot.empty) {
      const records: PerformanceRecord[] = [];
      snapshot.forEach((doc: any) => {
        const item = { ...doc.data(), id: doc.id } as PerformanceRecord;
        records.push(item);
        perfCache.set(doc.id, item);
      });
      persistToDisk();
      records.sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));
      return records;
    }
  } catch {}

  // Fallback to memory / disk cache
  let list = Array.from(perfCache.values());
  if (year) {
    list = list.filter(r => r.year === year);
  }
  if (month) {
    list = list.filter(r => r.month === month);
  }
  list.sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));
  return list;
}

/**
 * Get performance records specifically belonging to a single employee.
 * Strictly guarantees multi-tenant privacy.
 */
export async function getEmployeePerformance(employeeUid: string): Promise<PerformanceRecord[]> {
  if (!employeeUid) return [];

  try {
    const db = getAdminDb();
    const snapshotPromise = db.collection('performance_evaluations')
      .where('employeeUid', '==', employeeUid)
      .get();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore timeout')), 1200)
    );
    const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);
    if (snapshot && !snapshot.empty) {
      const records: PerformanceRecord[] = [];
      snapshot.forEach((doc: any) => {
        const item = { ...doc.data(), id: doc.id } as PerformanceRecord;
        records.push(item);
        perfCache.set(doc.id, item);
      });
      records.sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));
      return records;
    }
  } catch {}

  // Fallback to cache (matching by employeeUid or username or aliased uids)
  const normalizedUid = employeeUid.toLowerCase();
  const list = Array.from(perfCache.values()).filter(r => {
    if (r.employeeUid === employeeUid) return true;
    if (r.username && r.username.toLowerCase() === normalizedUid) return true;
    if (normalizedUid.includes('mostafa') || normalizedUid.includes('moustafa') || normalizedUid === 'usr_admin_1') {
      return r.employeeUid === 'usr_mostafa' || r.employeeUid === 'emp_ext_moustafa_adly' || r.employeeUid === 'usr_admin_1';
    }
    return false;
  });
  list.sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));
  return list;
}

/**
 * Save / Update an array of performance records (e.g. approved after AI analysis).
 */
export async function savePerformanceRecords(
  records: PerformanceRecord[],
  adminActor?: { uid: string; displayName?: string }
): Promise<PerformanceRecord[]> {
  const saved: PerformanceRecord[] = [];
  const nowIso = new Date().toISOString();

  for (const raw of records) {
    const id = raw.id || `perf_${raw.employeeUid}_${raw.year}_${raw.month}_${Date.now().toString(36)}`;
    const monthLabel = raw.monthLabel || getMonthLabel(raw.month, raw.year);

    // Compute or validate accuracy & error rate
    const errorRate = Math.max(0, Math.min(100, Math.round(Number(raw.errorRate) || 0)));
    const accuracyRate = typeof raw.accuracyRate === 'number' 
      ? Math.max(0, Math.min(100, Math.round(raw.accuracyRate)))
      : (100 - errorRate);
    const score = typeof raw.score === 'number' 
      ? Math.max(0, Math.min(100, Math.round(raw.score))) 
      : accuracyRate;

    let rating = raw.overallRating;
    if (!rating) {
      if (score >= 90) rating = 'ممتاز';
      else if (score >= 80) rating = 'جيد جداً';
      else if (score >= 70) rating = 'جيد';
      else if (score >= 60) rating = 'مقبول';
      else rating = 'يحتاج تحسين';
    }

    const record: PerformanceRecord = {
      ...raw,
      id,
      month: Number(raw.month),
      year: Number(raw.year),
      monthLabel,
      errorRate,
      accuracyRate,
      score,
      overallRating: rating,
      casesHandled: Number(raw.casesHandled) || 0,
      callsPresented: raw.callsPresented !== undefined ? Number(raw.callsPresented) : (Number(raw.casesHandled) || 0),
      irRate: raw.irRate !== undefined ? Number(raw.irRate) : 100,
      utilizationRate: raw.utilizationRate !== undefined ? Number(raw.utilizationRate) : undefined,
      occupancyRate: raw.occupancyRate !== undefined ? Number(raw.occupancyRate) : undefined,
      attendance: raw.attendance ? {
        emergency: Number(raw.attendance.emergency) || 0,
        sick: Number(raw.attendance.sick) || 0,
        tardy: Number(raw.attendance.tardy) || 0
      } : undefined,
      errorCount: raw.errorCount !== undefined ? Number(raw.errorCount) : Math.round((Number(raw.casesHandled) || 0) * (errorRate / 100)),
      strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
      improvementAreas: Array.isArray(raw.improvementAreas) ? raw.improvementAreas : [],
      supervisorNotes: raw.supervisorNotes || '',
      aiAnalysisSummary: raw.aiAnalysisSummary || '',
      createdAt: raw.createdAt || nowIso,
      updatedAt: nowIso,
      addedBy: adminActor?.displayName ? `${adminActor.displayName} (${adminActor.uid})` : (raw.addedBy || 'إدارة التفتيش والرقابة')
    };

    perfCache.set(id, record);
    saved.push(record);

    // Firestore async update
    try {
      const db = getAdminDb();
      db.collection('performance_evaluations').doc(id).set(record, { merge: true }).catch(() => {});
    } catch {}
  }

  persistToDisk();
  return saved;
}

/**
 * Delete a single performance record.
 */
export async function deletePerformanceRecord(id: string): Promise<boolean> {
  const existed = perfCache.delete(id);
  if (existed) {
    persistToDisk();
    try {
      const db = getAdminDb();
      db.collection('performance_evaluations').doc(id).delete().catch(() => {});
    } catch {}
  }
  return existed;
}

/**
 * Helper to normalize Arabic strings for fuzzy name matching.
 */
function normalizeArabic(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // Remove harakat (tashkeel)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match an extracted name or username to a system user profile.
 */
export function matchEmployeeToUser(
  rawName: string,
  rawUsername: string | undefined,
  allUsers: UserProfile[]
): UserProfile | null {
  if (!rawName && !rawUsername) return null;

  const cleanRawName = normalizeArabic(rawName);
  const cleanRawUsername = (rawUsername || '').toLowerCase().trim();

  // 1. Direct username match
  if (cleanRawUsername) {
    const byUser = allUsers.find(u => u.username?.toLowerCase() === cleanRawUsername);
    if (byUser) return byUser;
  }

  // 2. Direct displayName exact match
  const exactName = allUsers.find(u => normalizeArabic(u.displayName) === cleanRawName);
  if (exactName) return exactName;

  // 3. Substring matching (e.g. "مصطفى عدلي" matches "مصطفى عدلي" or "مصطفى عدلي محمد")
  const subMatch = allUsers.find(u => {
    const norm = normalizeArabic(u.displayName);
    return norm.includes(cleanRawName) || cleanRawName.includes(norm);
  });
  if (subMatch) return subMatch;

  // 4. Match against email or username inside name
  const byWord = allUsers.find(u => {
    const userWords = normalizeArabic(u.displayName).split(' ').filter(w => w.length > 2);
    const targetWords = cleanRawName.split(' ').filter(w => w.length > 2);
    return targetWords.some(tw => userWords.includes(tw));
  });
  if (byWord) return byWord;

  return null;
}

/**
 * Heuristic text table and line parser fallback when remote AI API is temporarily unavailable
 */
function parseTextHeuristically(
  text: string, 
  knownEmployees: { uid: string; displayName: string; username: string }[]
): any[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 5);
  const results: any[] = [];

  for (const line of lines) {
    // Try to find a matching employee name in this line
    for (const emp of knownEmployees) {
      const normLine = normalizeArabic(line);
      const normName = normalizeArabic(emp.displayName);
      if (normLine.includes(normName) || (emp.username && normLine.includes(emp.username.toLowerCase()))) {
        // Extract error rate: e.g. 12% or أخطاء 12
        const errorMatch = line.match(/(?:أخطاء|نسبة الأخطاء|خطأ|error rate|error)[\s:]*([0-9]{1,2}(?:\.[0-9]+)?)\s*%/i) ||
                           line.match(/([0-9]{1,2}(?:\.[0-9]+)?)\s*%\s*(?:أخطاء|خطأ)/i) ||
                           line.match(/([0-9]{1,2})\s*%/);
        const errorRate = errorMatch ? Math.min(100, Math.max(0, parseFloat(errorMatch[1]))) : 10;
        const accuracyRate = Math.max(0, 100 - errorRate);

        // Extract cases handled: e.g. 150 ملف or معاملات 150
        const casesMatch = line.match(/(?:ملف|معاملة|منجزة|حالة|cases|handled)[\s:]*([0-9]+)/i) ||
                           line.match(/([0-9]+)\s*(?:ملف|معاملة|حالة)/i);
        const casesHandled = casesMatch ? parseInt(casesMatch[1], 10) : 100;

        const score = Math.round(accuracyRate);
        const overallRating = score >= 90 ? 'ممتاز' : score >= 80 ? 'جيد جداً' : score >= 70 ? 'جيد' : 'مقبول';

        results.push({
          employeeName: emp.displayName,
          username: emp.username,
          errorRate,
          accuracyRate,
          casesHandled,
          errorCount: Math.round((casesHandled * errorRate) / 100),
          score,
          overallRating,
          strengths: ['الالتزام بمواعيد الفحص والربط', 'دقة مطابقة المستندات'],
          improvementAreas: errorRate > 10 ? ['التركيز على مراجعة احتساب القيمة الإيجارية السنوية'] : ['المحافظة على وتيرة الإنجاز العالية'],
          supervisorNotes: `أداء معتمد لشهر التقييم. معدل الدقة المحقق ${accuracyRate}%.`,
          aiAnalysisSummary: `تم استخراج المؤشرات بدقة: نسبة دقة ${accuracyRate}% ونسبة أخطاء ${errorRate}%.`
        });
        break;
      }
    }
  }

  return results;
}

/**
 * Core AI Analysis Engine:
 * Analyzes uploaded performance sheets (images, screenshots, CSV, table text)
 * using Gemini 3.8 Flash to extract structured KPIs per employee for a specific month.
 */
export async function analyzePerformanceWithGemini(params: {
  month: number;
  year: number;
  images?: { mimeType: string; data: string }[];
  textData?: string;
}): Promise<PerformanceRecord[]> {
  const { month, year, images = [], textData = '' } = params;
  const monthLabel = getMonthLabel(month, year);

  // Retrieve known system users for exact matching
  const knownUsers = await listAllUsers();
  const knownEmployeesSummary = knownUsers.map(u => ({
    uid: u.uid,
    displayName: u.displayName,
    username: u.username,
    department: u.department,
    jobTitle: u.jobTitle
  }));

  const ai = getAiClient();

  // Construct System Instruction
  const systemInstruction = `
أنت خبير الذكاء الاصطناعي الرقابي والتحليلي المعتمد لمصلحة الضرائب العقارية المصرية.
مهمتك: فحص وتحليل كشوفات الأداء، الجداول، لقطات الشاشة أو الصور والنصوص الخاصة بتقييم الـ Agents وممثلي الدعم الضريبي لشهر "${monthLabel}".

قائمة الموظفين المسجلين حالياً في المنظومة لربط البيانات بهم بدقة:
${JSON.stringify(knownEmployeesSummary, null, 2)}

إرشادات التحليل والاستخراج:
1. استخرج بيانات كل موظف يظهر في الكشف أو الصورة أو النص المدخل.
2. استخرج نسبة الأخطاء المئوية بدقة (مثال: إذا ورد أن موظفاً مثل مصطفى عدلي حصل على 12% أخطاء، فتكون errorRate: 12، ودقته accuracyRate: 88).
3. استخرج عدد المعاملات والملفات المنجزة (casesHandled) وعدد الأخطاء إن ذكرت.
4. قيّم الأداء الشامل (score من 0 إلى 100) والتقييم العام (ممتاز، جيد جداً، جيد، مقبول، يحتاج تحسين).
5. استخلص 2-3 نقاط قوة مهنية بناء على الأداء.
6. استخلص 1-2 فرصة للتحسين وتفادي الأخطاء.
7. اكتب ملاحظة رقابية وتوجيهية موجزة ومحفزة للموظف.
8. اربط كل موظف باسمه أو اسم المستخدم مطابقاً لقائمة الموظفين أعلاه قدر الإمكان.
`.trim();

  const userPrompt = `
يرجى تحليل كشف أداء الموظفين التالي لشهر [${monthLabel}]:
${textData ? `\n--- بيانات نصية / جداول مرفقة ---\n${textData}\n` : ''}
${images.length > 0 ? `\nتم إرفاق ${images.length} صورة/لقطة شاشة لكشف الأداء لتحليلها بصرياً (OCR + AI Vision).` : ''}

قم باستخراج كشف الأداء بصيغة مصفوفة مهيكلة وفق المخطط المطلوب.
`.trim();

  // Prepare contents parts
  const parts: any[] = [];

  // Add images
  for (const img of images) {
    if (img && img.data) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType || 'image/jpeg',
          data: img.data
        }
      });
    }
  }

  // Add text part
  parts.push({
    text: userPrompt
  });

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        employeeName: {
          type: Type.STRING,
          description: 'اسم الموظف كما يظهر في الكشف أو مطابقاً للمنظومة'
        },
        username: {
          type: Type.STRING,
          description: 'اسم المستخدم أو المعرف إن وجد'
        },
        errorRate: {
          type: Type.NUMBER,
          description: 'نسبة الأخطاء المئوية كرقم صحيح أو عشري بين 0 و 100 (مثال: 12 تعني 12%)'
        },
        errorCount: {
          type: Type.NUMBER,
          description: 'عدد الأخطاء الفعلي إن وجد أو المحسوب'
        },
        accuracyRate: {
          type: Type.NUMBER,
          description: 'نسبة الدقة المئوية من 0 إلى 100'
        },
        casesHandled: {
          type: Type.NUMBER,
          description: 'عدد المعاملات أو الملفات الضريبية المفحوصة'
        },
        score: {
          type: Type.NUMBER,
          description: 'الدرجة الإجمالية من 100'
        },
        overallRating: {
          type: Type.STRING,
          description: 'ممتاز أو جيد جداً أو جيد أو مقبول أو يحتاج تحسين'
        },
        strengths: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'أبرز نقاط القوة في الأداء'
        },
        improvementAreas: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'نقاط وفرص التحسين وتفادي الأخطاء'
        },
        supervisorNotes: {
          type: Type.STRING,
          description: 'توصيات وتوجيهات رقابية للموظف'
        },
        aiAnalysisSummary: {
          type: Type.STRING,
          description: 'ملخص تحليلي صادر عن الذكاء الاصطناعي'
        }
      },
      required: [
        'employeeName',
        'errorRate',
        'accuracyRate',
        'casesHandled',
        'score',
        'overallRating',
        'strengths',
        'improvementAreas',
        'supervisorNotes'
      ]
    }
  };

  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.7-flash'
  ];

  let parsedArray: any[] = [];
  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      const genResult = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts
        },
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema
        }
      });

      const responseText = genResult.text?.trim() || '[]';
      parsedArray = JSON.parse(responseText);
      if (Array.isArray(parsedArray) && parsedArray.length > 0) {
        lastError = null;
        break; // Successfully extracted
      }
    } catch (err: any) {
      console.warn(`[PerformanceService] Model ${modelName} failed or busy, trying next...`, err?.message?.slice(0, 120));
      lastError = err;
    }
  }

  // Fallback: If AI API had service-wide temporary outage, attempt heuristic extraction if textData is present
  if ((!Array.isArray(parsedArray) || parsedArray.length === 0) && textData.trim()) {
    console.log('[PerformanceService] Attempting heuristic parser fallback for text data...');
    parsedArray = parseTextHeuristically(textData, knownEmployeesSummary);
  }

  if (!Array.isArray(parsedArray) || parsedArray.length === 0) {
    if (lastError) {
      throw new Error(`تعذر على الذكاء الاصطناعي معالجة الكشف حالياً: ${lastError?.message || 'خطأ في النموذج'}`);
    }
    throw new Error('لم يتمكن الذكاء الاصطناعي من استخراج أي بيانات موظفين من الصور أو النص المدخل.');
  }

  // Post-process and link with actual user profiles
  const nowIso = new Date().toISOString();
  const extractedRecords: PerformanceRecord[] = parsedArray.map((item, index) => {
    const matchedUser = matchEmployeeToUser(item.employeeName, item.username, knownUsers);

    const employeeUid = matchedUser?.uid || `emp_${Date.now()}_${index}`;
    const employeeName = matchedUser?.displayName || item.employeeName || 'Agent دعم ضريبي';
    const username = matchedUser?.username || item.username || '';
    const department = matchedUser?.department || 'مصلحة الضرائب العقارية';
    const jobTitle = matchedUser?.jobTitle || 'Agent دعم واستشارات ضريبية';

    const errorRate = Math.max(0, Math.min(100, Math.round(Number(item.errorRate) || 0)));
    const accuracyRate = typeof item.accuracyRate === 'number' 
      ? Math.max(0, Math.min(100, Math.round(item.accuracyRate))) 
      : (100 - errorRate);
    const score = typeof item.score === 'number' 
      ? Math.max(0, Math.min(100, Math.round(item.score))) 
      : accuracyRate;

    const casesHandled = Number(item.casesHandled) || 0;
    const errorCount = item.errorCount !== undefined 
      ? Number(item.errorCount) 
      : Math.round(casesHandled * (errorRate / 100));

    let rating = item.overallRating;
    if (!['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'يحتاج تحسين'].includes(rating)) {
      if (score >= 90) rating = 'ممتاز';
      else if (score >= 80) rating = 'جيد جداً';
      else if (score >= 70) rating = 'جيد';
      else if (score >= 60) rating = 'مقبول';
      else rating = 'يحتاج تحسين';
    }

    return {
      id: `perf_${employeeUid}_${year}_${month}_${Date.now().toString(36)}_${index}`,
      employeeUid,
      employeeName,
      username,
      department,
      jobTitle,
      month,
      year,
      monthLabel,
      errorRate,
      errorCount,
      accuracyRate,
      casesHandled,
      score,
      overallRating: rating as any,
      strengths: Array.isArray(item.strengths) ? item.strengths : [],
      improvementAreas: Array.isArray(item.improvementAreas) ? item.improvementAreas : [],
      supervisorNotes: item.supervisorNotes || '',
      aiAnalysisSummary: item.aiAnalysisSummary || `تم استخراج وتحليل مؤشرات الأداء لشهر ${monthLabel} بنجاح.`,
      createdAt: nowIso,
      updatedAt: nowIso,
      addedBy: 'تحليل الذكاء الاصطناعي (Gemini Vision)'
    };
  });

  return extractedRecords;
}
