/**
 * Gemini AI Tax Reasoning & Legal Grounding Service
 * Server-side AI Pipeline for Egyptian Real Estate Tax Authority.
 * 
 * Pipeline Architecture:
 * 1. Google Sheets is the ONLY factual authority (Zero hallucination / Zero general memory reliance)
 * 2. Mandatory Gemini API Verification (fail-fast on unavailability)
 * 3. Question Understanding with Gemini (Intent, Topics, Requested Information)
 * 4. Grounded Knowledge Retrieval & Fact Filtering from Google Sheets
 * 5. Grounded Answer Generation in Egyptian Professional Arabic
 * 6. Verified Source Attribution with exact Sheet Row Index
 */

import { GoogleGenAI } from '@google/genai';
import { knowledgeService } from '../../lib/knowledge/knowledge-service.ts';
import { KnowledgeRecord, QuestionUnderstanding } from '../../lib/knowledge/types.ts';
import { recordUnansweredQuestion } from './unansweredService.ts';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({ 
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

export interface ChatRequestPayload {
  query: string;
  conversationId?: string;
  history?: { role: 'user' | 'assistant' | 'model'; content: string }[];
  userUid?: string;
  userName?: string;
}

export interface ChatResponsePayload {
  answer: string;
  status: 'verified' | 'clarification' | 'not_found' | 'error';
  sources: {
    topic: string;
    source: string;
    isGoogleSheet?: boolean;
    rowNumber?: number;
  }[];
  usedRecords: KnowledgeRecord[];
  followUps: string[];
  latencyMs: number;
}

const UNDERSTANDING_SYSTEM_INSTRUCTION = `
You are the semantic question understanding engine for the Egyptian Real Estate Tax Authority (مصلحة الضرائب العقارية المصرية).
Your task is to analyze questions in Arabic (Egyptian dialect or Modern Standard Arabic), accounting for conversation context, and output a valid JSON object.

Extract:
1. "intent": One of ["inquiry", "calculation", "procedure", "documents_request", "fees_request", "duration_request", "conditions_request", "deadline_request", "exemption_request", "appeals_request", "greeting", "out_of_scope", "clarification_needed"]
2. "topic": Normalized Arabic topic (e.g., "تسجيل وحدة ورثة أو شراكة على الشيوع", "إعفاء السكن الخاص", "حساب الضريبة والخصم 30%", "تسهيلات الطعون وقانون 3 لسنة 2026")
3. "requestedInformation": Array containing any of ["required_documents", "fees", "duration", "conditions", "deadlines", "exemption_rules", "procedure_steps", "calculation", "crm_category", "details"]
4. "keywords": Array of important Arabic search keywords
5. "searchQuery": Clean, effective Arabic search phrase for knowledge base retrieval (focusing on the core tax question)
6. "needsClarification": Boolean (true only if the user query is excessively vague, like just "عايز الإجراءات" with no context)
7. "clarificationPrompt": Polite Egyptian Arabic question asking for clarification if needsClarification is true, otherwise empty string
8. "isOutOfScope": Boolean (true if asking about sports, cooking, politics, unrelated software, etc.)
9. "isGreeting": Boolean (true ONLY if the message is purely a greeting like "صباح الخير" or "ازيك" without any tax question attached. If a question is attached to a greeting, set isGreeting to FALSE and extract the core tax topic).

Return strictly JSON matching this structure without Markdown backticks or additional text.
`;

const EGYPTIAN_TAX_GENERATION_INSTRUCTION = `
You are a grounded knowledge assistant for the Egyptian Real Estate Tax Authority (مصلحة الضرائب العقارية المصرية).
You speak in polite, professional Egyptian Arabic (مثل موظف خبير ومتعاون في مصلحة الضرائب العقارية).

Strict Operational Invariants:
1. The provided Google Sheets records are the ONLY factual authority (Sole Source of Truth):
   - You MUST NOT use your own general knowledge or external memory.
   - You MUST NOT use previous assistant answers from past conversation turns as factual authority.
   - You MUST NOT use old cached knowledge.
   - You MUST NOT infer unsupported facts, numbers, dates, or fees.
   - If the retrieved Google Sheets records do not contain the requested information, say clearly: "المعلومة دي مش موجودة بشكل مؤكد عندي في قاعدة المعرفة الحالية."
   - If asked for tax calculations, perform them solely based on the explicit rates, exemptions, and maintenance deductions present in the provided Google Sheets records.

2. Professional Egyptian Tone:
   - Use warm, polite, and professional Egyptian phrasing: "أهلاً بك يا فندم"، "بناءً على البيانات المعتمدة في جدول البيانات..."، "المستندات المطلوبة هي...".
   - Answer only the specific facet requested (if asking about fees, answer about fees without dumping the entire unrequested record).
`;

// Cache for exhausted models with timestamps
const exhaustedModels = new Map<string, number>();

/**
 * Helper to call Gemini generateContent with exponential backoff and fallback models
 */
async function callGeminiGenerateWithRetry(
  params: {
    contents: any;
    config?: any;
    primaryModel?: string;
  }
): Promise<any> {
  const ai = getAiClient();
  const now = Date.now();

  for (const [model, exp] of exhaustedModels.entries()) {
    if (now > exp) {
      exhaustedModels.delete(model);
    }
  }

  const preferredPrimary = params.primaryModel || 'gemini-3.7-flash';
  const allCandidates = [
    preferredPrimary,
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.6-flash'
  ];

  const uniqueModels = Array.from(new Set(allCandidates));
  let modelsToTry = uniqueModels.filter(m => !exhaustedModels.has(m));
  if (modelsToTry.length === 0) {
    modelsToTry = uniqueModels;
  }

  let lastError: any = null;

  for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex++) {
    const currentModel = modelsToTry[modelIndex];
    const maxRetries = 1;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: params.contents,
          config: params.config
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code || '';
        const errorMessage = String(err?.message || JSON.stringify(err) || '');

        const isQuotaExceeded =
          status === 429 ||
          status === 'RESOURCE_EXHAUSTED' ||
          errorMessage.includes('429') ||
          errorMessage.includes('Quota exceeded') ||
          errorMessage.includes('RESOURCE_EXHAUSTED');

        if (isQuotaExceeded) {
          console.warn(`Gemini model ${currentModel} quota exceeded, switching to next candidate.`);
          exhaustedModels.set(currentModel, Date.now() + 60000);
          break;
        }

        const isTransient =
          status === 503 ||
          status === 'UNAVAILABLE' ||
          errorMessage.includes('503') ||
          errorMessage.includes('high demand') ||
          errorMessage.includes('Overloaded');

        if (isTransient && attempt < maxRetries) {
          const delay = 400 * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        break;
      }
    }
  }

  throw lastError || new Error('All Gemini model candidates failed');
}

