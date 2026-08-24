/**
 * Server-side tool panel proxy — unlocks *.toolaccess.click without the Chrome extension.
 * Uses admin-stored cookies + panel Referer on the server; never exposes the service role.
 */
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';
import { planIsActive } from './accountStore';
import {
  registerOrHeartbeatDevice,
  readDeviceFromRequest,
  DEVICE_LIMIT_MESSAGE,
} from './deviceSessions';
import { getGlobalProxyPublicStatus } from './globalProxySettings';
import { proxyAwareFetch } from './proxyFetch';
import {
  loadStoredSession,
  persistStoredSession,
  type StoredProxySession,
} from './proxySessionStore';

const router = Router();

const SESSION_TTL_MS = 20 * 60 * 1000;
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 12;

type ProxySession = {
  token: string;
  accountId: string;
  toolId: string;
  toolName: string;
  targetUrl: string;
  origin: string;
  cookieHeader: string;
  /** Hosts allowed for asset rewriting / cookie-bearing proxy (from cookie domains + origin). */
  cookieHosts: string[];
  referrer: string;
  /** Ordered Referer candidates to retry on 403 panel denial. */
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

// Avoid sticky timers on Vercel serverless cold starts; prune on demand instead.
if (!process.env.VERCEL) {
  setInterval(pruneSessions, 60_000).unref?.();
}

function config() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase authentication is not configured');
  return { url, anon };
}

function client(token?: string) {
  const { url, anon } = config();
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}

function toolsDb() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !(serviceKey || anon)) throw new Error('Supabase authentication is not configured');
  return createClient(url, serviceKey || anon!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
    let d = String(c?.domain || '')
      .trim()
      .replace(/^\./, '')
      .toLowerCase();
    if (d) hosts.add(d);
  }
  return [...hosts];
}

