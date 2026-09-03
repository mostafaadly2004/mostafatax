/**
 * Vercel Serverless Function Entry Point
 * Dispatches all /api/* requests to the Express application.
 */

import app from '../src/server/app.ts';

export default function handler(req: any, res: any) {
  return app(req, res);
}

