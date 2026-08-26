/**
 * Chat & Legal Inquiry Routes
 * Handles Gemini AI reasoning pipeline and conversation persistence.
 */

import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth-middleware.ts';
import { processTaxQuery } from '../services/geminiService.ts';
import { saveConversation, getUserConversations } from '../services/conversationService.ts';
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

    const response = await processTaxQuery({
      query: actualQuery,
      conversationId,
      history,
      userUid: user.uid,
      userName: user.displayName
    });

    // If a conversationId is provided, append messages to Firestore
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

      const conv: Conversation = {
        id: conversationId,
        ownerUid: user.uid,
        ownerName: user.displayName,
        title: actualQuery.slice(0, 35),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [userMsg, assistantMsg]
      };

      // Save asynchronously without blocking response
      saveConversation(conv, user).catch(err => console.warn('Could not save conversation to Firestore:', err));
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
 * Returns conversations for the authenticated user
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
 * POST /api/chat/conversations/save
 * Saves or updates a conversation
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
    res.status(500).json({ error: 'فشل حفظ المحادثة', details: err.message });
  }
});

export default router;
