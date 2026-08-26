/**
 * Storage Helpers for Conversations & User Preferences
 */

import { Conversation } from '../types.ts';

export function getSavedConversations(userUid?: string): Conversation[] {
  try {
    const key = userUid ? `tax_support_ai_convs_${userUid}` : 'tax_support_ai_conversations_v1';
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[], userUid?: string): void {
  try {
    const key = userUid ? `tax_support_ai_convs_${userUid}` : 'tax_support_ai_conversations_v1';
    localStorage.setItem(key, JSON.stringify(conversations));
  } catch (err) {
    console.error('Failed to save conversations to localStorage', err);
  }
}

export const getStoredConversations = getSavedConversations;
export const setStoredConversations = saveConversations;

export function getActiveConversationId(userUid?: string): string | null {
  try {
    const key = userUid ? `tax_support_ai_active_${userUid}` : 'tax_support_ai_active_conv_v1';
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setActiveConversationId(id: string | null, userUid?: string): void {
  try {
    const key = userUid ? `tax_support_ai_active_${userUid}` : 'tax_support_ai_active_conv_v1';
    if (id) {
      localStorage.setItem(key, id);
    } else {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.error('Failed to set active conversation ID', err);
  }
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
