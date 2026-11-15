/**
 * Production entry for Hostinger / VPS. No Vite — static dist + API only.
 */
import 'dotenv/config';
import path from 'path';
import express from 'express';
import { createApiApp } from './src/lib/createApiApp';

async function startServer() {
  const app = createApiApp();
  const rawPort = String(process.env.PORT || '3000').trim();
  // Hostinger may pass a numeric PORT or (rarely) a socket path — never listen(NaN).
  const listenTarget = /^\d+$/.test(rawPort) ? parseInt(rawPort, 10) : rawPort;
  const distPath = path.join(process.cwd(), 'dist');

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'ZynexTools', timestamp: new Date().toISOString() });
  });

  app.use(express.static(distPath, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/backend-api') ||
      req.path.startsWith('/fx') ||
      req.path.startsWith('/go')
    ) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'), err => {
      if (err) next(err);
    });
  });

  const server = app.listen(listenTarget, '0.0.0.0', () => {
    console.log(`✅ ZynexTools running on 0.0.0.0:${listenTarget}`);
  });
  server.on('error', err => {
    console.error('ZynexTools listen error:', err);
    process.exit(1);
  });
}

startServer().catch(err => {
  console.error('ZynexTools failed to start:', err);
  process.exit(1);
});
