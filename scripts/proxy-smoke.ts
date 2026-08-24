/**
 * Temporary smoke test for the generic proxy engine (no Supabase / auth needed).
 * Run: npx tsx scripts/proxy-smoke.ts
 */
import express from 'express';
import { forwardRequest, fromProxyPath, type ProxyTarget } from '../src/lib/proxyEngine';

const PORT = 4599;

function targetFor(origin: string): ProxyTarget {
  return { token: 't', origin, cookies: [] };
}

const app = express();
const raw = express.raw({ type: () => true, limit: '10mb' });

app.use('/fx/:token', raw, async (req, res) => {
  const origin = String(req.header('x-smoke-origin') || 'https://en.wikipedia.org');
  const target = targetFor(origin);
  const url = fromProxyPath(target, String(req.url || '/'));
  if (!url) return res.status(400).send('bad path');
  try {
    await forwardRequest({
      target,
      req,
      res,
      url,
      document: /text\/html/i.test(String(req.headers.accept || '')),
    });
  } catch (err: any) {
    if (!res.headersSent) res.status(502).send(String(err?.message || err));
  }
});

const server = app.listen(PORT);

const base = `http://127.0.0.1:${PORT}`;
let failures = 0;

function check(name: string, ok: boolean, extra = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
}

async function run() {
  // 1. HTML document: runtime injected + links rewritten into the proxy path space.
  const html = await fetch(`${base}/fx/t/wiki/Main_Page`, {
    headers: { accept: 'text/html', 'sec-fetch-dest': 'document' },
  });
  const body = await html.text();
  check('html status 200', html.status === 200, `got ${html.status}`);
  check('runtime injected', body.includes('data-atm-proxy'));
  check('same-origin links mapped', body.includes('href="/fx/t/'));
  check('cross-host assets mapped', /(href|src)="\/fx\/t\/~/.test(body));
  check('no raw origin links left', !/href="https:\/\/en\.wikipedia\.org/.test(body));
  check('csp header stripped', !html.headers.get('content-security-policy'));

  // 2. Sub-resource through the cross-host marker.
  const assetMatch = body.match(/(?:href|src)="(\/fx\/t\/[^"]*\.css[^"]*)"/) ||
    body.match(/href="(\/fx\/t\/[^"]*load\.php[^"]*)"/);
  if (assetMatch) {
    const css = await fetch(`${base}${assetMatch[1].replace(/&amp;/g, '&')}`, {
      headers: { accept: 'text/css', 'sec-fetch-dest': 'style' },
    });
    check('cross-host css 200', css.status === 200, `got ${css.status}`);
    const text = await css.text();
    check('css non-empty', text.length > 100, `${text.length} bytes`);
  } else {
    check('found a cross-host css link', false);
  }

  // 3. POST body passthrough (JSON) — proves raw body forwarding works.
  const payload = JSON.stringify({ hello: 'atm', n: 42 });
  const post = await fetch(`${base}/fx/t/post`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'x-smoke-origin': 'https://postman-echo.com',
    },
    body: payload,
  });
  const echo = await post.text();
  check('post status 200', post.status === 200, `got ${post.status}`);
  check('post body forwarded', echo.includes('"hello"') && echo.includes('atm'), echo.slice(0, 160));

  // 4. Redirect on a sub-resource is followed server-side.
  const redir = await fetch(`${base}/fx/t/redirect-to?url=https%3A%2F%2Fpostman-echo.com%2Fget`, {
    headers: { accept: 'application/json', 'x-smoke-origin': 'https://postman-echo.com' },
    redirect: 'manual',
  });
  check('sub-resource redirect followed', redir.status === 200, `got ${redir.status}`);

  // 5. Document redirect is handed to the browser as a proxy path.
  const docRedir = await fetch(`${base}/fx/t/redirect-to?url=https%3A%2F%2Fpostman-echo.com%2Fget`, {
    headers: {
      accept: 'text/html',
      'sec-fetch-dest': 'document',
      'x-smoke-origin': 'https://postman-echo.com',
    },
    redirect: 'manual',
  });
  const loc = docRedir.headers.get('location') || '';
  check('document redirect mapped', docRedir.status >= 300 && docRedir.status < 400 && loc.startsWith('/fx/t/'), `${docRedir.status} ${loc}`);

  // 6. Real-world SPA: ChatGPT document + CDN bundles (the "unstyled page" failure mode).
  const browserHeaders = {
    accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'upgrade-insecure-requests': '1',
  };
  const gpt = await fetch(`${base}/fx/t/`, {
    headers: { ...browserHeaders, 'sec-fetch-dest': 'document', 'x-smoke-origin': 'https://chatgpt.com' },
    redirect: 'manual',
  });
  const gptBody = gpt.status < 300 ? await gpt.text() : '';
  check('chatgpt document reachable', gpt.status === 200 || (gpt.status >= 300 && gpt.status < 400), `got ${gpt.status}`);

  if (gptBody) {
    const mappedHosts = [...new Set((gptBody.match(/\/fx\/t\/~[a-z0-9.-]+/gi) || []))].slice(0, 8);
    console.log(`      chatgpt html ${gptBody.length} bytes; mapped hosts: ${mappedHosts.join(', ') || 'none'}`);
    const cdn =
      gptBody.match(/(?:href|src)="(\/fx\/t\/~[a-z0-9.-]*oaistatic\.com\/[^"]+\.(?:js|css)[^"]*)"/i) ||
      gptBody.match(/(?:href|src)="(\/fx\/t\/[^"]+\.(?:js|css)[^"]*)"/i);
    check('oaistatic bundles mapped', Boolean(cdn), cdn ? cdn[1].slice(0, 70) : 'none found');
    if (cdn) {
      const path = cdn[1].replace(/&amp;/g, '&');
      const asset = await fetch(`${base}${path}`, {
        headers: { accept: '*/*', 'sec-fetch-dest': 'script', 'x-smoke-origin': 'https://chatgpt.com' },
      });
      const assetText = await asset.text();
      check('oaistatic bundle 200', asset.status === 200, `got ${asset.status}`);

      const direct = await fetch(
        `https://cdn.oaistatic.com${path.replace('/fx/t/~cdn.oaistatic.com', '')}`,
      );
      const directText = await direct.text();
      const isJs = /\.js(\?|$)/.test(path);
      if (isJs) {
        check('js bundle passed through byte-identical', assetText === directText,
          `proxy ${assetText.length} vs direct ${directText.length}`);
      } else {
        check('css bundle non-empty', assetText.length > 100, `${assetText.length} bytes`);
      }
    }

    // JS must be forwarded untouched or the SPA breaks (blank page / dead buttons).
    const js =
      gptBody.match(/src="(\/fx\/t\/(?!~)[^"]+\.js[^"]*)"/i) ||
      gptBody.match(/href="(\/fx\/t\/(?!~)[^"]+\.js[^"]*)"/i);
    check('js bundle link found', Boolean(js), js ? js[1].slice(0, 70) : 'none');
    if (js) {
      const path = js[1].replace(/&amp;/g, '&');
      const viaProxy = await fetch(`${base}${path}`, {
        headers: { ...browserHeaders, accept: '*/*', 'sec-fetch-dest': 'script', 'x-smoke-origin': 'https://chatgpt.com' },
      });
      const proxyText = await viaProxy.text();
      const direct = await fetch(`https://chatgpt.com${path.replace('/fx/t', '')}`, {
        headers: { ...browserHeaders, accept: '*/*' },
      });
      const directText = await direct.text();
      check('js bundle 200', viaProxy.status === 200, `got ${viaProxy.status}`);
      check('js bundle byte-identical', proxyText === directText,
        `proxy ${proxyText.length} vs direct ${directText.length}`);
    }
  }
}

run()
  .catch(err => {
    failures++;
    console.error('ERROR', err);
  })
  .finally(() => {
    server.close();
    console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
    process.exit(failures ? 1 : 0);
  });
