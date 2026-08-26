/**
 * Demo Knowledge Base Service
 * Egyptian Real Estate Tax operations (Law 196/2008 & Law 91/2005).
 */

import {
  KnowledgeBaseService,
  KnowledgeRecord,
  KnowledgeQueryFilter,
  KnowledgeSearchResult,
  KnowledgeBaseStats,
  QuestionUnderstanding,
  IntermediateExtractionResult,
  ExtractedFactItem
} from './types.ts';
import { normalizeArabic, calculateArabicMatchScore } from './arabic-utils.ts';

export const INITIAL_DEMO_RECORDS: KnowledgeRecord[] = [
  // 1. المستندات المطلوبة لنقل التكليف العقاري
  {
    id: 'kb-transfer-docs-01',
    category: 'إجراءات نقل الملكية',
    topic: 'المستندات المطلوبة لنقل التكليف العقاري وتغيير اسم المكلف',
    question: 'ما هي الأوراق والمستندات المطلوبة لنقل التكليف العقاري في مصلحة الضرائب العقارية؟',
    answer: `المستندات المطلوبة لنقل التكليف العقاري بالمأمورية:
1. صورة بطاقة الرقم القومي سارية للمشتري وللبائع مع الاطلاع على الأصل.
2. أصل عقد البيع المسجل بالشهر العقاري أو حكم صحة ونفاذ مشهر أو عقد بيع ابتدائي مشفوع بإعلام وراثة وشهادة وفاة في حالة الإرث.
3. كشف رسمي حديث مستخرج من سجلات الضرائب العقارية (نموذج مكلفة عقارية).
4. إيصال سداد ضريبة التصرفات العقارية (2.5%) الصادر من مصلحة الضرائب المصرية.
5. طلب نقل تكليف على النموذج المعتمد داخل مأمورية الضرائب العقارية المختصة.
6. توكيل رسمي ساري في حالة تقديم الطلب عن طريق وكيل مع صورة بطاقة الوكيل.`,
    source: 'دليل إجراءات مصلحة الضرائب العقارية المصرية - الكتاب الدوري رقم 4 لسنة 2021',
    approved: true,
    lastUpdated: '2025-01-15',
    keywords: [
      'نقل تكليف', 'اوراق نقل التكليف', 'مستندات نقل الملكية', 'عقد مسجل', 'رقم قومي', 'مكلفة عقارية',
      'نموذج نقل تكليف', 'توكيل', 'اشهار', 'تنازل عن شقة', 'بيع عقار', 'تغيير المالك', 'بائع ومشتري'
    ],
    isDemoData: true
  },
  // 2. خطوات وإجراءات التنازل ونقل التكليف
  {
    id: 'kb-transfer-proc-02',
    category: 'إجراءات نقل الملكية',
    topic: 'خطوات وإجراءات التنازل ونقل التكليف العقاري داخل المأمورية',
    question: 'كيف يتم تقديم طلب نقل التكليف وما هي مدة تنفيذ الخدمة بالمأمورية؟',
    answer: `إجراءات نقل التكليف العقاري:
1. التوجه لمأمورية الضرائب العقارية التابع لها العقار وسحب نموذج طلب نقل التكليف.
2. تسليم الأوراق والمستندات للموظف المختص بقسم التكليف لمراجعة الملكية وسند الحيازة.
3. إجراء معاينة ميدانية للعقار إذا تطلب الأمر للتحقق من الأوصاف والمساحات وحدود الوحدة.
4. التأكد من سداد كافة المتأخرات الضريبية السابقة حتى تاريخ تقديم الطلب.
5. قيد الطلب بسجل التكليفات وإصدار إشعار نقل التكليف باسم المالك الجديد.
مدة الإجراء: تستغرق العملية من 5 إلى 10 أيام عمل من تاريخ اكتمال المستندات وسداد الرسوم.`,
    source: 'اللائحة التنفيذية لقانون الضريبة العقارية رقم 196 لسنة 2008',
    approved: true,
    lastUpdated: '2025-01-10',
    keywords: [
      'خطوات نقل التكليف', 'اجراءات التنازل', 'مدة نقل التكليف', 'معاينة العقار',
      'سجل التكليفات', 'ايام عمل', 'قسم التكليف', 'سداد المتأخرات'
    ],
    isDemoData: true
  },
  // 3. ضريبة التصرفات العقارية (2.5%)
  {
    id: 'kb-transfer-fees-03',
    category: 'حساب الضريبة والنسب',
    topic: 'ضريبة التصرفات العقارية ونسبتها على عقود البيع والشراء',
    question: 'ما هي نسبة ضريبة التصرفات العقارية ومن الملزم بدفعها؟',
    answer: `أحكام ضريبة التصرفات العقارية وفقاً للمادة 42 من القانون 91 لسنة 2005:
1. النسبة المقررة: 2.5% بغير أي تخفيض من إجمالي قيمة التصرف أو البيع في العقارات المبنية أو الأراضي للبناء.
2. الملتزم بالسداد: المتصرف (البائع) هو الملزم قانوناً بسداد الضريبة خلال 30 يوماً من تاريخ التصرف.
3. الاستثناءات من الضريبة:
   - تقديم العقار كحصة عينية في رأسمال شركة مساهمة بشرط عدم التصرف في الأسهم المقابلة لمدة 5 سنوات.
   - البيوع الجبرية (الإدارية والقضائية) ونزع الملكية للمنفعة العامة.
   - التبرع أو الهبة للحكومة أو وحدات الإدارة المحلية أو للأقارب حتى الدرجة الأولى.`,
    source: 'المادة 42 من قانون الضريبة على الدخل رقم 91 لسنة 2005 وتعديلاته',
    approved: true,
    lastUpdated: '2025-02-01',
    keywords: [
      'ضريبة تصرفات عقارية', 'نسبة التصرفات', '2.5%', 'المتصرف البائع', 'سداد 30 يوم',
      'استثناءات التصرفات', 'هبة اقارب درجة اولى', 'تبرع للحكومة', 'بيع ارض', 'بيع شقة'
    ],
    isDemoData: true
  },
  // 4. المستندات المطلوبة لتسجيل عقار لأول مرة
  {
    id: 'kb-register-docs-04',
    category: 'المستندات والأوراق المطلوبة',
    topic: 'المستندات المطلوبة لحصر وتسجيل عقار أو وحدة لأول مرة (الإقرار الضريبي)',
    question: 'ما هي الأوراق المطلوبة لتقديم إقرار ضريبي وحصر عقار جديد غير مسجل؟',
    answer: `المستندات المطلوبة لحصر وتسجيل عقار جديد:
1. إقرار الثروة العقارية (نموذج 6 عقارات مبنية) مستوفى كافة البيانات.
2. صورة بطاقة الرقم القومي لمالك العقار أو المنتفع به.
3. صورة عقد ملكية الأرض أو العقار وصورة ترخيص البناء إن وجد.
4. إيصالات استهلاك المرافق الحديثة (كهرباء أو مياه أو غاز).
5. الرسومات الهندسية والمساحية المعتمدة إن تيسرت أو كروكي معتمد للعقار.
الرسوم: تقديم الإقرار الضريبي مجاني بدون أي رسوم إدارية.`,
    source: 'الكتاب الدوري لمصلحة الضرائب العقارية بشأن حصر وتثمين العقارات المبنية',
    approved: true,
    lastUpdated: '2025-01-20',
    keywords: [
      'تسجيل عقار جديد', 'نموذج 6 عقارات', 'اقرار ضريبي', 'حصر العقارات', 'ترخيص بناء',
      'ايصال كهرباء', 'رسومات هندسية', 'كروكي', 'عقار غير مسجل'
    ],
    isDemoData: true
  },
  // 5. كيفية حساب الضريبة العقارية والوعاء الضريبي
  {
    id: 'kb-fees-calc-05',
    category: 'حساب الضريبة والنسب',
    topic: 'طريقة وحساب الضريبة على العقارات المبنية والخصومات المسموحة',
    question: 'كيف يتم حساب قيمة الضريبة العقارية السنوية على الوحدات السكنية وغير السكنية؟',
    answer: `معادلة حساب الضريبة العقارية وفق القانون رقم 196 لسنة 2008:
1. تحديد القيمة الإيجارية السنوية المقدرة من لجان الحصر والتقدير.
2. خصم مصاريف الصيانة:
   - الوحدات السكنية: خصم 30% من القيمة الإيجارية مقابل مصاريف الصيانة.
   - الوحدات غير السكنية (التجارية/الإدارية): خصم 32% مقابل مصاريف الصيانة.
3. خصم حد الإعفاء القانوني للوحدة السكنية الرئيسية المخصصة لسكن الأسرة (24,000 جنيه سنوياً).
4. تطبيق سعر الضريبة: 10% من صافي القيمة الإيجارية الخاضعة للضريبة.
مثال: شقة سكن ثان بقيمة إيجارية 40,000 جنيه -> صافي الإيجار بعد خصم 30% = 28,000 جنيه -> الضريبة = 2,800 جنيه سنوياً.`,
    source: 'المادتان 12 و 19 من القانون رقم 196 لسنة 2008 بشأن الضريبة على العقارات المبنية',
    approved: true,
    lastUpdated: '2025-01-28',
    keywords: [
      'حساب الضريبة العقارية', 'معادلة الضريبة', '10%', 'مصاريف صيانة 30%', 'مصاريف صيانة 32%',
      'صافي القيمة الايجارية', 'وعاء الضريبة', 'حساب ضريبة شقة'
    ],
    isDemoData: true
  },
  // 6. شروط وحدود الإعفاء الضريبي للوحدات السكنية والتجارية
  {
    id: 'kb-exemptions-res-06',
    category: 'الإعفاءات السكنية والتجارية',
    topic: 'حدود وشروط إعفاء السكن الخاص والوحدات التجارية من الضريبة العقارية',
    question: 'ما هو حد الإعفاء للسكن الخاص والشقق المؤجرة والمحلات التجارية؟',
    answer: `شروط وحدود الإعفاء من الضريبة العقارية (المادة 18 من القانون 196 لسنة 2008):
1. السكن الخاص الرئيسي للأسرة: يعفى السكن الخاص الذي تقل قيمته الإيجارية السنوية عن 24,000 جنيه (ما يعادل قيمة سوقية تقريبية 2 مليون جنيه). يطبق الإعفاء على وحدة واحدة فقط لكل أسرة (الزوج والزوجة والأولاد القصر).
2. الوحدات غير السكنية (المحلات والأنشطة التجارية والصناعية والخدمية): تعفى كل وحدة تقل قيمتها الإيجارية السنوية عن 1,200 جنيه.
3. إعفاءات أخرى بحكم القانون:
   - العقارات المملوكة للدولة والمخصصة للنفع العام.
   - دور العبادة والجمعيات الخيرية والمستشفيات غير الهادفة للربح.
   - المقابر والأحواش ومراكز الشباب المقيدة رسمياً.`,
    source: 'المادة 18 من القانون 196 لسنة 2008 والمعدلة بالقانون 117 لسنة 2014',
    approved: true,
    lastUpdated: '2025-02-05',
    keywords: [
      'حد الاعفاء السكني', 'اعفاء السكن الخاص', '2 مليون', '24 الف سنويا', 'اعفاء تجاري 1200',
      'شروط اعفاء شقة', 'سكن الاسرة الرئيسي', 'دور عبادة', 'جمعيات خيرية'
    ],
    isDemoData: true
  },
  // 7. مواعيد سداد الضريبة وغرامات التأخير
  {
    id: 'kb-deadlines-07',
    category: 'مواعيد الطعون والتظلمات',
    topic: 'مواعيد تحصيل وسداد أقساط الضريبة العقارية وغرامات التأخير',
    question: 'متى يتم سداد الضريبة العقارية السنوية وما هي غرامات التأخير عند التخلف عن السداد؟',
    answer: `مواعيد السداد وغرامات التأخير:
1. مواعيد السداد: تستحق الضريبة في الأول من يناير من كل عام، ويجوز سدادها على قسطين متساويين:
   - القسط الأول: من أول يناير حتى نهاية شهر يونيو.
   - القسط الثاني: من أول يوليو حتى نهاية شهر ديسمبر.
2. غرامة التأخير: في حالة التأخر عن المواعيد المقررة، يتم احتساب مقابل تأخير سنوي يعادل سعر الائتمان والخصم المعلن من البنك المركزي المصري + 2% عن المبالغ المتأخرة.
3. التظلم من الإخطار: يسقط حق الطعن بعد مرور 60 يوماً من تاريخ استلام الإخطار بالربط (نموذج 3).`,
    source: 'المادة 23 والمادة 27 من القانون رقم 196 لسنة 2008',
    approved: true,
    lastUpdated: '2025-01-18',
    keywords: [
      'مواعيد السداد', 'قسط اول يناير', 'قسط ثاني يوليو', 'غرامة تاخير', 'مقابل تاخير',
      'البنك المركزي', '60 يوم طعن', 'فترة سماح', 'سداد الضريبة'
    ],
    isDemoData: true
  },
  // 8. استخراج شهادة الموقف الضريبي وبراءة الذمة
  {
    id: 'kb-certs-docs-08',
    category: 'الشهادات العقارية وبراءة الذمة',
    topic: 'المستندات المطلوبة لاستخراج شهادة براءة ذمة وسداد الضريبة العقارية',
    question: 'كيف استخرج شهادة براءة ذمة أو مخالصة ضريبية لعقار؟ وما هي الأوراق المطلوبة؟',
    answer: `إجراءات استخراج شهادة الموقف الضريبي (براءة الذمة):
1. التقدم بطلب استخراج شهادة سداد إلى مدير مأمورية الضرائب العقارية التابع لها العقار.
2. تقديم صورة بطاقة الرقم القومي لمالك العقار أو سند الوكالة الرسمية.
3. تقديم أصل آخر إيصال سداد للضريبة العقارية أو رقم المكلفة وسنة الربط.
4. مراجعة دفاتر التحصيل والحسابات والتأكد من عدم وجود مديونيات متأخرة أو فروق تقييم.
5. سداد الرسم الإداري المقرر للشهادة واستلام الشهادة معتمدة بخاتم شعار الجمهورية.
مدة الاستخراج: تصدر الشهادة خلال 24 إلى 48 ساعة عمل.`,
    source: 'دليل خدمات المواطنين المعتمد من مصلحة الضرائب العقارية المصرية',
    approved: true,
    lastUpdated: '2025-02-12',
    keywords: [
      'شهادة براءة ذمة', 'مخالصة ضريبية', 'شهادة سداد', 'موقف ضريبي', 'ايصال سداد',
      'رسم اداري', '24 ساعة', 'خاتم شعار الجمهورية'
    ],
    isDemoData: true
  },
  // 9. لجان الطعن والتظلمات
  {
    id: 'kb-appeals-09',
    category: 'مواعيد الطعون والتظلمات',
    topic: 'إجراءات ومواعيد التظلم والطعن على تقديرات القيمة الإيجارية للعقار',
    question: 'كيف يتم الطعن على القيمة الإيجارية المقدرة من مصلحة الضرائب العقارية وما هي المدة المحددة؟',
    answer: `إجراءات الطعن على القيمة الإيجارية (المادتان 16 و 17 من القانون 196 لسنة 2008):
1. ميعاد تقديم الطعن: خلال 60 يوماً من تاريخ استلام الإخطار بالقيمة الإيجارية (نموذج 3).
2. مكان التقديم: يقدم الطعن إلى مأمورية الضرائب العقارية المختصة أو مباشرة إلى أمانة لجنة الطعن.
3. رسم الطعن والتأمين:
   - سداد تأمين مقداره 50 جنيهاً للوحدة السكنية.
   - سداد تأمين مقداره 100 جنيه للوحدة غير السكنية (يرد التأمين في حالة قبول الطعن).
4. تشكيل لجنة الطعن: يرأس اللجنة أحد أعضاء الهيئات القضائية وتضم خبراء من خارج المصلحة وتفصل في الطعن بقرار نهائي واجب النفاذ خلال 30 يوماً.`,
    source: 'المادتان 16 و 17 من القانون 196 لسنة 2008 بشأن لجان الطعن الضريبي',
    approved: true,
    lastUpdated: '2025-01-22',
    keywords: [
      'الطعن على التقدير', 'تظلم من الضريبة', 'ميعاد الطعن 60 يوم', 'نموذج 3 طعن', 'تامين 50 جنيه',
      'تامين 100 جنيه', 'لجنة الطعن القضائية', 'قرار نهائي'
    ],
    isDemoData: true
  },
  // 10. UNAPPROVED DRAFT RECORD - Specifically designed for Test 6 verification
  {
    id: 'kb-draft-unapproved-10',
    category: 'عام',
    topic: 'مسودة غير معتمدة - رسوم إضافية مقترحة لعام 2026',
    question: 'ما هي رسوم النظافة المقترحة على الوحدات السكنية لعام 2026؟',
    answer: `(مسودة قيد الدراسة غير معتمدة): تقترح الرسوم إضافة 1500 جنيه سنوياً لرسوم النظافة و 500 جنيه للخدمات البيئية.`,
    source: 'مقترح مسودة داخلية لم يتم اعتمادها أو نشرها بالجريدة الرسمية',
    approved: false, // CRITICAL: This is unapproved and MUST be ignored by search
    lastUpdated: '2025-02-18',
    keywords: [
      'رسوم مقترحة', '1500 جنيه', 'رسوم نظافة', 'مقترح 2026', 'مسودة'
    ],
    isDemoData: true
  }
];

