/**
 * User & Identity Management Service
 * Integrates Firebase Admin Auth and Firestore user profile store with automatic in-memory fallback.
 * Enforces server-side password confirmation, anti-lockout security, and RBAC.
 */

import { getAdminAuth, getAdminDb } from '../firebase-admin.ts';
import { UserProfile, UserRole, UserAccountStatus } from '../../types.ts';
import { recordAuditLog } from './auditService.ts';

export interface CreateUserInput {
  displayName: string;
  username: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  department?: string;
  jobTitle?: string;
  role?: UserRole;
  status?: UserAccountStatus;
}

export interface UpdateProfileInput {
  uid: string;
  displayName?: string;
  username?: string;
  department?: string;
  jobTitle?: string;
  role?: UserRole;
  status?: UserAccountStatus;
}

// In-memory user registry fallback
const inMemoryUsers = new Map<string, UserProfile>([
  [
    'usr_mostafa',
    {
      uid: 'usr_mostafa',
      username: 'mostafa',
      displayName: 'مصطفى عدلي',
      email: 'aaddmostafa99@gmail.com',
      role: 'admin',
      department: 'الإدارة المركزية لنظم المعلومات والتحول الرقمي',
      jobTitle: 'مدير عام المنظومة ومسؤول النظام (System Administrator)',
      status: 'active',
      createdAt: '2025-01-01T08:00:00.000Z',
      lastLoginAt: new Date().toISOString()
    }
  ],
  [
    'usr_tariq',
    {
      uid: 'usr_tariq',
      username: 'tariq.ibrahim',
      displayName: 'طارق إبراهيم خليل',
      email: 'tariq.ibrahim@tax.gov.eg',
      role: 'employee',
      department: 'مأمورية الضرائب العقارية - وسط القاهرة',
      jobTitle: 'مأمور فحص وحصر عقاري رئيسي',
      status: 'active',
      createdAt: '2025-01-15T09:30:00.000Z',
      lastLoginAt: new Date().toISOString()
    }
  ],
  [
    'usr_sara',
    {
      uid: 'usr_sara',
      username: 'sara.mahmoud',
      displayName: 'سارة محمود الصاوي',
      email: 'sara.mahmoud@tax.gov.eg',
      role: 'employee',
      department: 'الإدارة العامة للشئون القانونية ولجان الطعن',
      jobTitle: 'باحث قانوني ومقرر لجنة طعن ضريبي',
      status: 'active',
      createdAt: '2025-02-01T10:15:00.000Z',
      lastLoginAt: new Date().toISOString()
    }
  ],
  [
    'usr_ahmed',
    {
      uid: 'usr_ahmed',
      username: 'ahmed.fouad',
      displayName: 'أحمد فؤاد الشناوي',
      email: 'ahmed.fouad@tax.gov.eg',
      role: 'employee',
      department: 'مأمورية الضرائب العقارية - الجيزة والدقي',
      jobTitle: 'مأمور ربط وتحصيل إلكتروني',
      status: 'active',
      createdAt: '2025-02-10T11:00:00.000Z',
      lastLoginAt: new Date().toISOString()
    }
  ]
]);

/**
 * List all users from Firestore with in-memory fallback
 */
export async function listAllUsers(): Promise<UserProfile[]> {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection('users').get();
    const users: UserProfile[] = [];
    snapshot.forEach(doc => {
      users.push({
        ...doc.data() as UserProfile,
        uid: doc.id
      });
    });

    if (users.length > 0) {
      // Sync into in-memory
      users.forEach(u => inMemoryUsers.set(u.uid, u));
      users.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      return users;
    }
  } catch (err) {
    // Firestore API not enabled or permission denied -> graceful in-memory fallback
  }

  const list = Array.from(inMemoryUsers.values());
  list.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });
  return list;
}

/**
 * Get single user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const db = getAdminDb();
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
      const data = { ...doc.data() as UserProfile, uid: doc.id };
      inMemoryUsers.set(uid, data);
      return data;
    }
  } catch {}

  return inMemoryUsers.get(uid) || null;
}

/**
 * Create a new user with Firebase Auth & Firestore Profile / in-memory fallback
 */
