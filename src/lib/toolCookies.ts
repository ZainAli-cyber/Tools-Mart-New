import { useEffect, useState } from 'react';
import { supabase } from './db';
import { db, type Tool } from '../admin/data/adminStore';

export type ToolAccessMethod = 'extension' | 'one_click';

export const FALLBACK_COOKIE_KEY = 'atm_tool_cookie_fallback';
export const EXTENSION_DOWNLOAD_URL = '/downloads/ai-toolz-mart-extension.zip';
export const EXTENSION_DISPLAY_NAME = 'AI Toolz Mart Access';

const NEED_EXTENSION_MSG =
  'Install the AI Toolz Mart Access browser extension to open this tool. Download it from the Installation Guide, then try again.';

export type LaunchProgressStep =
  | 'check'
  | 'authenticating'
  | 'session'
  | 'unlocking'
  | 'launching'
  | 'done';

export class NeedExtensionError extends Error {
  /** When false, UI must show Installation Guide only — never Session Apply. */
  readonly allowSessionApply: boolean;

  constructor(
    message = NEED_EXTENSION_MSG,
    opts?: { allowSessionApply?: boolean },
  ) {
    super(message);
    this.name = 'NeedExtensionError';
    this.allowSessionApply = Boolean(opts?.allowSessionApply);
  }
}

/** Thrown when the browser blocks opening the tool in a new tab. Never navigate the portal. */
export class PopupBlockedError extends Error {
  url?: string;
  constructor(
    message = 'Pop-up blocked. Allow pop-ups for this site, then try again. Your dashboard was left open.',
    url?: string,
  ) {
    super(message);
    this.name = 'PopupBlockedError';
    this.url = url;
  }
}

/**
 * Reserved blank tab (legacy). Prefer opening the real tool URL only after
 * access succeeds so members never see about:blank during Connecting.
 */
export function reserveToolTab(): Window {
  const probe = window.open('about:blank', '_blank');
  if (!probe || probe === window) {
    throw new PopupBlockedError();
  }
  try {
    probe.opener = null;
  } catch {
    /* ignore */
  }
  try {
    window.focus();
  } catch {
    /* ignore */
  }
  return probe;
}

