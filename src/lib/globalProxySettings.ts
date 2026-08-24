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

export function normalizeProxyUrl(raw: string): string {
  let s = String(raw || '').trim();
  if (!s) return '';
  // Allow host:port without scheme → assume http
  if (!/^https?:\/\//i.test(s) && !/^socks/i.test(s)) {
    s = `http://${s}`;
  }
  try {
    const u = new URL(s);
    if (!/^https?:$/i.test(u.protocol) && !/^socks/i.test(u.protocol)) {
      throw new Error('Proxy URL must start with http:// or https://');
    }
    return u.href;
  } catch {
    throw new Error('Invalid proxy URL. Example: http://user:pass@host:3128/');
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
