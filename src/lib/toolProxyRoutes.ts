/**
 * Tool proxy routes — entitlement checks + session handling on top of the generic
 * reverse-proxy engine in ./proxyEngine.
 *
 * URL space served to the browser:
 *   /fx/<token>/…            → tool origin
 *   /fx/<token>/~<host>/…    → any other host the tool page needs (CDNs, APIs)
 */
import { Router } from 'express';
import { createAnonSupabase, createPrivilegedSupabase } from './db';
import { createHash, randomBytes } from 'crypto';
import { planIsActive } from './accountStore';
import {
  registerOrHeartbeatDevice,
  readDeviceFromRequest,
  DEVICE_LIMIT_MESSAGE,
} from './deviceSessions';
import { getGlobalProxyPublicStatus } from './globalProxySettings';
import {
  bootstrapSessionCookies,
  filterLiveCookies,
  forwardRequest,
  fromProxyPath,
  isOneClickBlockedHost,
  normalizeCookies,
  oneClickBlockedHtml,
  unwrapNestedFxPath,
  type JarCookie,
  type ProxyTarget,
} from './proxyEngine';
import { runWithProxySticky } from './proxyFetch';
import {
  loadStoredSession,
  persistStoredSession,
  sealSession,
  unsealSession,
  type StoredProxySession,
} from './proxySessionStore';

const router = Router();

const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

type ProxySession = {
  token: string;
  accountId: string;
  toolId: string;
  toolName: string;
  targetUrl: string;
  origin: string;
  /** Live cookie jar (admin cookies + upstream Set-Cookie updates). */
  cookies: JarCookie[];
  /** Legacy flat header kept for older stored sessions. */
  cookieHeader: string;
  cookieHosts: string[];
  /** Referer used for panels that gate on a dashboard origin. */
  referrer: string;
  referrerCandidates: string[];
  expiresAt: number;
};

const sessions = new Map<string, ProxySession>();

function pruneSessions() {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(key);
  }
}

if (!process.env.VERCEL) {
  setInterval(pruneSessions, 60_000).unref?.();
}

function client(token?: string) {
  return createAnonSupabase(token);
}

function toolsDb() {
  return createPrivilegedSupabase();
}

function slugify(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toolMatchesKey(tool: any, key: string) {
  const want = String(key || '').trim().toLowerCase();
  if (!want) return false;
  const id = String(tool?.id || '').trim().toLowerCase();
  const name = String(tool?.name || '').trim().toLowerCase();
  return id === want || name === want || slugify(name) === want || slugify(id) === want;
}

function parseExtraJson(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  return {};
}

function parseCookiesPayload(raw?: string | null): any[] {
  let text = String(raw || '').trim();
  if (!text) return [];
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(text.slice(start, end + 1));
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) return parsed.filter(c => c && typeof c === 'object');
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.cookies)) return parsed.cookies.filter((c: any) => c && typeof c === 'object');
    if (Array.isArray(parsed.data)) return parsed.data.filter((c: any) => c && typeof c === 'object');
    if (parsed.name) return [parsed];
  }
  return [];
}

/** Build a Cookie request header from Chrome Copy-Cookies JSON objects. */
export function cookiesToHeader(cookies: any[]): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const c of cookies || []) {
    const name = String(c?.name || '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const value = c?.value == null ? '' : String(c.value);
    parts.push(`${name}=${value}`);
  }
  return parts.join('; ');
}

function hostsFromCookies(cookies: any[], origin: string): string[] {
  const hosts = new Set<string>();
  try {
    hosts.add(new URL(origin).hostname.toLowerCase());
  } catch {
    /* ignore */
  }
  for (const c of cookies || []) {
    const d = String(c?.domain || '')
      .trim()
      .replace(/^\./, '')
      .toLowerCase();
    if (d) hosts.add(d);
  }
  // ChatGPT one-click needs sibling OpenAI hosts for auth/CDN even if not in cookie JSON.
  const list = [...hosts];
  if (list.some(h => /(^|\.)(chatgpt\.com|openai\.com)$/i.test(h))) {
    for (const h of [
      'chatgpt.com',
      'www.chatgpt.com',
      'chat.openai.com',
      'auth.openai.com',
      'api.openai.com',
      'cdn.oaistatic.com',
      'ab.chatgpt.com',
    ]) {
      hosts.add(h);
    }
  }
  return [...hosts];
}

