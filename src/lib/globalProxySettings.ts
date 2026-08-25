/**
 * Global Proxy Engine — residential / HTTP proxy used by the server-side
 * tool cloud proxy so one-click tools can open without the Chrome extension.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const GLOBAL_PROXY_SETTING_KEY = 'global_proxy_engine';

export const GLOBAL_PROXY_SQL_HINT =
  'Run supabase_global_proxy_engine.sql (or supabase_device_limits_toggle.sql) in the Supabase SQL Editor so app_settings exists, then try again.';

export type GlobalProxyConfig = {
  enabled: boolean;
  /** Full proxy URL, e.g. http://user:pass@host:3128/ — never expose to non-admins. */
  url: string;
  setupRequired?: boolean;
};

export type GlobalProxyPublicStatus = {
  /** When true, one-click launches should use the server tool-proxy (no extension). */
  enabled: boolean;
  /** True when enabled and a non-empty proxy URL is configured. */
  ready: boolean;
};

const CACHE_MS = 8_000;
let cache: { at: number; value: GlobalProxyConfig } | null = null;

function serviceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for proxy settings');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function isAppSettingsMissing(message: unknown): boolean {
  return /app_settings|does not exist|schema cache|Could not find the table/i.test(
    String(message || ''),
  );
}

function parseConfig(raw: unknown): GlobalProxyConfig {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      enabled: Boolean(o.enabled),
      url: String(o.url || '').trim(),
    };
  }
  return { enabled: false, url: '' };
}

/** Always keep host:port visible (URL.href drops :80 for http). */
export function serializeProxyUrl(u: URL): string {
  const protocol = u.protocol === 'https:' ? 'https:' : 'http:';
  const port = u.port || (protocol === 'https:' ? '443' : '80');
  const user = u.username ? decodeURIComponent(u.username) : '';
  const pass = u.password ? decodeURIComponent(u.password) : '';
  const auth = user
    ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@`
    : '';
  return `${protocol}//${auth}${u.hostname}:${port}/`;
}

export function normalizeProxyUrl(raw: string): string {
  let s = String(raw || '').trim();
  if (!s) return '';
  // Allow host:port without scheme → assume http
  if (!/^https?:\/\//i.test(s) && !/^socks/i.test(s)) {
    s = `http://${s}`;
  }
  try {
    const u = new URL(s);
    if (/^socks/i.test(u.protocol)) {
      throw new Error(
        'Use the provider HTTP endpoint (http://user:pass@host:port/), not socks://. Residential HTTP is required for one-click.',
      );
    }
    if (!/^https?:$/i.test(u.protocol)) {
      throw new Error('Proxy URL must start with http:// or https://');
    }
    if (!u.hostname) {
      throw new Error('Invalid proxy URL. Example: http://user:pass@p.webshare.io:80/');
    }
    // Explicit port — some runtimes fail CONNECT when port is omitted.
    if (!u.port) {
      u.port = /^https:$/i.test(u.protocol) ? '443' : '80';
    }
    // Rotating usernames break sticky ChatGPT sessions.
    let user = decodeURIComponent(u.username || '');
    if (user) {
      user = user.replace(/-rotate$/i, '');
      u.username = user;
    }
    return serializeProxyUrl(u);
  } catch (err: any) {
    if (err?.message && /HTTP endpoint|must start with http|Invalid proxy|Example:/i.test(err.message)) {
      throw err;
    }
    throw new Error('Invalid proxy URL. Example: http://user:pass@p.webshare.io:80/');
  }
}

/** Webshare sticky session ids must be numeric (Endpoint Generator uses digits). */
function webshareStickyDigits(stickyId: string): string {
  const fromDigits = String(stickyId || '').replace(/\D/g, '');
  if (fromDigits.length >= 4) return fromDigits.slice(0, 12);
  // Deterministic fallback — never use Date.now() (that rotates the exit IP mid-session).
  let hash = 0;
  for (const ch of String(stickyId || 'atm')) {
    hash = (Math.imul(31, hash) + ch.charCodeAt(0)) | 0;
  }
  const mixed = `${Math.abs(hash)}7${Math.abs(hash << 3)}`.replace(/\D/g, '');
  return (mixed || '1001').slice(0, 10);
}

/**
 * Pin a residential sticky session so one tool tab keeps the same exit IP.
 * - Webshare: user-us-SESSIONID (numeric after country)
 * - IPRoyal / Bright Data style: user-session-ID
 * If the URL already contains a sticky marker, it is left unchanged.
 */
