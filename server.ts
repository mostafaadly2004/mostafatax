/**
 * Tax Support AI - Server Entry Point
 * Mounts the Express API and integrates Vite middleware in development.
 */

import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import app from './src/server/app.ts';

const PORT = 3000;

async function startServer() {
  const server = http.createServer(app);

  // Vite middleware for local development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const express = await import('express');
    app.use(express.default.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Tax Support AI server running on http://localhost:${PORT}`);
  });
}

startServer();
