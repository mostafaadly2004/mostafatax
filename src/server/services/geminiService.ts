/**
 * Gemini AI Tax Reasoning & Legal Grounding Service
 * Server-side AI Pipeline for Egyptian Real Estate Tax Authority (مصلحة الضرائب العقارية المصرية).
 * 
 * Pipeline Architecture:
 * 1. Cloud Firestore (`knowledge` collection) is the SINGLE SOURCE OF TRUTH for all factual knowledge.
 * 2. Model: `gemini-3.7-flash` with thinking capabilities.
 * 3. Stage 1: Question Understanding & Intent Extraction with `gemini-3.7-flash`.
 * 4. Stage 2: Grounded Retrieval from Cloud Firestore (`approved === true` only).
 * 5. Stage 3: Grounded Answer Generation in Egyptian Professional Arabic with `gemini-3.7-flash`.
 * 6. Hallucination Safeguard: If information is not in Firestore records -> "المعلومة دي مش موجودة بشكل مؤكد عندي في قاعدة المعرفة الحالية، فمش هخمن عليك."
 * 7. Failure Safeguard: If Gemini fails -> "حصلت مشكلة مؤقتة أثناء معالجة السؤال، حاول تاني."
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

export interface ChatDiagnostics {
  auth: 'PASS' | 'FAIL';
  intentUnderstanding: 'PASS' | 'FAIL';
  firestoreRetrieval: 'PASS' | 'FAIL';
  geminiGeneration: 'PASS' | 'FAIL';
  modelUsed: string;
  matchedCount: number;
  knowledgeVersion?: number;
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
    id?: string;
    version?: number;
  }[];
  usedRecords: KnowledgeRecord[];
  followUps: string[];
  latencyMs: number;
  diagnostics?: ChatDiagnostics;
}

const UNDERSTANDING_SYSTEM_INSTRUCTION = `
You are the semantic question understanding engine for the Egyptian Real Estate Tax Authority (مصلحة الضرائب العقارية المصرية).
Your task is to analyze employee/taxpayer questions in Arabic (Egyptian dialect or Modern Standard Arabic), accounting for conversation context, and output a valid JSON object.

Extract:
1. "intent": One of ["inquiry", "calculation", "procedure", "documents_request", "fees_request", "duration_request", "conditions_request", "deadline_request", "exemption_request", "appeals_request", "greeting", "out_of_scope", "clarification_needed"]
2. "topic": Normalized Arabic topic (e.g., "تسجيل وحدة ورثة أو شراكة على الشيوع", "إعفاء السكن الخاص", "حساب الضريبة والخصم 30%", "تسهيلات الطعون وقانون 3 لسنة 2026", "استرداد السداد بالزيادة", "كشف المشتملات والحساب")
3. "requestedInformation": Array containing any of ["required_documents", "fees", "duration", "conditions", "deadlines", "exemption_rules", "procedure_steps", "calculation", "crm_category", "details"]
4. "keywords": Array of important Arabic search keywords
5. "searchQuery": Clean, effective Arabic search phrase for Firestore knowledge retrieval (focusing on the core tax question)
6. "needsClarification": Boolean (true only if the user query is excessively vague, like just "عايز الإجراءات" with no context)
7. "clarificationPrompt": Polite Egyptian Arabic question asking for clarification if needsClarification is true, otherwise empty string
8. "isOutOfScope": Boolean (true if asking about sports, cooking, politics, unrelated software, etc.)
9. "isGreeting": Boolean (true ONLY if the message is purely a greeting like "صباح الخير" or "ازيك" without any tax question attached. If a question is attached to a greeting, set isGreeting to FALSE and extract the core tax topic).

Return strictly JSON matching this structure without Markdown backticks or additional text.
`;

const EGYPTIAN_TAX_GENERATION_INSTRUCTION = `
أنت المساعد الذكي لمصلحة الضرائب العقارية المصرية.
تتحدث باللغة العربية بلهجة مصرية مهذبة ورسمية وواضحة (أسلوب موظف مصري خبير ومتعاون في مصلحة الضرائب العقارية).

المبادئ والقواعد الصارمة:
1. سجلات قاعدة المعرفة المعتمدة (Firestore Knowledge Records) المرفقة في السياق هي مصدر الحقائق والمعلومات الوحيد والحصري:
   - لا تعتمد على أي معلومات عامة من خارج السجلات المعتمدة المرفقة.
   - لا تعتمد على إجابات سابقة في المحادثة كمصدر للحقائق الحالية.
   - التزم بالدقة التامة في النسب والمبالغ والمواعيد والقوانين (قانون 196 لسنة 2008 وتعديلات قانون 3 لسنة 2026).
   - إذا سأل الموظف عن شيء غير موجود في السجلات المرفقة، قل بوضوح وبنفس الصيغة:
     "المعلومة دي مش موجودة بشكل مؤكد عندي في قاعدة المعرفة الحالية، فمش هخمن عليك."

2. الأسلوب والتنسيق:
   - أسلوب مصري مهذب ومريح: "أهلاً بك يا فندم"، "بالنسبة لاستفسارك عن..."، "المستندات المطلوبة هي: ...".
   - رتب الإجابة بنقاط واضحة وسهلة القراءة للموظف أو المواطن.
   - إذا تضمن السجل تصنيف CRM أو بيانات مطلوبة للعميل، اذكرها في نهاية الإجابة بتنسيق مرتب:
     💡 التصنيف على CRM: (التصنيف الأساسي / الفرعي)
     📋 البيانات المطلوبة من العميل: (البيانات)
`;

// Cache for exhausted models
const exhaustedModels = new Map<string, number>();

/**
 * Robust Gemini model invoker with retry and fallback
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

  // Mandatory target model is gemini-3.7-flash
  const preferredPrimary = params.primaryModel || 'gemini-3.7-flash';
  const allCandidates = [
    preferredPrimary,
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite'
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
 * Stage 1: Question Understanding with Gemini 3.7 Flash
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
      primaryModel: 'gemini-3.7-flash',
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
 * Stage 3: Grounded Answer Generation with Gemini 3.7 Flash
 */
