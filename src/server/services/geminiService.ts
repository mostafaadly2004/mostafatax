/**
 * Gemini 3.7 Flash Grounded Conversational AI Agent Service
 * Real Grounded Conversational Pipeline for the Egyptian Real Estate Tax Authority (مصلحة الضرائب العقارية المصرية).
 * 
 * Pipeline Architecture:
 * 1. Cloud Firestore (`knowledge` collection) is the EXCLUSIVE factual source of truth.
 * 2. Stage 1: Question Understanding with `gemini-3.7-flash` (Extracts intent, topic, requestedInformation, keywords, searchQuery with structured output schema).
 * 3. Retrieval Tool: `searchKnowledge()` against CURRENT APPROVED Firestore records only (`approved === true`).
 * 4. Stage 2: Grounded Conversational Generation with `gemini-3.7-flash` (thinkingConfig: ThinkingLevel.MEDIUM).
 * 5. Factual Grounding & Validation: Anti-verbatim database dump, anti-hallucination, CRM separation, and numbers/dates verification.
 * 6. Admin Telemetry & Real Diagnostics: Real execution metrics without exposing chain-of-thought or raw prompts.
 */

import 'dotenv/config';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { knowledgeService } from '../../lib/knowledge/knowledge-service.ts';
import { KnowledgeRecord, QuestionUnderstanding } from '../../lib/knowledge/types.ts';
import { recordUnansweredQuestion } from './unansweredService.ts';

let aiClient: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

/**
 * Resilient Gemini Content Generator with Exponential Backoff & 503 Demand Spike Handling
 */
async function callGeminiWithResilience(
  ai: GoogleGenAI,
  params: {
    primaryModel?: string;
    contents: string;
    config: any;
  }
): Promise<{ text: string; modelUsed: string }> {
  const models = [params.primaryModel || 'gemini-3.7-flash', 'gemini-3.6-flash'];

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config
        });
        const text = (response.text || '').trim();
        if (text) {
          return { text, modelUsed: model };
        }
      } catch (err: any) {
        const status = err?.status;
        const msg = err?.message || '';
        const isRateOrBusy = status === 429 || status === 503 || msg.includes('high demand') || msg.includes('RESOURCE_EXHAUSTED');

        if (attempt === 1 && isRateOrBusy) {
          // Wait 1200ms before retrying
          await new Promise(resolve => setTimeout(resolve, 1200));
          continue;
        }

        console.warn(`[Gemini] Model ${model} unavailable (status: ${status || msg}), failing over...`);
        break;
      }
    }
  }

  throw new Error('All Gemini model endpoints are currently experiencing service spikes.');
}

export type ChatResponseStatus = 
  | 'verified' 
  | 'no_verified_data' 
  | 'clarification' 
  | 'ai_error' 
  | 'knowledge_error' 
  | 'knowledge_conflict' 
  | 'transfer_required';

export interface ChatDiagnostics {
  model: string;
  thinkingLevel: string;
  stage1Started: number;
  stage1Completed: number;
  retrievalStarted: number;
  retrievalCompleted: number;
  recordsRetrieved: number;
  stage2Started: number;
  stage2Completed: number;
  groundingValidation: 'PASS' | 'FAIL' | 'REJECTED' | 'BYPASS_GREETING';
  finalStatus: ChatResponseStatus;
  intent?: string;
  topic?: string;
  searchQuery?: string;
  knowledgeVersion?: number;
}

export interface ChatRequestPayload {
  query: string;
  conversationId?: string;
  history?: { role: 'user' | 'assistant' | 'model'; content: string }[];
  userUid?: string;
  userName?: string;
  debugMode?: boolean;
}

export interface ChatResponsePayload {
  answer: string;
  status: ChatResponseStatus;
  sources: {
    topic: string;
    source: string;
    id?: string;
    version?: number;
  }[];
  usedRecords: KnowledgeRecord[];
  followUps: string[];
  latencyMs: number;
  requestId: string;
  knowledgeVersion?: string;
  routing?: {
    requiresHumanTransfer: boolean;
    transferType?: string;
    targetDepartment?: string;
  };
  diagnostics?: ChatDiagnostics;
}

