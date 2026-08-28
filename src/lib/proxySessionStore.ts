/**
 * Persist tool-proxy sessions so Vercel serverless can load cookies on /view and /asset.
 * Memory Map is not shared across lambdas — without this, ChatGPT CSS/JS 410/404.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { createPrivilegedSupabase, supabaseSealKeyMaterial } from './db';

export type StoredProxySession = {
  token: string;
  accountId: string;
  toolId: string;
  toolName: string;
  targetUrl: string;
  origin: string;
  cookieHeader: string;
  /** Domain/path aware jar used by the proxy engine (newer sessions). */
  cookies?: Array<{ name: string; value: string; domain?: string; path?: string; secure?: boolean }>;
  cookieHosts: string[];
  referrer: string;
  referrerCandidates: string[];
  expiresAt: number;
};

function db() {
  return createPrivilegedSupabase();
}

function keyBuf() {
  return createHash('sha256')
    .update(supabaseSealKeyMaterial())
    .digest();
}

export function sealSession(s: StoredProxySession): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBuf(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(s), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

export function unsealSession(blob: string): StoredProxySession | null {
  try {
    const buf = Buffer.from(String(blob || ''), 'base64url');
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', keyBuf(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    const parsed = JSON.parse(json);
    if (!parsed?.token || !parsed?.origin) return null;
    return parsed as StoredProxySession;
  } catch {
    return null;
  }
}

export async function persistStoredSession(s: StoredProxySession): Promise<void> {
  const client = db();
  const sealed = sealSession(s);
  const { error } = await client.from('tool_proxy_sessions').upsert(
    {
      token: s.token,
      sealed,
      expires_at: new Date(s.expiresAt).toISOString(),
    },
    { onConflict: 'token' },
  );
  if (!error) return;

  await client.from('app_settings').upsert(
    {
      key: `pxs_${s.token}`,
      value: { sealed, expiresAt: s.expiresAt },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );
}

export async function loadStoredSession(token: string): Promise<StoredProxySession | null> {
  const id = String(token || '').trim();
  if (!id) return null;
  const client = db();

  const table = await client
    .from('tool_proxy_sessions')
    .select('sealed,expires_at')
    .eq('token', id)
    .maybeSingle();
  if (!table.error && table.data?.sealed) {
    if (new Date(String(table.data.expires_at)).getTime() <= Date.now()) return null;
    return unsealSession(table.data.sealed);
  }

  const fallback = await client.from('app_settings').select('value').eq('key', `pxs_${id}`).maybeSingle();
  const v = fallback.data?.value as { sealed?: string; expiresAt?: number } | null;
  if (v?.sealed) {
    if (Number(v.expiresAt || 0) <= Date.now()) return null;
    return unsealSession(v.sealed);
  }
  return null;
}