/** Same-origin relative paths must be resolved against the portal, not about:blank. */
export function absolutePortalUrl(url: string): string {
  const dest = String(url || '').trim();
  if (!dest) return dest;
  if (/^https?:\/\//i.test(dest) || dest.startsWith('about:')) return dest;
  try {
    return new URL(dest, window.location.origin).href;
  } catch {
    return dest;
  }
}

/** Navigate a tab reserved at click-time. Never touches the portal window. */
export function navigateReservedTab(tab: Window | null | undefined, url: string): void {
  const dest = absolutePortalUrl(String(url || '').trim());
  if (!dest) throw new Error('No destination URL');
  if (!tab || tab.closed || tab === window) {
    throw new PopupBlockedError(
      'The tool tab was closed or blocked. Allow pop-ups for this site, then try again.',
      dest,
    );
  }
  try {
    tab.location.replace(dest);
  } catch {
    try {
      tab.location.href = dest;
    } catch {
      throw new PopupBlockedError(
        'Could not open the tool in a new tab. Allow pop-ups for this site, then try again.',
        dest,
      );
    }
  }
}

export function closeReservedTab(tab: Window | null | undefined) {
  if (!tab || tab.closed || tab === window) return;
  try {
    tab.close();
  } catch {
    /* ignore */
  }
}

/**
 * Open the accessed tool in a new tab (destination URL only — no blank placeholder).
 */
export function openToolInNewTab(url: string): void {
  const dest = absolutePortalUrl(String(url || '').trim());
  if (!dest) throw new Error('No destination URL');
  const tab = window.open(dest, '_blank');
  if (!tab || tab === window) {
    throw new PopupBlockedError(
      'Pop-up blocked. Allow pop-ups for this site, then use Open Tool.',
      dest,
    );
  }
  try {
    tab.opener = null;
  } catch {
    /* ignore */
  }
}

export type ToolCookieFields = {
  accessMethod: ToolAccessMethod;
  toolUrl: string;
  cookiesJson: string;
  /** Dashboard URL to spoof as Referer for *.toolaccess.click panels. */
  panelReferrer?: string;
};

type FallbackMap = Record<string, ToolCookieFields>;

const COLUMN_MISSING = /could not find|schema cache|column|42703|PGRST204/i;

/** Never treat browser localStorage as the production DB. */
const EMPTY_COOKIE_FIELDS: ToolCookieFields = {
  accessMethod: 'extension',
  toolUrl: '',
  cookiesJson: '',
  panelReferrer: '',
};

export function isOneClick(method?: string | null): boolean {
  return String(method || '').trim().toLowerCase() === 'one_click';
}

/** By extension / by_extension / anything that is not On one click. */
export function isExtensionAccess(method?: string | null): boolean {
  return !isOneClick(method);
}

/** True when hostname is toolaccess.click or a subdomain (mirror / SEO panel). */
export function isToolAccessUrl(url?: string | null): boolean {
  try {
    const host = new URL(String(url || '').trim()).hostname.toLowerCase();
    return host === 'toolaccess.click' || host.endsWith('.toolaccess.click');
  } catch {
    return /toolaccess\.click/i.test(String(url || ''));
  }
}

/**
 * Pak SEO opens tools from the logged-in aMember dashboard on app.pakseotools.com
 * (not /login). Prefer that origin as Referer — apex is a fallback only.
 */
export const DEFAULT_PANEL_REFERRER = 'https://app.pakseotools.com/';
export const APP_PANEL_REFERRER = DEFAULT_PANEL_REFERRER;
export const APEX_PANEL_REFERRER = 'https://pakseotools.com/';

/** Common dashboard Referers vendors accept (never /login). App host first. */
export const PANEL_REFERRER_SUGGESTIONS = [
  DEFAULT_PANEL_REFERRER,
  APEX_PANEL_REFERRER,
  'https://app.pakseotools.com/member',
] as const;

/**
 * Normalize admin unlock Referer for toolaccess panels.
 * Paths like /login are usually wrong — panels expect the dashboard root.
 */
export function normalizePanelUnlockReferrer(raw?: string | null): string {
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

/** Ordered unique Referer candidates for DNR / proxy unlock (admin value first after normalize). */
export function panelUnlockReferrerCandidates(raw?: string | null): string[] {
  const normalized = normalizePanelUnlockReferrer(raw);
  const asIs = String(raw || '').trim();
  const out: string[] = [];
  const push = (v: string) => {
    const s = String(v || '').trim();
    if (s && !out.includes(s)) out.push(s);
  };
  push(normalized);
  push(asIs);
  for (const s of PANEL_REFERRER_SUGGESTIONS) push(s);
  // Also try origin-only variants of the admin value (no path) for strict Referer matchers.
  if (normalized) {
    try {
      push(`${new URL(normalized).origin}/`);
    } catch {
      /* ignore */
    }
  }
  return out;
}

/** Effective Referer to send: normalized admin value, else Pak app dashboard. */
export function resolvePanelUnlockReferrer(raw?: string | null, dest?: string | null): string {
  if (!isToolAccessUrl(dest) && !String(raw || '').trim()) return '';
  const normalized = normalizePanelUnlockReferrer(raw);
  if (normalized) return normalized;
  if (isToolAccessUrl(dest)) return DEFAULT_PANEL_REFERRER;
  return '';
}

export function isLoginLikePanelReferrer(raw?: string | null): boolean {
  try {
    const u = new URL(String(raw || '').trim());
    return /\/(login|signin|sign-in|sign_in|register|signup|sign-up)\/?$/i.test(u.pathname);
  } catch {
    return false;
  }
}

export const TOOLACCESS_ADMIN_WARNING =
  'This destination uses toolaccess.click. One click still uses the Access extension to unlock the panel (required by the vendor). ChatGPT-style real URLs do not. Set Panel unlock referrer to https://app.pakseotools.com/ (Pak dashboard — not /login) and paste cookies from an already unlocked toolaccess session (PHPSESSID etc.). Referer alone is not enough.';

export const TOOLACCESS_USER_WARNING =
  'This tool opens a toolaccess.click panel. The Access extension (or Session apply proxy) sends Cookie + Referer like the Pak SEO dashboard. If you still see 403, ask admin to refresh cookies from an unlocked session and set Panel unlock referrer to https://app.pakseotools.com/ (not /login).';

export const TOOLACCESS_NEED_EXTENSION_MSG =
  'toolaccess.click panels need session unlock (Access extension or Session apply proxy). Use Apply & Open without the extension, or install the extension for auto-login.';

/** One-click auto-login needs the Access extension to write admin cookies into the browser. */
export const COOKIES_NEED_EXTENSION_MSG =
  'Install AI Toolz Mart Access once so one-click can apply saved cookies and open the tool logged in. Without the extension, ChatGPT only shows the login page (browsers cannot set those cookies from the dashboard).';

export function cookiesAreSet(raw?: string | null): boolean {
  const text = String(raw || '').trim();
  if (!text || text === '[]' || text === '{}') return false;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.length > 0;
    if (parsed && typeof parsed === 'object') return Object.keys(parsed).length > 0;
  } catch {
    return text.length > 2;
  }
  return false;
}

export function readCookieFallback(): FallbackMap {
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_COOKIE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function writeCookieFallback(id: string, fields: ToolCookieFields) {
  const all = readCookieFallback();
  all[id] = fields;
  localStorage.setItem(FALLBACK_COOKIE_KEY, JSON.stringify(all));
}

export function parseExtraObject(raw: any): Record<string, any> {
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

/**
 * Parse Chrome "Copy Cookies" (and similar) exports.
 * Accepts an array, `{ cookies: [...] }`, a single cookie object,
 * double-encoded JSON, or clipboard wrappers.
 */
export function parseCookieJson(raw?: string | null): any[] {
  let text = String(raw || '').trim();
  if (!text) return [];
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    try {
      text = JSON.parse(text);
    } catch {
      /* keep */
    }
    text = String(text || '').trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start >= 0 && end > start) parsed = JSON.parse(text.slice(start, end + 1));
    else throw new Error('Cookies must be valid JSON');
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
    if (Array.isArray(parsed.cookies)) {
      return parsed.cookies.filter((c: any) => c && typeof c === 'object');
    }
    if (Array.isArray(parsed.data)) {
      return parsed.data.filter((c: any) => c && typeof c === 'object');
    }
    if (parsed.name) return [parsed];
  }
  return [];
}

/**
 * When fallback is explicitly passed (including EMPTY), do NOT read localStorage.
 * Only use localStorage when fallback arg is omitted (undefined).
 */
export function normalizeToolRow(row: any, fallback?: ToolCookieFields | null): Tool {
  const extraObj = parseExtraObject(row?.extra);
  const extra: ToolCookieFields =
    fallback !== undefined
      ? fallback || EMPTY_COOKIE_FIELDS
      : readCookieFallback()[row?.id] || EMPTY_COOKIE_FIELDS;

  const access =
    row?.access_method ||
    row?.accessMethod ||
    extraObj.accessMethod ||
    extraObj.access_method ||
    extra.accessMethod ||
    'extension';
  const showRaw = row?.show_on_home ?? row?.showOnHome ?? extraObj.showOnHome ?? extraObj.show_on_home;

  return {
    id: row.id,
    name: row.name,
    category: row.category || 'SEO',
    rating: Number(row.rating || 4.9),
    price: Number(row.price || 0),
    originalPrice: Number(row.original_price ?? row.originalPrice ?? 0),
    discount: Number(row.discount || 0),
    favicon: row.favicon || '',
    desc: row.desc || row.description || '',
    fullDesc: row.full_desc || row.fullDesc,
    features: row.features,
    useCases: row.use_cases || row.useCases,
    faqs: row.faqs,
    waText: row.wa_text || row.waText,
    isPrivate: row.is_private ?? row.isPrivate,
    isSemiPrivate: row.is_semi_private ?? row.isSemiPrivate,
    badge: row.badge,
    showOnHome: showRaw === false || showRaw === 'false' || showRaw === 0 ? false : true,
    // Admin "By extension" may be stored as extension or by_extension — never one_click.
    accessMethod: isOneClick(access) ? 'one_click' : 'extension',
    toolUrl: row.tool_url || row.toolUrl || extraObj.toolUrl || extraObj.tool_url || extra.toolUrl || '',
    cookiesJson:
      row.cookies_json ??
      row.cookiesJson ??
      extraObj.cookiesJson ??
      extraObj.cookies_json ??
      extra.cookiesJson ??
      '',
    panelReferrer:
      row.panel_referrer ||
      row.panelReferrer ||
      extraObj.panelReferrer ||
      extraObj.unlockReferrer ||
      extraObj.panel_referrer ||
      extra.panelReferrer ||
      '',
  };
}

export type SaveCookieResult =
  | { ok: true; usedFallback: boolean }
  | { ok: false; error: string };

const SESSION_EXPIRED_MSG =
  'Admin session expired. Sign in again, then Save Cookies so settings reach the production database.';

/**
 * Admin panel login uses Supabase auth + portal session, not the legacy `admin_jwt` key.
 * Prefer the live access token; keep admin_jwt as a sync/fallback for older apiClient callers.
 */
export async function getAdminAccessToken(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = String(data.session?.access_token || '').trim();
    if (token) {
      try {
        localStorage.setItem('admin_jwt', token);
      } catch {
        /* ignore quota / private mode */
      }
      return token;
    }
  } catch {
    /* fall through */
  }
  try {
    return String(localStorage.getItem('admin_jwt') || '').trim();
  } catch {
    return '';
  }
}

