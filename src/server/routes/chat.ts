/**
 * Chat & Legal Inquiry Routes
 * Handles Gemini AI reasoning pipeline and multi-user isolated conversation persistence.
 */

import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth-middleware.ts';
import { processTaxQuery } from '../services/geminiService.ts';
import {
  saveConversation,
  getUserConversations,
  getConversationById,
  deleteConversation
} from '../services/conversationService.ts';
import { Conversation, Message } from '../../types.ts';

const router = Router();

/**
 * POST /api/chat/ask
 * Processes employee tax queries with server-side Gemini AI & legal grounding
 */
router.post('/ask', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { query, message, conversationId, history } = req.body;

    const actualQuery = (query || message || '').trim();
    if (!actualQuery) {
      res.status(400).json({ error: 'يرجى كتابة نص الاستفسار' });
      return;
    }

    let existingConv: Conversation | null = null;

    // Strict IDOR & Isolation Check if conversationId is provided
    if (conversationId) {
      try {
        existingConv = await getConversationById(conversationId, user);
      } catch (authErr: any) {
        if (authErr.status === 403) {
          res.status(403).json({
            error: 'غير مصرح لك بالوصول إلى هذه المحادثة أو إرسال رسائل بها.',
            code: 'FORBIDDEN'
          });
          return;
        }
      }
    }

    // Process tax query through Gemini with verified user identity
    const response = await processTaxQuery({
      query: actualQuery,
      conversationId: conversationId || undefined,
      history: Array.isArray(history) ? history : (existingConv?.messages || []),
      userUid: user.uid,
      userName: user.displayName
    });

    // If conversationId is provided, persist the turn
    if (conversationId) {
      const userMsg: Message = {
        id: `msg_${Date.now()}_u`,
        role: 'user',
        content: actualQuery,
        timestamp: Date.now()
      };

      const assistantMsg: Message = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: response.answer,
        status: response.status,
        sources: response.sources,
        followUps: response.followUps,
        usedRecords: response.usedRecords,
        latencyMs: response.latencyMs,
        timestamp: Date.now()
      };

      const existingMessages = existingConv?.messages || [];
      const updatedMessages = [...existingMessages, userMsg, assistantMsg];

      const conv: Conversation = {
        id: conversationId,
        ownerUid: user.uid,
        ownerName: user.displayName || 'موظف الضرائب',
        ownerEmail: user.email || '',
        title: existingConv?.title || (actualQuery.length > 35 ? actualQuery.slice(0, 35) + '...' : actualQuery),
        createdAt: existingConv?.createdAt || Date.now(),
        updatedAt: Date.now(),
        messages: updatedMessages
      };

      // Save asynchronously with guaranteed ownerUid enforcement
      saveConversation(conv, user).catch(err =>
        console.warn('[Chat] Failed to persist conversation turn:', err)
      );
    }

    res.json(response);
  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({
      answer: 'حدث خطأ غير متوقع أثناء معالجة الاستفسار. يرجى المحاولة مرة أخرى.',
      status: 'error',
      sources: [],
      latencyMs: 0
    });
  }
});

/**
 * GET /api/chat/conversations
 * Returns conversations exclusively owned by the authenticated user
 */
router.get('/conversations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const conversations = await getUserConversations(user.uid);
    res.json({ success: true, conversations });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحميل المحادثات', details: err.message });
  }
});

/**
 * GET /api/chat/conversations/:id
 * Retrieves a single conversation, verifying ownerUid == user.uid
 */
router.get('/conversations/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const convId = req.params.id;
    const conversation = await getConversationById(convId, user);

    if (!conversation) {
      res.status(404).json({ error: 'المحادثة غير موجودة' });
      return;
    }

    res.json({ success: true, conversation });
  } catch (err: any) {
    if (err.status === 403) {
      res.status(403).json({ error: err.message, code: 'FORBIDDEN' });
      return;
    }
    res.status(500).json({ error: 'فشل تحميل المحادثة' });
  }
});

/**
 * DELETE /api/chat/conversations/:id
 * Deletes a conversation owned by the authenticated user
 */
router.delete('/conversations/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const convId = req.params.id;
    await deleteConversation(convId, user);
    res.json({ success: true, message: 'تم حذف المحادثة بنجاح' });
  } catch (err: any) {
    if (err.status === 403) {
      res.status(403).json({ error: err.message, code: 'FORBIDDEN' });
      return;
    }
    res.status(400).json({ error: err.message || 'فشل حذف المحادثة' });
  }
});

/**
 * POST /api/chat/conversations/save
 * Saves or updates a conversation with strict ownership verification
 */
router.post('/conversations/save', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const conv = req.body.conversation;
    if (!conv || !conv.id) {
      res.status(400).json({ error: 'بيانات المحادثة غير صحيحة' });
      return;
    }

    const saved = await saveConversation(conv, user);
    res.json({ success: true, conversation: saved });
  } catch (err: any) {
    if (err.status === 403) {
      res.status(403).json({ error: err.message, code: 'FORBIDDEN' });
      return;
    }
    res.status(500).json({ error: 'فشل حفظ المحادثة', details: err.message });
  }
});

export default router;