export class DemoKnowledgeBaseService implements KnowledgeBaseService {
  readonly providerName = 'DemoKnowledgeBase (قاعدة المعرفة التوضيحية - المرحلة الأولى)';
  readonly isDemo = true;
  private records: KnowledgeRecord[] = [...INITIAL_DEMO_RECORDS];

  async search(
    query: string,
    filter: KnowledgeQueryFilter = {},
    understanding?: Partial<QuestionUnderstanding>
  ): Promise<KnowledgeSearchResult[]> {
    const approvedOnly = filter.approvedOnly ?? true;
    const limit = filter.limit ?? 5;
    const minScore = filter.minScore ?? 15;

    let pool = this.records;
    if (approvedOnly) {
      pool = pool.filter(r => r.approved === true);
    }
    if (filter.category) {
      const normCat = normalizeArabic(filter.category);
      pool = pool.filter(r => normalizeArabic(r.category) === normCat);
    }

    const results: KnowledgeSearchResult[] = [];
    const queryParts: string[] = [query];
    if (understanding?.searchQuery && understanding.searchQuery.trim() !== query.trim()) {
      queryParts.push(understanding.searchQuery);
    }
    if (understanding?.topic && understanding.topic.trim() !== query.trim()) {
      queryParts.push(understanding.topic);
    }

    const combinedQuery = queryParts.join(' ');
    const extraKeywords = (understanding?.keywords || []).filter(k => k.trim() !== query.trim());

    for (const record of pool) {
      const allRecordText = `${record.topic} ${record.question} ${record.answer} ${record.category}`;
      const allKeywords = [...record.keywords, ...extraKeywords];

      const match = calculateArabicMatchScore(combinedQuery, allRecordText, allKeywords);

      let score = match.score;
      if (score >= 10 && understanding?.detectedCategory) {
        if (normalizeArabic(record.category) === normalizeArabic(understanding.detectedCategory)) {
          score += 15;
        }
      }

      if (score >= minScore) {
        results.push({
          record,
          score,
          matchedKeywords: match.matchedKeywords,
          matchReason: `تطابق مصطلحات (${match.matchedKeywords.slice(0, 3).join(', ') || 'نصي'})`
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  async extractRelevantKnowledge(
    understanding: QuestionUnderstanding,
    filter: KnowledgeQueryFilter = { approvedOnly: true, limit: 3, minScore: 15 }
  ): Promise<IntermediateExtractionResult> {
    const candidates = await this.search(
      understanding.searchQuery || understanding.topic,
      filter,
      understanding
    );

    const candidateRecords = candidates.map(c => c.record);
    const sources = candidateRecords.map(r => ({
      name: r.source,
      lastUpdated: r.lastUpdated,
      isDemo: true
    }));

    if (candidateRecords.length === 0) {
      return {
        candidateRecords: [],
        extractedFacts: [],
        requestedInformation: understanding.requestedInformation || ['details'],
        isInformationMissing: true,
        missingFields: understanding.requestedInformation || ['details'],
        sources: []
      };
    }

    const requestedFields = (understanding.requestedInformation && understanding.requestedInformation.length > 0)
      ? understanding.requestedInformation
      : ['details'];

    const extractedFacts: ExtractedFactItem[] = [];
    const missingFields: string[] = [];

    for (const field of requestedFields) {
      let fieldFacts: string[] = [];
      let sourceTopic = '';
      let sourceId = '';

      for (const record of candidateRecords) {
        const lines = record.answer
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean);

        if (field === 'required_documents') {
          const docLines = lines.filter(l => {
            const norm = normalizeArabic(l);
            return (
              /^\d+\./.test(l) ||
              norm.includes('بطاقة') ||
              norm.includes('عقد') ||
              norm.includes('كشف') ||
              norm.includes('ايصال') ||
              norm.includes('نموذج') ||
              norm.includes('توكيل') ||
              norm.includes('مستند') ||
              norm.includes('اوراق') ||
              norm.includes('صورة')
            );
          });
          if (docLines.length > 0) {
            fieldFacts = docLines;
            sourceTopic = record.topic;
            sourceId = record.id;
            break;
          }
        } else if (field === 'fees') {
          const feeLines = lines.filter(l => {
            const norm = normalizeArabic(l);
            return (
              norm.includes('%') ||
              norm.includes('جنيه') ||
              norm.includes('رسم') ||
              norm.includes('نسبة') ||
              norm.includes('ضريبة') ||
              norm.includes('تأمين') ||
              norm.includes('سداد') ||
              norm.includes('مجاني')
            );
          });
          if (feeLines.length > 0) {
            fieldFacts = feeLines;
            sourceTopic = record.topic;
            sourceId = record.id;
            break;
          }
        } else if (field === 'duration') {
          const durLines = lines.filter(l => {
            const norm = normalizeArabic(l);
            return (
              norm.includes('يوم') ||
              norm.includes('ايام') ||
              norm.includes('ساعة') ||
              norm.includes('ساعات') ||
              norm.includes('مدة') ||
              norm.includes('شهر') ||
              norm.includes('فترة') ||
              norm.includes('تستغرق')
            );
          });
          if (durLines.length > 0) {
            fieldFacts = durLines;
            sourceTopic = record.topic;
            sourceId = record.id;
            break;
          }
        } else if (field === 'conditions' || field === 'exemption_rules') {
          const condLines = lines.filter(l => {
            const norm = normalizeArabic(l);
            return (
              norm.includes('شرط') ||
              norm.includes('شروط') ||
              norm.includes('يعفى') ||
              norm.includes('اعفاء') ||
              norm.includes('حد') ||
              norm.includes('استثناء') ||
              norm.includes('ملزم') ||
              norm.includes('تطبيق')
            );
          });
          if (condLines.length > 0) {
            fieldFacts = condLines;
            sourceTopic = record.topic;
            sourceId = record.id;
            break;
          }
        } else if (field === 'deadlines') {
          const deadlineLines = lines.filter(l => {
            const norm = normalizeArabic(l);
            return (
              norm.includes('موعد') ||
              norm.includes('مواعيد') ||
              norm.includes('خلال') ||
              norm.includes('يناير') ||
              norm.includes('يوليو') ||
              norm.includes('يونيو') ||
              norm.includes('تستحق') ||
              norm.includes('يسقط')
            );
          });
          if (deadlineLines.length > 0) {
            fieldFacts = deadlineLines;
            sourceTopic = record.topic;
            sourceId = record.id;
            break;
          }
        } else {
          fieldFacts = lines;
          sourceTopic = record.topic;
          sourceId = record.id;
          break;
        }
      }

      if (fieldFacts.length > 0) {
        const fieldLabels: Record<string, string> = {
          required_documents: 'المستندات المطلوبة',
          fees: 'الرسوم والنسب المقررة',
          duration: 'المدة الزمنية',
          conditions: 'الشروط والأحكام',
          deadlines: 'المواعيد والمواقيت القانونية',
          exemption_rules: 'قواعد وحدود الإعفاء',
          procedure_steps: 'خطوات الإجراء',
          details: 'تفاصيل الإجراء'
        };
        extractedFacts.push({
          field,
          label: fieldLabels[field] || field,
          facts: fieldFacts,
          sourceRecordId: sourceId || candidateRecords[0].id,
          topic: sourceTopic || candidateRecords[0].topic
        });
      } else {
        missingFields.push(field);
      }
    }

    const isInformationMissing = extractedFacts.length === 0;

    return {
      candidateRecords,
      extractedFacts,
      requestedInformation: requestedFields,
      isInformationMissing,
      missingFields,
      sources
    };
  }

  async getById(id: string): Promise<KnowledgeRecord | null> {
    const record = this.records.find(r => r.id === id);
    return record || null;
  }

  async getAllRecords(): Promise<KnowledgeRecord[]> {
    return [...this.records];
  }

  async getStats(): Promise<KnowledgeBaseStats> {
    const total = this.records.length;
    const approved = this.records.filter(r => r.approved).length;
    const unapproved = total - approved;

    const catMap = new Map<string, number>();
    for (const r of this.records) {
      catMap.set(r.category, (catMap.get(r.category) || 0) + 1);
    }

    const categories = Array.from(catMap.entries()).map(([name, count]) => ({
      name,
      count
    }));

    return {
      totalRecords: total,
      approvedRecords: approved,
      unapprovedRecords: unapproved,
      categories,
      providerName: this.providerName,
      isDemo: this.isDemo,
      isGoogleSheetsActive: false
    };
  }

  async setRecordApproval(id: string, approved: boolean): Promise<boolean> {
    const rec = this.records.find(r => r.id === id);
    if (rec) {
      rec.approved = approved;
      return true;
    }
    return false;
  }

  async upsertRecord(record: KnowledgeRecord): Promise<boolean> {
    const idx = this.records.findIndex(r => r.id === record.id);
    if (idx >= 0) {
      this.records[idx] = { ...this.records[idx], ...record };
    } else {
      this.records.unshift(record);
    }
    return true;
  }

  async deleteRecord(id: string): Promise<boolean> {
    const initialLen = this.records.length;
    this.records = this.records.filter(r => r.id !== id);
    return this.records.length < initialLen;
  }

  async setAllRecords(records: KnowledgeRecord[]): Promise<boolean> {
    if (Array.isArray(records)) {
      this.records = [...records];
      return true;
    }
    return false;
  }
}
