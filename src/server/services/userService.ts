/**
 * User & Identity Management Service
 * Integrates Firebase Admin Auth and Firestore user profile store.
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

/**
 * List all users from Firestore
 */
export async function listAllUsers(): Promise<UserProfile[]> {
  const db = getAdminDb();
  const snapshot = await db.collection('users').get();
  const users: UserProfile[] = [];
  snapshot.forEach(doc => {
    users.push({
      ...doc.data() as UserProfile,
      uid: doc.id
    });
  });

  // Sort by createdAt descending
  users.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  return users;
}

/**
 * Get single user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getAdminDb();
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) return null;
  return { ...doc.data() as UserProfile, uid: doc.id };
}

/**
 * Create a new user with Firebase Auth & Firestore Profile
 */
export async function createNewUser(
  input: CreateUserInput,
  actor: UserProfile
): Promise<UserProfile> {
  const adminAuth = getAdminAuth();
  const db = getAdminDb();

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

  // Server-side Password Confirmation & Strength validation
  const password = input.password || '';
  const confirmPassword = input.confirmPassword || '';

  if (password.length < 6) {
    throw new Error('كلمة المرور يجب ألا تقل عن 6 أحرف/أرقام');
  }

  if (confirmPassword && password !== confirmPassword) {
    throw new Error('كلمتا المرور غير متطابقتين. يرجى التأكد من تطابق كلمة المرور وتأكيدها.');
  }

  // Check if username or email already exists in Firestore
  const existingByUsername = await db.collection('users').where('username', '==', username).limit(1).get();
  if (!existingByUsername.empty) {
    throw new Error(`اسم المستخدم "${username}" مستخدم بالفعل لموظف آخر.`);
  }

  // Step 1: Create user in Firebase Authentication
  let authUser;
  try {
    authUser = await adminAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: true
    });
  } catch (authErr: any) {
    if (authErr.code === 'auth/email-already-exists') {
      // Try to find if auth user exists
      try {
        authUser = await adminAuth.getUserByEmail(email);
        await adminAuth.updateUser(authUser.uid, { password, displayName });
      } catch {
        throw new Error(`البريد الإلكتروني "${email}" مسجل بالفعل.`);
      }
    } else {
      throw new Error(`فشل إنشاء المستخدم في نظام المصادقة: ${authErr.message}`);
    }
  }

  // Step 2: Create Firestore Profile linked to exact Auth UID
  const newProfile: UserProfile = {
    uid: authUser.uid,
    username,
    displayName,
    email,
    role: input.role || 'employee',
    department: input.department || 'مأمورية الضرائب العقارية بالقاهرة',
    jobTitle: input.jobTitle || 'مأمور فحص وربط ضريبي',
    status: input.status || 'active',
    createdAt: new Date().toISOString()
  };

  try {
    await db.collection('users').doc(authUser.uid).set(newProfile);
  } catch (dbErr: any) {
    // Rollback auth user on failure to prevent orphaned records
    try {
      await adminAuth.deleteUser(authUser.uid);
    } catch {}
    throw new Error(`فشل حفظ بيانات الموظف في قاعدة البيانات: ${dbErr.message}`);
  }

  // Step 3: Record Audit Log
  await recordAuditLog({
    actorUid: actor.uid,
    actorName: actor.displayName,
    action: 'CREATE_USER',
    targetType: 'user',
    targetId: authUser.uid,
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
  const db = getAdminDb();
  const userRef = db.collection('users').doc(input.uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    throw new Error('المستخدم غير موجود');
  }

  const current = doc.data() as UserProfile;

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

  await userRef.set(updates, { merge: true });

  // Update Display Name in Firebase Auth if changed
  if (updates.displayName) {
    try {
      const adminAuth = getAdminAuth();
      await adminAuth.updateUser(input.uid, { displayName: updates.displayName });
    } catch (e) {
      console.warn('Could not update Firebase Auth displayName:', e);
    }
  }

  const updatedProfile = { ...current, ...updates };

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

  const adminAuth = getAdminAuth();
  const db = getAdminDb();
  const userDoc = await db.collection('users').doc(targetUid).get();
  const userData = userDoc.exists ? userDoc.data() as UserProfile : null;

  try {
    await adminAuth.updateUser(targetUid, { password: newPassword });
  } catch (err: any) {
    throw new Error(`فشل تحديث كلمة المرور في Firebase: ${err.message}`);
  }

  await recordAuditLog({
    actorUid: actor.uid,
    actorName: actor.displayName,
    action: 'ADMIN_RESET_PASSWORD',
    targetType: 'user',
    targetId: targetUid,
    details: `إعادة تعيين كلمة المرور للموظف: ${userData?.displayName || targetUid}`,
    metadata: { targetUsername: userData?.username }
  });
}

/**
 * Generate password reset link
 */
export async function generatePasswordResetLink(
  targetUid: string,
  actor: UserProfile
): Promise<string> {
  const adminAuth = getAdminAuth();
  const db = getAdminDb();
  const userDoc = await db.collection('users').doc(targetUid).get();
  if (!userDoc.exists) throw new Error('المستخدم غير موجود');

  const userData = userDoc.data() as UserProfile;
  if (!userData.email) throw new Error('الموظف ليس لديه بريد إلكتروني مسجل');

  const resetLink = await adminAuth.generatePasswordResetLink(userData.email);

  await recordAuditLog({
    actorUid: actor.uid,
    actorName: actor.displayName,
    action: 'GENERATE_RESET_LINK',
    targetType: 'user',
    targetId: targetUid,
    details: `إصدار رابط إعادة تعيين كلمة المرور للموظف: ${userData.displayName}`,
    metadata: { email: userData.email }
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

  const db = getAdminDb();
  const userDoc = await db.collection('users').doc(targetUid).get();
  if (!userDoc.exists) {
    throw new Error('المستخدم المراد حذفه غير موجود');
  }

  const userData = userDoc.data() as UserProfile;
  if (userData.username === 'mostafa' || userData.email === 'aaddmostafa99@gmail.com') {
    throw new Error('لا يمكن حذف حساب مسؤول النظام الرئيسي.');
  }

  // Delete from Firestore
  await db.collection('users').doc(targetUid).delete();

  // Delete from Firebase Auth
  try {
    const adminAuth = getAdminAuth();
    await adminAuth.deleteUser(targetUid);
  } catch (err) {
    console.warn('Could not delete user from Firebase Auth:', err);
  }

  await recordAuditLog({
    actorUid: actor.uid,
    actorName: actor.displayName,
    action: 'DELETE_USER',
    targetType: 'user',
    targetId: targetUid,
    details: `حذف حساب الموظف: ${userData.displayName} (${userData.username})`,
    metadata: { targetUsername: userData.username, targetEmail: userData.email }
  });
}

/**
 * Batch delete users
 */
export async function batchDeleteUsers(
  targetUids: string[],
  actor: UserProfile
): Promise<number> {
  const adminAuth = getAdminAuth();
  const db = getAdminDb();
  let count = 0;

  for (const uid of targetUids) {
    if (uid === actor.uid) continue; // Skip self
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) continue;

    const userData = userDoc.data() as UserProfile;
    if (userData.username === 'mostafa' || userData.email === 'aaddmostafa99@gmail.com') continue;

    await db.collection('users').doc(uid).delete();
    try {
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