/**
 * Local Arabic semantic understanding fallback
 */
function extractLocalUnderstanding(query: string): QuestionUnderstanding {
  const norm = query.trim().toLowerCase();

  const isGreeting = 
    norm.includes('صباح الخير') || 
    norm.includes('مساء الخير') || 
    norm.includes('ازيك') || 
    norm.includes('عامل ايه') || 
    norm.includes('السلام عليكم') || 
    norm === 'مرحبا' || 
    norm === 'اهلا' ||
    norm === 'أهلاً';

  if (isGreeting) {
    return {
      intent: 'greeting',
      topic: 'الترحيب والمساعدة العامة',
      requestedInformation: ['details'],
      keywords: ['ترحيب', 'مساعدة'],
      searchQuery: 'الترحيب',
      needsClarification: false,
      isGreeting: true,
      isOutOfScope: false
    };
  }

  const requestedInfo: string[] = [];
  if (norm.includes('اوراق') || norm.includes('أوراق') || norm.includes('مستندات') || norm.includes('ورق')) {
    requestedInfo.push('required_documents');
  }
  if (norm.includes('رسوم') || norm.includes('كم') || norm.includes('تكلفة') || norm.includes('فلوس') || norm.includes('سعر')) {
    requestedInfo.push('fees');
  }
  if (norm.includes('مدة') || norm.includes('وقت') || norm.includes('ايام') || norm.includes('أيام') || norm.includes('كام يوم')) {
    requestedInfo.push('duration');
  }
  if (norm.includes('شروط') || norm.includes('شرط')) {
    requestedInfo.push('conditions');
  }
  if (norm.includes('مواعيد') || norm.includes('اخر ميعاد') || norm.includes('مهلة')) {
    requestedInfo.push('deadlines');
  }
  if (norm.includes('اعفاء') || norm.includes('إعفاء') || norm.includes('معفي')) {
    requestedInfo.push('exemption_rules');
  }
  if (norm.includes('احسب') || norm.includes('حساب') || norm.includes('ضريبة')) {
    requestedInfo.push('calculation');
  }

  let topic = 'استفسار ضريبي';
  let category = 'عام';
  if (norm.includes('ورث') || norm.includes('تركه') || norm.includes('تركة') || norm.includes('شريك') || norm.includes('شركاء') || norm.includes('شيوع')) {
    topic = 'تسجيل وحدات الورثة والشركاء على الشيوع وطلب الإعفاء';
    category = 'الورثة والشيوع';
  } else if (norm.includes('سكن') || norm.includes('خاص') || norm.includes('شقة') || norm.includes('وحدة سكنية') || norm.includes('استرداد') || norm.includes('تحت الحساب')) {
    topic = 'إعفاء السكن الخاص واسترداد المبالغ المسددة بالزيادة';
    category = 'الإعفاء الضريبي';
  } else if (norm.includes('خصم') || norm.includes('30%') || norm.includes('30') || norm.includes('25%') || norm.includes('5%') || norm.includes('حافز')) {
    topic = 'نسب الخصم وحافز تقديم الإقرار والسداد 30%';
    category = 'حساب الضريبة والخصم';
  } else if (norm.includes('طعن') || norm.includes('تظلم') || norm.includes('لجنة') || norm.includes('قانون 3') || norm.includes('منازعات')) {
    topic = 'إلغاء طعون المناطق وقانون التسهيلات 3 لسنة 2026';
    category = 'الطعون والتسهيلات';
  } else if (norm.includes('قسط') || norm.includes('تقسيط')) {
    topic = 'تقسيط الضريبة العقارية';
    category = 'التحصيل والسداد';
  } else if (norm.includes('سعر') || norm.includes('احسب') || norm.includes('حساب') || norm.includes('قيمة سوقية') || norm.includes('قيمة ايجارية')) {
    topic = 'سعر الضريبة العقارية وطريقة الحساب ومصاريف الصيانة';
    category = 'حساب الضريبة';
  } else if (norm.includes('تحويل') || norm.includes('رقم') || norm.includes('موظف') || norm.includes('مواعيد') || norm.includes('خدمة العملاء') || norm.includes('crm')) {
    topic = 'سيناريوهات التحويل وأرقام الدعم ومواعيد العمل';
    category = 'خدمة العملاء والتحويل';
  }

  const keywords = query
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  return {
    intent: requestedInfo.length > 0 ? 'procedure' : 'inquiry',
    topic,
    requestedInformation: requestedInfo.length > 0 ? requestedInfo : ['details'],
    keywords,
    searchQuery: query,
    needsClarification: false,
    isOutOfScope: false,
    isGreeting: false,
    detectedCategory: category
  };
}