export async function createNewUser(
  input: CreateUserInput,
  actor: UserProfile
): Promise<UserProfile> {
  const displayName = (input.displayName || '').trim();
  if (!displayName) {
    throw new Error('يرجى إدخال الاسم الكامل للموظف');
  }

  // Sanitize username
  let username = (input.username || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  if (!username) {
    username = 'emp_' + Math.random().toString(36).substring(2, 8);
  }

  // Derive or sanitize email
  let email = (input.email || '').trim().toLowerCase();
  if (!email) {
    email = `${username}@tax.gov.eg`;
  }

  // Check uniqueness in in-memory store
  for (const user of inMemoryUsers.values()) {
    if (user.username.toLowerCase() === username.toLowerCase()) {
      throw new Error(`اسم المستخدم "${username}" مستخدم بالفعل لموظف آخر.`);
    }
  }

  // Server-side Password Confirmation & Strength validation
  const password = input.password || '';
  const confirmPassword = input.confirmPassword || '';

  if (password.length < 6) {
    throw new Error('كلمة المرور يجب ألا تقل عن 6 أحرف/أرقام');
  }

  if (confirmPassword && password !== confirmPassword) {
    throw new Error('كلمتا المرور غير متطابقتين. يرجى التأكد من تطابق كلمة المرور وتأكيدها.');
  }

  let userUid = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  // Try Firebase Authentication
  try {
    const adminAuth = getAdminAuth();
    const authUser = await adminAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: true
    });
    userUid = authUser.uid;
  } catch (authErr: any) {
    // If auth is unavailable or email already exists in auth, use fallback UID
    if (authErr.code === 'auth/email-already-exists') {
      try {
        const adminAuth = getAdminAuth();
        const existing = await adminAuth.getUserByEmail(email);
        userUid = existing.uid;
        await adminAuth.updateUser(userUid, { password, displayName });
      } catch {}
    }
  }

  // Build profile
  const newProfile: UserProfile = {
    uid: userUid,
    username,
    displayName,
    email,
    role: input.role || 'employee',
    department: input.department || 'مأمورية الضرائب العقارية بالقاهرة',
    jobTitle: input.jobTitle || 'مأمور فحص وربط ضريبي',
    status: input.status || 'active',
    createdAt: new Date().toISOString()
  };

  // Save to in-memory store immediately
  inMemoryUsers.set(userUid, newProfile);

  // Attempt Firestore persistence
  try {
    const db = getAdminDb();
    await db.collection('users').doc(userUid).set(newProfile);
  } catch (dbErr) {
    // Graceful in-memory handling
  }

  // Record Audit Log
  await recordAuditLog({
    actorUid: actor.uid,
    actorName: actor.displayName,
    action: 'CREATE_USER',
    targetType: 'user',
    targetId: userUid,
    details: `إنشاء حساب موظف جديد: ${displayName} (${username}) بدائرة ${newProfile.department}`,
    metadata: { username, role: newProfile.role, department: newProfile.department }
  });

  return newProfile;
}

/**
 * Update user profile & status with Anti-Lockout enforcement
 */
export async function updateUserProfile(
  input: UpdateProfileInput,
  actor: UserProfile
): Promise<UserProfile> {
  let current = inMemoryUsers.get(input.uid) || null;

  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(input.uid).get();
    if (userDoc.exists) {
      current = { ...userDoc.data() as UserProfile, uid: userDoc.id };
    }
  } catch {}

  if (!current) {
    throw new Error('المستخدم غير موجود');
  }

  // Anti-Lockout: Prevent admin from demoting or disabling their own account
  if (actor.uid === input.uid) {
    if (input.role && input.role !== 'admin') {
      throw new Error('لا يمكنك إلغاء صلاحيات المشرف الخاصة بحسابك لمنع الإغلاق الذاتي للنظام.');
    }
    if (input.status && input.status !== 'active') {
      throw new Error('لا يمكنك تعليق أو تعطيل حسابك الحالي.');
    }
  }

  // Prevent modifying the primary system admin
  if (current.username === 'mostafa' && input.status && input.status !== 'active') {
    throw new Error('لا يمكن تعطيل حساب مسؤول النظام الرئيسي.');
  }

  const updates: Partial<UserProfile> = {
    ...((input.displayName !== undefined) && { displayName: input.displayName.trim() }),
    ...((input.username !== undefined) && { username: input.username.trim().toLowerCase() }),
    ...((input.jobTitle !== undefined) && { jobTitle: input.jobTitle.trim() }),
    ...((input.department !== undefined) && { department: input.department.trim() }),
    ...((input.role !== undefined) && { role: input.role }),
    ...((input.status !== undefined) && { status: input.status }),
    lastSeenAt: new Date().toISOString()
  };

  const updatedProfile: UserProfile = { ...current, ...updates };
  inMemoryUsers.set(input.uid, updatedProfile);

  // Try Firestore update
  try {
    const db = getAdminDb();
    await db.collection('users').doc(input.uid).set(updates, { merge: true });
  } catch {}

  // Update Display Name in Firebase Auth if changed
  if (updates.displayName) {
    try {
      const adminAuth = getAdminAuth();
      await adminAuth.updateUser(input.uid, { displayName: updates.displayName });
    } catch {}
  }

  await recordAuditLog({
    actorUid: actor.uid,
    actorName: actor.displayName,
    action: 'UPDATE_USER_PROFILE',
    targetType: 'user',
    targetId: input.uid,
    details: `تحديث بيانات الموظف: ${updatedProfile.displayName}`,
    metadata: updates
  });

  return updatedProfile;
}

