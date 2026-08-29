/**
 * Google Sheets API & Google Workspace OAuth Client Integration
 * Handles Google Identity Services (GIS) token flows, Google Drive listing,
 * creating new official spreadsheets, and 2-way data synchronization.
 */

import firebaseConfig from '../../firebase-applet-config.json';
import { KnowledgeRecord } from './knowledge/types.ts';
import { GoogleDriveFile, GoogleSheetConfig } from '../types.ts';

// Standard Google Sheets Columns in order
export const SHEET_COLUMNS = [
  'ID (معرف السجل)',
  'Category (التصنيف)',
  'Topic (الموضوع)',
  'Question (السؤال الشائع)',
  'Answer (الإجابة المعتمدة والمستندات)',
  'Source (السند القانوني والمصدر)',
  'Approved (معتمد)',
  'LastUpdated (تاريخ التحديث)',
  'Keywords (الكلمات المفتاحية)'
];

const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
].join(' ');

export interface GoogleAuthTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

export function getCachedToken(): string | null {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }
  const stored = localStorage.getItem('tax_support_sheets_token');
  const exp = localStorage.getItem('tax_support_sheets_token_exp');
  if (stored && exp && Date.now() < Number(exp) - 60000) {
    cachedAccessToken = stored;
    tokenExpiresAt = Number(exp);
    return stored;
  }
  return null;
}

export function saveCachedToken(token: string, expiresInSeconds: number = 3600) {
  cachedAccessToken = token;
  tokenExpiresAt = Date.now() + (expiresInSeconds * 1000);
  localStorage.setItem('tax_support_sheets_token', token);
  localStorage.setItem('tax_support_sheets_token_exp', String(tokenExpiresAt));
}

export function clearCachedToken() {
  cachedAccessToken = null;
  tokenExpiresAt = 0;
  localStorage.removeItem('tax_support_sheets_token');
  localStorage.removeItem('tax_support_sheets_token_exp');
}

/**
 * Initiates Google OAuth Token flow using Google Identity Services (GIS)
 */
export async function requestGoogleAccessToken(): Promise<string> {
  const current = getCachedToken();
  if (current) return current;

  return new Promise((resolve, reject) => {
    // Check if google GIS is loaded
    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services script is still loading. Please try again.'));
    }

    const clientId = (firebaseConfig as any).oAuthClientId;
    if (!clientId) {
      return reject(new Error('OAuth Client ID is not configured in firebase-applet-config.json.'));
    }

    try {
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: OAUTH_SCOPES,
        callback: (response: GoogleAuthTokenResponse) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (response.access_token) {
            saveCachedToken(response.access_token, response.expires_in || 3600);
            resolve(response.access_token);
          } else {
            reject(new Error('No access token returned from Google authentication.'));
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      reject(new Error('Failed to initialize Google OAuth token client: ' + err.message));
    }
  });
}

/**
 * List existing Google Spreadsheets in user's Drive
 */
export async function listUserSpreadsheets(accessToken: string): Promise<GoogleDriveFile[]> {
  try {
    const q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=30`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        }
      }
    );

    if (!res.ok) {
      if (res.status === 401) {
        clearCachedToken();
        throw new Error('Google authorization expired. Please reconnect.');
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Google Drive API error (${res.status})`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err: any) {
    console.error('Error fetching Google Spreadsheets:', err);
    throw err;
  }
}

/**
 * Creates a brand new Google Spreadsheet with custom Tax Knowledge formatting and default records
 */
export async function createTaxKnowledgeSpreadsheet(
  accessToken: string,
  title: string = 'قاعدة معرفة الضرائب العقارية - Tax Support AI',
  initialRecords: KnowledgeRecord[] = []
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; rowCount: number }> {
  try {
    // 1. Create Spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title,
          locale: 'ar_EG',
          autoRecalc: 'ON_CHANGE',
          timeZone: 'Africa/Cairo'
        },
        sheets: [
          {
            properties: {
              title: 'قاعدة المعرفة',
              rightToLeft: true,
              gridProperties: {
                frozenRowCount: 1
              }
            }
          }
        ]
      })
    });

    if (!createRes.ok) {
      if (createRes.status === 401) clearCachedToken();
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to create Google Spreadsheet');
    }

    const createdData = await createRes.json();
    const spreadsheetId = createdData.spreadsheetId;
    const spreadsheetUrl = createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // 2. Populate Header & Initial Records
    const rows: (string | boolean | number)[][] = [
      SHEET_COLUMNS
    ];

    initialRecords.forEach(r => {
      rows.push([
        r.id,
        r.category,
        r.topic,
        r.question,
        r.answer,
        r.source,
        r.approved ? 'نعم' : 'لا',
        r.lastUpdated,
        r.keywords.join(', ')
      ]);
    });

    const sheetName = 'قاعدة المعرفة';
    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:I${rows.length}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `${sheetName}!A1:I${rows.length}`,
          majorDimension: 'ROWS',
          values: rows
        })
      }
    );

    if (!writeRes.ok) {
      console.warn('Populating initial rows warning:', await writeRes.text());
    }

    return {
      spreadsheetId,
      spreadsheetUrl,
      rowCount: initialRecords.length
    };
  } catch (err: any) {
    console.error('Failed to create tax knowledge spreadsheet:', err);
    throw err;
  }
}

