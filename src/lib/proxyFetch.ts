/**
 * Outbound fetch that optionally routes through the Global Proxy Engine (undici ProxyAgent).
 */
import { getActiveOutboundProxyUrl } from './globalProxySettings';

type FetchInit = RequestInit & { dispatcher?: unknown };

let cachedAgent: { proxyUrl: string; agent: unknown; at: number } | null = null;
const AGENT_TTL_MS = 60_000;

async function getProxyAgent(proxyUrl: string): Promise<unknown> {
  const now = Date.now();
  if (cachedAgent && cachedAgent.proxyUrl === proxyUrl && now - cachedAgent.at < AGENT_TTL_MS) {
    return cachedAgent.agent;
  }
  const undici = await import('undici');
  const agent = new undici.ProxyAgent(proxyUrl);
  cachedAgent = { proxyUrl, agent, at: now };
  return agent;
}

export function invalidateProxyAgentCache() {
  cachedAgent = null;
}

/**
 * Same as fetch(), but when Global Proxy Engine is enabled, traffic goes via the configured proxy.
 */
export async function proxyAwareFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  const proxyUrl = await getActiveOutboundProxyUrl();
  if (!proxyUrl) {
    return fetch(input, init);
  }

  try {
    const undici = await import('undici');
    const agent = await getProxyAgent(proxyUrl);
    const opts: FetchInit = { ...(init || {}), dispatcher: agent };
    // undici fetch returns a WHATWG Response compatible with Node 18+ fetch Response.
    return (await undici.fetch(input, opts as any)) as unknown as Response;
  } catch (err: any) {
    const msg = String(err?.message || err || 'Proxy request failed');
    throw new Error(
      /proxy|ECONNREFUSED|ENOTFOUND|socket|tunnel|407|authentication/i.test(msg)
        ? `Global Proxy Engine failed (${msg}). Check the proxy URL in Admin → Accounts.`
        : msg,
    );
  }
}

/** Quick connectivity check — fetches a public IP endpoint through the given proxy URL. */
export async function testProxyUrl(proxyUrlRaw: string): Promise<{ ok: true; ip: string } | { ok: false; error: string }> {
  let proxyUrl: string;
  try {
    const { normalizeProxyUrl } = await import('./globalProxySettings');
    proxyUrl = normalizeProxyUrl(proxyUrlRaw);
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Invalid proxy URL' };
  }
  if (!proxyUrl) return { ok: false, error: 'Proxy URL is empty' };

  try {
    const undici = await import('undici');
    const agent = new undici.ProxyAgent(proxyUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await undici.fetch('https://api.ipify.org?format=json', {
        dispatcher: agent,
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      } as any);
      const text = await res.text();
      if (!res.ok) {
        return { ok: false, error: `Proxy reachable but IP check failed (${res.status})` };
      }
      let ip = '';
      try {
        ip = String(JSON.parse(text)?.ip || '').trim();
      } catch {
        ip = text.trim().slice(0, 64);
      }
      return { ok: true, ip: ip || 'unknown' };
    } finally {
      clearTimeout(timer);
      try {
        (agent as any).close?.();
      } catch {
        /* ignore */
      }
    }
  } catch (err: any) {
    return { ok: false, error: String(err?.message || err || 'Proxy test failed') };
  }
}
