/**
 * Firebase Admin SDK Singleton Initializer
 * Provides authenticated Firestore database and Authentication services for backend routes.
 */

import { initializeApp, getApps, getApp, cert, applicationDefault, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let firebaseConfigJson: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfigJson = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch {
  // Fallback to empty
}

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

export function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const projectId = 
    process.env.FIREBASE_PROJECT_ID || 
    firebaseConfigJson.projectId || 
    'gen-lang-client-0115727745';

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      }),
      projectId
    });
  } else {
    // Application Default Credentials or Project ID fallback
    try {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId
      });
    } catch {
      adminApp = initializeApp({
        projectId
      });
    }
  }

  return adminApp;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    const app = getAdminApp();
    adminAuth = getAuth(app);
  }
  return adminAuth;
}

export function getAdminDb(): Firestore {
  if (!adminDb) {
    const app = getAdminApp();
    adminDb = getFirestore(app);
    adminDb.settings({ ignoreUndefinedProperties: true });
  }
  return adminDb;
}