/**
 * Reads all knowledge records from a connected Google Spreadsheet
 */
export async function readRecordsFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  range: string = 'A1:I500'
): Promise<{ records: KnowledgeRecord[]; sheetTitle: string; sheetName: string }> {
  try {
    // 1. Get Spreadsheet Metadata to find first sheet title
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (!metaRes.ok) {
      if (metaRes.status === 401) clearCachedToken();
      const err = await metaRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to access Google Spreadsheet');
    }

    const meta = await metaRes.json();
    const sheetTitle = meta.properties?.title || 'جداول الضرائب العقارية';
    const firstSheetName = meta.sheets?.[0]?.properties?.title || 'Sheet1';

    // 2. Fetch Values
    const fullRange = `${firstSheetName}!A1:I500`;
    const valRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(fullRange)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        }
      }
    );

    if (!valRes.ok) {
      const err = await valRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to read sheet data');
    }

    const valData = await valRes.json();
    const rows = valData.values || [];

    if (rows.length <= 1) {
      return { records: [], sheetTitle, sheetName: firstSheetName };
    }

    // Parse data rows (ignoring header at row 0)
    const records: KnowledgeRecord[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[1] && !row[2] && !row[3]) continue;

      const rawId = (row[0] || `kb-sheet-${i}`).toString().trim();
      const category = (row[1] || 'عام').toString().trim();
      const topic = (row[2] || row[3] || 'موضوع بدون عنوان').toString().trim();
      const question = (row[3] || topic).toString().trim();
      const answer = (row[4] || '').toString().trim();
      const source = (row[5] || 'Google Sheets - قاعدة المعرفة المشتركة').toString().trim();
      
      const rawApproved = (row[6] || '').toString().trim().toLowerCase();
      const approved = rawApproved === 'نعم' || rawApproved === 'true' || rawApproved === '1' || rawApproved === 'معتمد' || rawApproved === 'yes';

      const lastUpdated = (row[7] || new Date().toISOString().split('T')[0]).toString().trim();
      
      const rawKeywords = row[8] || '';
      const keywords: string[] = typeof rawKeywords === 'string'
        ? rawKeywords.split(/[,،]+/).map((k: string) => k.trim()).filter(Boolean)
        : [];

      records.push({
        id: rawId,
        category,
        topic,
        question,
        answer,
        source,
        approved,
        lastUpdated,
        keywords: keywords.length > 0 ? keywords : [topic, category],
        sourceType: 'google_sheets',
        spreadsheetId,
        spreadsheetTitle: sheetTitle,
        sheetName: firstSheetName,
        isGoogleSheetRecord: true,
        sheetRowIndex: i + 1,
        rowNumber: i + 1
      });
    }

    return { records, sheetTitle, sheetName: firstSheetName };
  } catch (err: any) {
    console.error('Error reading records from Google Sheet:', err);
    throw err;
  }
}

/**
 * Pushes/Writes updated Knowledge Records into a connected Google Spreadsheet
 */
export async function writeRecordsToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  records: KnowledgeRecord[],
  sheetName: string = 'قاعدة المعرفة'
): Promise<boolean> {
  try {
    const rows: (string | boolean | number)[][] = [
      SHEET_COLUMNS
    ];

    records.forEach(r => {
      rows.push([
        r.id,
        r.category,
        r.topic,
        r.question,
        r.answer,
        r.source,
        r.approved ? 'نعم' : 'لا',
        r.lastUpdated || new Date().toISOString().split('T')[0],
        r.keywords.join(', ')
      ]);
    });

    const range = `${sheetName}!A1:I${Math.max(rows.length, 100)}`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range,
          majorDimension: 'ROWS',
          values: rows
        })
      }
    );

    if (!res.ok) {
      if (res.status === 401) clearCachedToken();
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to update Google Sheet values');
    }

    return true;
  } catch (err: any) {
    console.error('Error writing records to Google Sheet:', err);
    throw err;
  }
}

/**
 * Appends a single record to the bottom of the Google Sheet
 */
export async function appendRecordToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  record: KnowledgeRecord,
  sheetName: string = 'قاعدة المعرفة'
): Promise<boolean> {
  try {
    const row = [
      record.id,
      record.category,
      record.topic,
      record.question,
      record.answer,
      record.source,
      record.approved ? 'نعم' : 'لا',
      record.lastUpdated || new Date().toISOString().split('T')[0],
      record.keywords.join(', ')
    ];

    const range = `${sheetName}!A:I`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range,
          majorDimension: 'ROWS',
          values: [row]
        })
      }
    );

    return res.ok;
  } catch (err) {
    console.error('Error appending row to Google Sheet:', err);
    return false;
  }
}