function mapAdminSaveError(status: number, body: any, fallback: string): string {
  if (status === 401 || status === 403) return SESSION_EXPIRED_MSG;
  const raw = String(body?.error || body?.message || fallback || '').trim();
  // Misconfigured service role is a server/config issue — do not label it as session expiry.
  if (/SUPABASE_SERVICE_ROLE_KEY|not configured|service.?role/i.test(raw)) {
    return raw;
  }
  return raw || fallback;
}

function looksLikeHtmlResponse(text: string): boolean {
  const t = String(text || '').trimStart().slice(0, 32).toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html');
}

async function readAdminJson(res: Response): Promise<any> {
  const text = await res.text();
  if (looksLikeHtmlResponse(text)) {
    throw new Error(
      'API is not available on this URL (got website HTML instead of JSON). Open the Production domain https://tools-mart-latest.vercel.app — not a preview link like *-uplaps.vercel.app — then sign in and Save again.',
    );
  }
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Save failed (${res.status}): invalid API response`);
  }
}

async function loadToolsViaAdminApi(): Promise<Tool[] | null> {
  const adminJwt = await getAdminAccessToken();
  if (!adminJwt) return null;
  try {
    const res = await fetch('/api/admin/tools', {
      headers: { Authorization: `Bearer ${adminJwt}` },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    return rows.map((row: any) =>
      normalizeToolRow(
        {
          id: row.id,
          name: row.name,
          category: row.category,
          rating: row.rating,
          price: row.price,
          original_price: row.originalPrice,
          discount: row.discount,
          favicon: row.favicon,
          badge: row.badge,
          desc: row.desc,
          full_desc: row.fullDesc,
          features: row.features,
          use_cases: row.useCases,
          faqs: row.faqs,
          wa_text: row.waText,
          is_private: row.isPrivate,
          is_semi_private: row.isSemiPrivate,
          show_on_home: row.showOnHome,
          access_method: row.accessMethod,
          tool_url: row.toolUrl,
          cookies_json: row.cookiesJson,
          panel_referrer: row.panelReferrer,
        },
        EMPTY_COOKIE_FIELDS,
      ),
    );
  } catch {
    return null;
  }
}

export async function loadCatalogTools(opts?: { includeCookies?: boolean }): Promise<Tool[]> {
  const includeCookies = Boolean(opts?.includeCookies);
  const fallback = readCookieFallback();
  const local = db.getTools();

  // Cookies admin: DB via service-role API is source of truth.
  if (includeCookies) {
    const fromAdmin = await loadToolsViaAdminApi();
    if (fromAdmin && fromAdmin.length) {
      const seen = new Set(fromAdmin.map(t => t.id));
      const merged = [...fromAdmin];
      local.forEach(tool => {
        if (seen.has(tool.id)) return;
        merged.push(
          normalizeToolRow(tool, {
            accessMethod: tool.accessMethod || 'extension',
            toolUrl: '',
            cookiesJson: '',
            panelReferrer: '',
          }),
        );
      });
      return merged;
    }
  }

  const publicSelect =
    'id,name,category,rating,price,original_price,discount,favicon,badge,desc,full_desc,features,use_cases,faqs,wa_text,is_private,is_semi_private,access_method,show_on_home,extra';
  const first = includeCookies
    ? await supabase.from('tools').select('*')
    : await supabase.from('tools').select(publicSelect);

  let rows: any[] | null = first.data;
  if (first.error) {
    const retries = includeCookies
      ? [
          'id,name,category,rating,price,original_price,discount,favicon,badge,desc,full_desc,features,use_cases,faqs,wa_text,is_private,is_semi_private,access_method,tool_url,cookies_json,show_on_home,extra',
          'id,name,category,rating,price,original_price,discount,favicon,badge,desc,full_desc,features,use_cases,faqs,wa_text,is_private,is_semi_private,access_method,extra',
          'id,name,category,rating,price,original_price,discount,favicon,badge,desc,full_desc,features,use_cases,faqs,wa_text,is_private,is_semi_private,extra',
        ]
      : [
          'id,name,category,rating,price,original_price,discount,favicon,badge,desc,full_desc,features,use_cases,faqs,wa_text,is_private,is_semi_private,access_method,extra',
          'id,name,category,rating,price,original_price,discount,favicon,badge,desc,full_desc,features,use_cases,faqs,wa_text,is_private,is_semi_private,extra',
          'id,name,category,rating,price,original_price,discount,favicon,badge,desc,full_desc,features,use_cases,faqs,wa_text,is_private,is_semi_private',
        ];
    for (const cols of retries) {
      const retry = await supabase.from('tools').select(cols);
      if (!retry.error) {
        rows = retry.data;
        break;
      }
    }
  }

  const fromDb = (rows || []).map(row => {
    const mapped = normalizeToolRow(
      row,
      includeCookies ? EMPTY_COOKIE_FIELDS : fallback[row.id] || null,
    );
    if (!includeCookies) {
      mapped.cookiesJson = '';
      mapped.toolUrl = '';
      mapped.panelReferrer = '';
    }
    return mapped;
  });

  const seen = new Set(fromDb.map(t => t.id));
  const merged = [...fromDb];
  local.forEach(tool => {
    if (seen.has(tool.id)) {
      const i = merged.findIndex(t => t.id === tool.id);
      if (i >= 0) {
        if (!merged[i].accessMethod) merged[i].accessMethod = tool.accessMethod || 'extension';
        if (tool.showOnHome === false) merged[i].showOnHome = false;
        else if (merged[i].showOnHome !== false) merged[i].showOnHome = tool.showOnHome !== false;
        if (!includeCookies) {
          merged[i].toolUrl = '';
          merged[i].cookiesJson = '';
          merged[i].panelReferrer = '';
        }
      }
      return;
    }
    const next = normalizeToolRow(
      tool,
      includeCookies ? EMPTY_COOKIE_FIELDS : fallback[tool.id] || null,
    );
    if (!includeCookies) {
      next.cookiesJson = '';
      next.toolUrl = '';
      next.panelReferrer = '';
    } else {
      next.toolUrl = '';
      next.cookiesJson = '';
      next.panelReferrer = '';
      next.accessMethod = tool.accessMethod || 'extension';
    }
    merged.push(next);
  });
  return merged;
}

/**
 * Persist cookie settings via admin API (service role).
 * Creates the tools row automatically when it does not exist yet (new tools).
 */
export async function saveToolCookieSettings(
  tool: Tool,
  fields: ToolCookieFields,
): Promise<SaveCookieResult> {
  const adminJwt = await getAdminAccessToken();
  if (!adminJwt) {
    return { ok: false, error: SESSION_EXPIRED_MSG };
  }

  const name = String(tool.name || '').trim();
  const id = String(tool.id || '').trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const keys = [...new Set([id, name].filter(Boolean))];
  let lastError = 'Could not save cookie settings to the database.';

  const payload = {
    id,
    name: name || id,
    category: tool.category || 'Other',
    rating: tool.rating,
    price: tool.price,
    originalPrice: tool.originalPrice,
    discount: tool.discount,
    favicon: tool.favicon || '',
    desc: tool.desc || '',
    fullDesc: tool.fullDesc || '',
    features: tool.features || [],
    useCases: tool.useCases || [],
    faqs: tool.faqs || [],
    waText: tool.waText || name,
    isPrivate: Boolean(tool.isPrivate),
    isSemiPrivate: Boolean(tool.isSemiPrivate),
    showOnHome: tool.showOnHome !== false,
    badge: tool.badge || '',
    accessMethod: fields.accessMethod,
    toolUrl: fields.toolUrl || '',
    cookiesJson: fields.cookiesJson || '',
    panelReferrer: fields.panelReferrer || '',
  };

  for (const key of keys) {
    try {
      const res = await fetch(`/api/admin/tools/${encodeURIComponent(String(key).trim())}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminJwt}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await readAdminJson(res);
      if (res.ok) {
        writeCookieFallback(id, fields);
        db.saveTool({ ...tool, id, name: payload.name, ...fields });
        const persistedUrl = String(body?.toolUrl || '').trim();
        const usedFallback = Boolean(body?.usedFallback);
        if (fields.accessMethod === 'one_click' && fields.toolUrl.trim() && !persistedUrl) {
          return {
            ok: false,
            error:
              'Save reached the API but destination URL was not stored. Run supabase_tool_cookies.sql (ensure tools.extra exists), then Save again.',
          };
        }
        return { ok: true, usedFallback };
      }
      lastError = mapAdminSaveError(res.status, body, `Save failed (${res.status})`);
      if (res.status === 401 || res.status === 403) {
        try {
          localStorage.removeItem('admin_jwt');
        } catch {
          /* ignore */
        }
        return { ok: false, error: SESSION_EXPIRED_MSG };
      }
      if (res.status === 404) continue;
      return { ok: false, error: lastError };
    } catch (err: any) {
      lastError = err?.message || 'Network error while saving cookie settings.';
    }
  }

  return {
    ok: false,
    error:
      lastError ||
      'Could not save cookie settings. Confirm SUPABASE_SERVICE_ROLE_KEY on Vercel, then try Save again.',
  };
}

