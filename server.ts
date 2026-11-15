import 'dotenv/config';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './src/lib/createApiApp';

async function startServer() {
  const app = createApiApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    // Hostinger / VPS: one long-lived Node process serves API + SPA.
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false, maxAge: '1h' }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/backend-api') || req.path.startsWith('/fx') || req.path.startsWith('/go')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'), err => {
        if (err) next(err);
      });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ ZynexTools running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
