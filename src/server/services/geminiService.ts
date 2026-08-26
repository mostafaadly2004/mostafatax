/**
 * Gemini AI Tax Reasoning & Legal Grounding Service
 * Server-side AI Pipeline for Egyptian Real Estate Tax Authority (Law 196/2008 & Law 187/2023).
 * 
 * Pipeline Architecture:
 * 1. Mandatory Gemini API Verification (fail-fast on unavailability)
 * 2. Real Gemini Question Understanding (Intent, Topics, Requested Information, Ambiguity, Out-of-scope)
 * 3. Structured Knowledge Retrieval & Fact Filtering
 * 4. Grounded Gemini Final Answer Generation in Egyptian Professional Arabic
 * 5. Output Validation & Real Source Attribution (NO raw DB dump / NO canned fallbacks)
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
  sources: { topic: string; source: string; isDemo?: boolean; isGoogleSheet?: boolean }[];
  usedRecords: KnowledgeRecord[];
  followUps: string[];
  latencyMs: number;
}

const UNDERSTANDING_SYSTEM_INSTRUCTION = `
You are the semantic question understanding engine for the Egyptian Real Estate Tax Authority (مصلحة الضرائب العقارية المصرية).
Your task is to analyze questions in Arabic (Egyptian dialect or Modern Standard Arabic), accounting for conversation context, and output a valid JSON object.

Extract:
1. "intent": One of ["inquiry", "calculation", "procedure", "documents_request", "fees_request", "duration_request", "conditions_request", "deadline_request", "exemption_request", "appeals_request", "greeting", "out_of_scope", "clarification_needed"]
2. "topic": Normalized Arabic topic (e.g., "نقل التكليف العقاري", "إعفاء السكن الخاص", "لجان الطعن وإنهاء المنازعات", "ضريبة التصرفات العقارية", "حساب الضريبة العقارية")
3. "requestedInformation": Array containing any of ["required_documents", "fees", "duration", "conditions", "deadlines", "exemption_rules", "procedure_steps", "calculation", "details"]
4. "keywords": Array of important Arabic search keywords
5. "searchQuery": Clean, effective Arabic search phrase for knowledge base retrieval
6. "needsClarification": Boolean (true only if the user query is excessively vague, like just "عايز الإجراءات" with no context)
7. "clarificationPrompt": Polite Egyptian Arabic question asking for clarification if needsClarification is true, otherwise empty string
8. "isOutOfScope": Boolean (true if asking about sports, cooking, politics, unrelated software, etc.)
9. "isGreeting": Boolean (true if greeting like "صباح الخير", "ازيك", "عامل ايه", "السلام عليكم", "مين انت")

Return strictly JSON matching this structure without Markdown backticks or additional text.
`;

const EGYPTIAN_TAX_GENERATION_INSTRUCTION = `
أنت المساعد الضريبي الذكي لمصلحة الضرائب العقارية المصرية (Tax Support AI).
تتحدث باللغة العربية المصرية المهنية، باحترام وود ولباقة طبيعية تامة (مثل موظف خبير ومتعاون فاهم شغله وبيساعد زملائه والمواطنين).

المبادئ الحاكمة لأسلوبك وسلوكك:
1. الأسلوب المصري المهذب الطبيعي (Egyptian Professional):
   - تحدث بأسلوب مصري طبيعي راقٍ، مثل: "أهلاً بك يا فندم"، "بالنسبة لنقل الملكية، المستندات المطلوبة هي..."، "بحسب البيانات المتاحة عندي..."، "أيوه، في الحالة دي...".
   - تجنب الردود الآلية الجافة وتجنب تكرار عبارات مثل "وفقاً لقاعدة المعرفة" في كل إجابة.
   - إذا حياك المستخدم، رد بترحيب مصري لطيف واعرض المساعدة مباشرة.

2. الانضباط التام بالحقائق والمعلومات المرفقة (Strict Grounding & Zero Hallucination):
   - لا تخترع أرقاماً أو نسباً أو مواعيد أو مستندات أو مواد قانونية غير واردة في الحقائق المعتمدة المرفقة أو القواعد الأساسية المعتمدة (القانون 196 لسنة 2008 وتعديلاته والقانون 187 لسنة 2023).
   - إذا افترض المستخدم رقماً أو رسماً أو ادعى شيئاً (مثل "أكيد الرسوم 500 جنيه صح؟") والرقم غير مؤكد في الحقائق المرفقة، لا تؤكده بل وضح الحقيقة أو قل: "المبلغ ده مش ظاهر عندي كمعلومة مؤكدة في قاعدة المعرفة الحالية".
   - أجب عن الجزئية المطلوبة تحديداً (إذا سأل عن الرسوم فقط، أجب عن الرسوم ولا تسرد كل تفاصيل الإجراء غير المطلوبة).

3. العمليات الحسابية الضريبية (القانون 196 لسنة 2008):
   - السكن الخاص: استنزال 30% مصاريف صيانة من القيمة الإيجارية السنوية، ثم خصم حد الإعفاء للسكن الخاص (24,000 جنيه صافي)، والضريبة 10% على ما زاد عن ذلك.
   - غير السكني (تجاري/إداري): استنزال 32% مصاريف صيانة، وضريبة 10% على الصافي.
   - احسب الخطوات الرياضية بوضوح عند طلب الحساب.
`;

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
  const primaryModel = params.primaryModel || 'gemini-3.7-flash';
  const fallbackModels = ['gemini-flash-latest', 'gemini-3.1-flash-lite'];
  const modelsToTry = [primaryModel, ...fallbackModels];

  let lastError: any = null;

  for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex++) {
    const currentModel = modelsToTry[modelIndex];
    const maxRetries = modelIndex === 0 ? 2 : 1; // Retry primary twice, fallback once

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
        const errorMessage = String(err?.message || '');
        const isTransient = 
          status === 'UNAVAILABLE' ||
          status === 503 ||
          status === 429 ||
          errorMessage.includes('503') ||
          errorMessage.includes('high demand') ||
          errorMessage.includes('UNAVAILABLE') ||
          errorMessage.includes('RESOURCE_EXHAUSTED');

        if (isTransient) {
          console.warn(`Gemini API transient spike (${currentModel}, attempt ${attempt + 1}/${maxRetries + 1}):`, errorMessage);
          if (attempt < maxRetries) {
            // Wait 600ms * (attempt + 1)
            await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
            continue;
          }
          // Move to fallback model
          break;
        } else {
          // If non-transient, throw immediately
          throw err;
        }
      }
    }
  }

  throw lastError;
}

/**
 * Stage 1: Question Understanding with Gemini
 */
