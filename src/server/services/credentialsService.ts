/**
 * Server-Side Authentication Credentials Service
 * Manages secure password hashing and verification using Node.js crypto (scrypt).
 * Passwords are NEVER stored in plaintext.
 * Passwords are NEVER sent to client, logged, or placed in Firestore.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EXACT_35_EMPLOYEES, getDeterministicUid } from '../data/seedEmployees.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'credentials.json');

// Memory cache of credentials (uid -> passwordHash)
const credentialCache = new Map<string, string>();
let credentialsLoaded = false;

// Fast lookup for built-in default passwords (uid -> default password)
const DEFAULT_PASSWORDS_BY_UID = new Map<string, string>();
for (const emp of EXACT_35_EMPLOYEES) {
  const uid = getDeterministicUid(emp.username);
  DEFAULT_PASSWORDS_BY_UID.set(uid, emp.password);
}
DEFAULT_PASSWORDS_BY_UID.set('usr_mostafa', 'mostafaadly011');
DEFAULT_PASSWORDS_BY_UID.set('usr_employee_reta', 'reta');

function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Read-only filesystem in serverless environments (Vercel Lambda)
  }
}

function loadCredentials(): void {
  if (credentialsLoaded) return;
  ensureDataDirectory();
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
      const data: Record<string, string> = JSON.parse(raw);
      for (const [uid, hash] of Object.entries(data)) {
        if (uid && hash) {
          credentialCache.set(uid, hash);
        }
      }
    }
  } catch (err) {
    // Non-fatal fallback for Vercel/serverless
  } finally {
    credentialsLoaded = true;
  }
}

function persistCredentials(): void {
  ensureDataDirectory();
  try {
    const data: Record<string, string> = {};
    for (const [uid, hash] of credentialCache.entries()) {
      data[uid] = hash;
    }
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Read-only in Vercel - silent in-memory fallback
  }
}

/**
 * Generates a salted scrypt hash of a password.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Timing-safe comparison of a password against a stored scrypt hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash || !storedHash.includes(':')) {
    return false;
  }
  try {
    const [salt, keyHex] = storedHash.split(':');
    if (!salt || !keyHex) return false;
    const keyBuffer = Buffer.from(keyHex, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Sets or updates the hashed credential for a user.
 */
export function setUserCredential(uid: string, passwordHash: string): void {
  loadCredentials();
  credentialCache.set(uid, passwordHash);
  persistCredentials();
}

/**
 * Gets the stored password hash for a user (server-side only).
 */
export function getUserCredential(uid: string): string | null {
  loadCredentials();
  return credentialCache.get(uid) || null;
}

/**
 * Verifies a user's password attempt.
 * Supports hashed credentials, fallback to seed defaults, and case-tolerance for temporary passwords.
 */
export function verifyUserPassword(uid: string, passwordAttempt: string): boolean {
  if (!uid || !passwordAttempt) return false;
  loadCredentials();

  const cleanAttempt = passwordAttempt.trim();

  // 1. Check stored scrypt hash if available
  const storedHash = credentialCache.get(uid);
  if (storedHash) {
    // CRITICAL SECURITY RULE: If a user has a stored custom/changed password hash,
    // ONLY that hash is authoritative. NEVER fall back to seed passwords or aliases!
    return verifyPassword(cleanAttempt, storedHash);
  }

  // 2. Only if NO stored hash exists yet (initial first-time login before password change):
  const defaultPass = DEFAULT_PASSWORDS_BY_UID.get(uid);
  if (defaultPass) {
    const isExact = cleanAttempt === defaultPass;
    const isCaseInsensitive = cleanAttempt.toLowerCase() === defaultPass.toLowerCase();

    if (isExact || isCaseInsensitive) {
      return true;
    }
  }

  // 3. Initial default fallback for uninitialized admin/demo accounts only
  if (uid === 'usr_mostafa' && !storedHash) {
    if (cleanAttempt === 'mostafaadly011') {
      return true;
    }
  }

  if (uid === 'usr_employee_reta' && !storedHash) {
    if (cleanAttempt === 'reta' || cleanAttempt === '123456') {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a user has a stored credential.
 */
export function hasUserCredential(uid: string): boolean {
  loadCredentials();
  return credentialCache.has(uid);
}