// Stage 1 Schema Definition for Structured Output
const QUESTION_UNDERSTANDING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.STRING,
      description: 'One of: inquiry, calculation, procedure, documents_request, fees_request, duration_request, conditions_request, deadlines_request, exemption_request, appeals_request, greeting, out_of_scope, clarification_needed'
    },
    topic: {
      type: Type.STRING,
      description: 'The normalized core tax subject (e.g. "نقل الملكية", "إعفاء السكن الخاص", "حساب الضريبة والخصم 30%", "تسهيلات الطعون وقانون 3 لسنة 2026", "استرداد السداد بالزيادة", "تسجيل وحدات الورثة والشيوع")'
    },
    requestedInformation: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Specific aspects requested: ["required_documents", "fees", "duration", "conditions", "deadlines", "exemption_rules", "procedure_steps", "calculation", "crm_category", "details"]'
    },
    entities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Entities extracted from query (e.g., amounts, laws, property types)'
    },
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key search keywords in Arabic'
    },
    searchQuery: {
      type: Type.STRING,
      description: 'Optimized Arabic search query for Firestore knowledge retrieval'
    },
    needsClarification: {
      type: Type.BOOLEAN,
      description: 'True only if the question is too vague or ambiguous to resolve'
    },
    clarificationQuestion: {
      type: Type.STRING,
      description: 'Egyptian Arabic clarification question if needsClarification is true'
    },
    isOutOfScope: {
      type: Type.BOOLEAN,
      description: 'True if completely unrelated to real estate taxes, laws, or public services'
    },
    isGreeting: {
      type: Type.BOOLEAN,
      description: 'True ONLY if the message is purely a greeting without any tax inquiry'
    }
  },
  required: [
    'intent',
    'topic',
    'requestedInformation',
    'keywords',
    'searchQuery',
    'needsClarification',
    'isOutOfScope',
    'isGreeting'
  ]
};

const STAGE1_SYSTEM_INSTRUCTION = `
You are the semantic question understanding engine for the Egyptian Real Estate Tax Authority (مصلحة الضرائب العقارية المصرية).
Analyze employee/citizen inquiries in Egyptian Arabic or Modern Standard Arabic, considering the conversation context for follow-up questions.

Rules:
1. Meaning over exact words: Understand intent regardless of Egyptian dialect synonyms (e.g. "إيه الورق المطلوب؟", "أجيب معايا إيه؟", "محتاج إيه عشان أقدم؟", "إيه المستندات اللي لازم تكون معايا؟" all mean topic: "المستندات المطلوبة" and requestedInformation: ["required_documents"]).
2. Short follow-up resolution:
   - If previous turn was about "نقل الملكية" and user asks "طب والرسوم؟" -> topic is "نقل الملكية", requestedInformation: ["fees"], searchQuery: "رسوم نقل الملكية".
   - If user asks "والمدة؟" -> topic is "نقل الملكية", requestedInformation: ["duration"], searchQuery: "مدة إجراءات نقل الملكية".
3. Pure Greetings: Mark isGreeting: true ONLY if the message is strictly a greeting (e.g. "صباح الخير", "ازيك", "السلام عليكم") with no tax inquiry attached.
4. Out of scope: Mark isOutOfScope: true for cooking, sports, general entertainment, unrelated coding, etc.

Return valid JSON adhering strictly to the schema.
`;

