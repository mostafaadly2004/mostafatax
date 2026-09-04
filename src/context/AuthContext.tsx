/**
 * Authentication & Role Management Context
 * Backed by Firebase Client Authentication and Firestore User Profiles.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithCustomToken,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../lib/firebase.ts';
import { UserProfile, UserRole } from '../types.ts';
import { apiFetch } from '../lib/api-client.ts';
import { 
  authenticateLocally, 
  changePasswordLocally, 
  initLocalAuthStore 
} from '../services/localAuthService.ts';

interface AuthContextType {
  userProfile: UserProfile | null;
  userRole: UserRole;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to resolve email from username or direct email
function resolveEmail(identifier: string): string {
  const raw = identifier.trim();
  const trimmed = raw.toLowerCase();
  const norm = trimmed
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ');

  if (trimmed.includes('@')) {
    return trimmed;
  }
  if (
    trimmed === 'mostafa' ||
    trimmed === 'moustafa' ||
    norm === 'مصطفي' ||
    norm === 'مصطفي عدلي' ||
    trimmed === 'admin' ||
    trimmed === 'usr_mostafa'
  ) {
    return 'aaddmostafa99@gmail.com';
  }
  if (trimmed === 'reta') {
    return 'reta@tax.gov.eg';
  }
  return `${trimmed}@tax.gov.eg`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('tax_auth_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize local auth store on mount
  useEffect(() => {
    try {
      initLocalAuthStore();
    } catch (e) {
      console.warn('[Auth] Init local store notice:', e);
    }
    
    // Check if we already have a locally stored profile
    const saved = localStorage.getItem('tax_auth_profile');
    if (saved) {
      try {
        setUserProfile(JSON.parse(saved));
      } catch {}
    }
    setIsLoading(false);

    // Optional background Firebase auth observer
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: FirebaseUser | null) => {
      if (currentUser && !localStorage.getItem('tax_auth_profile')) {
        try {
          const { data, ok } = await apiFetch<{ userProfile: UserProfile }>('/api/auth/me');
          if (ok && data?.userProfile) {
            setUserProfile(data.userProfile);
            localStorage.setItem('tax_auth_profile', JSON.stringify(data.userProfile));
          }
        } catch {}
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    const cleanPass = password.trim();

    // 1. First: Authenticate locally inside the website (100% self-contained, no network lag)
    const localAuthResult = authenticateLocally(identifier, cleanPass);
    if (localAuthResult.success && localAuthResult.userProfile) {
      const activeUser = localAuthResult.userProfile;
      setUserProfile(activeUser);
      try {
        localStorage.setItem('tax_auth_profile', JSON.stringify(activeUser));
      } catch {}

      // Optional background sync with server without blocking user
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: cleanPass })
      }).catch(() => {});

      setIsLoading(false);
      return true;
    }

    if (localAuthResult.error && localAuthResult.error.includes('تعطيل أو تعليق')) {
      setError(localAuthResult.error);
      setIsLoading(false);
      return false;
    }

    // 2. Second: Fallback to server endpoint if present
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: cleanPass })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data?.userProfile) {
        setUserProfile(data.userProfile);
        try {
          localStorage.setItem('tax_auth_profile', JSON.stringify(data.userProfile));
        } catch {}
        setIsLoading(false);
        return true;
      }

      if (data?.error) {
        setError(data.error);
        setIsLoading(false);
        return false;
      }

      setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      setIsLoading(false);
      return false;
    } catch (netErr) {
      console.warn('Network auth fallback warning:', netErr);
      setError(localAuthResult.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      setIsLoading(false);
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Call server to provision/sync user profile in Firestore
      try {
        const idToken = await user.getIdToken().catch(() => '');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const syncRes = await fetch('/api/auth/google-sync', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || ''
          })
        });

        const data = await syncRes.json().catch(() => null);

        if (syncRes.ok && data?.success && data?.userProfile) {
          const verifiedProfile: UserProfile = data.userProfile;
          setUserProfile(verifiedProfile);
          localStorage.setItem('tax_auth_profile', JSON.stringify(verifiedProfile));
          setIsLoading(false);
          return true;
        } else if (data?.code === 'ACCOUNT_INACTIVE') {
          await firebaseSignOut(auth).catch(() => {});
          localStorage.removeItem('tax_auth_profile');
          setUserProfile(null);
          setError(data.error || 'تم تعليق أو تعطيل هذا الحساب.');
          setIsLoading(false);
          return false;
        }
      } catch (syncErr) {
        console.warn('Backend sync warning, proceeding with client auth profile:', syncErr);
      }

      // Safe resilient fallback directly from authenticated Firebase Google User
      const isGoogleAdmin = (user.email && user.email.toLowerCase() === 'aaddmostafa99@gmail.com');
      const fallbackGoogleProfile: UserProfile = {
        uid: user.uid,
        username: user.email ? user.email.split('@')[0] : 'user',
        displayName: user.displayName || user.email || 'موظف مصلحة الضرائب',
        email: user.email || '',
        photoURL: user.photoURL || '',
        provider: 'google',
        role: isGoogleAdmin ? 'admin' : 'employee',
        department: isGoogleAdmin ? 'مصلحة الضرائب العقارية - المركز الرئيسي' : 'مصلحة الضرائب العقارية',
        jobTitle: isGoogleAdmin ? 'مشرف نظام (System Administrator)' : 'Agent دعم واستشارات ضريبية',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      setUserProfile(fallbackGoogleProfile);
      localStorage.setItem('tax_auth_profile', JSON.stringify(fallbackGoogleProfile));

      setIsLoading(false);
      return true;
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('خطأ النطاق غير مصرح به (auth/unauthorized-domain): يجب إضافة دومين mostafatax.vercel.app إلى Authorized Domains في Firebase Console.');
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setError('تم إغلاق نافذة تسجيل الدخول بواسطة جوجل.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('تم حظر النافذة المنبثقة من قِبل المتصفح. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('تسجيل الدخول عبر Google غير مفعّل في Firebase Console. يرجى تفعيل موفر خدمة Google في Authentication > Sign-in method.');
      } else {
        setError(err.message || 'فشل تسجيل الدخول بواسطة حساب Google');
      }
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('tax_auth_profile');
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Signout error:', e);
    }
    setUserProfile(null);
  };

  const refreshProfile = async () => {
    if (!auth.currentUser) return;
    try {
      const { data, ok } = await apiFetch<{ userProfile: UserProfile }>('/api/auth/me');
      if (ok && data?.userProfile) {
        setUserProfile(data.userProfile);
      }
    } catch (err) {
      console.warn('Error refreshing profile:', err);
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userProfile?.uid) {
      return { success: false, error: 'لم يتم العثور على جلسة المستخدم الحالية' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'كلمتا المرور الجديدتان غير متطابقتين' };
    }

    // 1. Change password immediately in local storage (guarantees offline & Vercel reliability)
    const localChange = changePasswordLocally(userProfile.uid, currentPassword, newPassword);
    if (!localChange.success) {
      return { success: false, error: localChange.error || 'فشل تغيير كلمة المرور' };
    }

    if (localChange.userProfile) {
      setUserProfile(localChange.userProfile);
    }

    // 2. Synchronize with server in background if reachable
    try {
      await apiFetch<{
        success: boolean;
        userProfile?: UserProfile;
      }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword, uid: userProfile.uid })
      });
    } catch (syncErr) {
      console.warn('[Auth] Server sync optional notice:', syncErr);
    }

    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        userProfile,
        userRole: userProfile?.role || 'employee',
        isAuthenticated: !!userProfile,
        isAdmin: userProfile?.role === 'admin',
        isLoading,
        error,
        login,
        loginWithGoogle,
        logout,
        refreshProfile,
        changePassword,
        clearError: () => setError(null)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
