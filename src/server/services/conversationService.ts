/**
 * Isolated Multi-Tenant Conversation Service
 * 
 * CORE PRINCIPLES:
 * 1. ONE USER = ONE PRIVATE CHAT SPACE
 * 2. Every conversation is strictly partitioned by `ownerUid` (Firebase UID).
 * 3. NO shared/global lists of conversations.
 * 4. IDOR Protection: Any attempt by User B to view or modify User A's conversation throws 403 Forbidden.
 * 5. Admin endpoints are explicitly segregated and require `admin` role.
 * 6. Dual-layer storage: Firestore when available + atomic local disk persistence & in-memory cache.
 */

import fs from 'fs';
import path from 'path';
import { getAdminDb } from '../firebase-admin.ts';
import { Conversation, UserProfile } from '../../types.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');

// In-memory user-partitioned store: Map<ownerUid, Map<conversationId, Conversation>>
const userPartitionedConversations = new Map<string, Map<string, Conversation>>();

function getUserMap(ownerUid: string): Map<string, Conversation> {
  if (!userPartitionedConversations.has(ownerUid)) {
    userPartitionedConversations.set(ownerUid, new Map<string, Conversation>());
  }
  return userPartitionedConversations.get(ownerUid)!;
}

function findExistingConversationAcrossAll(conversationId: string): Conversation | null {
  for (const map of userPartitionedConversations.values()) {
    const conv = map.get(conversationId);
    if (conv) return conv;
  }
  return null;
}

function persistToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const allConvs: Conversation[] = [];
    for (const userMap of userPartitionedConversations.values()) {
      for (const conv of userMap.values()) {
        allConvs.push(conv);
      }
    }
    fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(allConvs, null, 2), 'utf-8');
  } catch {}
}

function initConversationStorage(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(CONVERSATIONS_FILE)) {
      const raw = fs.readFileSync(CONVERSATIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const c of parsed) {
          if (c && c.id && c.ownerUid) {
            getUserMap(c.ownerUid).set(c.id, c);
          }
        }
      }
    }
  } catch {}
}

// Initialize on module load
initConversationStorage();

/**
 * Get a single conversation with strict IDOR ownership check
 */
