/**
 * Client helpers for server-side tool proxy + cookie-apply open (no extension).
 * Cookies stay on the server (DB); this client never needs raw cookie JSON for proxy opens.
 */
import { supabase } from './db';
import { isToolAccessUrl } from './toolCookies';

export type ProxyLaunchResult =
  | { mode: 'proxy'; viewUrl: string; url: string; name: string; toolId?: string; expiresInSec?: number }
  | { mode: 'direct'; url: string; name: string; toolId?: string; message?: string };

function proxyErrorMessage(status: number, body: any): string {
  const fromServer = String(body?.error || body?.message || '').trim();
  if (fromServer) return fromServer;
  if (status === 404) {
    return 'Tool proxy API not found (404). Restart the portal server so /api/tool-proxy is mounted.';
  }
  if (status === 401) return 'Authentication required. Sign in again, then retry.';
  if (status === 403) return 'Access denied for this tool or plan.';
  if (status === 502 || status === 503) return 'Tool proxy upstream failed. Ask admin to refresh cookies / panel referrer.';
  return `Could not start tool proxy (${status})`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const { deviceHeaders } = await import('./deviceFingerprint');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...deviceHeaders(),
  };
}

/** Start a server proxy session for toolaccess / panel-unlock tools. */
export async function launchToolProxy(toolId: string): Promise<ProxyLaunchResult> {
  const id = String(toolId || '').trim();
  if (!id) throw new Error('toolId is required');

  let response: Response;
  try {
    const headers = await authHeaders();
    response = await fetch('/api/tool-proxy/launch', {
      method: 'POST',
      headers,
      body: JSON.stringify({ toolId: id, forceProxy: true }),
    });
  } catch (err: any) {
    throw new Error(err?.message || 'Network error starting tool proxy');
  }

  const raw = await response.text();
  let body: any = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }

  if (!response.ok) throw new Error(proxyErrorMessage(response.status, body));

  if (body.mode === 'proxy' && body.viewUrl) {
    return {
      mode: 'proxy',
      viewUrl: String(body.viewUrl),
      url: String(body.url || ''),
      name: String(body.name || ''),
      toolId: body.toolId,
      expiresInSec: body.expiresInSec,
    };
  }
  return {
    mode: 'direct',
    url: String(body.url || ''),
    name: String(body.name || ''),
    toolId: body.toolId,
    message: body.message,
  };
}

export function shouldUseServerProxy(dest: string, unlockReferrer?: string): boolean {
  return isToolAccessUrl(dest) || Boolean(String(unlockReferrer || '').trim());
}

/** Open via proxy when needed; otherwise open the destination URL. Always opens a tab. */
export async function applyAndOpenTool(opts: {
  toolId: string;
  dest: string;
  unlockReferrer?: string;
  /** @deprecated Unused for proxy path — cookies are loaded server-side from DB. */
  cookiesJson?: string;
}): Promise<{ opened: 'proxy' | 'direct'; url: string }> {
  const dest = String(opts.dest || '').trim();
  if (!dest) throw new Error('No destination URL');

  if (shouldUseServerProxy(dest, opts.unlockReferrer)) {
    const result = await launchToolProxy(opts.toolId);
    if (result.mode === 'proxy' && result.viewUrl) {
      const win = window.open(result.viewUrl, '_blank');
      if (!win) {
        // Popup blocked — navigate current tab as last resort
        window.location.href = result.viewUrl;
      }
      return { opened: 'proxy', url: result.viewUrl };
    }
    // Server declined proxy — fall through to direct open
  }

  const win = window.open(dest, '_blank', 'noopener,noreferrer');
  if (!win) window.location.href = dest;
  return { opened: 'direct', url: dest };
}