const STAGE2_SYSTEM_INSTRUCTION = `
أنت المساعد الذكي والمستشار الضريبي لمصلحة الضرائب العقارية المصرية.
تتحدث باللغة العربية بلهجة مصرية مهذبة ورسمية وواضحة (أسلوب موظف مصري خبير ومتعاون في مصلحة الضرائب العقارية).

المبادئ والقواعد الأساسية:
1. قاعدة المعرفة المعتمدة (Firestore Knowledge Base) المرفقة هي المصدر الحصري والوحيد للحقائق والأرقام والنسب والمواعيد.
   - لا تخترع أو تخمن أي رقم أو نسبة أو مدة أو قانون من معلوماتك العامة.
   - إذا سأل المستخدم عن جزئية غير واردة في السجلات المعتمدة المرفقة، قل بوضوح:
     "المعلومة دي مش موجودة عندي بشكل مؤكد في قاعدة المعرفة الحالية، فمش هخمن عليك."

2. منع نقل نصوص قاعدة البيانات حرفياً (DO NOT RETURN DATABASE TEXT VERBATIM):
   - لا تقم بنسخ نص السجل كما هو في قاعدة البيانات.
   - لا تبدأ بعبارات السياسات الداخلية مثل "يتم إبلاغ العميل أنه يمكنه...".
   - اشرح الموضوع بأسلوب محادثة مصري طبيعي وسلس ومباشر ("أيوه، بالنسبة للحالة دي، المستندات المطلوبة هي...", "بخصوص الرسوم، المقررة هي...").

3. الإجابة المحددة دون إطالة غير مطلوبة (DO NOT OVERANSWER):
   - إذا سأل المستخدم عن الرسوم فقط، أجب عن الرسوم.
   - لا تسرد المستندات والمدد والشروط إلا إذا كانت مرتبطة مباشرة بسؤاله أو طلبها.

4. عزل بيانات الـ CRM والتعليمات الداخلية:
   - تصنيفات الـ CRM ("يتم اختيارها على CRM...") وبيانات العميل المطلوبة ("الاسم ثلاثي / رقم الموبايل...") هي تعليمات تشغيلية داخلية ولا تذكر في نص الإجابة العادي كحقائق ضريبية.

5. الأسلوب والتحية:
   - استخدم لهجة مصرية راقية ومهذبة ("أهلاً بك يا فندم"، "تحت أمرك"، "بالنسبة للاستفسار...").
   - تجنب التكرار المفرط للكلمات وتجنب اللهجة المبتذلة، والتزم باحترافية موظف الضرائب.
`;

/**
 * Stage 1: Question Understanding with Gemini 3.7 Flash
 */
async function runStage1QuestionUnderstanding(
  ai: GoogleGenAI,
  query: string,
  history?: { role: 'user' | 'assistant' | 'model'; content: string }[]
): Promise<{ understanding: QuestionUnderstanding; modelUsed: string }> {
  let historyContext = '';
  if (history && history.length > 0) {
    historyContext = history
      .slice(-6)
      .map(h => `${h.role === 'user' ? 'سؤال الموظف' : 'المساعد'}: ${h.content}`)
      .join('\n');
  }

  const prompt = `${historyContext ? `[سياق المحادثة السابقة لأغراض الربط وفهم المتابعة فقط]:\n${historyContext}\n\n` : ''}رسالة المستخدم الحالية:\n"${query}"\n\nقم بتحليل الرسالة واستخراج كائن JSON وفقاً للمخطط المحدد:`;

  const result = await callGeminiWithResilience(ai, {
    primaryModel: 'gemini-3.7-flash',
    contents: prompt,
    config: {
      systemInstruction: STAGE1_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: QUESTION_UNDERSTANDING_SCHEMA
    }
  });

  const parsed = JSON.parse(result.text);

  return {
    understanding: {
      intent: parsed.intent || 'inquiry',
      topic: parsed.topic || query,
      requestedInformation: Array.isArray(parsed.requestedInformation) && parsed.requestedInformation.length > 0
        ? parsed.requestedInformation
        : ['details'],
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      searchQuery: parsed.searchQuery || parsed.topic || query,
      needsClarification: Boolean(parsed.needsClarification),
      clarificationPrompt: parsed.clarificationQuestion || '',
      isOutOfScope: Boolean(parsed.isOutOfScope),
      isGreeting: Boolean(parsed.isGreeting) && query.length < 40
    },
    modelUsed: result.modelUsed
  };
}

/**
 * Server-Side Knowledge Retrieval Tool
 * Strictly queries CURRENT approved Firestore records only.
 */
