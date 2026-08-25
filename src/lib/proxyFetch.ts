/**
 * Outbound fetch via Global Proxy Engine.
 *
 * One-click needs a *residential sticky* HTTP proxy:
 * - Datacenter/AWS IPs often load ChatGPT HTML but fail Send / hit Cloudflare
 * - Sticky session keeps the same exit IP for one tool tab
 */
import { AsyncLocalStorage } from 'async_hooks';
import {
  applyStickySession,
  getActiveOutboundProxyUrl,
  normalizeProxyUrl,
} from './globalProxySettings';

type FetchInit = RequestInit & { dispatcher?: unknown };

const stickyStore = new AsyncLocalStorage<string>();
let cachedAgent: { key: string; agent: unknown; at: number } | null = null;
const AGENT_TTL_MS = 5 * 60_000;

/** Run tool-proxy work so every upstream fetch shares one sticky residential IP. */
export function runWithProxySticky<T>(stickyId: string, fn: () => Promise<T>): Promise<T> {
  const id = String(stickyId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 16);
  if (!id) return fn();
  return stickyStore.run(id, fn);
}

export function invalidateProxyAgentCache() {
  cachedAgent = null;
}

async function getProxyAgent(proxyUrl: string): Promise<unknown> {
  const now = Date.now();
  if (cachedAgent && cachedAgent.key === proxyUrl && now - cachedAgent.at < AGENT_TTL_MS) {
    return cachedAgent.agent;
  }
  if (/^socks/i.test(proxyUrl)) {
    throw new Error(
      'SOCKS proxies are not supported on this host. Use the provider’s HTTP residential endpoint (http://user:pass@host:port/).',
    );
  }
  const undici = await import('undici');
  const agent = new undici.ProxyAgent({
    uri: proxyUrl,
    connections: 16,
    pipelining: 1,
    connect: { timeout: 30_000 },
  } as any);
  cachedAgent = { key: proxyUrl, agent, at: now };
  return agent;
}

async function resolveProxyUrl(): Promise<string | null> {
  let proxyUrl = await getActiveOutboundProxyUrl();
  if (!proxyUrl) return null;
  const sticky = stickyStore.getStore();
  if (sticky) proxyUrl = applyStickySession(proxyUrl, sticky);
  return proxyUrl;
}

/**
 * Same as fetch(), but when Global Proxy Engine is enabled, traffic goes via the configured proxy.
 */
export async function proxyAwareFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  const proxyUrl = await resolveProxyUrl();
  if (!proxyUrl) {
    return fetch(input, init);
  }

  try {
    const undici = await import('undici');
    const agent = await getProxyAgent(proxyUrl);
    const opts: FetchInit = { ...(init || {}), dispatcher: agent };
    return (await undici.fetch(input, opts as any)) as unknown as Response;
  } catch (err: any) {
    const msg = String(err?.message || err || 'Proxy request failed');
    throw new Error(
      /proxy|ECONNREFUSED|ENOTFOUND|socket|tunnel|407|authentication|SOCKS|residential/i.test(msg)
        ? `Global Proxy Engine failed (${msg}). Check Admin → Global Proxy Engine (residential HTTP URL).`
        : msg,
    );
  }
}

export type ProxyTestResult =
  | {
      ok: true;
      ip: string;
      isp?: string;
      hosting?: boolean;
      residentialLikely: boolean;
      chatgptHtml: number;
      chatgptBlocked: boolean;
      udemyHtml?: number;
      udemyBlocked?: boolean;
      oneClickReady: boolean;
      message: string;
      warnings: string[];
    }
  | { ok: false; error: string };

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function looksLikeCloudflare(status: number, body: string): boolean {
  return (
    status === 403 ||
    status === 503 ||
    /just a moment|cf-browser-verification|challenge-platform|cdn-cgi\/challenge|attention required|unable to connect to the website|ray id:/i.test(
      body,
    )
  );
}