/** Panel hosts that gate on dashboard Referer + proxy_token (Pak SEO style). */
function isPanelUnlockUrl(url?: string | null): boolean {
  try {
    const host = new URL(String(url || '').trim()).hostname.toLowerCase();
    return (
      host === 'toolaccess.click' ||
      host.endsWith('.toolaccess.click') ||
      host.endsWith('.xemrush.site') ||
      host.endsWith('.semrush.site') ||
      host.endsWith('.groupbuy.tools') ||
      /\.(toolpanel|sharedpanel|panelhub)\./i.test(host)
    );
  } catch {
    return /toolaccess\.click|xemrush\.site|semrush\.site/i.test(String(url || ''));
  }
}

/** Real first-party sites — never spoof a Pak SEO Referer on these. */
function isRealToolOrigin(url?: string | null): boolean {
  try {
    const host = new URL(String(url || '').trim()).hostname.toLowerCase();
    return (
      host === 'chatgpt.com' ||
      host.endsWith('.chatgpt.com') ||
      host === 'chat.openai.com' ||
      host.endsWith('.openai.com') ||
      host === 'claude.ai' ||
      host.endsWith('.claude.ai') ||
      host === 'gemini.google.com' ||
      host === 'www.midjourney.com' ||
      host.endsWith('.midjourney.com')
    );
  } catch {
    return false;
  }
}

function isToolAccessUrl(url?: string | null): boolean {
  return isPanelUnlockUrl(url);
}

const DEFAULT_PANEL_REFERRER = 'https://app.pakseotools.com/';
const APEX_PANEL_REFERRER = 'https://pakseotools.com/';
const PANEL_REFERRER_FALLBACKS = [
  DEFAULT_PANEL_REFERRER,
  APEX_PANEL_REFERRER,
  'https://app.pakseotools.com/member',
] as const;

function normalizePanelUnlockReferrer(raw?: string | null): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed);
    if (!/^https?:$/i.test(u.protocol)) return trimmed;
    if (/\/(login|signin|sign-in|sign_in|register|signup|sign-up)\/?$/i.test(u.pathname)) {
      return `${u.origin}/`;
    }
    if (!u.pathname || u.pathname === '/') return `${u.origin}/`;
    return trimmed;
  } catch {
    return trimmed;
  }
}

function panelUnlockReferrerCandidates(raw?: string | null): string[] {
  const normalized = normalizePanelUnlockReferrer(raw);
  const asIs = String(raw || '').trim();
  const out: string[] = [];
  const push = (v: string) => {
    const s = String(v || '').trim();
    if (s && !out.includes(s)) out.push(s);
  };
  push(normalized);
  push(asIs);
  for (const s of PANEL_REFERRER_FALLBACKS) push(s);
  if (normalized) {
    try {
      push(`${new URL(normalized).origin}/`);
    } catch {
      /* ignore */
    }
  }
  return out;
}

function resolvePanelUnlockReferrer(raw?: string | null, dest?: string | null): string {
  // Real sites (ChatGPT etc.) must keep their own Referer/Origin — a Pak SEO
  // referrer breaks API calls even when the HTML shell still loads.
  if (isRealToolOrigin(dest)) return '';
  if (!isPanelUnlockUrl(dest) && !String(raw || '').trim()) return '';
  if (!isPanelUnlockUrl(dest) && String(raw || '').trim()) {
    // Admin set a referrer on a non-panel URL — only honor it for panel hosts.
    return '';
  }
  const normalized = normalizePanelUnlockReferrer(raw);
  if (normalized) return normalized;
  if (isPanelUnlockUrl(dest)) return DEFAULT_PANEL_REFERRER;
  return '';
}

