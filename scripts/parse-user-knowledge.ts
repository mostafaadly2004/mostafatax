import fs from 'fs';
import path from 'path';
import { RAW_USER_DATASET } from '../src/lib/knowledge/raw-user-data.ts';
import { KnowledgeRecord } from '../src/lib/knowledge/types.ts';

// Parser script to turn RAW_USER_DATASET into structured KnowledgeRecords
function parseUserData(): KnowledgeRecord[] {
  const text = RAW_USER_DATASET;
  const records: KnowledgeRecord[] = [];

  // Split by items (e.g. number followed by " - " or question mark lines)
  // Let's inspect the sections in RAW_USER_DATASET
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let currentTopic = '';
  let currentQuestion = '';
  let answerLines: string[] = [];
  let crmCategory = '';
  let crmSubCategory = '';
  let requiredData = '';
  let itemIndex = 0;

  function pushRecord() {
    if (!currentQuestion && !currentTopic && answerLines.length === 0) return;

    itemIndex++;
    const fullAnswer = answerLines.join('\n').trim();
    let finalAnswer = fullAnswer;
    
    // Add CRM and required data to answer or metadata if present
    const metadataAdditions: string[] = [];
    if (crmCategory || crmSubCategory) {
      metadataAdditions.push(`💡 تصنيف CRM: (التصنيف الأساسي: ${crmCategory || 'استفسارات عن الضرائب العقارية'}${crmSubCategory ? ` - التصنيف الفرعي: ${crmSubCategory}` : ''})`);
    }
    if (requiredData) {
      metadataAdditions.push(`📋 البيانات المطلوبة: ${requiredData}`);
    }

    if (metadataAdditions.length > 0) {
      finalAnswer = `${fullAnswer}\n\n${metadataAdditions.join('\n')}`;
    }

    const topicTitle = currentQuestion.replace(/^[٠-٩0-9\s\-]+/, '').replace(/^في حالة استفسار العميل /, '').replace(/^في حال استفسار العميل /, '').replace(/^العميل يستعلم عن /, '').trim() || currentTopic || `استفسار ضريبي ${itemIndex}`;

    // Extract keywords from topic, question, and categories
    const keywordsSet = new Set<string>();
    topicTitle.split(/[\s,،/()]+/).forEach(k => {
      if (k.length > 2) keywordsSet.add(k);
    });
    if (crmCategory) keywordsSet.add(crmCategory);
    if (crmSubCategory) keywordsSet.add(crmSubCategory);

    const record: KnowledgeRecord = {
      id: `kb_user_data_${itemIndex}`,
      category: crmCategory || 'استفسارات عن الضرائب العقاريه',
      topic: topicTitle,
      question: currentQuestion || topicTitle,
      answer: finalAnswer,
      source: `دليل استفسارات وخدمات مصلحة الضرائب العقارية (بند ${itemIndex})`,
      approved: true,
      lastUpdated: '2026-08-29',
      keywords: Array.from(keywordsSet),
      sourceType: 'google_sheets',
      spreadsheetId: 'user_provided_qa_dataset',
      spreadsheetTitle: 'قاعدة المعرفة الرسمية المعتمدة - الضرائب العقارية',
      sheetName: 'دليل خدمة العملاء',
      sheetRowIndex: itemIndex + 1,
      rowNumber: itemIndex + 1,
      isGoogleSheetRecord: true
    };

    records.push(record);

    // Reset
    currentTopic = '';
    currentQuestion = '';
    answerLines = [];
    crmCategory = '';
    crmSubCategory = '';
    requiredData = '';
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line === 'اسئله و اجوبه') continue;

    // Check if line is a question header like:
    // "١ - في حالة استفسار العميل..." or "هل الضريبة على العقارات المبنية..." or "ما هو سعر الضريبة؟"
    const isNumberedQuestion = /^[٠-٩0-9]+\s*-\s*/.test(line);
    const isQuestionMarkHeader = (line.endsWith('؟') || line.endsWith('?')) && !line.startsWith('💡') && !line.startsWith('البيانات المطلوبه');
    const isKnownStandaloneHeader = [
      'استفسار عن الموقع الالكتروني',
      'استفسار عن الموبيل ابلكشن',
      'مواعيد العمل',
      'التصرفات العقاريه / ايرادات ثروة عقاريه / حجز علي الحساب البنكي',
      'قيمة الضريبه العقاريه',
      'عناوين مصلحه الضرائب',
      'للتحويل الي موظف الضرائب العقارية',
      'للدعم الفني',
      'استفسارات غير ضريبي',
      'استفسار ضريبي (تحويل)',
      'حساب قيمه الضريبه (تحويل)',
      'مواعيد عمل الماموريه (تحويل)',
      'الدعم الفني - عدم استلام رساله كود التاكيد',
      'الدعم الفني - عدم استلام البريد الالكتروني',
      'الدعم الفني - خطا عند تقديم الاقرار',
      'الدعم الفني - خانه غير مفعله',
      'الدعم الفني - سداد الالكتروني',
      'الدعم الفني - عدم ايجاد العنوان علي الخريطه',
      'الدعم الفني - متابعه شكوي دعم فني'
    ].includes(line);

    if (isNumberedQuestion || (isQuestionMarkHeader && answerLines.length > 0) || isKnownStandaloneHeader) {
      // If we already have a record accumulating, push it
      if (currentQuestion || answerLines.length > 0) {
        pushRecord();
      }

      if (isKnownStandaloneHeader) {
        currentTopic = line;
        currentQuestion = line;
      } else {
        currentQuestion = line;
        currentTopic = line.replace(/^[٠-٩0-9]+\s*-\s*/, '').replace(/[؟?]$/, '').trim();
      }
      continue;
    }

    // Check CRM line
    if (line.includes('💡') || line.includes('يتم اختيارها علي CRM') || line.includes('يتم التحويل علي')) {
      const match = line.match(/التصنيف الاساسي\s*:\s*([^-\)]+)(?:-\s*التصنيف الفرعي\s*:\s*([^)]+))?/);
      if (match) {
        crmCategory = match[1]?.trim() || '';
        crmSubCategory = match[2]?.trim() || '';
      } else {
        crmCategory = line.replace(/^[💡\s]+/, '').trim();
      }
      continue;
    }

    // Check required data line
    if (line.startsWith('البيانات المطلوبه')) {
      // Look at current line or next line
      const after = line.replace(/^البيانات المطلوبه\s*[:\-]*\s*/, '').trim();
      if (after) {
        requiredData = after;
      } else if (i + 1 < lines.length && !lines[i+1].startsWith('💡') && !/^[٠-٩0-9]+\s*-/.test(lines[i+1])) {
        requiredData = lines[i+1];
        i++;
      }
      continue;
    }

    // Otherwise it's part of the answer
    answerLines.push(line);
  }

  // Push final record
  pushRecord();

  return records;
}

const records = parseUserData();
console.log(`Parsed ${records.length} records from user dataset.`);

const snapshotData = {
  spreadsheetId: 'user_provided_qa_dataset',
  spreadsheetTitle: 'قاعدة المعرفة الرسمية المعتمدة - الضرائب العقارية',
  sheetName: 'دليل خدمة العملاء',
  lastSyncedAt: new Date().toISOString(),
  contentHash: `sh_user_data_${records.length}`,
  version: 1,
  records
};

const SNAPSHOT_FILE = path.join(process.cwd(), 'data', 'sheets-knowledge-snapshot.json');
fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshotData, null, 2), 'utf-8');
console.log(`Saved snapshot to ${SNAPSHOT_FILE}`);
