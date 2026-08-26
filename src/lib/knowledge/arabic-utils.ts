/**
 * Arabic NLP and Normalization Utilities
 * Handles normalization, dialect variations, synonyms, and fuzzy matching for Arabic queries.
 */

// Common Egyptian dialect and synonym mapping
export const ARABIC_SYNONYM_MAP: Record<string, string[]> = {
  'اوراق': ['أوراق', 'ورق', 'مستندات', 'وثائق', 'طلبات', 'ملفات', 'شهادات', 'مرفقات'],
  'مستندات': ['أوراق', 'ورق', 'وثائق', 'شهادات'],
  'تكلفة': ['رسوم', 'مصاريف', 'سعر', 'فلوس'],
  'رسوم': ['تكلفة', 'مصاريف', 'ضريبة', 'مبلغ', 'قيمة'],
  'مدة': ['وقت', 'فترة', 'ايام', 'أيام', 'ميعاد', 'موعد', 'زمن', 'استغراق'],
  'نقل': ['تحويل', 'تنازل', 'بيع', 'شراء', 'تغيير اسم', 'اشهار'],
  'سكن': ['سكني', 'شقة', 'عقار', 'بيت', 'منزل', 'وحدة سكنية'],
  'تجاري': ['محل', 'مكتب', 'شركة', 'اداري', 'غير سكني', 'مخزن', 'نشاط تجاري'],
  'اعفاء': ['إعفاء', 'استثناء', 'سماح', 'حد اعفاء', 'معفي', 'اسقاط'],
  'تظلم': ['طعن', 'اعتراض', 'شكوى', 'اعادة نظر', 'استئناف', 'لجنة الطعن'],
  'براءة': ['مخالصة', 'شهادة تصرفات', 'شهادة سداد', 'ابراء ذمة', 'عدم مديونية'],
  'غرامة': ['تاخير', 'تأخير', 'فوائد', 'غرامات', 'عقوبة', 'جزاء'],
  'ضريبة': ['عوائد', 'اموال مقررة', 'رسم عقاري', 'ضريبة عقارية', 'مكلفة']
};

/**
 * Normalizes Arabic text by:
 * 1. Removing Tashkeel (diacritics: Fatha, Damma, Kasra, Sukun, Tanween, Shadda)
 * 2. Removing Tatweel/Kashida (_)
 * 3. Normalizing Alef variants (أ إ آ -> ا)
 * 4. Normalizing Teh Marbuta (ة -> ه)
 * 5. Normalizing Yeh / Alef Maksura (ى -> ي)
 * 6. Normalizing Hamza variants (ؤ ئ ء -> generic)
 * 7. Removing punctuation & extra spaces
 */
