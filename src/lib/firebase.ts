/**
 * Firebase Client SDK Initialization
 * Connects the React application to Firebase Authentication & Firestore.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  projectId: firebaseConfigJson.projectId || 'gen-lang-client-0115727745',
  appId: firebaseConfigJson.appId || '1:358019820346:web:d968c9cf6019fe1cd2fe03',
  apiKey: firebaseConfigJson.apiKey || 'AIzaSyC3Zvgb8p7bIb93abR1fkdPdDlUQ9fgAJY',
  authDomain: firebaseConfigJson.authDomain || 'gen-lang-client-0115727745.firebaseapp.com',
  storageBucket: firebaseConfigJson.storageBucket || 'gen-lang-client-0115727745.firebasestorage.app',
  messagingSenderId: firebaseConfigJson.messagingSenderId || '358019820346'
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
