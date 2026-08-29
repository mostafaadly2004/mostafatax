import { knowledgeService } from '../src/lib/knowledge/knowledge-service.ts';
import { RAW_USER_DATASET } from '../src/lib/knowledge/raw-user-data.ts';
import { KnowledgeRecord } from '../src/lib/knowledge/types.ts';
import fs from 'fs';
import path from 'path';

function buildStructuredRecords(): KnowledgeRecord[] {
  const text = RAW_USER_DATASET.trim();
  const records: KnowledgeRecord[] = [];

  // Split by items carefully
  // The dataset has questions separated by empty lines or question headers
  // Let's parse item by item cleanly
  const rawSections = text.split(/(?=\n(?:[٠-٩0-9]+\s*-\s*|هل |ما |متى |متي |كيف |أمتلك |امتلك |العقار |عقار |تعتبر |يشترط |في حالة |في حال |العميل يستعلم |استفسار عن |مواعيد العمل|التصرفات العقاريه|قيمة الضريبه العقاريه|عناوين مصلحه الضرائب|للتحويل الي |للدعم الفني|استفسارات غير ضريبي|استفسار ضريبي|حساب قيمه الضريبه|مواعيد عمل الماموريه|الدعم الفني - ))/g);

  let idx = 0;
  for (const section of rawSections) {
    const trimmed = section.trim();
    if (!trimmed || trimmed === 'اسئله و اجوبه') continue;

    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const header = lines[0];
    let question = header;
    let topic = header.replace(/^[٠-٩0-9]+\s*-\s*/, '').replace(/^[💡📋\s]+/, '').replace(/[؟?]$/, '').trim();
    
    // Extract CRM and Data required if present
    let crmCategory = 'استفسارات عن الضرائب العقاريه';
    let crmSubCategory = '';
    let requiredData = '';
    const bodyLines: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('💡') || line.includes('يتم اختيارها علي CRM') || line.includes('يتم التحويل علي')) {
        const match = line.match(/التصنيف الاساسي\s*:\s*([^-\)]+)(?:-\s*التصنيف الفرعي\s*:\s*([^)]+))?/);
        if (match) {
          crmCategory = match[1]?.trim() || crmCategory;
          crmSubCategory = match[2]?.trim() || '';
        } else {
          crmCategory = line.replace(/^[💡\s]+/, '').trim();
        }
      } else if (line.startsWith('البيانات المطلوبه')) {
        const after = line.replace(/^البيانات المطلوبه\s*[:\-]*\s*/, '').trim();
        if (after) {
          requiredData = after;
        } else if (i + 1 < lines.length && !lines[i+1].startsWith('💡')) {
          requiredData = lines[i+1];
          i++;
        }
      } else {
        bodyLines.push(line);
      }
    }

    const answerBody = bodyLines.join('\n').trim();
    if (!answerBody && !topic) continue;

    idx++;
    let finalAnswer = answerBody || topic;
    const additions: string[] = [];
    if (crmCategory || crmSubCategory) {
      additions.push(`💡 تصنيف CRM: (التصنيف الأساسي: ${crmCategory}${crmSubCategory ? ` - التصنيف الفرعي: ${crmSubCategory}` : ''})`);
    }
    if (requiredData) {
      additions.push(`📋 البيانات المطلوبة: ${requiredData}`);
    }
    if (additions.length > 0) {
      finalAnswer = `${finalAnswer}\n\n${additions.join('\n')}`;
    }

    const keywords = [
      ...topic.split(/[\s,،/()]+/).filter(k => k.length > 2),
      crmCategory,
      crmSubCategory
    ].filter(Boolean);

    records.push({
      id: `kb_user_data_${idx}`,
      category: crmCategory,
      topic: topic,
      question: question,
      answer: finalAnswer,
      source: `دليل الاستفسارات المعتمد (سؤال ${idx})`,
      approved: true,
      lastUpdated: '2026-08-29',
      keywords: Array.from(new Set(keywords)),
      sourceType: 'google_sheets',
      spreadsheetId: 'user_provided_qa_dataset',
      spreadsheetTitle: 'قاعدة المعرفة الحصرية لمصلحة الضرائب العقارية',
      sheetName: 'الأسئلة والأجوبة المعتمدة',
      sheetRowIndex: idx + 1,
      rowNumber: idx + 1,
      isGoogleSheetRecord: true
    });
  }

  return records;
}

const records = buildStructuredRecords();
console.log(`Generated ${records.length} clean records.`);
for (let i = 0; i < Math.min(5, records.length); i++) {
  console.log(`Record ${i+1}: Topic="${records[i].topic}", Category="${records[i].category}"`);
}

const snapshotData = {
  spreadsheetId: 'user_provided_qa_dataset',
  spreadsheetTitle: 'قاعدة المعرفة الحصرية لمصلحة الضرائب العقارية',
  sheetName: 'الأسئلة والأجوبة المعتمدة',
  lastSyncedAt: new Date().toISOString(),
  contentHash: `sh_user_clean_${records.length}`,
  version: 1,
  records
};

const SNAPSHOT_FILE = path.join(process.cwd(), 'data', 'sheets-knowledge-snapshot.json');
fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshotData, null, 2), 'utf-8');
console.log(`Updated snapshot file: ${SNAPSHOT_FILE}`);