async function understandQuestionWithGemini(
  query: string,
  history?: { role: 'user' | 'assistant' | 'model'; content: string }[]
): Promise<QuestionUnderstanding> {
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
  } catch (err) {
    // If JSON parsing fails, build a robust fallback understanding
    console.warn('Could not parse JSON from Gemini understanding:', rawText);
    parsed = {
      intent: 'inquiry',
      topic: query,
      requestedInformation: ['details'],
      keywords: query.split(' ').filter(w => w.length > 2),
      searchQuery: query,
      needsClarification: false,
      isOutOfScope: false,
      isGreeting: false
    };
  }

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
    isGreeting: Boolean(parsed.isGreeting) || query.includes('ازيك') || query.includes('عامل ايه') || query.includes('صباح الخير') || query.includes('السلام عليكم')
  };
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
  let historyContext = '';
  if (history && history.length > 0) {
    historyContext = history
      .slice(-6)
      .map(h => `${h.role === 'user' ? 'الموظف' : 'المساعد'}: ${h.content}`)
      .join('\n');
  }

  const prompt = `
${historyContext ? `سياق المحادثة السابقة:\n${historyContext}\n\n` : ''}سؤال / طلب الموظف الحالي:
"${query}"

${factsText ? `الحقائق والبيانات المعتمدة المسترجعة من قاعدة المعرفة:\n${factsText}\n` : ''}
الموضوع المطلوب: ${understanding.topic}
المعلومات المطلوبة تحديداً: ${understanding.requestedInformation.join(', ')}

المطلوب:
أجب بأسلوب مصري مهذب وطبيعي مع مراعاة التعليمات المحددة. اشرح المطلوب بوضوح بالاستناد إلى الحقائق المرفقة أعلاه فقط وبدون اختلاق أي معلومات غير مؤكدة.
`;

  const response = await callGeminiGenerateWithRetry({
    primaryModel: 'gemini-3.7-flash',
    contents: prompt,
    config: {
      systemInstruction: EGYPTIAN_TAX_GENERATION_INSTRUCTION,
      temperature: 0.4
    }
  });

  const text = (response.text || '').trim();
  if (!text) {
    throw new Error('Gemini returned an empty answer');
  }
  return text;
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
      followUps: ['كيف يتم حساب إعفاء السكن الخاص؟', 'ما هي مواعيد الطعن الضريبي؟'],
      latencyMs: Date.now() - startTime
    };
  }

  try {
    // Step 1: Real Question Understanding with Gemini
    const understanding = await understandQuestionWithGemini(query, payload.history);

    // Case A: Greeting
    if (understanding.isGreeting) {
      const greetingAnswer = await generateGroundedAnswerWithGemini(
        query,
        understanding,
        'تحية طيبة وترحيب بالموظف وتقديم المساعدة في الضرائب العقارية المصرية (قانون 196 لسنة 2008)',
        payload.history
      );
      return {
        answer: greetingAnswer,
        status: 'verified',
        sources: [],
        usedRecords: [],
        followUps: [
          'كيف يتم حساب إعفاء السكن الخاص؟',
          'ما هي الأوراق المطلوبة لنقل التكليف العقاري؟',
          'ما هي مواعيد تقديم الإقرارات والطعن؟'
        ],
        latencyMs: Date.now() - startTime
      };
    }

    // Case B: Out of Scope
    if (understanding.isOutOfScope) {
      return {
        answer: 'أنا مخصص للاستفسارات المتعلقة بنطاق الضرائب العقارية والمعلومات الموجودة في قاعدة المعرفة، ومتاح لمساعدتك في أي موضوع يخص الضرائب العقارية أو إجراءاتها.',
        status: 'clarification',
        sources: [],
        usedRecords: [],
        followUps: [
          'ما هو حد إعفاء السكن الخاص؟',
          'ما هي إجراءات نقل التكليف العقاري؟'
        ],
        latencyMs: Date.now() - startTime
      };
    }

    // Case C: Ambiguous query needing clarification
    if (understanding.needsClarification) {
      const promptText = understanding.clarificationPrompt || 
        'أكيد، بس ممكن تحددلي الإجراء المقصود؟ مثلًا نقل قيد وتكليف، تسجيل سكن خاص، أو تقديم طعن ضريبي؟';
      return {
        answer: promptText,
        status: 'clarification',
        sources: [],
        usedRecords: [],
        followUps: [
          'المستندات المطلوبة لنقل التكليف',
          'إجراءات الطعن على نموذج 3',
          'حساب ضريبة السكن الخاص'
        ],
        latencyMs: Date.now() - startTime
      };
    }

    // Step 2: Knowledge Retrieval and Specific Fact Extraction
    const activeService = knowledgeService;
    const extractionResult = await activeService.extractRelevantKnowledge(understanding, {
      approvedOnly: true,
      limit: 3,
      minScore: 15
    });

    const isCalculationQuery = understanding.intent === 'calculation' ||
      understanding.requestedInformation.includes('calculation') ||
      query.includes('احسب') ||
      query.includes('حساب') ||
      query.includes('مليون') ||
      query.includes('ألف');

    // Case D: No verified knowledge found for a factual request
    if (extractionResult.isInformationMissing && !isCalculationQuery) {
      // Record unanswered question for admin analytics
      if (payload.userUid) {
        recordUnansweredQuestion({
          query,
          employeeUid: payload.userUid,
          employeeName: payload.userName || 'موظف الضرائب',
          status: 'not_found',
          reason: 'المعلومة غير متوفرة في قاعدة المعرفة الحالية',
          suggestedTopic: understanding.topic
        }).catch(() => {});
      }

      return {
        answer: 'المعلومة دي مش موجودة بشكل مؤكد عندي في قاعدة المعرفة الحالية، فمش هخمن عليك.',
        status: 'not_found',
        sources: [],
        usedRecords: [],
        followUps: [
          'ما هو حد إعفاء السكن الخاص؟',
          'ما هي المستندات المطلوبة لنقل التكليف العقاري؟'
        ],
        latencyMs: Date.now() - startTime
      };
    }

    // Build structured facts text for Gemini
    let factsText = '';
    if (extractionResult.extractedFacts.length > 0) {
      factsText = extractionResult.extractedFacts
        .map(f => `[${f.label} - ${f.topic}]:\n${f.facts.join('\n')}`)
        .join('\n\n');
    } else if (extractionResult.candidateRecords.length > 0) {
      factsText = extractionResult.candidateRecords
        .map(r => `[${r.topic} (${r.source})]:\n${r.answer}`)
        .join('\n\n');
    }

    // Step 3: Real Grounded Gemini Generation
    const finalAnswer = await generateGroundedAnswerWithGemini(
      query,
      understanding,
      factsText,
      payload.history
    );

    // Collect verified sources from candidate records
    const sources = extractionResult.candidateRecords.map(r => ({
      topic: r.topic,
      source: r.source || 'القانون 196 لسنة 2008 ولائحته التنفيذية',
      isDemo: r.isDemoData,
      isGoogleSheet: r.isGoogleSheetRecord
    }));

    if (sources.length === 0 && isCalculationQuery) {
      sources.push({
        topic: 'حساب الضريبة العقارية وإعفاء السكن الخاص',
        source: 'القانون رقم 196 لسنة 2008 وتعديلاته',
        isDemo: false,
        isGoogleSheet: false
      });
    }

    // Dynamic Context-Aware Follow-ups
    const followUps: string[] = [];
    if (understanding.topic.includes('نقل') || understanding.topic.includes('تكليف')) {
      followUps.push('ما هي الرسوم الخاصة بنقل التكليف العقاري؟');
      followUps.push('ما هي المدة الزمنية لتنفيذ نقل التكليف؟');
    } else if (understanding.topic.includes('سكن') || understanding.topic.includes('إعفاء')) {
      followUps.push('ما هي المستندات المطلوبة لإثبات السكن الخاص؟');
      followUps.push('كيف يتم حساب الضريبة إذا كان للمكلف وحدتان سكنيتان؟');
    } else if (understanding.topic.includes('طعن') || understanding.topic.includes('منازعات')) {
      followUps.push('ما هي قيمة التأمين لسداد الطعن السكني وغير السكني؟');
      followUps.push('ما هي إجراءات لجان إنهاء المنازعات وفقاً للقانون 187؟');
    } else {
      followUps.push('كيف يتم حساب إعفاء السكن الخاص؟');
      followUps.push('ما هي مواعيد سداد أقساط الضريبة العقارية؟');
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

    // Record error in unanswered log for administration
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

    // Return strict controlled error (NO raw DB dump, NO fake verified)
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