async function selectToolsRows(sb: ReturnType<typeof toolsDb>, idEq?: string) {
  const attempts = [
    '*',
    'id,name,access_method,tool_url,cookies_json,panel_referrer,extra',
    'id,name,access_method,tool_url,cookies_json,extra',
    'id,name,extra',
    'id,name',
  ];
  for (const cols of attempts) {
    const q = idEq
      ? sb.from('tools').select(cols).eq('id', idEq).maybeSingle()
      : sb.from('tools').select(cols);
    const result = await q;
    if (!result.error) {
      return idEq ? (result.data ? [result.data] : []) : result.data || [];
    }
  }
  return [];
}

async function findToolByKey(key: string) {
  const sb = toolsDb();
  const raw = decodeURIComponent(String(key || '')).trim();
  if (!raw) return null;
  const byIdRows = await selectToolsRows(sb, raw);
  if (byIdRows[0]) return byIdRows[0];
  const rows = (await selectToolsRows(sb)) as any[];
  return rows.find((row: any) => toolMatchesKey(row, raw)) || null;
}

async function profileForToken(token: string) {
  const supabase = client(token);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return null;

  const db = toolsDb();
  const { data: profile, error } = await db
    .from('customers')
    .select('id,customer_code,name,email,role,status,plan,expiry,tools')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();
  if (!error && profile) return profile;

  const fallback = await supabase
    .from('customers')
    .select('id,customer_code,name,email,role,status,plan,expiry,tools')
    .eq('auth_user_id', authData.user.id)
    .single();
  if (fallback.error || !fallback.data) return null;
  return fallback.data;
}

function toolAssigned(profile: { tools?: any }, tool: { id?: string; name?: string }) {
  const assigned = Array.isArray(profile.tools) ? profile.tools : [];
  return assigned.some((entry: any) => {
    const value = String(entry || '').trim();
    if (!value) return false;
    return toolMatchesKey(tool, value) || value.toLowerCase() === String(tool.name || '').trim().toLowerCase();
  });
}

function resolveToolAccessMethod(tool: any, extra: Record<string, any>): 'one_click' | 'extension' {
  const candidates = [
    extra?.accessMethod,
    extra?.access_method,
    tool?.access_method,
    tool?.accessMethod,
  ]
    .map(v => String(v || '').trim().toLowerCase())
    .filter(Boolean);
  if (candidates.some(v => v === 'one_click' || v === 'one-click')) return 'one_click';
  return 'extension';
}

function cookieFields(tool: any) {
  const extra = parseExtraJson(tool?.extra);
  const url =
    'toolUrl' in extra || 'tool_url' in extra
      ? String(extra.toolUrl || extra.tool_url || '')
      : String(tool?.tool_url || '');
  const cookiesRaw =
    'cookiesJson' in extra || 'cookies_json' in extra
      ? String(extra.cookiesJson ?? extra.cookies_json ?? '')
      : String(tool?.cookies_json ?? '');
  const panelReferrer =
    'panelReferrer' in extra || 'unlockReferrer' in extra || 'panel_referrer' in extra
      ? String(extra.panelReferrer || extra.unlockReferrer || extra.panel_referrer || '')
      : String(tool?.panel_referrer || '');
  return {
    accessMethod: resolveToolAccessMethod(tool, extra),
    url: String(url || '').trim(),
    cookiesRaw: String(cookiesRaw || ''),
    panelReferrer: String(panelReferrer || '').trim(),
  };
}

async function requireEntitledLaunch(req: any): Promise<
  | { ok: true; profile: any; tool: any; fields: ReturnType<typeof cookieFields>; cookies: any[] }
  | { ok: false; status: number; error: string }