/**
 * Reset User Password via Firebase Admin SDK
 */
export async function resetUserPassword(
  targetUid: string,
  newPassword: string,
  confirmPassword: string,
  actor: UserProfile
): Promise<void> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف');
  }

  if (newPassword !== confirmPassword) {
    throw new Error('كلمتا المرور غير متطابقتين. يرجى إعادة كتابة التأكيد بدقة.');
  }

  const user = inMemoryUsers.get(targetUid);

  try {
    const adminAuth = getAdminAuth();
    await adminAuth.updateUser(targetUid, { password: newPassword });
  } catch {}

  await recordAuditLog({
    actorUid: actor.uid,
    actorName: actor.displayName,
    action: 'ADMIN_RESET_PASSWORD',
    targetType: 'user',
    targetId: targetUid,
    details: `إعادة تعيين كلمة المرور للموظف: ${user?.displayName || targetUid}`,
    metadata: { targetUsername: user?.username }
  });
}

/**
 * Generate password reset link
 */
export async function generatePasswordResetLink(
  targetUid: string,
  actor: UserProfile
): Promise<string> {
  const user = inMemoryUsers.get(targetUid);
  if (!user) throw new Error('المستخدم غير موجود');
  if (!user.email) throw new Error('الموظف ليس لديه بريد إلكتروني مسجل');

  let resetLink = `https://tax.gov.eg/reset-password?token=mock_reset_${targetUid}_${Date.now()}`;
  try {
    const adminAuth = getAdminAuth();
    resetLink = await adminAuth.generatePasswordResetLink(user.email);
  } catch {}

  await recordAuditLog({
    actorUid: actor.uid,
    actorName: actor.displayName,
    action: 'GENERATE_RESET_LINK',
    targetType: 'user',
    targetId: targetUid,
    details: `إصدار رابط إعادة تعيين كلمة المرور للموظف: ${user.displayName}`,
    metadata: { email: user.email }
  });

  return resetLink;
}

/**
 * Delete single user from Auth & Firestore
 */
export async function deleteUser(
  targetUid: string,
  actor: UserProfile
): Promise<void> {
  if (actor.uid === targetUid) {
    throw new Error('لا يمكنك حذف حساب المشرف الخاص بك أثناء تسجيل الدخول.');
  }

  const user = inMemoryUsers.get(targetUid);
  if (!user) {
    throw new Error('المستخدم المراد حذفه غير موجود');
  }

  if (user.username === 'mostafa' || user.email === 'aaddmostafa99@gmail.com') {
    throw new Error('لا يمكن حذف حساب مسؤول النظام الرئيسي.');
  }

  inMemoryUsers.delete(targetUid);

  // Delete from Firestore
  try {
    const db = getAdminDb();
    await db.collection('users').doc(targetUid).delete();
  } catch {}

  // Delete from Firebase Auth
  try {
    const adminAuth = getAdminAuth();
    await adminAuth.deleteUser(targetUid);
  } catch {}

  await recordAuditLog({
    actorUid: actor.uid,
    actorName: actor.displayName,
    action: 'DELETE_USER',
    targetType: 'user',
    targetId: targetUid,
    details: `حذف حساب الموظف: ${user.displayName} (${user.username})`,
    metadata: { targetUsername: user.username, targetEmail: user.email }
  });
}

/**
 * Batch delete users
 */
export async function batchDeleteUsers(
  targetUids: string[],
  actor: UserProfile
): Promise<number> {
  let count = 0;

  for (const uid of targetUids) {
    if (uid === actor.uid) continue; // Skip self
    const user = inMemoryUsers.get(uid);
    if (!user) continue;

    if (user.username === 'mostafa' || user.email === 'aaddmostafa99@gmail.com') continue;

    inMemoryUsers.delete(uid);

    try {
      const db = getAdminDb();
      await db.collection('users').doc(uid).delete();
    } catch {}

    try {
      const adminAuth = getAdminAuth();
      await adminAuth.deleteUser(uid);
    } catch {}

    count++;
  }

  if (count > 0) {
    await recordAuditLog({
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'BATCH_DELETE_USERS',
      targetType: 'user',
      targetId: 'multiple',
      details: `حذف جماعي لعدد (${count}) من حسابات الموظفين التجريبية`,
      metadata: { deletedCount: count }
    });
  }

  return count;
}
