/**
 * Authenticated API Client
 * Automatically attaches Firebase ID Token in Authorization: Bearer <token>
 */

import { auth } from './firebase.ts';

export async function getAuthHeaders(customHeaders: Record<string, string> = {}): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    ...customHeaders
  };

  const saved = localStorage.getItem('tax_auth_profile');
  let localProfile: any = null;
  if (saved) {
    try {
      localProfile = JSON.parse(saved);
    } catch {}
  }

  const user = auth.currentUser;
  if (user && (!localProfile || user.email === localProfile.email)) {
    try {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
      return headers;
    } catch (err) {
      console.warn('Could not get Firebase ID token:', err);
    }
  }

  // If user is logged in via profile in localStorage (or Firebase token couldn't be obtained)
  if (localProfile?.uid) {
    try {
      const payload = JSON.stringify({
        uid: String(localProfile.uid || 'anon'),
        email: String(localProfile.email || ''),
        role: String(localProfile.role || 'employee')
      });
      const tokenPart = btoa(encodeURIComponent(payload));
      headers['Authorization'] = `Bearer dev_token_${tokenPart}`;
    } catch {
      const role = encodeURIComponent(localProfile.role || 'employee');
      const safeUid = encodeURIComponent(localProfile.uid || 'anon');
      headers['Authorization'] = `Bearer dev_token_${safeUid}_${role}`;
    }
  }

  return headers;
}

export async function apiFetch<T = any>(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<{ data: T | null; error: string | null; ok: boolean; status: number }> {
  const headers = await getAuthHeaders(options.headers as Record<string, string> || {});
  
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const timeoutMs = options.timeoutMs || 18000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Combine caller signal with timeout
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : null;

    if (!res.ok) {
      const errorMsg = data?.error || data?.message || data?.answer || `خطأ في الخادم (${res.status})`;
      return { data, error: errorMsg, ok: false, status: res.status };
    }

    return { data, error: null, ok: true, status: res.status };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { data: null, error: 'استغرقت الاستجابة وقتاً أطول من المتوقع، يرجى المحاولة مرة أخرى.', ok: false, status: 408 };
    }
    return { data: null, error: err.message || 'فشل الاتصال بالخادم', ok: false, status: 0 };
  }
}