> {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return { ok: false, status: 401, error: 'Authentication required' };

  const profile = await profileForToken(token);
  if (!profile) return { ok: false, status: 401, error: 'Session expired. Please sign in again.' };
  if (profile.status === 'blocked') return { ok: false, status: 403, error: 'Account suspended' };

  const fp = readDeviceFromRequest(req);
  if (!fp.deviceId) {
    return {
      ok: false,
      status: 400,
      error: 'Device id required. Refresh the portal, then try again.',
    };
  }
  const deviceCheck = await registerOrHeartbeatDevice({
    accountId: profile.id,
    deviceId: fp.deviceId,
    deviceLabel: fp.deviceLabel,
    userAgent: fp.userAgent,
  });
  if (deviceCheck.ok === false) {
    return { ok: false, status: deviceCheck.status, error: deviceCheck.error || DEVICE_LIMIT_MESSAGE };
  }

  if (!planIsActive(profile.plan, profile.expiry)) {
    return { ok: false, status: 403, error: 'Activate or renew a plan to access tools.' };
  }

  const toolKey = String(req.body?.toolId || req.body?.toolKey || req.query?.toolId || '').trim();
  if (!toolKey) return { ok: false, status: 400, error: 'toolId is required' };

  const tool = await findToolByKey(toolKey);
  if (!tool) return { ok: false, status: 404, error: 'Tool not found' };
  if (!toolAssigned(profile, tool)) {
    return { ok: false, status: 403, error: 'This tool is not assigned to your account.' };
  }

  const fields = cookieFields(tool);
  if (!fields.url) {
    return {
      ok: false,
      status: 400,
      error: 'No destination URL is set for this tool. Ask admin to save Cookies settings again.',
    };
  }

  return {
    ok: true,
    profile,
    tool,
    fields,
    cookies: parseCookiesPayload(fields.cookiesRaw),
  };
}

function newToken() {
  return randomBytes(24).toString('hex');
}

function publicFxPath(token: string): string {
  return `/fx/${encodeURIComponent(String(token || '').trim())}/`;
}

function tokenFromRequest(req: { query?: any; headers?: any; params?: any }): string {
  const fromParam = String(req.params?.token || '').trim();
  if (fromParam) return fromParam;
  const fromQuery = String(req.query?.token || '').trim();
  if (fromQuery) return fromQuery;
  const cookie = String(req.headers?.cookie || '');
  const match = cookie.match(/(?:^|;\s*)atm_px=([^;]+)/);
  return match ? decodeURIComponent(match[1].trim()) : '';
}

/** Token of the page that issued the request — keeps multiple open tools apart. */
function tokenFromReferer(req: any): string {
  try {
    const path = new URL(String(req.headers?.referer || '')).pathname;
    return decodeURIComponent(path.match(/^\/fx\/([^/]+)/)?.[1] || '');
  } catch {
    return '';
  }
}

function setProxyCookie(res: any, token: string, sealed?: string) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const parts = [
    `atm_px=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly${secure}`,
  ];
  // Browser cookie limit ~4KB — only attach sealed backup when it fits (panel tools).
  if (sealed && sealed.length < 2800) {
    parts.push(
      `atm_px_s=${encodeURIComponent(sealed)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly${secure}`,
    );
  }
  if (typeof res.append === 'function') {
    for (const p of parts) res.append('Set-Cookie', p);
  } else {
    res.setHeader('Set-Cookie', parts);
  }
}

function hydrateSession(stored: StoredProxySession & { cookies?: JarCookie[] }): ProxySession {
  let originHost = '';
  try {
    originHost = new URL(stored.origin).hostname;
  } catch {
    /* ignore */
  }
  const cookies =
    Array.isArray(stored.cookies) && stored.cookies.length
      ? normalizeCookies(stored.cookies, originHost)
      : normalizeCookies(
          String(stored.cookieHeader || '')
            .split(';')
            .map(part => {
              const eq = part.indexOf('=');
              if (eq <= 0) return null;
              return {
                name: part.slice(0, eq).trim(),
                value: part.slice(eq + 1).trim(),
                domain: originHost,
              };
            })
            .filter(Boolean) as any[],
          originHost,
        );
  return { ...(stored as any), cookies } as ProxySession;
}