export async function saveCatalogTool(tool: Tool): Promise<{ usedFallback: boolean }> {
  const normalized: Tool = { ...tool, showOnHome: tool.showOnHome !== false };
  db.saveTool(normalized);

  const adminJwt = await getAdminAccessToken();
  if (adminJwt) {
    try {
      const res = await fetch('/api/admin/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminJwt}`,
        },
        body: JSON.stringify(normalized),
      });
      if (res.ok) return { usedFallback: false };
    } catch {
      /* fall through */
    }
  }

  const payload: any = {
    id: normalized.id,
    name: normalized.name,
    category: normalized.category,
    rating: normalized.rating,
    price: normalized.price,
    original_price: normalized.originalPrice,
    discount: normalized.discount,
    favicon: normalized.favicon,
    badge: normalized.badge || null,
    desc: normalized.desc,
    full_desc: normalized.fullDesc || null,
    features: normalized.features || null,
    use_cases: normalized.useCases || null,
    faqs: normalized.faqs || null,
    wa_text: normalized.waText || null,
    is_private: !!normalized.isPrivate,
    is_semi_private: !!normalized.isSemiPrivate,
    show_on_home: normalized.showOnHome !== false,
  };

  const { error } = await supabase.from('tools').upsert(payload);
  if (!error) return { usedFallback: false };

  if (COLUMN_MISSING.test(error.message || '')) {
    const { id: _drop, show_on_home: _s, ...withoutCol } = payload;
    const { data: existing } = await supabase
      .from('tools')
      .select('extra')
      .eq('id', normalized.id)
      .maybeSingle();
    const prevExtra = existing?.extra && typeof existing.extra === 'object' ? existing.extra : {};
    await supabase.from('tools').upsert({
      ...withoutCol,
      id: normalized.id,
      extra: { ...prevExtra, showOnHome: normalized.showOnHome !== false },
    } as any);
    return { usedFallback: true };
  }

  return { usedFallback: true };
}