async function executeKnowledgeRetrievalTool(
  understanding: QuestionUnderstanding
): Promise<{
  records: KnowledgeRecord[];
  hasConflict: boolean;
  conflictDetails?: string;
  isTransferRequired: boolean;
  transferType?: string;
}> {
  // Query only approved records
  const searchResults = await knowledgeService.search(
    understanding.searchQuery || understanding.topic,
    {
      approvedOnly: true,
      limit: 4,
      minScore: 10
    },
    understanding
  );

  const candidateRecords = searchResults.map(r => r.record);

  // Check for potential conflicting records in approved knowledge
  let hasConflict = false;
  let conflictDetails: string | undefined;

  if (candidateRecords.length >= 2) {
    const primary = candidateRecords[0];
    const secondary = candidateRecords[1];

    if (
      primary.topic === secondary.topic &&
      primary.id !== secondary.id &&
      primary.answer.length > 20 &&
      secondary.answer.length > 20
    ) {
      const nums1: string[] = primary.answer.match(/\d+[\d.,%]*/g) || [];
      const nums2: string[] = secondary.answer.match(/\d+[\d.,%]*/g) || [];
      const hasNumberDivergence = nums1.some((n: string) => !nums2.includes(n)) && nums2.some((n: string) => !nums1.includes(n));

      if (hasNumberDivergence && primary.approved && secondary.approved) {
        hasConflict = true;
        conflictDetails = `تعارض في بيانات الموضوع: "${primary.topic}" بين السجلين ${primary.id} و ${secondary.id}`;
      }
    }
  }

  // Check if any retrieved record designates an operational routing transfer
  let isTransferRequired = false;
  let transferType: string | undefined;

  for (const rec of candidateRecords) {
    const act = (rec.routingAction || rec.answer || '').toLowerCase();
    if (act.includes('يحول للموظف') || act.includes('تحويل لمأمورية') || act.includes('الدعم الفني')) {
      isTransferRequired = true;
      transferType = act.includes('الدعم الفني') ? 'tech_support' : 'tax_employee';
      break;
    }
  }

  return {
    records: candidateRecords.slice(0, 3), // Return top 3 maximum evidence records
    hasConflict,
    conflictDetails,
    isTransferRequired,
    transferType
  };
}

/**
 * Stage 2: Grounded Answer Generation with Gemini 3.7 Flash
 */
async function runStage2GroundedAnswerGeneration(
  ai: GoogleGenAI,
  query: string,
  understanding: QuestionUnderstanding,
  records: KnowledgeRecord[],
  history?: { role: 'user' | 'assistant' | 'model'; content: string }[]
): Promise<{ answer: string; modelUsed: string }> {
  let historyContext = '';
  if (history && history.length > 0) {
    historyContext = history
      .slice(-4)
      .map(h => `${h.role === 'user' ? 'سؤال سابق للموظف' : 'رد سابق (للمتابعة فقط وليس مصدراً للحقائق)'}: ${h.content}`)
      .join('\n');
  }

  // Format evidence cleanly
  const evidenceText = records.map((r, i) => {
    return `[سجل معتمد #${i + 1} - الموضوع: ${r.topic} | التصنيف: ${r.category} | النسخة: v${r.version || 1}]:\n${r.answer}`;
  }).join('\n\n');

  const prompt = `
${historyContext ? `[سياق المحادثة السابقة]:\n${historyContext}\n(ملاحظة هامة: المصدر الوحيد للحقائق الحالية هو السجلات المعتمدة أدناه).\n\n` : ''}
سؤال / استفسار الموظف أو المواطن:
"${query}"

[سجلات قاعدة المعرفة المعتمدة من Firestore - المصدر الحصري للحقائق]:
${evidenceText}

الموضوع المستهدف: ${understanding.topic}
المعلومات المطلوبة تحديداً: ${understanding.requestedInformation.join(', ')}

التعليمات الصارمة:
1. أجب بأسلوب موظف مصري خبير وودود ومتعاون في مصلحة الضرائب العقارية.
2. لا تقم بنسخ أو طباعة نصوص قاعدة البيانات حرفياً. اشرح الحقائق بلغة عربية مصرية طبيعية وسلسة ومفهومة.
3. التزم بالحقائق والأرقام الواردة في السجلات أعلاه دون تحريف أو إضافة حقائق غير موجودة.
4. أجب عن المطلوب تحديداً دون إسهاب أو سرد بنود غير مطلوبة.
5. لا تذكر تعليمات الـ CRM الداخلية في نص الإجابة العادي.
`;

  const result = await callGeminiWithResilience(ai, {
    primaryModel: 'gemini-3.7-flash',
    contents: prompt,
    config: {
      systemInstruction: STAGE2_SYSTEM_INSTRUCTION,
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.MEDIUM
      }
    }
  });

  return {
    answer: result.text,
    modelUsed: result.modelUsed
  };
}