async function fetchViaProxy(
  proxyUrl: string,
  url: string,
  headers: Record<string, string>,
  timeoutMs = 35_000,
): Promise<{ status: number; text: string }> {
  const undici = await import('undici');
  const agent = new undici.ProxyAgent({
    uri: proxyUrl,
    connections: 4,
    pipelining: 1,
    connect: { timeout: timeoutMs },
  } as any);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Proxy request timed out')), timeoutMs);
  try {
    const res = await undici.fetch(url, {
      dispatcher: agent,
      signal: controller.signal,
      headers,
      redirect: 'follow',
    } as any);
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
    try {
      (agent as any).close?.();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Strong one-click readiness check — IP type + ChatGPT/Udemy reachability through the proxy.
 */
export async function testProxyUrl(proxyUrlRaw: string): Promise<ProxyTestResult> {
  let proxyUrl: string;
  try {
    proxyUrl = normalizeProxyUrl(proxyUrlRaw);
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Invalid proxy URL' };
  }
  if (!proxyUrl) return { ok: false, error: 'Proxy URL is empty' };
  if (/^socks/i.test(proxyUrl)) {
    return {
      ok: false,
      error:
        'Use an HTTP residential proxy URL (http://user:pass@host:port/), not socks://. Most providers give both.',
    };
  }

  // Pin a sticky session for the whole test (same as a real tool tab).
  // Webshare needs numeric session ids — applyStickySession handles that.
  const stickyProxyUrl = applyStickySession(proxyUrl, `t${Date.now()}`);

  try {
    let activeProxy = stickyProxyUrl;
    let ipRes: { status: number; text: string } | null = null;
    let lastErr: any = null;

    for (const candidate of [stickyProxyUrl, proxyUrl]) {
      try {
        const res = await fetchViaProxy(candidate, 'https://api.ipify.org?format=json', {
          Accept: 'application/json',
          'User-Agent': BROWSER_UA,
        });
        if (res.status >= 200 && res.status < 300) {
          ipRes = res;
          activeProxy = candidate;
          break;
        }
        lastErr = new Error(`Proxy reachable but IP check failed (${res.status})`);
      } catch (err) {
        lastErr = err;
      }
    }

    if (!ipRes) {
      throw lastErr || new Error('Proxy IP check failed');
    }
    proxyUrl = activeProxy;

    let ip = '';
    try {
      ip = String(JSON.parse(ipRes.text)?.ip || '').trim();
    } catch {
      ip = ipRes.text.trim().slice(0, 64);
    }
    if (!ip) return { ok: false, error: 'Proxy returned empty IP' };

    let isp = '';
    let hosting = false;
    try {
      const meta = await fetchViaProxy(
        proxyUrl,
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,proxy,hosting,isp,org,query`,
        { Accept: 'application/json', 'User-Agent': BROWSER_UA },
      );
      const j = JSON.parse(meta.text);
      if (j?.status === 'success') {
        isp = String(j.isp || j.org || '').trim();
        hosting = Boolean(j.hosting || j.proxy);
      }
    } catch {
      /* optional */
    }

    if (!isp && /^(3\.|13\.|18\.|34\.|35\.|52\.|54\.|16\.|44\.|63\.|64\.|100\.|107\.|174\.|184\.)/.test(ip)) {
      hosting = true;
      isp = 'Likely cloud/datacenter (heuristic)';
    }

    const chatgpt = await fetchViaProxy(proxyUrl, 'https://chatgpt.com/', {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': BROWSER_UA,
      'Accept-Language': 'en-US,en;q=0.9',
    });
    const chatgptBlocked = looksLikeCloudflare(chatgpt.status, chatgpt.text.slice(0, 4000));

    let udemyHtml = 0;
    let udemyBlocked = false;
    try {
      const udemy = await fetchViaProxy(proxyUrl, 'https://www.udemy.com/', {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'en-US,en;q=0.9',
      });
      udemyHtml = udemy.status;
      udemyBlocked = looksLikeCloudflare(udemy.status, udemy.text.slice(0, 4000));
    } catch {
      udemyBlocked = true;
    }

    const residentialLikely = !hosting;
    const warnings: string[] = [];
    if (hosting) {
      warnings.push(
        'Exit IP looks like datacenter/VPN. ChatGPT Send and Udemy often fail — buy residential sticky (Webshare/IPRoyal/Bright Data).',
      );
    }
    if (chatgptBlocked) warnings.push('ChatGPT returned a bot/Cloudflare wall through this proxy.');
    if (udemyBlocked) {
      warnings.push(
        'Udemy returned a Cloudflare wall — keep Udemy on By extension unless this residential IP is trusted.',
      );
    }

    const oneClickReady =
      residentialLikely && !chatgptBlocked && chatgpt.status >= 200 && chatgpt.status < 400;

    const message = oneClickReady
      ? `One-click ready — residential IP ${ip}${isp ? ` (${isp})` : ''}. ChatGPT HTML ${chatgpt.status}.`
      : `Proxy reachable (IP ${ip}) but NOT ready for one-click.${warnings[0] ? ` ${warnings[0]}` : ''}`;

    return {
      ok: true,
      ip,
      isp: isp || undefined,
      hosting,
      residentialLikely,
      chatgptHtml: chatgpt.status,
      chatgptBlocked,
      udemyHtml,
      udemyBlocked,
      oneClickReady,
      message,
      warnings,
    };
  } catch (err: any) {
    const cause =
      err?.cause?.message ||
      err?.cause?.code ||
      (typeof err?.cause === 'string' ? err.cause : '') ||
      '';
    const base = String(err?.message || err || 'Proxy test failed');
    const detail = cause && !base.includes(String(cause)) ? `${base} (${cause})` : base;
    let hint = detail;
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|aborted|UND_ERR|cancelled|timed out/i.test(detail)) {
      hint =
        `${detail}. Check: (1) Save with http://USER:PASS@p.webshare.io:80/ (port stays after save now), ` +
        `(2) Sticky not Rotating, (3) verify Webshare email, (4) wait for deploy then Test again.`;
    }
    return { ok: false, error: hint };
  }
}
