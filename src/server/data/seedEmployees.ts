/**
 * Seed Dataset: 35 Official Real Estate Tax Authority Employees
 * Standalone data module safe to import in both client-less server environments,
 * Vercel serverless functions, and local development.
 */

import type { UserProfile } from '../../types.ts';

export interface EmployeeSeedRecord {
  id: number;
  name: string;
  username: string;
  password: string;
}

export const EXACT_35_EMPLOYEES: ReadonlyArray<EmployeeSeedRecord> = [
  { id: 1, name: 'Donia Fouad', username: 'Ext-Donia_Fouad', password: 'Rta@001' },
  { id: 2, name: 'Mahmoud Ibrahim', username: 'Ext-Mahmoud_Ibrahim', password: 'Rta@002' },
  { id: 3, name: 'Nourhan Mbakry', username: 'Ext-Nourhan_Mbakry', password: 'Rta@003' },
  { id: 4, name: 'Khaled Abdallah', username: 'Ext-Khaled_Abdallah', password: 'Rta@004' },
  { id: 5, name: 'Mohamed AhmedY', username: 'Ext-Mohamed_AhmedY', password: 'Rta@005' },
  { id: 6, name: 'Abdelhamid Tarek', username: 'Ext-Abdelhamid_Tarek', password: 'Rta@006' },
  { id: 7, name: 'Elshaimaa Ahmed', username: 'Ext-Elshaimaa_Ahmed', password: 'Rta@007' },
  { id: 8, name: 'Doha Ahmed', username: 'Ext-Doha_Ahmed', password: 'Rta@008' },
  { id: 9, name: 'Gano Amir', username: 'Ext-Gano_Amir', password: 'Rta@009' },
  { id: 10, name: 'Sandy Sameh', username: 'Ext-Sandy_Sameh', password: 'Rta@010' },
  { id: 11, name: 'Youssef Ahmed', username: 'Ext-Youssef_Ahmed', password: 'Rta@011' },
  { id: 12, name: 'Radwa Mahmed', username: 'Ext-Radwa_Mahmed', password: 'Rta@012' },
  { id: 13, name: 'Ahmed MFahmy', username: 'Ext-Ahmed_MFahmy', password: 'Rta@013' },
  { id: 14, name: 'badereldin Ahmed', username: 'Ext-badereldin_Ahmed', password: 'Rta@014' },
  { id: 15, name: 'Moustafa Adly', username: 'Ext-Moustafa_Adly', password: 'Rta@015' },
  { id: 16, name: 'M Ahmed', username: 'Ext-M_Ahmed', password: 'Rta@016' },
  { id: 17, name: 'Mohamed Mtaha', username: 'Ext-Mohamed_Mtaha', password: 'Rta@017' },
  { id: 18, name: 'Ali Khassan', username: 'Ext-Ali_Khassan', password: 'Rta@018' },
  { id: 19, name: 'Fatma Ahmed', username: 'Ext-Fatma_Ahmed', password: 'Rta@019' },
  { id: 20, name: 'Menna Amohamd', username: 'Ext-Menna_Amohamd', password: 'Rta@020' },
  { id: 21, name: 'Kawthar Ehab', username: 'Ext-Kawthar_Ehab', password: 'Rta@021' },
  { id: 22, name: 'Mahmoud Omar', username: 'Ext-Mahmoud_Omar', password: 'Rta@022' },
  { id: 23, name: 'Abdullah Ali', username: 'Ext-Abdullah_Ali', password: 'Rta@023' },
  { id: 24, name: 'Mohamed Elbakry', username: 'Ext-Mohamed_Elbakry', password: 'Rta@024' },
  { id: 25, name: 'Abdlrhmmn Thrw', username: 'Ext-Abdlrhmmn_Thrw', password: 'Rta@025' },
  { id: 26, name: 'Peter Samir', username: 'Ext-Peter_Samir', password: 'Rta@026' },
  { id: 27, name: 'Mostafa Essam', username: 'Ext-Mostafa_Essam', password: 'Rta@027' },
  { id: 28, name: 'Ahmed Saeed', username: 'Ext-Ahmed_Saeed', password: 'Rta@028' },
  { id: 29, name: 'Abdelrhmmn Fathy', username: 'Ext-Abdelrhmmn_Fathy', password: 'Rta@029' },
  { id: 30, name: 'Abdlrhmmn Mohamed', username: 'Ext-Abdlrhmmn_Mohamed', password: 'Rta@030' },
  { id: 31, name: 'Mustafa Sabry', username: 'Ext-Mustafa_Sabry', password: 'Rta@031' },
  { id: 32, name: 'Ahmed Sherif', username: 'Ext-Ahmed_Sherif', password: 'Rta@032' },
  { id: 33, name: 'Mohamed Tohamy', username: 'Ext-Mohamed_Tohamy', password: 'Rta@033' },
  { id: 34, name: 'Menna Khaled', username: 'Ext-Menna_Khaled', password: 'Rta@034' },
  { id: 35, name: 'Malak Mohamed', username: 'Ext-Malak_Mohamed', password: 'Rta@035' }
];

export function getDeterministicUid(username: string): string {
  const sanitized = username.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return `emp_${sanitized}`;
}

export function getEmployeeEmail(username: string): string {
  const sanitized = username.toLowerCase();
  return `${sanitized}@tax.gov.eg`;
}

export function buildSeedEmployeeProfile(rec: EmployeeSeedRecord): UserProfile {
  const uid = getDeterministicUid(rec.username);
  const email = getEmployeeEmail(rec.username);
  return {
    uid,
    username: rec.username,
    displayName: rec.name,
    email,
    provider: 'password',
    role: 'employee',
    department: 'مصلحة الضرائب العقارية - مركز الاتصال والمأموريات',
    jobTitle: 'مأمور فحص وخدمة ممولين',
    status: 'active',
    mustChangePassword: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  };
}

export function getAllSeedProfiles(): UserProfile[] {
  return EXACT_35_EMPLOYEES.map(buildSeedEmployeeProfile);
}

// Fast lookup map by lowercased username or email
export const SEED_EMPLOYEES_BY_IDENTIFIER = new Map<string, EmployeeSeedRecord>();
for (const item of EXACT_35_EMPLOYEES) {
  SEED_EMPLOYEES_BY_IDENTIFIER.set(item.username.toLowerCase(), item);
  SEED_EMPLOYEES_BY_IDENTIFIER.set(getEmployeeEmail(item.username).toLowerCase(), item);
}
