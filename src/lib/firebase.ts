/**
 * Firebase Client SDK Initialization
 * Connects the React application to Firebase Authentication & Firestore.
 * Supports both VITE_ environment variables (Vercel) and firebase-applet-config.json.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};

const projectId =
  metaEnv.VITE_FIREBASE_PROJECT_ID ||
  firebaseConfigJson.projectId ||
  'gen-lang-client-0115727745';

const appId =
  metaEnv.VITE_FIREBASE_APP_ID ||
  firebaseConfigJson.appId ||
  '1:358019820346:web:d968c9cf6019fe1cd2fe03';

const apiKey =
  metaEnv.VITE_FIREBASE_API_KEY ||
  firebaseConfigJson.apiKey ||
  'AIzaSyC3Zvgb8p7bIb93abR1fkdPdDlUQ9fgAJY';

const authDomain =
  metaEnv.VITE_FIREBASE_AUTH_DOMAIN ||
  firebaseConfigJson.authDomain ||
  'gen-lang-client-0115727745.firebaseapp.com';

const storageBucket =
  metaEnv.VITE_FIREBASE_STORAGE_BUCKET ||
  firebaseConfigJson.storageBucket ||
  'gen-lang-client-0115727745.firebasestorage.app';

const messagingSenderId =
  metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID ||
  firebaseConfigJson.messagingSenderId ||
  '358019820346';

export const firebaseConfig = {
  projectId,
  appId,
  apiKey,
  authDomain,
  storageBucket,
  messagingSenderId
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