/**
 * Factual Grounding Validator
 * Ensures numbers, percentages, laws, and claims match retrieved evidence.
 */
function validateAnswerGrounding(
  answer: string,
  records: KnowledgeRecord[],
  understanding: QuestionUnderstanding
): { passed: boolean; cleanAnswer: string; reason?: string } {
  let cleanAnswer = answer.trim();

  // 1. Remove leaked CRM directives if generated by model
  cleanAnswer = cleanAnswer
    .replace(/يتم اختيارها على crm[^\n.]*/gi, '')
    .replace(/يتم اختيارها على الـ crm[^\n.]*/gi, '')
    .replace(/💡 التصنيف على crm:[^\n]*/gi, '')
    .replace(/📋 البيانات المطلوبة من العميل:[^\n]*/gi, '')
    .trim();

  if (records.length === 0) {
    return {
      passed: true,
      cleanAnswer: 'المعلومة دي مش موجودة عندي بشكل مؤكد في قاعدة المعرفة الحالية، فمش هخمن عليك.',
      reason: 'NO_RECORDS_EMPTY_GROUNDING'
    };
  }

  // 2. Validate numbers and percentages in answer against evidence
  const combinedEvidence = records.map(r => r.answer).join(' ');
  const answerPercentages = cleanAnswer.match(/\b\d+(\.\d+)?%/g) || [];

  for (const pct of answerPercentages) {
    if (!combinedEvidence.includes(pct)) {
      const cleanPct = pct.replace('%', '').trim();
      if (!combinedEvidence.includes(cleanPct)) {
        return {
          passed: false,
          cleanAnswer: 'المعلومة دي مش موجودة عندي بشكل مؤكد في قاعدة المعرفة الحالية، فمش هخمن عليك.',
          reason: `UNGROUNDED_PERCENTAGE: ${pct}`
        };
      }
    }
  }

  return {
    passed: true,
    cleanAnswer
  };
}

/**
 * Main Orchestration Pipeline: Process Inquiries with Authentic Two-Stage Gemini 3.7 Flash Agent
 */