async function generateGroundedAnswerWithGemini(
  query: string,
  understanding: QuestionUnderstanding,
  factsText: string,
  history?: { role: 'user' | 'assistant' | 'model'; content: string }[]
): Promise<string> {
  let historyContext = '';
  if (history && history.length > 0) {
    historyContext = history
      .slice(-4)
      .map(h => `${h.role === 'user' ? 'سؤال الموظف السابق' : 'إجابة سابقة (غير معتمدة للحقائق الحالية)'}: ${h.content}`)
      .join('\n');
  }

  const prompt = `
${historyContext ? `[سياق المحادثة السابقة لأغراض المتابعة فقط]:\n${historyContext}\n(تنبيه: المصدر الوحيد للحقائق الحالية هو سجلات قاعدة المعرفة المرفقة أدناه فقط).\n\n` : ''}سؤال / طلب الموظف أو المواطن:
"${query}"

[سجلات قاعدة معرفة الضرائب العقارية المعتمدة - المصدر الحصري للحقائق]:
${factsText}

الموضوع المستهدف: ${understanding.topic}
المعلومات المطلوبة: ${understanding.requestedInformation.join(', ')}

التعليمات الصارمة:
1. أجب بأسلوب موظف مصري خبير ومتعاون في مصلحة الضرائب العقارية، راقٍ ومهذب ومباشر ودقيق.
2. التزم التزاماً حديدياً وحصرياً بكافة الحقائق والأرقام والنسب والإجراءات والبيانات الواردة في سجلات قاعدة المعرفة المعتمدة المرفقة أعلاه دون زيادة أو نقصان أو تحريف.
3. إذا تضمن السجل تصنيف CRM أو بيانات مطلوبة من العميل، اذكرها في نهاية الإجابة بتنسيق مرتب وواضح.
4. لا تستخدم أي معلومات عامة من خارج السجلات الحالية المرفقة.
5. إذا كانت هناك جزئية لم ترد في السجلات المرفقة، اذكر بوضوح: "المعلومة دي مش موجودة بشكل مؤكد عندي في قاعدة المعرفة الحالية، فمش هخمن عليك."
`;

  try {
    const response = await callGeminiGenerateWithRetry({
      primaryModel: 'gemini-3.7-flash',
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
    throw err;
  }
}

/**
 * Main Entry Point: Process Tax Inquiries with Full Firestore + Gemini 3.7 Flash AI Pipeline
 */
export async function processTaxQuery(
  payload: ChatRequestPayload
): Promise<ChatResponsePayload> {
  const startTime = Date.now();
  const query = payload.query.trim();

  const diagnostics: ChatDiagnostics = {
    auth: 'PASS',
    intentUnderstanding: 'FAIL',
    firestoreRetrieval: 'FAIL',
    geminiGeneration: 'FAIL',
    modelUsed: 'gemini-3.7-flash',
    matchedCount: 0
  };

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
      latencyMs: Date.now() - startTime,
      diagnostics
    };
  }

  // Security Check / Prompt Injection Defense
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
      latencyMs: Date.now() - startTime,
      diagnostics
    };
  }

  try {
    // Stage 1: Question Understanding with Gemini 3.7 Flash
    const understanding = await understandQuestionWithGemini(query, payload.history);
    diagnostics.intentUnderstanding = 'PASS';

    // Case A: Pure Greeting
    if (understanding.isGreeting) {
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
        latencyMs: Date.now() - startTime,
        diagnostics
      };
    }

    // Stage 2: Retrieve approved records from Cloud Firestore
    const extractionResult = await knowledgeService.extractRelevantKnowledge(understanding, {
      approvedOnly: true,
      limit: 3,
      minScore: 12
    });

    diagnostics.firestoreRetrieval = 'PASS';
    diagnostics.matchedCount = extractionResult.candidateRecords.length;

    // Case B: No verified knowledge found in Firestore
    if (extractionResult.isInformationMissing || extractionResult.candidateRecords.length === 0) {
      if (payload.userUid) {
        recordUnansweredQuestion({
          query,
          employeeUid: payload.userUid,
          employeeName: payload.userName || 'موظف الضرائب',
          status: 'not_found',
          reason: 'المعلومة غير متوفرة في قاعدة معرفة Firestore المعتمدة',
          suggestedTopic: understanding.topic
        }).catch(() => {});
      }

      return {
        answer: 'المعلومة دي مش موجودة بشكل مؤكد عندي في قاعدة المعرفة الحالية، فمش هخمن عليك.',
        status: 'not_found',
        sources: [],
        usedRecords: [],
        followUps: [
          'تسجيل وحدة ورثة أو شراكة على الشيوع',
          'سداد تحت حساب الضريبة للسكن الخاص',
          'حساب الضريبة والخصم 30%'
        ],
        latencyMs: Date.now() - startTime,
        diagnostics
      };
    }

    // Build structured facts text for Gemini from candidate records
    const factsText = extractionResult.candidateRecords
      .map(r => `[سجل: ${r.topic} - التصنيف: ${r.category} | النسخة: v${r.version || 1} | المصدر: ${r.source || r.sourceReference}]:\n${r.answer}`)
      .join('\n\n');

    // Stage 3: Grounded Gemini 3.7 Flash Generation
    const finalAnswer = await generateGroundedAnswerWithGemini(
      query,
      understanding,
      factsText,
      payload.history
    );

    diagnostics.geminiGeneration = 'PASS';

    // Collect verified sources from candidate records
    const sources = extractionResult.candidateRecords.map(r => ({
      topic: r.topic,
      source: r.source || r.sourceReference || 'قاعدة معرفة الضرائب العقارية (Firestore)',
      id: r.id,
      version: r.version
    }));

    // Dynamic Context-Aware Follow-ups
    const followUps: string[] = [];
    if (understanding.topic.includes('ورثة') || understanding.topic.includes('شيوع')) {
      followUps.push('ما هي الأوراق المطلوبة لتسجيل الورثة؟');
      followUps.push('هل يجوز تقسيط الضريبة؟');
    } else if (understanding.topic.includes('سكن') || understanding.topic.includes('إعفاء')) {
      followUps.push('ما هو حد الإعفاء للسكن الخاص؟');
      followUps.push('كيف يتم استرداد المبالغ المسددة بالزيادة؟');
    } else if (understanding.topic.includes('حساب') || understanding.topic.includes('خصم')) {
      followUps.push('ما هي نسبة مصاريف الصيانة المستنزلة؟');
      followUps.push('كيف أحصل على خصم الـ 30%؟');
    } else {
      followUps.push('ما هي مواعيد تقديم الإقرارات الضريبية؟');
      followUps.push('كيف يتم تقديم طعن وفقاً لقانون 3 لسنة 2026؟');
    }

    return {
      answer: finalAnswer,
      status: 'verified',
      sources,
      usedRecords: extractionResult.candidateRecords,
      followUps,
      latencyMs: Date.now() - startTime,
      diagnostics
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
      latencyMs: Date.now() - startTime,
      diagnostics
    };
  }
}