export function useCatalogTools() {
  const [tools, setTools] = useState<Tool[]>(() => db.getTools());
  useEffect(() => {
    void loadCatalogTools({ includeCookies: false }).then(setTools);
  }, []);
  return tools;
}

export async function fetchLaunchPayload(
  toolKey: string,
  opts?: { omitCookies?: boolean },
): Promise<{
  accessMethod: ToolAccessMethod;
  url: string;
  cookies: any[];
  name: string;
  panelReferrer?: string;
  unlockReferrer?: string;
}> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const { deviceHeaders } = await import('./deviceFingerprint');
  const omitCookies = Boolean(opts?.omitCookies);
  const qs = omitCookies ? '?omitCookies=1' : '';
  const response = await fetch(`/api/extension/launch/${encodeURIComponent(toolKey)}${qs}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...deviceHeaders(),
      ...(omitCookies ? { 'X-Omit-Cookies': '1' } : {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Could not open this tool');
  const panelReferrer = String(body.panelReferrer || body.unlockReferrer || '').trim();
  return {
    accessMethod: resolveAccessMethod(body.accessMethod),
    url: String(body.url || body.toolUrl || '').trim(),
    cookies: omitCookies ? [] : Array.isArray(body.cookies) ? body.cookies : [],
    name: String(body.name || ''),
    panelReferrer: panelReferrer || undefined,
    unlockReferrer: panelReferrer || undefined,
  };
}

const EXT_SOURCE = 'aitoolzmart';
const EXT_REPLY = 'aitoolzmart-extension';
const EXT_TIMEOUT_MS = 15000;
const PING_TIMEOUT_MS = 1500;

function nextRequestId() {
  return `atm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function waitForExtensionMessage<T extends { action?: string; requestId?: string }>(
  action: string,
  requestId: string,
  timeoutMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error('AI Toolz Mart extension did not respond in time.'));
    }, timeoutMs);

    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.source !== EXT_REPLY || data.action !== action || data.requestId !== requestId) {
        return;
      }
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(data as T);
    }

    window.addEventListener('message', onMessage);
  });
}