export async function getConversationById(
  conversationId: string,
  authenticatedUser: UserProfile
): Promise<Conversation | null> {
  if (!conversationId || !authenticatedUser) return null;

  let conv: Conversation | null = null;

  // 1. Try Firestore safely
  try {
    const db = getAdminDb();
    const doc = await db.collection('conversations').doc(conversationId).get();
    if (doc.exists) {
      conv = { ...doc.data() as Conversation, id: doc.id };
    }
  } catch {
    // Firestore unavailable -> fallback to local store
  }

  // 2. Try in-memory & disk partitions
  if (!conv) {
    // Search user's own partition first
    const userMap = getUserMap(authenticatedUser.uid);
    conv = userMap.get(conversationId) || null;

    // If not found in user's partition, search across all partitions to catch cross-user IDOR access
    if (!conv) {
      const otherUserConv = findExistingConversationAcrossAll(conversationId);
      if (otherUserConv) {
        if (authenticatedUser.role !== 'admin' && otherUserConv.ownerUid !== authenticatedUser.uid) {
          const err: any = new Error('غير مصرح لك بالوصول إلى هذه المحادثة (Forbidden: IDOR Protection)');
          err.status = 403;
          err.code = 'FORBIDDEN';
          throw err;
        }
        conv = otherUserConv;
      }
    }
  }

  if (!conv) return null;

  // 3. Ownership / Authorization Check
  if (authenticatedUser.role !== 'admin' && conv.ownerUid !== authenticatedUser.uid) {
    const err: any = new Error('غير مصرح لك بالوصول إلى هذه المحادثة (Forbidden: IDOR Protection)');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  // Cache in user partition
  if (conv.ownerUid) {
    getUserMap(conv.ownerUid).set(conv.id, conv);
  }

  return conv;
}

/**
 * Save or update a conversation with strict ownership assignment
 */
export async function saveConversation(
  conversation: Conversation,
  authenticatedUser: UserProfile
): Promise<Conversation> {
  if (!conversation || !conversation.id) {
    throw new Error('بيانات المحادثة غير صحيحة');
  }

  // Check if conversation already exists across Firestore or in-memory to prevent hijacking
  let existing: Conversation | null = null;
  try {
    const db = getAdminDb();
    const doc = await db.collection('conversations').doc(conversation.id).get();
    if (doc.exists) {
      existing = { ...doc.data() as Conversation, id: doc.id };
    }
  } catch {}

  if (!existing) {
    existing = findExistingConversationAcrossAll(conversation.id);
  }

  if (existing && existing.ownerUid && existing.ownerUid !== authenticatedUser.uid && authenticatedUser.role !== 'admin') {
    const err: any = new Error('غير مصرح لك بتعديل محادثة تخص مستخدماً آخر (Forbidden: Identity Protection)');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  // Enforce true ownerUid from verified server session
  const safeConversation: Conversation = {
    ...conversation,
    ownerUid: authenticatedUser.uid,
    ownerName: authenticatedUser.displayName || 'موظف الضرائب',
    ownerEmail: authenticatedUser.email || '',
    userId: authenticatedUser.uid,
    userName: authenticatedUser.displayName || 'موظف الضرائب',
    updatedAt: Date.now()
  };

  // Save to isolated user-specific in-memory partition & local disk
  getUserMap(authenticatedUser.uid).set(safeConversation.id, safeConversation);
  persistToDisk();

  // Persist to Firestore if available
  try {
    const db = getAdminDb();
    await db.collection('conversations').doc(safeConversation.id).set(safeConversation, { merge: true });
  } catch {}

  return safeConversation;
}

/**
 * Get all conversations owned exclusively by the authenticated user
 */
export async function getUserConversations(userUid: string): Promise<Conversation[]> {
  if (!userUid) return [];

  const userMap = getUserMap(userUid);

  try {
    const db = getAdminDb();
    const snapshot = await db.collection('conversations')
      .where('ownerUid', '==', userUid)
      .get();

    const convs: Conversation[] = [];
    snapshot.forEach(doc => {
      const data = { ...doc.data() as Conversation, id: doc.id };
      // Strict guard against Firestore misconfiguration
      if (data.ownerUid === userUid) {
        convs.push(data);
        userMap.set(data.id, data);
      }
    });

    if (convs.length > 0) {
      persistToDisk();
      convs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return convs;
    }
  } catch {
    // Firestore unavailable -> seamlessly use user partition
  }

  // Return only from this specific user's partition
  const userConvs = Array.from(userMap.values()).filter(c => c.ownerUid === userUid);
  userConvs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return userConvs;
}

/**
 * Delete a conversation with strict ownership check
 */
export async function deleteConversation(
  conversationId: string,
  authenticatedUser: UserProfile
): Promise<boolean> {
  if (!conversationId) return false;

  // Verify ownership before deletion
  let existing: Conversation | null = null;
  try {
    const db = getAdminDb();
    const doc = await db.collection('conversations').doc(conversationId).get();
    if (doc.exists) {
      existing = { ...doc.data() as Conversation, id: doc.id };
    }
  } catch {}

  if (!existing) {
    existing = findExistingConversationAcrossAll(conversationId);
  }

  if (existing && existing.ownerUid && existing.ownerUid !== authenticatedUser.uid && authenticatedUser.role !== 'admin') {
    const err: any = new Error('غير مصرح لك بحذف محادثة مستخدم آخر');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  // Remove from in-memory partition & persist to disk
  if (existing?.ownerUid) {
    getUserMap(existing.ownerUid).delete(conversationId);
  }
  getUserMap(authenticatedUser.uid).delete(conversationId);
  persistToDisk();

  // Remove from Firestore if available
  try {
    const db = getAdminDb();
    await db.collection('conversations').doc(conversationId).delete();
  } catch {}

  return true;
}

/**
 * Admin only: Retrieve all conversations across the entire authority
 */
export async function getAllConversationsForAdmin(): Promise<Conversation[]> {
  const allConvs: Conversation[] = [];
  const seenIds = new Set<string>();

  try {
    const db = getAdminDb();
    const snapshot = await db.collection('conversations').get();
    snapshot.forEach(doc => {
      const data = { ...doc.data() as Conversation, id: doc.id };
      allConvs.push(data);
      seenIds.add(data.id);
    });
  } catch {}

  // Merge in-memory partitions
  for (const userMap of userPartitionedConversations.values()) {
    for (const conv of userMap.values()) {
      if (!seenIds.has(conv.id)) {
        allConvs.push(conv);
        seenIds.add(conv.id);
      }
    }
  }

  allConvs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return allConvs;
}