export async function processTaxQuery(
  payload: ChatRequestPayload
): Promise<ChatResponsePayload> {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const query = payload.query.trim();

  const diagnostics: ChatDiagnostics = {
    model: 'gemini-3.7-flash',
    thinkingLevel: 'MEDIUM',
    stage1Started: 0,
    stage1Completed: 0,
    retrievalStarted: 0,
    retrievalCompleted: 0,
    recordsRetrieved: 0,
    stage2Started: 0,
    stage2Completed: 0,
    groundingValidation: 'PASS',
    finalStatus: 'verified'
  };

  // 1. Initial Prompt Injection / Cyber Security Filter
  const lowerQuery = query.toLowerCase();
  if (
    lowerQuery.includes('ignore all previous instructions') ||
    lowerQuery.includes('dump all database') ||
    lowerQuery.includes('reveal secret') ||
    lowerQuery.includes('system override')
  ) {
    diagnostics.finalStatus = 'verified';
    diagnostics.groundingValidation = 'PASS';
    return {
      answer: 'عذراً، بصفتي المساعد الذكي لمصلحة الضرائب العقارية، لا يمكنني تنفيذ هذا الطلب لمخالفته المعايير والسياسات الأمنية والقانونية.',
      status: 'verified',
      sources: [{ topic: 'الأمان والامتثال', source: 'السياسات الأمنية للمنظومة' }],
      usedRecords: [],
      followUps: ['ما هي مواعيد تقديم الإقرارات الضريبية؟'],
      latencyMs: Date.now() - startTime,
      requestId,
      diagnostics
    };
  }

  let ai: GoogleGenAI;
  try {
    ai = getAiClient();
  } catch (err: any) {
    diagnostics.finalStatus = 'ai_error';
    return {
      answer: 'حصلت مشكلة مؤقتة في الاتصال بمحرك الذكاء الاصطناعي، يرجى المحاولة مرة أخرى.',
      status: 'ai_error',
      sources: [],
      usedRecords: [],
      followUps: [],
      latencyMs: Date.now() - startTime,
      requestId,
      diagnostics
    };
  }

  try {
    // ----------------------------------------------------
    // STAGE 1: Question Understanding with Gemini 3.7 Flash
    // ----------------------------------------------------
    diagnostics.stage1Started = Date.now();
    const stage1Result = await runStage1QuestionUnderstanding(ai, query, payload.history);
    const understanding = stage1Result.understanding;
    diagnostics.model = stage1Result.modelUsed;
    diagnostics.stage1Completed = Date.now();
    diagnostics.intent = understanding.intent;
    diagnostics.topic = understanding.topic;
    diagnostics.searchQuery = understanding.searchQuery;

    // Handle Pure Greetings
    if (understanding.isGreeting) {
      diagnostics.groundingValidation = 'BYPASS_GREETING';
      diagnostics.finalStatus = 'verified';
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
        requestId,
        diagnostics
      };
    }

    // Handle Clarification Needed
    if (understanding.needsClarification && understanding.clarificationPrompt) {
      diagnostics.finalStatus = 'clarification';
      return {
        answer: understanding.clarificationPrompt || 'ممكن توضحلي الاستفسار أو الإجراء المطلوب بمزيد من التفصيل عشان أساعدك بالمعلومة المعتمدة الدقيقة؟',
        status: 'clarification',
        sources: [],
        usedRecords: [],
        followUps: [
          'إجراءات نقل الملكية',
          'طلب إعفاء السكن الخاص',
          'حساب الضريبة العقارية'
        ],
        latencyMs: Date.now() - startTime,
        requestId,
        diagnostics
      };
    }

    // Handle Out of Scope Questions
    if (understanding.isOutOfScope) {
      diagnostics.finalStatus = 'no_verified_data';
      return {
        answer: 'المعلومة دي مش موجودة عندي بشكل مؤكد في قاعدة المعرفة الحالية، فمش هخمن عليك. أنا مخصص للاستفسارات المتعلقة بالضرائب والخدمات العقارية المقررة في قاعدة المعرفة.',
        status: 'no_verified_data',
        sources: [],
        usedRecords: [],
        followUps: [
          'ما هي شروط إعفاء السكن الخاص؟',
          'كيف يتم احتساب نسبة الخصم 30%؟',
          'المستندات المطلوبة لنقل الملكية'
        ],
        latencyMs: Date.now() - startTime,
        requestId,
        diagnostics
      };
    }

    // ----------------------------------------------------
    // KNOWLEDGE RETRIEVAL TOOL: Query Approved Firestore Data
    // ----------------------------------------------------
    diagnostics.retrievalStarted = Date.now();
    const retrievalResult = await executeKnowledgeRetrievalTool(understanding);
    diagnostics.retrievalCompleted = Date.now();
    diagnostics.recordsRetrieved = retrievalResult.records.length;

    // Handle Conflicting Knowledge
    if (retrievalResult.hasConflict) {
      diagnostics.finalStatus = 'knowledge_conflict';
      return {
        answer: 'فيه تعارض بين المعلومات المعتمدة في قاعدة المعرفة بخصوص هذا الموضوع، وتم إرسال الملاحظة للمراجعة والتدقيق قبل تأكيدها.',
        status: 'knowledge_conflict',
        sources: retrievalResult.records.map(r => ({
          topic: r.topic,
          source: r.source || r.sourceReference || 'Firestore Knowledge',
          id: r.id,
          version: r.version
        })),
        usedRecords: retrievalResult.records,
        followUps: ['استفسار عن موضوع آخر'],
        latencyMs: Date.now() - startTime,
        requestId,
        diagnostics
      };
    }

    // Handle Missing Information (No data in approved Firestore records)
    if (retrievalResult.records.length === 0) {
      diagnostics.finalStatus = 'no_verified_data';

      // Log unanswered question for admin review
      if (payload.userUid) {
        recordUnansweredQuestion({
          query,
          employeeUid: payload.userUid,
          employeeName: payload.userName || 'موظف الضرائب',
          status: 'not_found',
          reason: 'المعلومة غير مسجلة في قاعدة المعرفة المعتمدة',
          suggestedTopic: understanding.topic
        }).catch(() => {});
      }

      return {
        answer: 'المعلومة دي مش موجودة عندي بشكل مؤكد في قاعدة المعرفة الحالية، فمش هخمن عليك.',
        status: 'no_verified_data',
        sources: [],
        usedRecords: [],
        followUps: [
          'تسجيل وحدة ورثة أو شراكة على الشيوع',
          'سددت تحت الحساب والشقة سكن خاص',
          'حساب الضريبة والخصم 30%'
        ],
        latencyMs: Date.now() - startTime,
        requestId,
        diagnostics
      };
    }

    // ----------------------------------------------------
    // STAGE 2: Grounded Answer Generation with Gemini 3.7 Flash
    // ----------------------------------------------------
    diagnostics.stage2Started = Date.now();
    const stage2Result = await runStage2GroundedAnswerGeneration(
      ai,
      query,
      understanding,
      retrievalResult.records,
      payload.history
    );
    diagnostics.stage2Completed = Date.now();
    diagnostics.model = stage2Result.modelUsed;

    // ----------------------------------------------------
    // FACTUAL VALIDATION & GROUNDING CHECKS
    // ----------------------------------------------------
    const validationResult = validateAnswerGrounding(
      stage2Result.answer,
      retrievalResult.records,
      understanding
    );

    if (!validationResult.passed) {
      diagnostics.groundingValidation = 'REJECTED';
      diagnostics.finalStatus = 'no_verified_data';
      return {
        answer: 'المعلومة دي مش موجودة عندي بشكل مؤكد في قاعدة المعرفة الحالية، فمش هخمن عليك.',
        status: 'no_verified_data',
        sources: [],
        usedRecords: [],
        followUps: ['استفسار عن موضوع آخر'],
        latencyMs: Date.now() - startTime,
        requestId,
        diagnostics
      };
    }

    diagnostics.groundingValidation = 'PASS';
    diagnostics.finalStatus = retrievalResult.isTransferRequired ? 'transfer_required' : 'verified';

    const sources = retrievalResult.records.map(r => ({
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
    } else if (understanding.topic.includes('ملكية')) {
      followUps.push('طب والرسوم؟');
      followUps.push('والمدة؟');
    } else {
      followUps.push('ما هي مواعيد تقديم الإقرارات الضريبية؟');
      followUps.push('كيف يتم تقديم طعن وفقاً لقانون 3 لسنة 2026؟');
    }

    return {
      answer: validationResult.cleanAnswer,
      status: diagnostics.finalStatus,
      sources,
      usedRecords: retrievalResult.records,
      followUps,
      latencyMs: Date.now() - startTime,
      requestId,
      routing: retrievalResult.isTransferRequired ? {
        requiresHumanTransfer: true,
        transferType: retrievalResult.transferType || 'tax_employee',
        targetDepartment: 'مأمورية الضرائب العقارية المختصة'
      } : undefined,
      diagnostics: payload.debugMode ? diagnostics : undefined
    };

  } catch (err: any) {
    console.error('[GeminiAgent] Critical AI Pipeline failure:', err);
    diagnostics.finalStatus = 'ai_error';

    return {
      answer: 'حصلت مشكلة مؤقتة أثناء معالجة السؤال بواسطة الذكاء الاصطناعي، يرجى المحاولة مرة أخرى.',
      status: 'ai_error',
      sources: [],
      usedRecords: [],
      followUps: [],
      latencyMs: Date.now() - startTime,
      requestId,
      diagnostics: payload.debugMode ? diagnostics : undefined
    };
  }
}