export async function isAccessExtensionInstalled(timeoutMs = PING_TIMEOUT_MS): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const requestId = nextRequestId();
  try {
    const pending = waitForExtensionMessage<{ ok?: boolean }>('pong', requestId, timeoutMs);
    window.postMessage({ source: EXT_SOURCE, action: 'ping', requestId }, window.origin);
    const reply = await pending;
    return Boolean(reply?.ok);
  } catch {
    return false;
  }
}

async function applyCookiesViaExtension(
  cookies: any[],
  url: string,
  opts?: {
    unlockReferrer?: string;
    referrerCandidates?: string[];
    /** When false, extension applies cookies only — portal navigates reserved tab. */
    openTab?: boolean;
  },
): Promise<void> {
  const requestId = nextRequestId();
  const pending = waitForExtensionMessage<{
    ok?: boolean;
    error?: string;
    unlockMode?: string;
    unlockRules?: number;
    setCount?: number;
  }>('apply-cookies-result', requestId, EXT_TIMEOUT_MS);

  const panelDest = isToolAccessUrl(url);
  const unlockReferrer = resolvePanelUnlockReferrer(opts?.unlockReferrer, url);
  const candidates =
    opts?.referrerCandidates?.length
      ? opts.referrerCandidates
      : panelUnlockReferrerCandidates(opts?.unlockReferrer || unlockReferrer);
  const openTab = opts?.openTab !== false;

  window.postMessage(
    {
      source: EXT_SOURCE,
      action: 'apply-cookies',
      requestId,
      cookies,
      url,
      openTab,
      waitForAck: true,
      ...(unlockReferrer || panelDest
        ? {
            referrer: unlockReferrer || DEFAULT_PANEL_REFERRER,
            unlockReferrer: unlockReferrer || DEFAULT_PANEL_REFERRER,
            panelReferrer: unlockReferrer || DEFAULT_PANEL_REFERRER,
            referrerCandidates: candidates.length
              ? candidates
              : panelUnlockReferrerCandidates(DEFAULT_PANEL_REFERRER),
          }
        : {}),
    },
    window.origin,
  );

  const result = await pending;
  if (!result?.ok) {
    throw new Error(result?.error || 'Extension could not apply cookies before opening the tool.');
  }

  // Panel unlock must have DNR Referer rules active before navigation (extension ACKs after both).
  if (panelDest) {
    const mode = String(result.unlockMode || '');
    const rules = Number(result.unlockRules || 0);
    const unlocked = rules > 0 && (mode === 'referer' || mode === 'referer+origin');
    if (!unlocked) {
      throw new Error(
        `Panel Referer unlock did not install (mode=${mode || 'none'}). Reinstall the Access extension, then try again. ${TOOLACCESS_USER_WARNING}`,
      );
    }
  }
}

