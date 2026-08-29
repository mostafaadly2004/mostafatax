/**
 * Main Express Application
 * Production-ready server application mountable in both Vercel Serverless Functions and Node container.
 */

import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.ts';
import chatRoutes from './routes/chat.ts';
import adminUsersRoutes from './routes/admin/users.ts';
import adminConversationsRoutes from './routes/admin/conversations.ts';
import adminAuditLogsRoutes from './routes/admin/auditLogs.ts';
import adminUnansweredRoutes from './routes/admin/unanswered.ts';
import adminKnowledgeRoutes from './routes/admin/knowledge.ts';
import adminOverviewRoutes from './routes/admin/overview.ts';
import adminDbRoutes from './routes/admin/db.ts';
import testRunnerRoutes from './routes/admin/testing.ts';

dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security & CORS Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Tax Support AI - Egyptian Real Estate Tax Authority',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/conversations', adminConversationsRoutes);
app.use('/api/admin/audit-logs', adminAuditLogsRoutes);
app.use('/api/admin/activity', adminAuditLogsRoutes);
app.use('/api/admin/unanswered', adminUnansweredRoutes);
app.use('/api/admin/knowledge', adminKnowledgeRoutes);
app.use('/api/knowledge', adminKnowledgeRoutes);
app.use('/api/admin/overview', adminOverviewRoutes);
app.use('/api/admin/db', adminDbRoutes);
app.use('/api/test-runner', testRunnerRoutes);

export default app;
