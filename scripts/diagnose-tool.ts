/**
 * Diagnose why one-click tools fail: cookies vs proxy vs referrer vs Cloudflare.
 * Usage: npx tsx scripts/diagnose-tool.ts
 *
 * Reads nothing from the DB — paste a sample Cookie header / proxy URL via env:
 *   DIAG_PROXY=http://user:pass@host:port/
 *   DIAG_COOKIE="name=value; name2=value2"
 */
import { ProxyAgent, fetch as undiciFetch } from 'undici';

const PROXY = process.env.DIAG_PROXY || '';
const COOKIE = process.env.DIAG_COOKIE || '';

async function hit(label: string, url: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: String((init.headers as any)?.Accept || 'text/html,application/json,*/*'),
    ...(COOKIE ? { Cookie: COOKIE } : {}),
    ...((init.headers as any) || {}),
  };
  delete (headers as any).Accept; // set below cleanly
  headers.Accept = String((init.headers as any)?.Accept || 'text/html,application/json,*/*');

  const opts: any = {
    method: init.method || 'GET',
    headers,
    redirect: 'manual',
  };
  if (PROXY) opts.dispatcher = new ProxyAgent(PROXY);
  if (init.body) opts.body = init.body;

  const started = Date.now();
  try {
    const res = await undiciFetch(url, opts);
    const text = await res.text();
    const preview = text.slice(0, 220).replace(/\s+/g, ' ');
    const cf = /just a moment|cf-browser-verification|challenge-platform|attention required/i.test(text);
    const denied = /session expired|access denied|access again from dashboard/i.test(text);
    console.log(
      `${label}\n  ${res.status} ${res.headers.get('content-type') || ''} (${Date.now() - started}ms)` +
        `${cf ? ' [CLOUDFLARE CHALLENGE]' : ''}${denied ? ' [PANEL DENIED]' : ''}` +
        `\n  ${preview}\n`,
    );
    return { status: res.status, text, cf, denied };
  } catch (err: any) {
    console.log(`${label}\n  ERROR ${err?.message || err}\n`);
    return { status: 0, text: '', cf: false, denied: false };
  }
}

async function main() {
  console.log('Proxy:', PROXY ? PROXY.replace(/\/\/.*:.*@/, '//***:***@') : '(direct — no DIAG_PROXY)');
  console.log('Cookie:', COOKIE ? `${COOKIE.split(';').length} parts` : '(none — set DIAG_COOKIE)\n');

  // 1) Outbound IP
  await hit('IP check', 'https://api.ipify.org?format=json', {
    headers: { Accept: 'application/json' },
  });

  // 2) ChatGPT HTML shell (often works even when API is blocked)
  await hit('ChatGPT HTML', 'https://chatgpt.com/', {
    headers: { Accept: 'text/html', Referer: 'https://chatgpt.com/' },
  });

  // 3) ChatGPT session/bootstrap APIs — these must work for the Send button to enable
  await hit('ChatGPT /backend-api/me', 'https://chatgpt.com/backend-api/me', {
    headers: {
      Accept: 'application/json',
      Referer: 'https://chatgpt.com/',
      Origin: 'https://chatgpt.com',
    },
  });
  await hit('ChatGPT /api/auth/session', 'https://chatgpt.com/api/auth/session', {
    headers: {
      Accept: 'application/json',
      Referer: 'https://chatgpt.com/',
    },
  });

  // 4) Panel-style host (Semrush) — Referer candidates
  const panel = process.env.DIAG_PANEL || 'https://semrush3.xemrush.site/home/';
  for (const ref of [
    'https://app.pakseotools.com/',
    'https://app.pakseotools.com/member',
    'https://pakseotools.com/',
    '',
  ]) {
    await hit(
      `Panel ${panel} referer=${ref || '(none)'}`,
      panel,
      {
        headers: {
          Accept: 'text/html',
          ...(ref ? { Referer: ref, Origin: new URL(ref).origin } : {}),
        },
      },
    );
  }

  console.log(`
Interpretation:
- If ChatGPT HTML = 200 but /backend-api/me or /api/auth/session = 403/challenge → PROXY IP is blocked (need residential).
- If those APIs = 401 → cookies missing/expired (re-copy from logged-in chatgpt.com).
- If Panel denied on ALL referers → proxy_token cookie is dead (re-unlock from seller dashboard, re-copy cookies).
- If Panel works with one referer only → use that exact referrer in Admin.
`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
