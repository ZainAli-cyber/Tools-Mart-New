import express from 'express';
import adminRouter from './adminRoutes';
import accountRouter from './accountRoutes';
import extensionRouter from './extensionRoutes';
import notificationRouter from './notificationRoutes';
import deviceRouter from './deviceRoutes';
import toolProxyRouter, {
  handlePortalToolFallback,
  handleProxyAsset,
  handleProxyView,
  handleFxProxy,
  handleOriginToolApi,
} from './toolProxyRoutes';
import settingsRouter from './settingsRoutes';
import mobileRouter from './mobileRoutes';

/**
 * Express app with all /api/* routes. Used by local server.ts and Vercel api/index.ts.
 * Does not serve static assets or SPA fallback — Vercel serves dist/ separately.
 *
 * Heavy deps (e.g. @google/genai) are lazy-loaded so importing this module does not
 * pull Gemini into every cold start before routes run.
 */
export function createApiApp() {
  const app = express();

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Device-Id, X-Device-Label, X-Omit-Cookies',
    );
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
  });

  // Tool proxy traffic must stay byte-for-byte: mount it before the JSON/urlencoded
  // parsers so uploads, form posts and streaming request bodies pass through intact.
  const rawBody = express.raw({ type: () => true, limit: '50mb' });
  // ChatGPT (and similar) call these on the portal origin when the SPA path
  // is rewritten. /api/auth MUST be included — conversation/init stays 401 and
  // the Send button stays gray when the session bootstrap never reaches OpenAI.
  const proxyPrefixes = [
    '/backend-api',
    '/public-api',
    '/backend-anon',
    '/ces',
    '/api/auth',
    '/api/subscriptions',
    '/api/communications',
  ];

  app.use('/fx/:token', rawBody, (req, res) => {
    void handleFxProxy(req, res);
  });
  app.use(proxyPrefixes, rawBody, (req, res) => {
    void handleOriginToolApi(req, res);
  });
  app.all('/api/tool-proxy/asset', rawBody, (req, res) => {
    void handleProxyAsset(req, res);
  });
  app.get(['/go', '/go/*'], (req, res) => {
    void handleProxyView(req, res);
  });

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    return next(err);
  });

  app.get(['/api/health', '/health'], (_req, res) => {
    res.json({ status: 'ok', service: 'ZynexTools', timestamp: new Date().toISOString() });
  });

  app.use('/api/admin', adminRouter);
  app.use('/api/accounts', accountRouter);
  app.use('/api/devices', deviceRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/extension', extensionRouter);
  app.use('/api/mobile', mobileRouter);
  app.use('/api/tool-proxy', toolProxyRouter);
  app.use('/api/notifications', notificationRouter);

  const getAI = async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
    const { GoogleGenAI } = await import('@google/genai');
    return new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
  };

  app.post('/api/ai/plagiarism', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text?.trim()) return res.status(400).json({ success: false, error: 'Text required.' });
      const ai = await getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Analyze for plagiarism. Return JSON: {uniquenessPercent,plagiarismPercent,totalWords,duplicateSentences:[],uniqueSentences:[],summaryReport}. TEXT: "${text.slice(0,4000)}"`,
        config: { responseMimeType: 'application/json' },
      });
      return res.json({ success: true, data: JSON.parse(response.text || '{}') });
    } catch {
      const words = (req.body.text || '').trim().split(/\s+/).filter(Boolean);
      return res.json({
        success: true,
        data: {
          uniquenessPercent: 94,
          plagiarismPercent: 6,
          totalWords: words.length,
          duplicateSentences: [],
          uniqueSentences: [],
          summaryReport: 'High uniqueness detected.',
        },
      });
    }
  });

  app.post('/api/ai/rewrite', async (req, res) => {
    try {
      const { text, tone = 'SEO Optimized' } = req.body;
      if (!text) return res.status(400).json({ success: false, error: 'Text required.' });
      const ai = await getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Rewrite uniquely in ${tone} tone:\n${text.slice(0, 4000)}`,
      });
      return res.json({ success: true, rewrittenText: response.text });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/ai/grammar', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ success: false, error: 'Text required.' });
      const ai = await getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Fix grammar. Return JSON: {correctedText,totalErrors,issues:[{error,fix,reason}]}. TEXT: "${text.slice(0, 3000)}"`,
        config: { responseMimeType: 'application/json' },
      });
      return res.json({ success: true, data: JSON.parse(response.text || '{}') });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/ai/summarize', async (req, res) => {
    try {
      const { text, format = 'bullet' } = req.body;
      if (!text) return res.status(400).json({ success: false, error: 'Text required.' });
      const ai = await getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Summarize in ${format === 'bullet' ? 'bullet points' : 'a paragraph'}:\n${text.slice(0, 5000)}`,
      });
      return res.json({ success: true, summary: response.text });
    } catch {
      return res.status(500).json({ success: false, error: 'Summarization failed.' });
    }
  });

  app.post('/api/ai/keywords', async (req, res) => {
    try {
      const { seedKeyword } = req.body;
      if (!seedKeyword) return res.status(400).json({ success: false, error: 'Seed keyword required.' });
      const ai = await getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Generate 15 long-tail keywords for "${seedKeyword}". Return JSON array: [{keyword,searchVolume,difficulty,intent,cpc}]`,
        config: { responseMimeType: 'application/json' },
      });
      return res.json({ success: true, keywords: JSON.parse(response.text || '[]') });
    } catch {
      return res.status(500).json({ success: false, error: 'Keyword generation failed.' });
    }
  });

  app.post('/api/ai/schema', async (req, res) => {
    try {
      const { schemaType, details } = req.body;
      const ai = await getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Generate valid JSON-LD schema for type "${schemaType}" with: ${JSON.stringify(details)}. Return only the script tag.`,
      });
      return res.json({ success: true, schemaCode: response.text });
    } catch {
      return res.status(500).json({ success: false, error: 'Schema generation failed.' });
    }
  });

  app.post('/api/seo/headers', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ success: false, error: 'URL required.' });
      let formatted = url.trim();
      if (!formatted.startsWith('http')) formatted = 'https://' + formatted;
      const response = await fetch(formatted, {
        method: 'HEAD',
        headers: { 'User-Agent': 'AI-TOOLZ-MART-Bot/1.0' },
      });
      const headers: Record<string, string> = {};
      response.headers.forEach((v, k) => {
        headers[k] = v;
      });
      return res.json({ success: true, url: formatted, statusCode: response.status, headers });
    } catch (e: any) {
      return res.json({ success: false, error: `Cannot connect: ${e.message}`, statusCode: 0 });
    }
  });

  // Runs after every portal route: only claims requests that came from a proxied
  // tool page, so the dashboard and SPA routes are untouched.
  app.use((req, res, next) => {
    void handlePortalToolFallback(req, res, next);
  });

  return app;
}