export function applyStickySession(proxyUrl: string, stickyId: string): string {
  const id = String(stickyId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 12);
  if (!id) return proxyUrl;
  try {
    const u = new URL(proxyUrl);
    let user = decodeURIComponent(u.username || '');
    if (!user) return proxyUrl;
    if (/session/i.test(user)) return proxyUrl;

    const host = (u.hostname || '').toLowerCase();
    if (/webshare\.io$/i.test(host)) {
      // Drop generator sticky suffix (e.g. user-us-680248) so each tool tab gets its own pin.
      user = user.replace(/-\d{3,}$/i, '');
      // Webshare requires numeric session ids: {user}-us-123456
      u.username = `${user}-${webshareStickyDigits(id)}`;
      if (!u.port) u.port = '80';
      return serializeProxyUrl(u);
    }

    // user → user-session-ID (most residential HTTP gateways)
    u.username = `${user}-session-${id}`;
    if (!u.port) u.port = /^https:$/i.test(u.protocol) ? '443' : '80';
    return serializeProxyUrl(u);
  } catch {
    return proxyUrl;
  }
}

/** Mask credentials in a proxy URL for safe admin display logging. */
export function maskProxyUrl(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    if (u.username || u.password) {
      u.username = u.username ? '***' : '';
      u.password = u.password ? '***' : '';
    }
    return u.href;
  } catch {
    return '***';
  }
}

export async function getGlobalProxyConfig(admin?: SupabaseClient): Promise<GlobalProxyConfig> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS && !cache.value.setupRequired) {
    return { ...cache.value };
  }
  try {
    const db = admin || serviceClient();
    const { data, error } = await db
      .from('app_settings')
      .select('value')
      .eq('key', GLOBAL_PROXY_SETTING_KEY)
      .maybeSingle();
    if (error) {
      const setupRequired = isAppSettingsMissing(error.message);
      const value: GlobalProxyConfig = { enabled: false, url: '', setupRequired: setupRequired || undefined };
      cache = { at: now, value };
      return { ...value };
    }
    const value = parseConfig(data?.value);
    cache = { at: now, value };
    return { ...value };
  } catch (err: any) {
    const setupRequired = isAppSettingsMissing(err?.message);
    const value: GlobalProxyConfig = { enabled: false, url: '', setupRequired: setupRequired || undefined };
    cache = { at: now, value };
    return { ...value };
  }
}

export async function getGlobalProxyPublicStatus(admin?: SupabaseClient): Promise<GlobalProxyPublicStatus> {
  const cfg = await getGlobalProxyConfig(admin);
  const ready = Boolean(cfg.enabled && cfg.url);
  return { enabled: Boolean(cfg.enabled), ready };
}

/** Active outbound proxy URL when engine is ON and URL is set; otherwise null. */
export async function getActiveOutboundProxyUrl(admin?: SupabaseClient): Promise<string | null> {
  const cfg = await getGlobalProxyConfig(admin);
  if (!cfg.enabled || !cfg.url) return null;
  try {
    return normalizeProxyUrl(cfg.url);
  } catch {
    return null;
  }
}

export async function setGlobalProxyConfig(
  input: { enabled: boolean; url?: string },
  admin?: SupabaseClient,
): Promise<GlobalProxyConfig> {
  const db = admin || serviceClient();
  const prev = await getGlobalProxyConfig(db);
  let url = prev.url;
  if (typeof input.url === 'string') {
    const trimmed = input.url.trim();
    url = trimmed ? normalizeProxyUrl(trimmed) : '';
  }
  const enabled = Boolean(input.enabled) && Boolean(url);
  const value: GlobalProxyConfig = { enabled, url };
  const { error } = await db.from('app_settings').upsert(
    {
      key: GLOBAL_PROXY_SETTING_KEY,
      value: { enabled: value.enabled, url: value.url },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );
  if (error) {
    if (isAppSettingsMissing(error.message)) {
      throw new Error(GLOBAL_PROXY_SQL_HINT);
    }
    throw new Error(error.message);
  }
  cache = { at: Date.now(), value };
  return { ...value };
}

export async function clearGlobalProxyConfig(admin?: SupabaseClient): Promise<GlobalProxyConfig> {
  return setGlobalProxyConfig({ enabled: false, url: '' }, admin);
}

export function invalidateGlobalProxyCache() {
  cache = null;
}
