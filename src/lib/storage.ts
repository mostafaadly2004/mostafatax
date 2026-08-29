/**
 * Storage Helpers for Conversations & User Preferences
 * Strictly namespaces all local cache keys by Firebase User UID.
 * Never allows un-isolated global keys that could leak across user accounts.
 */

import { Conversation } from '../types.ts';

export function getSavedConversations(userUid?: string): Conversation[] {
  if (!userUid) return [];
  try {
    const key = `tax_support_ai_convs_${userUid}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[], userUid?: string): void {
  if (!userUid) return;
  try {
    const key = `tax_support_ai_convs_${userUid}`;
    localStorage.setItem(key, JSON.stringify(conversations));
  } catch (err) {
    console.error('Failed to save conversations to localStorage', err);
  }
}

export const getStoredConversations = getSavedConversations;
export const setStoredConversations = saveConversations;

export function getActiveConversationId(userUid?: string): string | null {
  if (!userUid) return null;
  try {
    const key = `tax_support_ai_active_${userUid}`;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setActiveConversationId(id: string | null, userUid?: string): void {
  if (!userUid) return;
  try {
    const key = `tax_support_ai_active_${userUid}`;
    if (id) {
      localStorage.setItem(key, id);
    } else {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.error('Failed to set active conversation ID', err);
  }
}

export function clearUserConversations(userUid?: string): void {
  if (!userUid) return;
  try {
    localStorage.removeItem(`tax_support_ai_convs_${userUid}`);
    localStorage.removeItem(`tax_support_ai_active_${userUid}`);
  } catch {}
}

export function createNewConversation(
  ownerUid = 'anonymous',
  ownerName = 'موظف الضرائب',
  initialTitle = 'محادثة استفسار ضريبي جديدة'
): Conversation {
  return {
    id: 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    ownerUid,
    ownerName,
    title: initialTitle,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: []
  };
}
