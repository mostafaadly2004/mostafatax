/**
 * Vercel Serverless Function Entry Point Source
 * Bundled into api/index.js during build to provide a standalone ESM serverless handler.
 */

import app from './app.ts';

export default function handler(req: any, res: any) {
  return app(req, res);
}
