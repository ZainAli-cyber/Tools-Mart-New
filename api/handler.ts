import type { IncomingMessage, ServerResponse } from 'http';
import express from 'express';
import { createApiApp } from '../src/lib/createApiApp';

/**
 * Vercel serverless entry (bundled to api/index.js via `npm run build:api`).
 * vercel.json rewrites `/api/(.*)` → `/api`.
 *
 * - Default export is a plain function (safe with ESM/CJS interop)
 * - /api/health never calls createApiApp() (still safe if route graph misbehaves)
 * - Static import of createApiApp so the esbuild bundle includes src/lib/**
 */

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

const healthPayload = () => ({
  status: 'ok' as const,
  service: 'ZynexTools',
  timestamp: new Date().toISOString(),
});

function isHealthPath(url: string | undefined) {
  if (!url) return false;
  const path = url.split('?')[0];
  return path === '/api/health' || path === '/health';
}

let fullApp: express.Express | null = null;
let fullAppError: string | null = null;

function getFullApp(): express.Express {
  if (fullApp) return fullApp;
  if (fullAppError) throw new Error(fullAppError);
  try {
    fullApp = createApiApp();
    return fullApp;
  } catch (err) {
    fullAppError = err instanceof Error ? err.stack || err.message : String(err);
    console.error('[api] createApiApp failed:\n', fullAppError);
    throw err;
  }
}

function createBootstrapApp() {
  const app = express();

  app.get(['/api/health', '/health'], (_req, res) => {
    res.status(200).json(healthPayload());
  });

  app.use((req, res, next) => {
    if (isHealthPath(req.url) || isHealthPath(req.originalUrl)) {
      return res.status(200).json(healthPayload());
    }
    try {
      return getFullApp()(req, res, next);
    } catch (err) {
      console.error('[api] request failed after init error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'API initialization failed',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  });

  return app;
}

const bootstrap = createBootstrapApp();

const handler: NodeHandler = (req, res) => {
  if (isHealthPath(req.url)) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(healthPayload()));
    return;
  }
  bootstrap(req, res);
};

export default handler;