function sealedFromRequest(req: { headers?: any }): string {
  const cookie = String(req.headers?.cookie || '');
  const match = cookie.match(/(?:^|;\s*)atm_px_s=([^;]+)/);
  return match ? decodeURIComponent(match[1].trim()) : '';
}

async function resolveSession(token: string, req?: { headers?: any }): Promise<ProxySession | null> {
  pruneSessions();
  const id = String(token || '').trim();
  if (!id) return null;
  const mem = sessions.get(id);
  if (mem && mem.expiresAt > Date.now()) {
    mem.expiresAt = Date.now() + SESSION_TTL_MS;
    return mem;
  }
  const stored = await loadStoredSession(id);
  if (stored && stored.expiresAt > Date.now()) {
    const session = hydrateSession(stored as any);
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    sessions.set(id, session);
    return session;
  }

  // Last resort: sealed blob carried by the browser (survives missing DB table).
  if (req) {
    const sealed = sealedFromRequest(req);
    if (sealed) {
      const parsed = unsealSession(sealed);
      if (parsed && parsed.token === id && parsed.expiresAt > Date.now()) {
        const session = hydrateSession(parsed as any);
        session.expiresAt = Date.now() + SESSION_TTL_MS;
        sessions.set(id, session);
        void persistStoredSession(session as unknown as StoredProxySession);
        return session;
      }
    }
  }
  return null;
}

async function rememberSession(session: ProxySession): Promise<string> {
  sessions.set(session.token, session);
  const sealed = sealSession(session as unknown as StoredProxySession);
  try {
    await persistStoredSession(session as unknown as StoredProxySession);
  } catch (err) {
    console.error('[tool-proxy] persist session failed', (err as any)?.message || err);
  }
  return sealed;
}

function escapeHtml(s: string) {
  return String(s || '').replace(/[&<>"']/g, ch => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[ch] || ch;
  });
}

function sessionLostPage(res: any, status = 410) {
  return res
    .status(status)
    .type('html')
    .send(
      `<!doctype html><meta charset="utf-8"><title>Session ended</title>
       <body style="font-family:system-ui;background:#0d0908;color:#fecaca;padding:2.5rem;max-width:34rem;margin:auto">
       <h1 style="font-size:1.25rem">Tool session ended</h1>
       <p style="color:#94a3b8;font-size:.9rem">Go back to your dashboard and click <strong>Open</strong> on the tool again.</p>
       </body>`,
    );
}