/** Static/API hosts ChatGPT (and similar) load from — must be proxied or CSS never applies. */
function relatedHostsForOrigin(origin: string): string[] {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (/(chatgpt|openai|oaistatic)/i.test(host)) {
      return [
        'chatgpt.com',
        'chat.openai.com',
        'openai.com',
        'oaistatic.com',
        'oaiusercontent.com',
        'auth.openai.com',
        'ab.chatgpt.com',
      ];
    }
    if (host === 'toolaccess.click' || host.endsWith('.toolaccess.click')) {
      return ['toolaccess.click'];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function hostAllowed(host: string, domains: string[]): boolean {
  const h = host.toLowerCase();
  return domains.some(d => {
    const domain = String(d || '')
      .replace(/^\./, '')
      .toLowerCase();
    return Boolean(domain) && (h === domain || h.endsWith(`.${domain}`));
  });
}

function isStaticCdnHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === 'oaistatic.com' || h.endsWith('.oaistatic.com') || h.endsWith('.oaiusercontent.com');
}

function isToolAccessUrl(url?: string | null): boolean {
  try {
    const host = new URL(String(url || '').trim()).hostname.toLowerCase();
    return host === 'toolaccess.click' || host.endsWith('.toolaccess.click');
  } catch {
    return /toolaccess\.click/i.test(String(url || ''));
  }
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
  if (!isToolAccessUrl(dest) && !String(raw || '').trim()) return '';
  const normalized = normalizePanelUnlockReferrer(raw);
  if (normalized) return normalized;
  if (isToolAccessUrl(dest)) return DEFAULT_PANEL_REFERRER;
  return '';
}

function isPanelAccessDenied(status: number, contentType: string | null, bodyPreview: string): boolean {
  if (status !== 403) return false;
  const text = String(bodyPreview || '');
  return /access denied|pak seo|tool dashboard/i.test(text) || /text\/html/i.test(String(contentType || ''));
}

/** Merge upstream Set-Cookie into the session Cookie header (keeps PHPSESSID continuity). */
function mergeSetCookies(existingHeader: string, response: Response): string {
  const jar = new Map<string, string>();
  for (const part of String(existingHeader || '').split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) jar.set(name, value);
  }

  const rawList: string[] =
    typeof (response.headers as any).getSetCookie === 'function'
      ? (response.headers as any).getSetCookie()
      : [];
  if (!rawList.length) {
    const single = response.headers.get('set-cookie');
    if (single) rawList.push(single);
  }

  for (const raw of rawList) {
    const first = String(raw || '').split(';')[0] || '';
    const eq = first.indexOf('=');
    if (eq <= 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (name) jar.set(name, value);
  }

  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
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

function cookieFields(tool: any) {
  const extra = parseExtraJson(tool?.extra);
  const method = tool?.access_method || extra.accessMethod || extra.access_method;
  const url = tool?.tool_url || extra.toolUrl || extra.tool_url || '';
  const cookiesRaw = tool?.cookies_json ?? extra.cookiesJson ?? extra.cookies_json ?? '';
  const panelReferrer =
    tool?.panel_referrer ||
    extra.panelReferrer ||
    extra.unlockReferrer ||
    extra.panel_referrer ||
    '';
  const normalized =
    String(method || '').trim().toLowerCase() === 'one_click'
      ? ('one_click' as const)
      : ('extension' as const);
  return {
    accessMethod: normalized,
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

function publicGoPath(dest: string): string {
  try {
    const u = new URL(dest);
    const path = u.pathname && u.pathname !== '/' ? u.pathname : '/';
    return `/go/${u.host}${path}`;
  } catch {
    return '/go';
  }
}

function tokenFromRequest(req: { query?: any; headers?: any; params?: any }): string {
  const fromQuery = String(req.query?.token || '').trim();
  if (fromQuery) return fromQuery;
  const fromParam = String(req.params?.token || '').trim();
  if (fromParam) return fromParam;
  const cookie = String(req.headers?.cookie || '');
  const match = cookie.match(/(?:^|;\s*)atm_px=([^;]+)/);
  return match ? decodeURIComponent(match[1].trim()) : '';
}

function setProxyCookie(res: { setHeader: (k: string, v: string) => void }, token: string) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `atm_px=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly${secure}`,
  );
}

function resolveAgainst(base: string, href: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function shouldProxyUrl(session: ProxySession, absoluteUrl: string): boolean {
  try {
    const u = new URL(absoluteUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    const originHost = new URL(session.origin).hostname.toLowerCase();
    if (host === originHost || host.endsWith(`.${originHost}`)) return true;
    if (host === 'toolaccess.click' || host.endsWith('.toolaccess.click')) return true;
    if (hostAllowed(host, session.cookieHosts || [])) return true;
    if (hostAllowed(host, relatedHostsForOrigin(session.origin))) return true;
    return false;
  } catch {
    return false;
  }
}

function cookieHeaderForTarget(session: ProxySession, url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (isStaticCdnHost(host)) return '';
    const originHost = new URL(session.origin).hostname.toLowerCase();
    if (host === originHost || host.endsWith(`.${originHost}`) || originHost.endsWith(`.${host}`)) {
      return session.cookieHeader;
    }
    if (hostAllowed(host, session.cookieHosts || [])) return session.cookieHeader;
    if (hostAllowed(host, relatedHostsForOrigin(session.origin)) && !isStaticCdnHost(host)) {
      return session.cookieHeader;
    }
    return '';
  } catch {
    return session.cookieHeader;
  }
}

async function resolveSession(token: string): Promise<ProxySession | null> {
  pruneSessions();
  const id = String(token || '').trim();
  if (!id) return null;
  const mem = sessions.get(id);
  if (mem && mem.expiresAt > Date.now()) {
    mem.expiresAt = Date.now() + SESSION_TTL_MS;
    return mem;
  }
  const stored = await loadStoredSession(id);
  if (!stored || stored.expiresAt <= Date.now()) return null;
  stored.expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(id, stored);
  return stored;
}

async function rememberSession(session: ProxySession): Promise<void> {
  sessions.set(session.token, session);
  try {
    await persistStoredSession(session as StoredProxySession);
  } catch (err) {
    console.error('[tool-proxy] persist session failed', (err as any)?.message || err);
  }
}

function proxyAssetUrl(token: string, absoluteUrl: string): string {
  return `/api/tool-proxy/asset?token=${encodeURIComponent(token)}&u=${encodeURIComponent(absoluteUrl)}`;
}

function rewriteEmbeddedUrls(text: string, session: ProxySession, pageUrl: string): string {
  return String(text || '').replace(
    /https?:\/\/[^\s"'<>\\)]+/gi,
    raw => {
      const cleaned = raw.replace(/[.,;]+$/, '');
      const abs = resolveAgainst(pageUrl, cleaned);
      if (!abs || !shouldProxyUrl(session, abs)) return raw;
      return proxyAssetUrl(session.token, abs);
    },
  );
}

function proxyBootstrapScript(session: ProxySession): string {
  const token = JSON.stringify(session.token);
  const root = JSON.stringify(session.origin.endsWith('/') ? session.origin : `${session.origin}/`);
  const allow = JSON.stringify(
    [...new Set([...(session.cookieHosts || []), ...relatedHostsForOrigin(session.origin)])],
  );
  const goPath = JSON.stringify(publicGoPath(session.targetUrl || session.origin));
  return `<script data-atm-proxy="1">
(function(){
  var TOKEN=${token};
  var ROOT=${root};
  var ALLOW=${allow};
  var GOPATH=${goPath};
  try {
    sessionStorage.setItem('atm_px', TOKEN);
    sessionStorage.setItem('atm_px_go', GOPATH);
    if (location.search) history.replaceState(null, '', location.pathname);
  } catch (e) {}
  function hostOk(h){
    h=String(h||'').toLowerCase();
    for (var i=0;i<ALLOW.length;i++){
      var d=String(ALLOW[i]||'').replace(/^\\./,'').toLowerCase();
      if(d && (h===d || h.slice(-(d.length+1))==='.'+d)) return true;
    }
    return false;
  }
  function toToolUrl(u){
    try {
      var a=new URL(u, location.href);
      if (a.hostname===location.hostname || /vercel\\.app$/i.test(a.hostname)) {
        if (/^\\/api\\/tool-proxy\\//i.test(a.pathname)) return null;
        if (/^\\/go(\\/|$)/i.test(a.pathname)) return new URL('/' + (a.search||'') + (a.hash||''), ROOT).href;
        return new URL(a.pathname + a.search + a.hash, ROOT).href;
      }
      return a.href;
    } catch(e){ return null; }
  }
  function wrap(u){
    var a=toToolUrl(u);
    if(!a) return u;
    try {
      var h=new URL(a).hostname;
      if(!hostOk(h)) return u;
    } catch(e){ return u; }
    return '/api/tool-proxy/asset?token='+encodeURIComponent(TOKEN)+'&u='+encodeURIComponent(a);
  }
  var ofetch=window.fetch;
  window.fetch=function(input, init){
    try {
      var raw=typeof input==='string'?input:(input&&input.url);
      if(raw){
        var w=wrap(raw);
        if(w!==raw){
          if(typeof input==='string') return ofetch.call(this, w, init);
          return ofetch.call(this, new Request(w, input), init);
        }
      }
    } catch(e){}
    return ofetch.apply(this, arguments);
  };
  var oopen=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(m, url){
    var args=Array.prototype.slice.call(arguments);
    if(typeof url==='string') args[1]=wrap(url);
    return oopen.apply(this, args);
  };
  document.addEventListener('submit', function(e){
    try {
      var form=e.target;
      if(!form || form.tagName!=='FORM') return;
      var action=form.getAttribute('action') || location.href;
      var tool=toToolUrl(action);
      if(!tool) { e.preventDefault(); e.stopPropagation(); return; }
      var resolved=new URL(action, location.href);
      if(resolved.hostname!==location.hostname && !/vercel\\.app$/i.test(resolved.hostname)) return;
      e.preventDefault();
      e.stopPropagation();
      var method=(form.getAttribute('method')||'GET').toUpperCase();
      var fd=new FormData(form);
      if(method==='GET'){
        var dest=new URL(tool);
        fd.forEach(function(v,k){ dest.searchParams.set(k, String(v)); });
        location.href=wrap(dest.href);
        return;
      }
      ofetch.call(window, wrap(tool), { method: method, body: fd, credentials: 'same-origin' })
        .then(function(r){ return r.text(); })
        .then(function(html){
          if(html) document.open(); document.write(html); document.close();
        })
        .catch(function(){ location.href=GOPATH+'?token='+encodeURIComponent(TOKEN); });
    } catch(err){}
  }, true);
})();
</script>`;
}

function rewriteHtml(html: string, session: ProxySession, pageUrl: string): string {
  const baseHref = pageUrl || session.targetUrl;
  const token = session.token;

  const rewriteAttr = (_attr: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('javascript:')) {
      return value;
    }
    if (trimmed.startsWith('#')) return value;
    const abs = resolveAgainst(baseHref, trimmed);
    if (!abs || !shouldProxyUrl(session, abs)) return value;
    return proxyAssetUrl(token, abs);
  };

  let out = html;

  out = out.replace(/<base\b[^>]*>/gi, '');
  out = out.replace(/<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '');

  out = out.replace(
    /\b(href|src|action|data-src|poster|data-href)=["']([^"']+)["']/gi,
    (_m, attr: string, val: string) => `${attr}="${rewriteAttr(attr, val)}"`,
  );

  out = out.replace(/\bsrcset=["']([^"']+)["']/gi, (_m, val: string) => {
    const parts = val.split(',').map((chunk: string) => {
      const bit = chunk.trim();
      if (!bit) return bit;
      const [urlPart, ...rest] = bit.split(/\s+/);
      const rewritten = rewriteAttr('srcset', urlPart);
      return [rewritten, ...rest].join(' ');
    });
    return `srcset="${parts.join(', ')}"`;
  });

  out = out.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (_m, _q: string, val: string) => {
    const rewritten = rewriteAttr('css', val.trim());
    return `url("${rewritten}")`;
  });

  out = rewriteEmbeddedUrls(out, session, baseHref);

  const boot = proxyBootstrapScript(session);

  if (/<head[\s>]/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>${boot}`);
  } else {
    out = boot + out;
  }

  return out;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildUpstreamHeaders(
  session: ProxySession,
  forUrl: string,
  opts?: { referrerOverride?: string; navigation?: boolean },
): Record<string, string> {
  const referrer = String(opts?.referrerOverride || session.referrer || '').trim();
  const navigation = opts?.navigation !== false;
  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: navigation
      ? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      : '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Upgrade-Insecure-Requests': '1',
  };
  if (navigation) {
    headers['Sec-Fetch-Dest'] = 'document';
    headers['Sec-Fetch-Mode'] = 'navigate';
    headers['Sec-Fetch-User'] = '?1';
    headers['Sec-Fetch-Site'] = referrer ? 'cross-site' : 'none';
  }
  const cookies = cookieHeaderForTarget(session, forUrl);
  if (cookies) headers.Cookie = cookies;
  if (referrer) {
    headers.Referer = referrer;
    try {
      headers.Origin = new URL(referrer).origin;
    } catch {
      /* ignore */
    }
  } else {
    try {
      headers.Referer = new URL(session.origin).origin + '/';
      headers.Origin = new URL(session.origin).origin;
    } catch {
      try {
        headers.Referer = new URL(forUrl).origin + '/';
      } catch {
        /* ignore */
      }
    }
  }
  return headers;
}

async function fetchUpstream(
  session: ProxySession,
  url: string,
  init?: { method?: string; body?: Buffer | string | null },
): Promise<Response> {
  let current = url;
  let method = init?.method || 'GET';
  let body = init?.body ?? null;

  const candidates = (session.referrerCandidates?.length
    ? session.referrerCandidates
    : [session.referrer]
  ).filter(Boolean);
  // Try primary referrer first; on panel 403, walk remaining candidates once each.
  let candidateIdx = 0;
  const tried = new Set<string>();

  for (let i = 0; i < MAX_REDIRECTS; i++) {
    const activeReferrer = candidates[candidateIdx] || session.referrer || '';
    if (activeReferrer) {
      session.referrer = activeReferrer;
      tried.add(activeReferrer);
    }

    const response = await proxyAwareFetch(current, {
      method,
      redirect: 'manual',
      headers: buildUpstreamHeaders(session, current, {
        referrerOverride: activeReferrer,
        navigation: !/\.(css|js|mjs|png|jpe?g|gif|webp|svg|woff2?|ttf|ico)(\?|$)/i.test(current),
      }),
      body: method === 'GET' || method === 'HEAD' ? undefined : body || undefined,
    });

    // Persist PHPSESSID / other Set-Cookie values for follow-up asset requests.
    session.cookieHeader = mergeSetCookies(session.cookieHeader, response);

    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get('location');
      if (!loc) return response;
      const next = resolveAgainst(current, loc);
      if (!next) return response;
      current = next;
      method = 'GET';
      body = null;
      continue;
    }

    if (response.status === 403 && isToolAccessUrl(current)) {
      const contentType = response.headers.get('content-type') || '';
      const previewBuf = await response.clone().arrayBuffer();
      const preview = Buffer.from(previewBuf).toString('utf8').slice(0, 400);
      if (isPanelAccessDenied(403, contentType, preview)) {
        let advanced = false;
        while (candidateIdx + 1 < candidates.length) {
          candidateIdx += 1;
          const nextRef = candidates[candidateIdx];
          if (nextRef && !tried.has(nextRef)) {
            advanced = true;
            break;
          }
        }
        if (advanced) {
          // Retry same URL with the next Referer candidate (fresh GET).
          method = 'GET';
          body = null;
          continue;
        }
      }
    }

    return response;
  }
  throw new Error('Too many redirects from upstream tool panel');
}

async function readLimited(response: Response): Promise<Buffer> {
  const ab = await response.arrayBuffer();
  if (ab.byteLength > MAX_BODY_BYTES) {
    throw new Error('Upstream response too large to proxy');
  }
  return Buffer.from(ab);
}

/**
 * POST /api/tool-proxy/launch
 * Body: { toolId }
 * Creates a short-lived proxy session and returns a same-origin view URL.
 */
router.post('/launch', async (req, res) => {
  try {
    const gate = await requireEntitledLaunch(req);
    if (gate.ok === false) {
      return res.status(gate.status).json({ error: gate.error });
    }

    const { profile, tool, fields, cookies } = gate;
    const dest = fields.url;

    // By extension tools must use the Access extension — never Session Apply / proxy bypass.
    if (fields.accessMethod !== 'one_click') {
      return res.status(403).json({
        error:
          'This tool requires the AI Toolz Mart Access browser extension. Install it from the Installation Guide, then open again.',
        accessMethod: 'extension',
      });
    }

    const preferProxy =
      isToolAccessUrl(dest) ||
      Boolean(fields.panelReferrer) ||
      Boolean(req.body?.forceProxy) ||
      cookies.length > 0;

    // When Global Proxy Engine is ready, always prefer server proxy for one-click
    // (even empty cookies) so residential IP routing applies.
    const proxyStatus = await getGlobalProxyPublicStatus();
    const useServerProxy = preferProxy || proxyStatus.ready;

    if (!useServerProxy) {
      return res.json({
        mode: 'direct',
        url: dest,
        name: tool.name,
        toolId: tool.id,
        message: 'This destination is opened directly; use Copy cookies + open for HttpOnly sites.',
      });
    }

    const cookieHeader = cookiesToHeader(cookies);
    let origin: string;
    try {
      origin = new URL(dest).origin;
    } catch {
      return res.status(400).json({ error: 'Invalid tool destination URL' });
    }

    const referrer = resolvePanelUnlockReferrer(fields.panelReferrer, dest);
    const referrerCandidates = panelUnlockReferrerCandidates(
      fields.panelReferrer || referrer || DEFAULT_PANEL_REFERRER,
    );

    pruneSessions();
    const token = newToken();
    const session: ProxySession = {
      token,
      accountId: String(profile.id),
      toolId: String(tool.id || ''),
      toolName: String(tool.name || 'Tool'),
      targetUrl: dest,
      origin,
      cookieHeader,
      cookieHosts: hostsFromCookies(cookies, origin),
      referrer: referrer || (isToolAccessUrl(dest) ? DEFAULT_PANEL_REFERRER : ''),
      referrerCandidates:
        referrerCandidates.length > 0
          ? referrerCandidates
          : isToolAccessUrl(dest)
            ? [DEFAULT_PANEL_REFERRER]
            : [],
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    sessions.set(token, session);
    await rememberSession(session);
    setProxyCookie(res, token);

    // Use the API path (not /go/…) so Vercel never serves the SPA homepage.
    const viewUrl = `/api/tool-proxy/view?token=${encodeURIComponent(token)}`;
    return res.json({
      mode: 'proxy',
      viewUrl,
      url: dest,
      name: tool.name,
      toolId: tool.id,
      expiresInSec: Math.floor(SESSION_TTL_MS / 1000),
      viaGlobalProxy: proxyStatus.ready,
      fingerprint: createHash('sha256').update(cookieHeader || dest).digest('hex').slice(0, 12),
    });
  } catch (error: any) {
    const message = String(error?.message || '').trim();
    console.error('[tool-proxy/launch]', message || error);
    return res.status(500).json({
      error: message || 'Could not start tool proxy',
      detail: process.env.NODE_ENV === 'production' ? undefined : message || undefined,
    });
  }
});

/**
 * GET /api/tool-proxy/view?token=
 * Fetches the panel HTML with Cookie + Referer and rewrites assets through this proxy.
 */
async function handleProxyView(req: any, res: any) {
  try {
    const token = tokenFromRequest(req);
    const session = await resolveSession(token);
    if (!session) {
      return res
        .status(410)
        .type('html')
        .send(
          `<!doctype html><meta charset="utf-8"><title>Reconnecting…</title>
           <body style="font-family:system-ui;background:#130d0d;color:#fecaca;padding:2rem">
           <h1>Reconnecting…</h1>
           <p>Restoring your tool session…</p>
           <script>
           (function(){
             try {
               var t = sessionStorage.getItem('atm_px');
               var go = sessionStorage.getItem('atm_px_go') || '/go/';
               if (t) {
                 var url = go + (go.indexOf('?') >= 0 ? '&' : '?') + 'token=' + encodeURIComponent(t);
                 location.replace(url);
                 return;
               }
             } catch (e) {}
             document.body.innerHTML = '<h1>Session expired</h1><p>Return to the dashboard and click Open again.</p>';
           })();
           </script>
           </body>`,
        );
    }

    session.expiresAt = Date.now() + SESSION_TTL_MS;
    void rememberSession(session);
    setProxyCookie(res, session.token);
    const upstream = await fetchUpstream(session, session.targetUrl);
    const buf = await readLimited(upstream);
    const contentType = upstream.headers.get('content-type') || 'text/html; charset=utf-8';

    if (!/text\/html|application\/xhtml/i.test(contentType)) {
      res.status(upstream.status);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-store');
      return res.send(buf);
    }

    const html = rewriteHtml(buf.toString('utf8'), session, upstream.url || session.targetUrl);

    if (upstream.status === 403 && isPanelAccessDenied(403, contentType, html)) {
      return res
        .status(403)
        .type('html')
        .send(
          `<!doctype html><meta charset="utf-8"><title>Panel locked</title>
           <body style="font-family:system-ui;background:#130d0d;color:#fecaca;padding:2rem;max-width:40rem">
           <h1>Tool panel still locked (403)</h1>
           <p>The vendor returned <em>Access from Pak seo tool dashboard</em>. Referer alone is not enough — admin must paste cookies from an <strong>already unlocked</strong> toolaccess session, and set Panel unlock referrer to <code>https://app.pakseotools.com/</code> (not /login).</p>
           <p style="color:#94a3b8;font-size:0.85rem">Tried referrer: ${escapeHtml(session.referrer || '—')}</p>
           </body>`,
        );
    }

    res.status(upstream.status);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    return res.send(html);
  } catch (error: any) {
    return res
      .status(502)
      .type('html')
      .send(
        `<!doctype html><meta charset="utf-8"><title>Error</title>
         <body style="font-family:system-ui;background:#130d0d;color:#fecaca;padding:2rem">
         <h1>Could not open tool</h1>
         <p>${escapeHtml(error?.message || 'Upstream fetch failed')}</p>
         <p>Ask admin to refresh cookies, or try again from the dashboard.</p></body>`,
      );
  }
}

export { handleProxyView };

/**
 * GET|POST|… /api/tool-proxy/asset?token=&u=
 * Proxies tool assets and API calls (ChatGPT conversation POST/SSE) with session cookies.
 */
async function handleProxyAsset(req: any, res: any) {
  try {
    const token = tokenFromRequest(req);
    const target = String(req.query.u || '').trim();
    const session = await resolveSession(token);
    if (!session) {
      return res.status(410).json({ error: 'Proxy session expired' });
    }
    if (!target || !shouldProxyUrl(session, target)) {
      return res.status(400).json({ error: 'URL not allowed for this proxy session' });
    }

    session.expiresAt = Date.now() + SESSION_TTL_MS;
    void rememberSession(session);

    const method = String(req.method || 'GET').toUpperCase();
    let body: Buffer | string | null = null;
    if (method !== 'GET' && method !== 'HEAD') {
      if (Buffer.isBuffer(req.body)) body = req.body;
      else if (typeof req.body === 'string') body = req.body;
      else if (req.body && typeof req.body === 'object') body = JSON.stringify(req.body);
    }

    const forwardHeaders: Record<string, string> = {
      ...buildUpstreamHeaders(session, target, {
        referrerOverride: session.origin + '/',
        navigation: method === 'GET' && !/\/(backend-api|api|public-api)\//i.test(target),
      }),
    };
    const ct = req.headers['content-type'];
    if (ct && method !== 'GET' && method !== 'HEAD') forwardHeaders['Content-Type'] = String(ct);
    const accept = req.headers.accept;
    if (accept) forwardHeaders.Accept = String(accept);
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (typeof value !== 'string') continue;
      if (/^(oai-|openai-|chatgpt-|x-openai)/i.test(key)) {
        forwardHeaders[key] = value;
      }
    }
    try {
      forwardHeaders.Origin = new URL(session.origin).origin;
      forwardHeaders.Referer = new URL(session.origin).origin + '/';
    } catch {
      /* ignore */
    }

    let current = target;
    let upstream = await proxyAwareFetch(current, {
      method,
      redirect: 'manual',
      headers: forwardHeaders,
      body: method === 'GET' || method === 'HEAD' ? undefined : body || undefined,
    });
    session.cookieHeader = mergeSetCookies(session.cookieHeader, upstream);

    // Follow a few redirects for GET/HEAD; for POST expose redirect to client as-is or follow without body once.
    for (let i = 0; i < 5; i++) {
      if (upstream.status < 300 || upstream.status >= 400) break;
      const loc = upstream.headers.get('location');
      if (!loc) break;
      const next = resolveAgainst(current, loc);
      if (!next || !shouldProxyUrl(session, next)) break;
      current = next;
      upstream = await proxyAwareFetch(current, {
        method: 'GET',
        redirect: 'manual',
        headers: buildUpstreamHeaders(session, current, {
          referrerOverride: session.origin + '/',
          navigation: true,
        }),
      });
      session.cookieHeader = mergeSetCookies(session.cookieHeader, upstream);
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const streamLike =
      /event-stream|ndjson|octet-stream/i.test(contentType) ||
      /text\/event-stream/i.test(String(accept || ''));

    if (streamLike && upstream.body) {
      res.status(upstream.status);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-store');
      const cacheControl = upstream.headers.get('cache-control');
      if (cacheControl) res.setHeader('Cache-Control', cacheControl);
      const { Readable } = await import('stream');
      // @ts-expect-error Node Readable.fromWeb
      Readable.fromWeb(upstream.body).pipe(res);
      return;
    }

    const buf = await readLimited(upstream);

    if (/text\/html|application\/xhtml/i.test(contentType)) {
      const html = rewriteHtml(buf.toString('utf8'), session, upstream.url || current);
      res.status(upstream.status);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.send(html);
    }

    if (/text\/css/i.test(contentType)) {
      const css = buf.toString('utf8').replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (_m, _q, val: string) => {
        const abs = resolveAgainst(current, val.trim());
        if (!abs || !shouldProxyUrl(session, abs)) return `url("${val.trim()}")`;
        return `url("${proxyAssetUrl(session.token, abs)}")`;
      });
      res.status(upstream.status);
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.send(css);
    }

    let pathname = '';
    try {
      pathname = new URL(current).pathname;
    } catch {
      /* ignore */
    }
    const isJs =
      /javascript|ecmascript/i.test(contentType) ||
      (/\.m?js$/i.test(pathname) && !/json/i.test(contentType));
    if (isJs) {
      const js = rewriteEmbeddedUrls(buf.toString('utf8'), session, upstream.url || current);
      res.status(upstream.status);
      res.setHeader(
        'Content-Type',
        /javascript|ecmascript/i.test(contentType) ? contentType : 'application/javascript; charset=utf-8',
      );
      res.setHeader('Cache-Control', 'no-store');
      return res.send(js);
    }

    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(buf);
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'Asset proxy failed' });
  }
}

/**
 * GET /api/tool-proxy/view?token=
 * Fetches the panel HTML with Cookie + Referer and rewrites assets through this proxy.
 */
router.get('/view', (req, res) => {
  void handleProxyView(req, res);
});

router.all('/asset', (req, res) => {
  void handleProxyAsset(req, res);
});

export default router;