function finishOpen(dest: string, opts?: LaunchToolOptions, openedByExtension = false) {
  if (openedByExtension) return;
  if (opts?.reservedTab) {
    navigateReservedTab(opts.reservedTab, dest);
    return;
  }
  openToolInNewTab(absolutePortalUrl(dest));
}

export type LaunchToolOptions = {
  onNeedExtension?: () => void;
  onProgress?: (step: LaunchProgressStep) => void;
  /** Tab opened synchronously on click — portal never navigates away. */
  reservedTab?: Window | null;
};

async function reportProgress(opts: LaunchToolOptions | undefined, step: LaunchProgressStep) {
  opts?.onProgress?.(step);
}

async function ensureExtension(
  opts?: LaunchToolOptions,
  message?: string,
  allowSessionApply = false,
) {
  const installed = await isAccessExtensionInstalled();
  if (!installed) {
    opts?.onNeedExtension?.();
    throw new NeedExtensionError(message || NEED_EXTENSION_MSG, { allowSessionApply });
  }
}

/** Extension required for *.toolaccess.click and/or panel unlock referrer. */
export function needsPanelUnlockExtension(dest: string, unlockReferrer?: string): boolean {
  return isToolAccessUrl(dest) || Boolean(String(unlockReferrer || '').trim());
}

/**
 * By-extension path: extension REQUIRED. Never Session Apply / window.open fallback.
 * Cookies applied with openTab=false; reserved click-tab is navigated after ACK.
 */
async function openViaExtension(
  dest: string,
  cookies: any[],
  opts?: LaunchToolOptions,
  unlockReferrer?: string,
) {
  const list = Array.isArray(cookies) ? cookies : [];
  const panelDest = isToolAccessUrl(dest);
  const referrer = resolvePanelUnlockReferrer(unlockReferrer, dest);
  const candidates = panelUnlockReferrerCandidates(unlockReferrer || referrer);
  await ensureExtension(opts, NEED_EXTENSION_MSG, false);
  await reportProgress(opts, 'session');
  if (panelDest || referrer) await reportProgress(opts, 'unlocking');
  await applyCookiesViaExtension(list, dest, {
    unlockReferrer: referrer || undefined,
    referrerCandidates: panelDest ? candidates : undefined,
    openTab: false,
  });
  await reportProgress(opts, 'launching');
  finishOpen(dest, opts, false);
}

async function openOneClick(
  toolId: string,
  dest: string,
  cookies: any[],
  opts?: LaunchToolOptions,
  unlockReferrer?: string,
) {
  const list = Array.isArray(cookies) ? cookies : [];
  const panelDest = isToolAccessUrl(dest);
  const referrer = resolvePanelUnlockReferrer(unlockReferrer, dest);
  const needsExt = needsPanelUnlockExtension(dest, unlockReferrer);

  // One-click with cookies / panel unlock → server proxy first (no extra settings round-trip).
  const preferServerProxy = needsExt || list.length > 0;

  if (preferServerProxy) {
    await reportProgress(opts, 'session');
    if (panelDest || referrer) await reportProgress(opts, 'unlocking');
    try {
      const { launchToolProxy } = await import('./toolProxyClient');
      const result = await launchToolProxy(toolId);
      if (result.mode === 'proxy' && result.viewUrl) {
        await reportProgress(opts, 'launching');
        finishOpen(result.viewUrl, opts, false);
        return;
      }
      if (list.length === 0 && !needsExt) {
        await reportProgress(opts, 'launching');
        finishOpen(dest, opts, false);
        return;
      }
    } catch (err: any) {
      if (!list.length && !needsExt) throw err;
      // Cookie / panel tools: fall through to extension if proxy launch failed.
    }
  }

  if (needsExt) {
    await ensureExtension(opts, TOOLACCESS_NEED_EXTENSION_MSG, true);
    await reportProgress(opts, 'session');
    await reportProgress(opts, 'unlocking');
    try {
      await applyCookiesViaExtension(list, dest, {
        unlockReferrer: referrer || undefined,
        referrerCandidates: panelUnlockReferrerCandidates(unlockReferrer || referrer),
        openTab: false,
      });
    } catch (err: any) {
      if (err instanceof NeedExtensionError) throw err;
      if (panelDest) {
        throw new Error(
          `Could not unlock toolaccess panel (${err?.message || 'extension error'}). ${TOOLACCESS_USER_WARNING}`,
        );
      }
      throw err;
    }
    await reportProgress(opts, 'launching');
    finishOpen(dest, opts, false);
    return;
  }

  await reportProgress(opts, 'session');

  if (list.length > 0) {
    await ensureExtension(opts, COOKIES_NEED_EXTENSION_MSG, true);
    try {
      await applyCookiesViaExtension(list, dest, { openTab: false });
    } catch (err: any) {
      if (err instanceof NeedExtensionError) throw err;
      throw new Error(
        err?.message ||
          'Could not apply admin cookies. Enable Global Proxy Engine in Admin, or install AI Toolz Mart Access v1.3.5+.',
      );
    }
    await reportProgress(opts, 'launching');
    finishOpen(dest, opts, false);
    return;
  }

  // One-click with no cookies configured → just open the URL.
  await reportProgress(opts, 'launching');
  finishOpen(dest, opts, false);
}