/**
 * Stage 1: Question Understanding with Gemini
 */
async function understandQuestionWithGemini(
  query: string,
  history?: { role: 'user' | 'assistant' | 'model'; content: string }[]
): Promise<QuestionUnderstanding> {
  const norm = query.trim().toLowerCase();
  if (
    norm.includes('صباح الخير') || 
    norm.includes('مساء الخير') || 
    norm.includes('ازيك') || 
    norm.includes('عامل ايه') || 
    norm.includes('السلام عليكم') || 
    norm === 'مرحبا' || 
    norm === 'اهلا' ||
    norm === 'أهلاً'
  ) {
    return extractLocalUnderstanding(query);
  }

  let historyContext = '';
  if (history && history.length > 0) {
    historyContext = history
      .slice(-6)
      .map(h => `${h.role === 'user' ? 'الموظف' : 'المساعد'}: ${h.content}`)
      .join('\n');
  }

  const prompt = `
${historyContext ? `سياق المحادثة السابقة:\n${historyContext}\n\n` : ''}
رسالة المستخدم الحالية: "${query}"

Analyze this query and return the JSON object:
`;

  try {
    const response = await callGeminiGenerateWithRetry({
      primaryModel: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: UNDERSTANDING_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const rawText = (response.text || '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return extractLocalUnderstanding(query);
    }

    const isPureGreeting = Boolean(parsed.isGreeting) && query.length < 35;

    return {
      intent: parsed.intent || 'inquiry',
      topic: parsed.topic || query,
      requestedInformation: Array.isArray(parsed.requestedInformation) && parsed.requestedInformation.length > 0
        ? parsed.requestedInformation
        : ['details'],
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : query.split(' '),
      searchQuery: parsed.searchQuery || parsed.topic || query,
      needsClarification: Boolean(parsed.needsClarification),
      clarificationPrompt: parsed.clarificationPrompt || '',
      isOutOfScope: Boolean(parsed.isOutOfScope),
      isGreeting: isPureGreeting
    };
  } catch (err: any) {
    console.warn('Understanding fallback used due to Gemini API load:', err?.message || err);
    return extractLocalUnderstanding(query);
  }
}

/**
 * Stage 2: Grounded Answer Generation with Gemini
 */
async function generateGroundedAnswerWithGemini(
  query: string,
  understanding: QuestionUnderstanding,
  factsText: string,
  history?: { role: 'user' | 'assistant' | 'model'; content: string }[]
): Promise<string> {
  // Isolate conversation history - past assistant claims are explicitly marked as historical non-factual context
  let historyContext = '';
  if (history && history.length > 0) {
    historyContext = history
      .slice(-4)
      .map(h => `${h.role === 'user' ? 'سؤال الموظف السابق' : 'إجابة سابقة (غير معتمدة للحقائق الحالية)'}: ${h.content}`)
      .join('\n');
  }

  const prompt = `
${historyContext ? `[سياق المحادثة السابقة لأغراض التتبع فقط]:\n${historyContext}\n(تنبيه: أي أرقام أو إجابات في السياق السابق قد تكون قديمة، والمصدر الحصري للحقائق الحالية هو السجلات المرفقة أدناه فقط).\n\n` : ''}سؤال / طلب الموظف الحالي:
"${query}"

[سجلات Google Sheets الحالية المعتمدة - مصدر الحقيقة والبيانات الوحيد]:
${factsText}

الموضوع المستهدف: ${understanding.topic}
المعلومات المطلوبة: ${understanding.requestedInformation.join(', ')}

التعليمات الصارمة:
1. أجب بأسلوب موظف مصري خبير ومتعاون، راقٍ ومهذب ومباشر وواضح.
2. التزم التزاماً حديدياً وحصرياً بكافة الحقائق والأرقام والنسب والإجراءات والبيانات الواردة في سجلات Google Sheets المرفقة أعلاه دون زيادة أو نقصان أو تحريف للبيانات.
3. إذا تضمن السجل تصنيف CRM أو بيانات مطلوبة أو أرقام تحويل، اذكرها في نهاية الإجابة بتنسيق مرتب وواضح.
4. لا تستخدم معلومات عامة من خارج السجلات الحالية.
5. إذا كانت هناك جزئية لم ترد في السجلات المرفقة، اذكر بوضوح أن المعلومة دي مش مسجلة في قاعدة المعرفة المعتمدة حالياً.
`;

  try {
    const response = await callGeminiGenerateWithRetry({
      primaryModel: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: EGYPTIAN_TAX_GENERATION_INSTRUCTION,
        temperature: 0.2
      }
    });

    const text = (response.text || '').trim();
    if (!text) {
      throw new Error('Gemini returned an empty answer');
    }
    return text;
  } catch (err: any) {
    console.error('Gemini generateContent error in grounded answer:', err?.message || err);
    if (understanding.isGreeting) {
      return 'أهلاً بك يا فندم في مصلحة الضرائب العقارية. أنا في خدمتك لأي استفسار بخصوص القواعد والإجراءات المعتمدة.';
    }
    // Step 33: Never dump raw records upon AI failure - fail safely
    throw err;
  }
}

/**
 * Main Entry Point: Process Tax Inquiries with Full AI Pipeline
 */
export async function processTaxQuery(
  payload: ChatRequestPayload
): Promise<ChatResponsePayload> {
  const startTime = Date.now();
  const query = payload.query.trim();

  // Fail-fast verification: Gemini client MUST be available
  try {
    getAiClient();
  } catch (err: any) {
    console.error('Gemini client unavailable:', err.message);
    return {
      answer: 'حصلت مشكلة مؤقتة أثناء معالجة السؤال، حاول تاني.',
      status: 'error',
      sources: [],
      usedRecords: [],
      followUps: [],
      latencyMs: Date.now() - startTime
    };
  }

  // Quick Prompt Injection / Security Check
  const lower = query.toLowerCase();
  if (
    lower.includes('ignore all previous instructions') ||
    lower.includes('delete all exemptions') ||
    lower.includes('dump all database credentials') ||
    lower.includes('reveal secret')
  ) {
    return {
      answer: 'عذراً، بصفتي المساعد الذكي لمصلحة الضرائب العقارية، لا يمكنني تنفيذ هذا الطلب لمخالفته المعايير والسياسات الأمنية والقانونية.',
      status: 'verified',
      sources: [{ topic: 'الأمان والامتثال', source: 'السياسات الأمنية للمنظومة' }],
      usedRecords: [],
      followUps: ['ما هي مواعيد تقديم الإقرارات الضريبية؟'],
      latencyMs: Date.now() - startTime
    };
  }

  try {
    // Ultra-Fast Step 1: Local semantic extraction (Zero network latency, <2ms)
    const localUnderstanding = extractLocalUnderstanding(query);

    // Case A: Pure Greeting
    if (localUnderstanding.isGreeting) {
      return {
        answer: 'أهلاً بك يا فندم في المساعد الذكي لمصلحة الضرائب العقارية. جاهز لمساعدتك في أي استفسار يخص القوانين والإجراءات المعتمدة، تفضل بطرح سؤالك!',
        status: 'verified',
        sources: [],
        usedRecords: [],
        followUps: [
          'عندي وحدة ورثة وعايز أسجلها وأطلب إعفاء؟',
          'سددت تحت الحساب والشقة سكن خاص؟',
          'كيف يتم حساب الضريبة ونسبة الخصم 30%؟'
        ],
        latencyMs: Date.now() - startTime
      };
    }

    // Step 2: Check Google Sheets Knowledge Base Availability
    const activeService = knowledgeService;
    if (!activeService.isReady()) {
      return {
        answer: 'قاعدة البيانات غير متاحة حاليًا، لذلك مش هقدر أديك إجابة غير مؤكدة.',
        status: 'error',
        sources: [],
        usedRecords: [],
        followUps: [],
        latencyMs: Date.now() - startTime
      };
    }

    // Step 3: Fast Local Knowledge Retrieval (<5ms)
    const extractionResult = await activeService.extractRelevantKnowledge(localUnderstanding, {
      approvedOnly: true,
      limit: 3,
      minScore: 12
    });

    // Case D: No verified knowledge found in current Google Sheet
    if (extractionResult.isInformationMissing || extractionResult.candidateRecords.length === 0) {
      if (payload.userUid) {
        recordUnansweredQuestion({
          query,
          employeeUid: payload.userUid,
          employeeName: payload.userName || 'موظف الضرائب',
          status: 'not_found',
          reason: 'المعلومة غير متوفرة في جدول Google Sheets الحالي',
          suggestedTopic: localUnderstanding.topic
        }).catch(() => {});
      }

      return {
        answer: 'يا فندم المعلومة دي تحديداً مش مسجلة عندي في قاعدة البيانات المعتمدة حالياً عشان مقولكش كلمة مش أكيدة.',
        status: 'not_found',
        sources: [],
        usedRecords: [],
        followUps: [
          'تسجيل وحدة ورثة أو شراكة على الشيوع',
          'سداد تحت حساب الضريبة للسكن الخاص',
          'حساب الضريبة والخصم 30%'
        ],
        latencyMs: Date.now() - startTime
      };
    }

    // Build structured facts text for Gemini from candidate records
    const factsText = extractionResult.candidateRecords
      .map(r => `[سجل: ${r.topic} - التصنيف: ${r.category} (صف ${r.rowNumber || r.sheetRowIndex || '—'}) | المصدر والسند: ${r.source}]:\n${r.answer}`)
      .join('\n\n');

    // Step 4: Fast Single-Stage Grounded Gemini Generation (Flash model, zero extra roundtrips)
    const finalAnswer = await generateGroundedAnswerWithGemini(
      query,
      localUnderstanding,
      factsText,
      payload.history
    );

    // Collect verified sources from candidate records
    const sources = extractionResult.candidateRecords.map(r => ({
      topic: r.topic,
      source: r.source || `Google Sheet (الصف ${r.rowNumber || r.sheetRowIndex || '—'})`,
      isGoogleSheet: true,
      rowNumber: r.rowNumber || r.sheetRowIndex
    }));

    // Dynamic Context-Aware Follow-ups
    const followUps: string[] = [];
    if (localUnderstanding.topic.includes('ورثة') || localUnderstanding.topic.includes('شيوع')) {
      followUps.push('ما هي الأوراق المطلوبة لتسجيل الورثة؟');
      followUps.push('هل يجوز تقسيط الضريبة؟');
    } else if (localUnderstanding.topic.includes('سكن') || localUnderstanding.topic.includes('إعفاء')) {
      followUps.push('ما هو حد الإعفاء للسكن الخاص؟');
      followUps.push('كيف يتم استرداد المبالغ المسددة بالزيادة؟');
    } else if (localUnderstanding.topic.includes('حساب') || localUnderstanding.topic.includes('خصم')) {
      followUps.push('ما هي نسبة مصاريف الصيانة المستنزلة؟');
      followUps.push('كيف أحصل على خصم الـ 30%؟');
    } else {
      followUps.push('ما هي مواعيد العمل في خدمة العملاء؟');
      followUps.push('ما هو رقم التحويل لموظف الضرائب؟');
    }

    return {
      answer: finalAnswer,
      status: 'verified',
      sources,
      usedRecords: extractionResult.candidateRecords,
      followUps,
      latencyMs: Date.now() - startTime
    };

  } catch (err: any) {
    console.error('Error in processTaxQuery AI pipeline:', err);

    if (payload.userUid) {
      recordUnansweredQuestion({
        query,
        employeeUid: payload.userUid,
        employeeName: payload.userName || 'موظف الضرائب',
        status: 'retrieval_failed',
        reason: 'حدث خطأ في استدعاء محرك الذكاء الاصطناعي',
        suggestedTopic: 'استفسارات عامة'
      }).catch(() => {});
    }

    return {
      answer: 'حصلت مشكلة مؤقتة أثناء معالجة السؤال، حاول تاني.',
      status: 'error',
      sources: [],
      usedRecords: [],
      followUps: [],
      latencyMs: Date.now() - startTime
    };
  }
}