function isDocumentRequest(req: any): boolean {
  const method = String(req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') return false;
  const dest = String(req.headers?.['sec-fetch-dest'] || '').toLowerCase();
  if (dest) return dest === 'document' || dest === 'iframe';
  const accept = String(req.headers?.accept || '');
  return /text\/html/i.test(accept);
}

/** Run one proxied request for a session and keep the cookie jar fresh. */
async function proxyThrough(session: ProxySession, req: any, res: any, url: string) {
  return runWithProxySticky(session.token, async () => {
    const document = isDocumentRequest(req);
    // Pak SEO algorithm: panel tools spoof the dashboard Referer on every request
    // (not only the first HTML document). Real sites keep an empty referrer so the
    // browser's mapped /fx/… Referer becomes chatgpt.com / etc.
    const panelMode = Boolean(session.referrer);
    const target: ProxyTarget = {
      token: session.token,
      origin: session.origin,
      cookies: session.cookies,
      referrer: panelMode ? session.referrer : '',
      referrerCandidates: panelMode ? session.referrerCandidates : [],
    };

    const before = session.cookies.length;
    const result = await forwardRequest({ target, req, res, url, document });

    const changed =
      result.cookies !== session.cookies &&
      (result.cookies.length !== before ||
        JSON.stringify(result.cookies) !== JSON.stringify(session.cookies));
    session.cookies = result.cookies;
    session.cookieHeader = cookiesToHeader(result.cookies);
    if (result.referrerUsed && panelMode) session.referrer = result.referrerUsed;
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    // Always persist — Vercel lambdas lose memory; skipping DB writes caused
    // ChatGPT mid-session 410 / lost cookies while Send was still loading.
    const sealed = await rememberSession(session);
    if (changed || result.referrerUsed || document) {
      setProxyCookie(res, session.token, sealed);
    } else {
      sessions.set(session.token, session);
    }
  });
}

router.post('/launch', async (req, res) => {
  try {
    const gate = await requireEntitledLaunch(req);
    if (gate.ok === false) {
      return res.status(gate.status).json({ error: gate.error });
    }

    const { profile, tool, fields, cookies } = gate;
    const dest = fields.url;

    if (isOneClickBlockedHost(dest)) {
      return res.status(403).json({
        error:
          'Canva and similar sites cannot use one-click — they require Cloudflare in a real browser. In Admin → Cookies set this tool to By extension.',
        accessMethod: 'extension',
        blockedHost: true,
      });
    }

    // "By extension" tools must use the Access extension — never the server proxy.
    if (fields.accessMethod !== 'one_click') {
      return res.status(403).json({
        error:
          'This tool requires the ZynexTools Access browser extension. Install it from the Installation Guide, then open again.',
        accessMethod: 'extension',
      });
    }

    let origin: string;
    try {
      origin = new URL(dest).origin;
    } catch {
      return res.status(400).json({ error: 'Invalid tool destination URL' });
    }

    const proxyStatus = await getGlobalProxyPublicStatus();
    if (!proxyStatus.ready) {
      return res.status(503).json({
        error:
          'Global Proxy Engine is not ready. Admin must enable it with a residential sticky HTTP proxy (Webshare) and pass the one-click test.',
      });
    }

    const liveRaw = filterLiveCookies(cookies);
    if (!liveRaw.length) {
      return res.status(400).json({
        error:
          'All saved cookies are expired. Admin must copy fresh cookies from a logged-in session and save again in Admin → Cookies.',
      });
    }

    const referrer = resolvePanelUnlockReferrer(fields.panelReferrer, dest);
    let originHost = '';
    try {
      originHost = new URL(origin).hostname;
    } catch {
      /* ignore */
    }
    const jar = normalizeCookies(liveRaw, originHost);

    pruneSessions();
    const token = newToken();

    const bootstrap = await runWithProxySticky(token, () =>
      bootstrapSessionCookies({
        origin,
        cookies: jar,
        referrer: referrer || `${origin}/`,
      }),
    );
    if (!bootstrap.ok) {
      return res.status(502).json({
        error:
          bootstrap.errors[0] ||
          'Could not warm the tool session. Copy fresh cookies or check Global Proxy Engine in Admin.',
        details: bootstrap.errors,
      });
    }

    const session: ProxySession = {
      token,
      accountId: String(profile.id),
      toolId: String(tool.id || ''),
      toolName: String(tool.name || 'Tool'),
      targetUrl: dest,
      origin,
      cookies: bootstrap.cookies,
      cookieHeader: cookiesToHeader(bootstrap.cookies),
      cookieHosts: hostsFromCookies(liveRaw, origin),
      referrer: referrer || (isPanelUnlockUrl(dest) ? DEFAULT_PANEL_REFERRER : ''),
      referrerCandidates: isPanelUnlockUrl(dest)
        ? panelUnlockReferrerCandidates(fields.panelReferrer || referrer || DEFAULT_PANEL_REFERRER)
        : [],
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    const sealed = await rememberSession(session);
    setProxyCookie(res, token, sealed);

    return res.json({
      mode: 'proxy',
      viewUrl: publicFxPath(token),
      url: dest,
      name: tool.name,
      toolId: tool.id,
      expiresInSec: Math.floor(SESSION_TTL_MS / 1000),
      viaGlobalProxy: proxyStatus.ready,
      fingerprint: createHash('sha256').update(session.cookieHeader || dest).digest('hex').slice(0, 12),
    });
  } catch (error: any) {
    const message = String(error?.message || '').trim();
    console.error('[tool-proxy/launch]', message || error);
    return res.status(500).json({ error: message || 'Could not start tool proxy' });
  }
});

/**
 * Reverse proxy mounted at /fx/:token — serves the tool document and every
 * request the page makes afterwards (same-origin and cross-host).
 */
export async function handleFxProxy(req: any, res: any) {
  let session: ProxySession | null = null;
  try {
    const token = tokenFromRequest(req);
    if (!token) return sessionLostPage(res, 400);

    session = await resolveSession(token, req);
    if (!session) return sessionLostPage(res);

    const remainder = String(req.url || '/');
    const pathOnly = remainder.split('?')[0] || '/';
    // Browser landed on /fx/<token>/fx/<token>/… — bounce to the single prefix.
    const nestedPrefix = `/fx/${encodeURIComponent(session.token)}`;
    if (pathOnly === nestedPrefix || pathOnly.startsWith(`${nestedPrefix}/`)) {
      const cleaned = unwrapNestedFxPath(session.token, pathOnly);
      const q = remainder.includes('?') ? remainder.slice(remainder.indexOf('?')) : '';
      return res.redirect(302, `${nestedPrefix}${cleaned === '/' ? '/' : cleaned}${q}`);
    }

    const isRoot = pathOnly === '/' || pathOnly === '';
    if (isDocumentRequest(req) && /(?:^|[?&])__cf_chl/i.test(String(req.url || ''))) {
      let host = session.origin;
      try {
        host = new URL(session.origin).hostname;
      } catch {
        /* ignore */
      }
      return res.status(403).type('html').send(oneClickBlockedHtml(host));
    }

    const target: ProxyTarget = {
      token: session.token,
      origin: session.origin,
      cookies: session.cookies,
      referrer: session.referrer,
    };
    const url = isRoot
      ? session.targetUrl
      : fromProxyPath(target, remainder);
    if (!url) return res.status(400).json({ error: 'Invalid proxy path' });

    const sealed = sealSession(session as unknown as StoredProxySession);
    setProxyCookie(res, session.token, sealed);
    await proxyThrough(session, req, res, url);
  } catch (error: any) {
    const message = String(error?.message || 'Proxy request failed');
    console.error('[tool-proxy/fx]', message);
    if (res.headersSent) return;
    if (isDocumentRequest(req)) {
      return res
        .status(502)
        .type('html')
        .send(
          `<!doctype html><meta charset="utf-8"><title>Could not open tool</title>
           <body style="font-family:system-ui;background:#0d0908;color:#fecaca;padding:2.5rem;max-width:34rem;margin:auto">
           <h1 style="font-size:1.25rem">Could not open this tool</h1>
           <p style="color:#94a3b8;font-size:.9rem">${escapeHtml(message)}</p>
           </body>`,
        );
    }
    return res.status(502).json({ error: message });
  }
}

/**
 * Safety net for pages that request absolute root paths (e.g. /backend-api/…)
 * before the injected runtime loads. Uses the atm_px session cookie.
 */
export async function handleOriginToolApi(req: any, res: any) {
  try {
    const session = await resolveSession(tokenFromReferer(req) || tokenFromRequest(req), req);
    if (!session) {
      return res.status(401).json({ error: 'No tool session. Open the tool from the dashboard again.' });
    }
    const original = String(req.originalUrl || req.url || '/');
    const base = session.origin.endsWith('/') ? session.origin : `${session.origin}/`;
    const url = new URL(original, base).href;
    await proxyThrough(session, req, res, url);
  } catch (error: any) {
    if (res.headersSent) return;
    return res.status(502).json({ error: error?.message || 'Tool API proxy failed' });
  }
}

/** Never proxied — these belong to the portal itself. */
const RESERVED_PATHS = [
  /^\/api\/tool-proxy(\/|$)/,
  /^\/api\/admin(\/|$)/,
  /^\/api\/accounts(\/|$)/,
  /^\/api\/devices(\/|$)/,
  /^\/api\/settings(\/|$)/,
  /^\/api\/extension(\/|$)/,
  /^\/api\/notifications(\/|$)/,
  /^\/api\/ai(\/|$)/,
  /^\/api\/seo(\/|$)/,
  /^\/api\/health$/,
  /^\/api\/health$/,
  /^\/fx(\/|$)/,
  /^\/go(\/|$)/,
  /^\/health$/,
];

/** Paths ChatGPT asks for on the portal origin — always claim when a tool session exists. */
const TOOL_ORIGIN_API = [
  /^\/backend-api(\/|$)/,
  /^\/public-api(\/|$)/,
  /^\/backend-anon(\/|$)/,
  /^\/ces(\/|$)/,
  /^\/api\/auth(\/|$)/,
  /^\/api\/subscriptions(\/|$)/,
  /^\/api\/communications(\/|$)/,
];

/** Portal assets: only protected when the request did not come from a tool page. */
const PORTAL_ASSET_PATHS = [
  /^\/assets\//,
  /^\/src\//,
  /^\/@/,
  /^\/node_modules\//,
  /^\/favicon/,
  /^\/manifest/,
  /^\/robots\.txt$/,
  /^\/sitemap/,
  /^\/vite\.svg$/,
];

/**
 * Last-resort proxy for requests a proxied page makes to absolute portal paths
 * (ES module imports, preloads, worker scripts). Keeps every tool working even
 * when the injected runtime cannot see the URL being built.
 */
export async function handlePortalToolFallback(req: any, res: any, next: any) {
  try {
    const path = String(req.path || req.url || '/').split('?')[0];
    if (RESERVED_PATHS.some(rx => rx.test(path))) return next();

    // The referring page's token wins so several tools can be open at once.
    const refererToken = tokenFromReferer(req);
    const token = refererToken || tokenFromRequest(req);
    if (!token) return next();

    const fromProxiedPage = Boolean(refererToken);
    const isToolApi = TOOL_ORIGIN_API.some(rx => rx.test(path));
    if (!fromProxiedPage && !isToolApi && PORTAL_ASSET_PATHS.some(rx => rx.test(path))) return next();

    const dest = String(req.headers?.['sec-fetch-dest'] || '').toLowerCase();
    const isSubresource = Boolean(dest) && dest !== 'document' && dest !== 'empty';
    // Tool API paths (auth/session, backend-api) must be claimed whenever we have
    // a session cookie — ChatGPT calls them with same-origin absolute paths.
    if (!fromProxiedPage && !isToolApi && !isSubresource) return next();

    const session = await resolveSession(token, req);
    if (!session) return next();

    const base = session.origin.endsWith('/') ? session.origin : `${session.origin}/`;
    const url = new URL(String(req.originalUrl || req.url || '/'), base).href;
    await proxyThrough(session, req, res, url);
  } catch (error: any) {
    if (res.headersSent) return;
    return next();
  }
}

/** Legacy entry points kept so older tabs/links keep working. */
export async function handleProxyView(req: any, res: any) {
  const token = tokenFromRequest(req);
  if (!token) return sessionLostPage(res, 400);
  const session = await resolveSession(token, req);
  if (!session) return sessionLostPage(res);
  const sealed = sealSession(session as unknown as StoredProxySession);
  setProxyCookie(res, session.token, sealed);
  return res.redirect(302, publicFxPath(session.token));
}

export async function handleProxyAsset(req: any, res: any) {
  try {
    const session = await resolveSession(tokenFromRequest(req), req);
    if (!session) return res.status(410).json({ error: 'Tool session ended' });
    const url = String(req.query?.u || '').trim();
    if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'Invalid asset URL' });
    await proxyThrough(session, req, res, url);
  } catch (error: any) {
    if (res.headersSent) return;
    return res.status(502).json({ error: error?.message || 'Asset proxy failed' });
  }
}

router.get('/view', (req, res) => {
  void handleProxyView(req, res);
});

router.all('/asset', (req, res) => {
  void handleProxyAsset(req, res);
});

export default router;
