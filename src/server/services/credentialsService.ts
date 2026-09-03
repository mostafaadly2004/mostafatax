/**
 * Server-Side Authentication Credentials Service
 * Manages secure password hashing and verification using Node.js crypto (scrypt).
 * Passwords are NEVER stored in plaintext.
 * Passwords are NEVER sent to client, logged, or placed in Firestore.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'credentials.json');

// Memory cache of credentials (uid -> passwordHash)
const credentialCache = new Map<string, string>();
let credentialsLoaded = false;

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
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
    console.error('[CredentialsService] Failed to load credentials file:', err);
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
    console.error('[CredentialsService] Failed to persist credentials file:', err);
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
 */
export function verifyUserPassword(uid: string, passwordAttempt: string): boolean {
  loadCredentials();
  const storedHash = credentialCache.get(uid);
  if (!storedHash) return false;
  return verifyPassword(passwordAttempt, storedHash);
}

/**
 * Checks if a user has a stored credential.
 */
export function hasUserCredential(uid: string): boolean {
  loadCredentials();
  return credentialCache.has(uid);
}