export function normalizeArabic(text: string | null | undefined): string {
  if (!text) return '';
  return text
    // Remove diacritics / tashkeel
    .replace(/[\u064B-\u0652\u0653-\u065F\u0670]/g, '')
    // Remove Tatweel (Kashida)
    .replace(/\u0640/g, '')
    // Normalize Alefs
    .replace(/[أإآ]/g, 'ا')
    // Normalize Teh Marbuta to Heh for flexible matching
    .replace(/ة/g, 'ه')
    // Normalize Alef Maksura to Yeh
    .replace(/ى/g, 'ي')
    // Normalize Hamzas
    .replace(/[ؤئء]/g, 'ء')
    // Remove special punctuation
    .replace(/[؟?.,!،\-_/\\()\[\]{}"'؛:]/g, ' ')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Tokenizes Arabic text into normalized words, removing common Arabic stopwords
 */
const ARABIC_STOPWORDS = new Set([
  'في', 'من', 'على', 'إلى', 'الى', 'عن', 'مع', 'هذا', 'هذه', 'تم', 'كان', 'كانت',
  'ما', 'ماذا', 'كيف', 'هل', 'كم', 'اين', 'أين', 'متى', 'لماذا', 'هو', 'هي', 'هم',
  'التي', 'الذي', 'الذين', 'اللتين', 'اللواتي', 'ان', 'أن', 'إن', 'لو', 'لا', 'لم',
  'لن', 'ليس', 'لو', 'كل', 'بعض', 'غير', 'فقط', 'ثم', 'او', 'أو', 'حيث', 'حتى',
  'اذا', 'إذا', 'بين', 'عند', 'لدى', 'منذ', 'نحو', 'قبل', 'بعد', 'اثناء', 'أثناء'
]);

export function stemArabicWord(word: string): string {
  let w = normalizeArabic(word);
  if (!w || w.length <= 2) return w;

  // Normalize Egyptian dialect verbs like عايز / عايزة -> ارغب
  if (w.startsWith('عايز') || w.startsWith('عاوز') || w.startsWith('محتاج')) {
    return 'طلب';
  }
  if (w.startsWith('ايه') || w.startsWith('اية') || w.startsWith('شو')) {
    return 'ما';
  }

  // Remove leading 'ال' if word length > 3
  if (w.startsWith('ال') && w.length > 3) {
    w = w.substring(2);
  }
  // Remove leading 'و' or 'ف' or 'ب' or 'ك' if followed by Al or valid root
  else if ((w.startsWith('و') || w.startsWith('ف') || w.startsWith('ب') || w.startsWith('ك')) && w.length > 3) {
    if (w.substring(1).startsWith('ال') && w.length > 4) {
      w = w.substring(3);
    } else {
      w = w.substring(1);
    }
  }

  return w;
}

export function tokenizeArabic(text: string): string[] {
  const normalized = normalizeArabic(text);
  if (!normalized) return [];

  const rawTokens = normalized
    .split(/\s+/)
    .filter(token => token.length > 1 && !ARABIC_STOPWORDS.has(token));

  const tokens: string[] = [];
  for (const t of rawTokens) {
    tokens.push(t);
    const stemmed = stemArabicWord(t);
    if (stemmed && stemmed !== t) {
      tokens.push(stemmed);
    }
  }

  return Array.from(new Set(tokens));
}

// Auxiliary / generic words that provide weak domain signal
const WEAK_AUXILIARY_TOKENS = new Set([
  'طلب', 'معرفه', 'استفسار', 'اريد', 'لو', 'سمحت', 'ممكن', 'عاوز', 'عايز', 'شرح', 'تفاصيل', 'بخصوص'
]);

/**
 * Computes match score between query terms and target text
 */
export function calculateArabicMatchScore(
  query: string,
  targetText: string,
  keywords: string[] = []
): { score: number; matchedKeywords: string[] } {
  const normQuery = normalizeArabic(query);
  const normTarget = normalizeArabic(targetText);
  const queryTokens = tokenizeArabic(query);
  const matchedKeywords: string[] = [];

  if (!normQuery || !normTarget || queryTokens.length === 0) {
    return { score: 0, matchedKeywords: [] };
  }

  // Exact phrase match bonus
  let score = 0;
  if (normTarget.includes(normQuery)) {
    score += 60;
  }

  // Keyword array matching: keyword must exist in both target record and query
  for (const kw of keywords) {
    const normKw = normalizeArabic(kw);
    if (!normKw || normKw === normQuery) continue;

    // The keyword must actually be relevant to the record
    if (normTarget.includes(normKw)) {
      if (normQuery.includes(normKw)) {
        score += 25;
        matchedKeywords.push(kw);
      } else {
        // Check individual tokens of keyword
        const kwTokens = tokenizeArabic(kw);
        const allTokensMatch = kwTokens.length > 0 && kwTokens.every(t => normQuery.includes(t));
        if (allTokensMatch) {
          score += 20;
          matchedKeywords.push(kw);
        }
      }
    }
  }

  // Token-level matching in target text
  let tokenMatches = 0;
  let strongTokenMatches = 0;

  for (const token of queryTokens) {
    const isWeak = WEAK_AUXILIARY_TOKENS.has(token);
    if (normTarget.includes(token)) {
      tokenMatches++;
      if (!isWeak) {
        strongTokenMatches++;
        score += 12;
      } else {
        score += 3;
      }
    } else {
      // Check synonyms
      for (const [canonical, syns] of Object.entries(ARABIC_SYNONYM_MAP)) {
        const normCanonical = normalizeArabic(canonical);
        const normSyns = syns.map(s => normalizeArabic(s));
        if (token === normCanonical || normSyns.includes(token)) {
          if (normTarget.includes(normCanonical) || normSyns.some(s => normTarget.includes(s))) {
            tokenMatches++;
            strongTokenMatches++;
            score += 10;
            break;
          }
        }
      }
    }
  }

  const tokenCoverage = tokenMatches / queryTokens.length;
  score += tokenCoverage * 25;

  // Strict Safeguard: If no domain keywords were matched AND strong token coverage is low (< 40%),
  // penalize heavily to prevent false positive matches on unrelated queries
  if (matchedKeywords.length === 0 && (strongTokenMatches < 2 || tokenCoverage < 0.40)) {
    score = Math.min(score, 8); // Below minScore threshold of 15
  }

  return { score, matchedKeywords: Array.from(new Set(matchedKeywords)) };
}