/** Normalize DB/admin values: one_click vs extension (incl. by_extension). */
export function resolveAccessMethod(method?: string | null): ToolAccessMethod {
  return isOneClick(method) ? 'one_click' : 'extension';
}

/**
 * Launch an entitled tool. Same rules for customer + reseller dashboards:
 * - one_click + Global Proxy Engine ON → server proxy (cookies + residential IP), no extension
 * - one_click + saved cookies (proxy off) → Access extension or Session Apply
 * - one_click + no cookies → open URL only
 * - extension / by_extension → Access extension required
 */
export async function launchAssignedTool(tool: Tool, opts?: LaunchToolOptions) {
  const key = String(tool.id || tool.name || '').trim();
  if (!key) throw new Error('Tool is missing an id');

  try {
    await reportProgress(opts, 'check');
    await reportProgress(opts, 'authenticating');
    const payload = await fetchLaunchPayload(key);
    const fromPayload = resolveAccessMethod(payload.accessMethod);
    // Trust launch API; only force extension when catalog badge is explicitly By extension.
    const catalogRaw = String(tool.accessMethod || '').trim().toLowerCase();
    const method =
      catalogRaw === 'extension' || catalogRaw === 'by_extension'
        ? 'extension'
        : fromPayload;
    const dest = String(payload.url || tool.toolUrl || '').trim();
    if (!dest) {
      throw new Error(
        'No destination URL is set for this tool. Ask admin to save Cookies settings again.',
      );
    }
    const unlockReferrer = String(
      payload.unlockReferrer || payload.panelReferrer || tool.panelReferrer || '',
    ).trim();
    const cookies = Array.isArray(payload.cookies) ? payload.cookies : [];

    if (method === 'one_click') {
      await openOneClick(key, dest, cookies, opts, unlockReferrer);
    } else {
      await openViaExtension(dest, cookies, opts, unlockReferrer);
    }
    opts?.onProgress?.('done');
    return;
  } catch (err) {
    // Never fall through to local one_click after by_extension NeedExtensionError.
    if (
      err instanceof NeedExtensionError ||
      (err instanceof Error &&
        (/not assigned|activate or renew|authentication required|session expired|account suspended|unavailable|No destination URL|Could not unlock toolaccess|Server proxy|Global Proxy/i.test(
          err.message,
        ) ||
          err.message === NEED_EXTENSION_MSG ||
          err.message === TOOLACCESS_NEED_EXTENSION_MSG ||
          err.message === COOKIES_NEED_EXTENSION_MSG))
    ) {
      throw err;
    }

    const local = readCookieFallback()[tool.id] || {
      accessMethod: tool.accessMethod,
      toolUrl: tool.toolUrl,
      cookiesJson: tool.cookiesJson,
      panelReferrer: tool.panelReferrer,
    };
    const dest = String(local.toolUrl || '').trim();
    if (!dest) throw err;

    let cookies: any[] = [];
    try {
      cookies = parseCookieJson(local.cookiesJson);
    } catch {
      cookies = [];
    }
    const catalogRaw = String(tool.accessMethod || '').trim().toLowerCase();
    const method =
      catalogRaw === 'extension' || catalogRaw === 'by_extension'
        ? 'extension'
        : resolveAccessMethod(local.accessMethod || tool.accessMethod);
    const unlockReferrer = String(local.panelReferrer || tool.panelReferrer || '').trim();
    if (method === 'one_click') {
      await openOneClick(key, dest, cookies, opts, unlockReferrer);
    } else {
      await openViaExtension(dest, cookies, opts, unlockReferrer);
    }
    opts?.onProgress?.('done');
  }
}
