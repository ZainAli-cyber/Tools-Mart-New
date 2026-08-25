import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  GLOBAL_PROXY_SQL_HINT,
  clearGlobalProxyConfig,
  getGlobalProxyConfig,
  getGlobalProxyPublicStatus,
  maskProxyUrl,
  setGlobalProxyConfig,
} from './globalProxySettings';
import { invalidateProxyAgentCache, testProxyUrl } from './proxyFetch';

const router = Router();

function clients() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env, then restart the server.',
    );
  }
  return {
    auth: createClient(url, anonKey, { auth: { persistSession: false } }),
    admin: createClient(url, serviceKey, { auth: { persistSession: false } }),
  };
}

async function actor(req: any) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { auth, admin } = clients();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await admin
    .from('customers')
    .select('id,role,status')
    .eq('auth_user_id', data.user.id)
    .maybeSingle();
  if (!profile || profile.status === 'blocked') return null;
  return { id: profile.id, role: String(profile.role || '') };
}

/** GET /api/settings/global-proxy — members: { enabled, ready }; admin: + url */
router.get('/global-proxy', async (req, res) => {
  try {
    const current = await actor(req);
    if (!current) return res.status(401).json({ error: 'Not authorized' });
    const { admin } = clients();

    if (current.role === 'admin') {
      const cfg = await getGlobalProxyConfig(admin);
      return res.json({
        enabled: cfg.enabled,
        ready: Boolean(cfg.enabled && cfg.url),
        url: cfg.url,
        maskedUrl: maskProxyUrl(cfg.url),
        ...(cfg.setupRequired ? { setupRequired: true, hint: GLOBAL_PROXY_SQL_HINT } : {}),
      });
    }

    const status = await getGlobalProxyPublicStatus(admin);
    return res.json(status);
  } catch (error: any) {
    return res.json({
      enabled: false,
      ready: false,
      setupRequired: true,
      hint: error?.message || GLOBAL_PROXY_SQL_HINT,
    });
  }
});

/** PATCH /api/settings/global-proxy — admin only */
router.patch('/global-proxy', async (req, res) => {
  try {
    const current = await actor(req);
    if (!current) return res.status(401).json({ error: 'Not authorized' });
    if (current.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { admin } = clients();
    const enabled = Boolean(req.body?.enabled);
    const url = typeof req.body?.url === 'string' ? req.body.url : undefined;
    if (enabled && (url === undefined ? !(await getGlobalProxyConfig(admin)).url : !String(url).trim())) {
      return res.status(400).json({ error: 'Proxy URL is required when enabling the Global Proxy Engine.' });
    }

    const cfg = await setGlobalProxyConfig({ enabled, url }, admin);
    invalidateProxyAgentCache();
    return res.json({
      enabled: cfg.enabled,
      ready: Boolean(cfg.enabled && cfg.url),
      url: cfg.url,
      maskedUrl: maskProxyUrl(cfg.url),
    });
  } catch (error: any) {
    const message = error?.message || 'Could not save proxy settings';
    const setup = message === GLOBAL_PROXY_SQL_HINT || /app_settings|does not exist|schema cache/i.test(message);
    return res.status(setup ? 503 : 500).json({
      error: setup ? GLOBAL_PROXY_SQL_HINT : message,
      enabled: false,
      ready: false,
      setupRequired: setup || undefined,
    });
  }
});

/** DELETE /api/settings/global-proxy — admin only, clears URL and disables */
router.delete('/global-proxy', async (req, res) => {
  try {
    const current = await actor(req);
    if (!current) return res.status(401).json({ error: 'Not authorized' });
    if (current.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { admin } = clients();
    const cfg = await clearGlobalProxyConfig(admin);
    invalidateProxyAgentCache();
    return res.json({
      enabled: cfg.enabled,
      ready: false,
      url: '',
      maskedUrl: '',
    });
  } catch (error: any) {
    const message = error?.message || 'Could not remove proxy settings';
    const setup = /app_settings|does not exist|schema cache/i.test(message);
    return res.status(setup ? 503 : 500).json({
      error: setup ? GLOBAL_PROXY_SQL_HINT : message,
    });
  }
});

/** POST /api/settings/global-proxy/test — admin only */
router.post('/global-proxy/test', async (req, res) => {
  try {
    const current = await actor(req);
    if (!current) return res.status(401).json({ error: 'Not authorized' });
    if (current.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    let url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!url) {
      const { admin } = clients();
      const cfg = await getGlobalProxyConfig(admin);
      url = cfg.url;
    }
    if (!url) return res.status(400).json({ error: 'Enter a proxy URL to test.' });

    const result = await testProxyUrl(url);
    if (result.ok === false) {
      return res.status(502).json({ ok: false, error: result.error });
    }
    return res.json({
      ok: true,
      ip: result.ip,
      isp: result.isp,
      hosting: result.hosting,
      residentialLikely: result.residentialLikely,
      chatgptHtml: result.chatgptHtml,
      chatgptBlocked: result.chatgptBlocked,
      udemyHtml: result.udemyHtml,
      udemyBlocked: result.udemyBlocked,
      oneClickReady: result.oneClickReady,
      warnings: result.warnings,
      message: result.message,
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error?.message || 'Proxy test failed' });
  }
});

export default router;
