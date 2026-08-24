import { supabase } from './db';
import { deviceHeaders } from './deviceFingerprint';

async function authorizedFetch(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Your session expired. Please log in again.');

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...deviceHeaders(),
        ...(init.headers || {}),
      },
    });
  } catch (e: any) {
    throw new Error(`Network error: ${e?.message || 'Could not reach server'}`);
  }

  const text = await response.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    if (!response.ok) {
      throw new Error(`Server error ${response.status}: ${text.slice(0, 120) || 'non-JSON response'}`);
    }
    body = {};
  }

  if (!response.ok) {
    throw new Error(body.error || body.message || `Request failed (${response.status})`);
  }
  return body;
}

export type GlobalProxySettings = {
  enabled: boolean;
  ready: boolean;
  url?: string;
  maskedUrl?: string;
  setupRequired?: boolean;
  hint?: string;
};

export function getGlobalProxySettings() {
  return authorizedFetch('/api/settings/global-proxy') as Promise<GlobalProxySettings>;
}

export function saveGlobalProxySettings(input: { enabled: boolean; url: string }) {
  return authorizedFetch('/api/settings/global-proxy', {
    method: 'PATCH',
    body: JSON.stringify(input),
  }) as Promise<GlobalProxySettings>;
}

export function removeGlobalProxySettings() {
  return authorizedFetch('/api/settings/global-proxy', {
    method: 'DELETE',
  }) as Promise<GlobalProxySettings>;
}

export function testGlobalProxySettings(url?: string) {
  return authorizedFetch('/api/settings/global-proxy/test', {
    method: 'POST',
    body: JSON.stringify(url ? { url } : {}),
  }) as Promise<{ ok: boolean; ip?: string; message?: string; error?: string }>;
}
