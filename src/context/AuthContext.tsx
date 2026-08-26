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
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../lib/firebase.ts';
import { UserProfile, UserRole } from '../types.ts';
import { apiFetch } from '../lib/api-client.ts';

interface AuthContextType {
  userProfile: UserProfile | null;
  userRole: UserRole;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to resolve email from username or direct email
function resolveEmail(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  if (trimmed === 'mostafa' || trimmed === 'admin') {
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

  // Sync profile when Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: FirebaseUser | null) => {
      if (currentUser) {
        try {
          const { data, ok } = await apiFetch<{ userProfile: UserProfile }>('/api/auth/me');
          if (ok && data?.userProfile) {
            setUserProfile(data.userProfile);
            localStorage.setItem('tax_auth_profile', JSON.stringify(data.userProfile));
          } else if (!userProfile) {
            const isAdmin = currentUser.email === 'aaddmostafa99@gmail.com';
            const fallbackProf: UserProfile = {
              uid: currentUser.uid,
              username: isAdmin ? 'mostafa' : (currentUser.email?.split('@')[0] || 'employee'),
              displayName: isAdmin ? 'مصطفى عدلي' : (currentUser.displayName || 'موظف الضرائب'),
              email: currentUser.email || '',
              role: isAdmin ? 'admin' : 'employee',
              department: 'مصلحة الضرائب العقارية',
              jobTitle: isAdmin ? 'مشرف نظام (System Admin)' : 'مأمور فحص وربط ضريبي',
              status: 'active',
              createdAt: new Date().toISOString()
            };
            setUserProfile(fallbackProf);
            localStorage.setItem('tax_auth_profile', JSON.stringify(fallbackProf));
          }
        } catch (err) {
          console.warn('Error fetching authenticated profile:', err);
        }
      } else {
        // Only clear if explicitly signed out
        if (!localStorage.getItem('tax_auth_profile')) {
          setUserProfile(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    const email = resolveEmail(identifier);
    const pass = password.trim();

    try {
      // Step 1: Call server verification endpoint
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: pass })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        // Attempt Firebase Client Sign-in with fallbacks
        if (data.customToken) {
          try {
            await signInWithCustomToken(auth, data.customToken);
          } catch (customErr) {
            console.warn('Custom token sign-in fallback:', customErr);
          }
        }

        if (!auth.currentUser) {
          try {
            await signInWithEmailAndPassword(auth, email, pass);
          } catch (passErr: any) {
            try {
              await createUserWithEmailAndPassword(auth, email, pass);
            } catch (createErr) {
              try {
                await signInAnonymously(auth);
              } catch {}
            }
          }
        }

        if (data.userProfile) {
          setUserProfile(data.userProfile);
          try {
            localStorage.setItem('tax_auth_profile', JSON.stringify(data.userProfile));
          } catch {}
        }

        // Log login event
        apiFetch('/api/auth/login-activity', { method: 'POST' }).catch(() => {});
        setIsLoading(false);
        return true;
      }

      if (data?.error) {
        setError(data.error);
        setIsLoading(false);
        return false;
      }

      // Final fallback
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        setIsLoading(false);
        return true;
      } catch (err) {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
        setIsLoading(false);
        return false;
      }
    } catch (authErr: any) {
      console.warn('Authentication attempt failed:', authErr);
      setError(authErr?.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
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
        logout,
        refreshProfile,
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
