import type { IncomingMessage, ServerResponse } from 'http';
import express from 'express';

/**
 * Vercel serverless entry for all /api/* (see vercel.json rewrite → /api).
 *
 * Critical for cold start:
 * - No dotenv here (Vercel injects env; local `server.ts` loads dotenv)
 * - /api/health never loads the heavy Express route graph
 * - Default export is a plain function (ESM-interop safe vs exporting Express app)
 */

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

const healthPayload = () => ({
  status: 'ok' as const,
  service: 'AI TOOLZ MART',
  timestamp: new Date().toISOString(),
});

function isHealthPath(url: string | undefined) {
  if (!url) return false;
  const path = url.split('?')[0];
  return path === '/api/health' || path === '/health';
}

let fullApp: express.Express | null = null;
let fullAppError: string | null = null;
let fullAppPromise: Promise<express.Express> | null = null;

async function getFullApp(): Promise<express.Express> {
  if (fullApp) return fullApp;
  if (fullAppError) throw new Error(fullAppError);
  if (!fullAppPromise) {
    fullAppPromise = (async () => {
      try {
        const { createApiApp } = await import('../src/lib/createApiApp');
        fullApp = createApiApp();
        return fullApp;
      } catch (err) {
        fullAppError = err instanceof Error ? err.stack || err.message : String(err);
        console.error('[api] createApiApp failed during lazy init:\n', fullAppError);
        fullAppPromise = null;
        throw err;
      }
    })();
  }
  return fullAppPromise;
}

/** Minimal app: health always works; everything else lazy-loads createApiApp. */
function createBootstrapApp() {
  const app = express();

  app.get(['/api/health', '/health'], (_req, res) => {
    res.status(200).json(healthPayload());
  });

  app.use(async (req, res, next) => {
    if (isHealthPath(req.url) || isHealthPath(req.originalUrl)) {
      return res.status(200).json(healthPayload());
    }
    try {
      const api = await getFullApp();
      return api(req, res, next);
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
  // Fast path — never touch Supabase / Gemini / route modules
  if (isHealthPath(req.url)) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(healthPayload()));
    return;
  }
  bootstrap(req, res);
};

export default handler;
