/**
 * Generic reverse-proxy engine for tool sessions.
 *
 * Design goals (works for any tool added by admin — URL + cookies only):
 * - One URL space: /fx/<token>/…  (same-origin) and /fx/<token>/~<host>/… (other hosts)
 * - Forward every method, header and body byte-for-byte; stream SSE/downloads untouched
 * - Domain/path aware cookie jar built from the admin cookie JSON
 * - Never rewrite JavaScript bodies (that breaks modern SPAs). Network APIs are patched
 *   in the page instead, so runtime-built URLs are mapped correctly.
 */
import { Readable } from 'stream';
import { proxyAwareFetch } from './proxyFetch';

export const PROXY_BASE = '/fx';
const CROSS_HOST_MARKER = '~';
const STREAM_TYPES = /event-stream|ndjson|octet-stream|audio|video|zip|pdf|wasm/i;
const REWRITE_HTML = /text\/html|application\/xhtml/i;
const REWRITE_CSS = /text\/css/i;

/** Cookie as stored by admin (Chrome "Copy Cookies" format). */
export type JarCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
};

export type ProxyTarget = {
  token: string;
  /** Tool origin, e.g. https://chatgpt.com */
  origin: string;
  cookies: JarCookie[];
  /** Referer to spoof for panels that require a dashboard origin. */
  referrer?: string;
  /** Ordered Referer fallbacks for panel unlock (Pak SEO style). */
  referrerCandidates?: string[];
};

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  'accept-encoding',
  'cookie',
  'origin',
  'referer',
  'if-none-match',
  'if-modified-since',
]);

const STRIP_RESPONSE_HEADERS = new Set([
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  'strict-transport-security',
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'report-to',
  'nel',
  'set-cookie',
  'alt-svc',
  'link',
]);

export function normalizeCookies(raw: any[], fallbackHost = ''): JarCookie[] {
  const out: JarCookie[] = [];
  const fallback = String(fallbackHost || '')
    .trim()
    .toLowerCase()
    .replace(/^\./, '');
  for (const c of Array.isArray(raw) ? raw : []) {
    const name = String(c?.name || '').trim();
    if (!name) continue;
    const domain =
      String(c?.domain || '')
        .trim()
        .toLowerCase()
        .replace(/^\./, '') || fallback;
    out.push({
      name,
      value: c?.value == null ? '' : String(c.value),
      domain,
      path: String(c?.path || '/') || '/',
      secure: Boolean(c?.secure),
    });
  }
  return out;
}

function domainMatches(host: string, domain?: string): boolean {
  const h = String(host || '').toLowerCase();
  const d = String(domain || '').toLowerCase().replace(/^\./, '');
  if (!d) return true;
  return h === d || h.endsWith(`.${d}`);
}

/** Cookie header for one target URL, using domain/path matching like a browser. */
export function cookieHeaderFor(cookies: JarCookie[], url: string): string {
  let host = '';
  let path = '/';
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    path = u.pathname || '/';
  } catch {
    return '';
  }
  const seen = new Map<string, string>();
  for (const c of cookies || []) {
    if (!domainMatches(host, c.domain)) continue;
    const cookiePath = c.path || '/';
    if (cookiePath !== '/' && !path.startsWith(cookiePath)) continue;
    seen.set(c.name, c.value);
  }
  return [...seen.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

/** Merge upstream Set-Cookie values back into the jar so logins/CSRF stay valid. */
export function mergeSetCookies(cookies: JarCookie[], response: Response, url: string): JarCookie[] {
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    /* ignore */
  }

  const raw: string[] =
    typeof (response.headers as any).getSetCookie === 'function'
      ? (response.headers as any).getSetCookie()
      : [];
  if (!raw.length) {
    const single = response.headers.get('set-cookie');
    if (single) raw.push(single);
  }
  if (!raw.length) return cookies;

  const next = [...cookies];
  for (const line of raw) {
    const parts = String(line || '').split(';');
    const first = parts.shift() || '';
    const eq = first.indexOf('=');
    if (eq <= 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (!name) continue;

    let domain = host;
    let path = '/';
    for (const attr of parts) {
      const [k, v] = attr.split('=');
      const key = String(k || '').trim().toLowerCase();
      if (key === 'domain' && v) domain = String(v).trim().toLowerCase().replace(/^\./, '');
      if (key === 'path' && v) path = String(v).trim() || '/';
    }

    const idx = next.findIndex(
      c => c.name === name && (c.domain || '') === domain && (c.path || '/') === path,
    );
    const entry: JarCookie = { name, value, domain, path };
    if (idx >= 0) next[idx] = entry;
    else next.push(entry);
  }
  return next;
}

function isBlockedHost(host: string): boolean {
  const h = String(host || '').toLowerCase();
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal')) return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === '::1' || h.startsWith('fd') || h.startsWith('fe80')) return true;
  return false;
}

/** Absolute tool URL → portal path under /fx/<token>. */
export function toProxyPath(target: ProxyTarget, absoluteUrl: string): string {
  try {
    const u = new URL(absoluteUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return absoluteUrl;
    const originHost = new URL(target.origin).hostname.toLowerCase();
    const base = `${PROXY_BASE}/${encodeURIComponent(target.token)}`;
    const tail = `${u.pathname}${u.search}${u.hash}`;
    if (u.hostname.toLowerCase() === originHost) return `${base}${tail}`;
    return `${base}/${CROSS_HOST_MARKER}${u.host}${tail}`;
  } catch {
    return absoluteUrl;
  }
}

/** Portal path remainder (after /fx/<token>) → absolute tool URL. */
export function fromProxyPath(target: ProxyTarget, remainder: string): string | null {
  const raw = String(remainder || '/');
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  try {
    if (withSlash.startsWith(`/${CROSS_HOST_MARKER}`)) {
      const rest = withSlash.slice(2);
      const slash = rest.indexOf('/');
      const host = slash === -1 ? rest : rest.slice(0, slash);
      const tail = slash === -1 ? '/' : rest.slice(slash);
      if (!host || isBlockedHost(host.split(':')[0])) return null;
      return new URL(tail, `https://${host}`).href;
    }
    const originBase = target.origin.endsWith('/') ? target.origin : `${target.origin}/`;
    const url = new URL(withSlash, originBase);
    if (isBlockedHost(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function resolveAgainst(base: string, href: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function mapAttrValue(target: ProxyTarget, pageUrl: string, value: string): string {
  const trimmed = String(value || '').trim();
  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith(`${PROXY_BASE}/`)
  ) {
    return value;
  }
  const abs = resolveAgainst(pageUrl, trimmed);
  if (!abs || !/^https?:/i.test(abs)) return value;
  return toProxyPath(target, abs);
}

export function rewriteCss(target: ProxyTarget, css: string, pageUrl: string): string {
  return String(css || '')
    .replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (_m, _q: string, val: string) => {
      return `url("${mapAttrValue(target, pageUrl, val)}")`;
    })
    .replace(/@import\s+(['"])([^'"]+)\1/gi, (_m, q: string, val: string) => {
      return `@import ${q}${mapAttrValue(target, pageUrl, val)}${q}`;
    });
}

/**
 * Injected page runtime. Patches network + URL APIs so any tool's runtime-built
 * requests stay inside the proxy. Never rewrites the tool's own JS bundles.
 */
function runtimeScript(target: ProxyTarget): string {
  const base = JSON.stringify(`${PROXY_BASE}/${encodeURIComponent(target.token)}`);
  const origin = JSON.stringify(new URL(target.origin).origin);
  const marker = JSON.stringify(CROSS_HOST_MARKER);

  return `<script data-atm-proxy="1">
(function(){
  if (window.__ATM_PROXY__) return;
  var BASE=${base}, ORIGIN=${origin}, MARK=${marker};
  window.__ATM_PROXY__={base:BASE,origin:ORIGIN};

  function portalHost(){ return location.host; }

  /** Current page mapped back to the tool URL space. */
  function virtualHref(){
    var p=location.pathname;
    if (p.indexOf(BASE)===0) {
      var rest=p.slice(BASE.length) || '/';
      if (rest.charAt(1)===MARK && rest.charAt(0)==='/') {
        var body=rest.slice(2), i=body.indexOf('/');
        var host=i===-1?body:body.slice(0,i);
        var tail=i===-1?'/':body.slice(i);
        return 'https://'+host+tail+location.search+location.hash;
      }
      return ORIGIN+rest+location.search+location.hash;
    }
    return ORIGIN+p+location.search+location.hash;
  }

  function toProxy(abs){
    try {
      var u=new URL(abs);
      if (u.protocol!=='http:' && u.protocol!=='https:') return abs;
      if (u.host===portalHost()) return abs;
      var o=new URL(ORIGIN);
      var tail=u.pathname+u.search+u.hash;
      if (u.host===o.host) return BASE+tail;
      return BASE+'/'+MARK+u.host+tail;
    } catch(e){ return abs; }
  }

  function map(input){
    if (input==null) return input;
    var raw=String(input);
    if (!raw || raw.charAt(0)==='#') return input;
    if (/^(data|blob|javascript|mailto|tel|about):/i.test(raw)) return input;
    if (raw.indexOf(BASE+'/')===0 || raw===BASE) return input;
    try {
      var abs=new URL(raw, virtualHref()).href;
      if (raw.charAt(0)==='/' || /^https?:/i.test(raw)) return toProxy(abs);
      // Relative paths already resolve inside the proxy path space.
      return input;
    } catch(e){ return input; }
  }

  var ofetch=window.fetch && window.fetch.bind(window);
  if (ofetch) {
    window.fetch=function(input, init){
      try {
        if (typeof input==='string' || input instanceof URL) {
          return ofetch(map(String(input)), init);
        }
        if (input && input.url) {
          var mapped=map(input.url);
          if (mapped===input.url) return ofetch(input, init);
          return ofetch(new Request(mapped, input), init);
        }
      } catch(e){}
      return ofetch(input, init);
    };
  }

  var oopen=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(){
    var args=Array.prototype.slice.call(arguments);
    if (typeof args[1]==='string') args[1]=map(args[1]);
    return oopen.apply(this, args);
  };

  if (window.EventSource) {
    var OES=window.EventSource;
    function PatchedES(url, conf){ return new OES(map(String(url)), conf); }
    PatchedES.prototype=OES.prototype;
    try { PatchedES.CONNECTING=OES.CONNECTING; PatchedES.OPEN=OES.OPEN; PatchedES.CLOSED=OES.CLOSED; } catch(e){}
    window.EventSource=PatchedES;
  }

  if (window.WebSocket) {
    var OWS=window.WebSocket;
    function PatchedWS(url, protocols){
      var u=String(url);
      try {
        var abs=new URL(u, virtualHref());
        var mapped=toProxy(abs.href.replace(/^ws/,'http'));
        if (mapped.indexOf(BASE)===0) {
          u=(location.protocol==='https:'?'wss://':'ws://')+location.host+mapped;
        }
      } catch(e){}
      return protocols===undefined ? new OWS(u) : new OWS(u, protocols);
    }
    PatchedWS.prototype=OWS.prototype;
    try { PatchedWS.CONNECTING=OWS.CONNECTING; PatchedWS.OPEN=OWS.OPEN; PatchedWS.CLOSING=OWS.CLOSING; PatchedWS.CLOSED=OWS.CLOSED; } catch(e){}
    window.WebSocket=PatchedWS;
  }

  // Service workers cannot see our patches — keep the page on the network path.
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register=function(){ return Promise.reject(new Error('disabled by proxy')); };
      if (navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(function(rs){
          rs.forEach(function(r){ try { r.unregister(); } catch(e){} });
        }).catch(function(){});
      }
    }
  } catch(e){}

  function patchProp(proto, prop){
    try {
      var d=Object.getOwnPropertyDescriptor(proto, prop);
      if (!d || !d.set) return;
      Object.defineProperty(proto, prop, {
        configurable:true, enumerable:d.enumerable,
        get: function(){ return d.get ? d.get.call(this) : undefined; },
        set: function(v){ return d.set.call(this, map(v)); }
      });
    } catch(e){}
  }
  if (window.HTMLScriptElement) patchProp(HTMLScriptElement.prototype, 'src');
  if (window.HTMLImageElement) patchProp(HTMLImageElement.prototype, 'src');
  if (window.HTMLLinkElement) patchProp(HTMLLinkElement.prototype, 'href');
  if (window.HTMLIFrameElement) patchProp(HTMLIFrameElement.prototype, 'src');
  if (window.HTMLMediaElement) patchProp(HTMLMediaElement.prototype, 'src');
  if (window.HTMLFormElement) patchProp(HTMLFormElement.prototype, 'action');

  var oset=Element.prototype.setAttribute;
  Element.prototype.setAttribute=function(name, value){
    try {
      var n=String(name||'').toLowerCase();
      if (n==='src' || n==='href' || n==='action' || n==='poster' || n==='formaction') {
        return oset.call(this, name, map(value));
      }
    } catch(e){}
    return oset.call(this, name, value);
  };

  // Keep SPA history inside the proxy path space.
  ['pushState','replaceState'].forEach(function(fn){
    var orig=history[fn];
    if (!orig) return;
    history[fn]=function(state, title, url){
      if (url==null) return orig.call(history, state, title, url);
      var mapped=url;
      try {
        var abs=new URL(String(url), virtualHref());
        var proxied=toProxy(abs.href);
        mapped = proxied.indexOf(BASE)===0 ? proxied : url;
      } catch(e){}
      return orig.call(history, state, title, mapped);
    };
  });

  var oopenwin=window.open;
  window.open=function(url){
    var args=Array.prototype.slice.call(arguments);
    if (typeof url==='string') args[0]=map(url);
    return oopenwin.apply(window, args);
  };

  // Block native form navigations away from /fx/… (caused reload-with-no-reply).
  // Do NOT stopPropagation on keydown — ChatGPT's React handlers need Enter.
  document.addEventListener('submit', function(e){
    try {
      var form=e.target;
      if(!form || form.tagName!=='FORM') return;
      var action=form.getAttribute('action') || location.href;
      if (String(action).indexOf(BASE)===0) return;
      var method=(form.getAttribute('method')||'GET').toUpperCase();
      var abs=new URL(action, virtualHref()).href;
      e.preventDefault();
      if (method==='GET') {
        var dest=new URL(abs);
        var fd=new FormData(form);
        fd.forEach(function(v,k){ dest.searchParams.set(k, String(v)); });
        location.href=map(dest.href);
        return;
      }
      if (ofetch) {
        ofetch(map(abs), { method: method, body: new FormData(form), credentials: 'same-origin' })
          .then(function(r){ return r.text(); })
          .then(function(html){
            if (html && /<html/i.test(html)) { document.open(); document.write(html); document.close(); }
          })
          .catch(function(){});
      }
    } catch(err){}
  }, true);

  // Re-enable Send when ChatGPT left it disabled after a failed conversation/init
  // (happens when /api/auth bootstrap was not proxied).
  function unlockComposer(){
    try {
      var btns=document.querySelectorAll('button[data-testid="send-button"], button[aria-label="Send prompt"], form[data-type="unified-composer"] button[type="submit"]');
      btns.forEach(function(btn){
        if (!btn) return;
        if (btn.disabled) btn.disabled=false;
        btn.removeAttribute('disabled');
        btn.setAttribute('aria-disabled','false');
      });
    } catch(e){}
  }
  setInterval(unlockComposer, 1500);
  document.addEventListener('input', unlockComposer, true);
})();
</script>`;
}

export function rewriteHtml(target: ProxyTarget, html: string, pageUrl: string): string {
  let out = String(html || '');

  out = out.replace(/<base\b[^>]*>/gi, '');
  out = out.replace(
    /<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi,
    '',
  );
  // Stylesheets are rewritten, so subresource integrity hashes no longer match.
  out = out.replace(/\sintegrity=("[^"]*"|'[^']*')/gi, '');

  out = out.replace(
    /\b(href|src|action|poster|formaction|data-src|data-href)=("([^"]*)"|'([^']*)')/gi,
    (_m, attr: string, _q: string, dq?: string, sq?: string) => {
      const value = dq !== undefined ? dq : sq || '';
      return `${attr}="${mapAttrValue(target, pageUrl, value)}"`;
    },
  );

  out = out.replace(/\bsrcset=("([^"]*)"|'([^']*)')/gi, (_m, _q: string, dq?: string, sq?: string) => {
    const value = dq !== undefined ? dq : sq || '';
    const mapped = value
      .split(',')
      .map(chunk => {
        const bit = chunk.trim();
        if (!bit) return bit;
        const [urlPart, ...rest] = bit.split(/\s+/);
        return [mapAttrValue(target, pageUrl, urlPart), ...rest].join(' ');
      })
      .join(', ');
    return `srcset="${mapped}"`;
  });

  out = out.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (m, css: string) => {
    return m.replace(css, rewriteCss(target, css, pageUrl));
  });

  const runtime = runtimeScript(target);
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>${runtime}`);
  } else if (/<html[^>]*>/i.test(out)) {
    out = out.replace(/<html([^>]*)>/i, `<html$1>${runtime}`);
  } else {
    out = runtime + out;
  }
  return out;
}

function isPanelDenied(status: number, contentType: string, bodyPreview: string): boolean {
  if (status === 403) return true;
  if (!/text\/html|application\/json|text\/plain/i.test(contentType) && status !== 401) return false;
  return /session expired|access again from dashboard|access denied|pak seo|tool dashboard|login to continue|please\s+login/i.test(
    String(bodyPreview || ''),
  );
}

function buildRequestHeaders(
  target: ProxyTarget,
  clientHeaders: Record<string, any>,
  url: string,
  method: string,
  refererOverride?: string,
): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(clientHeaders || {})) {
    const key = rawKey.toLowerCase();
    if (HOP_BY_HOP.has(key)) continue;
    if (key.startsWith('x-vercel') || key.startsWith('x-forwarded') || key === 'x-real-ip') continue;
    if (key === 'sec-fetch-site' || key === 'sec-fetch-mode' || key === 'sec-fetch-dest') continue;
    const value = Array.isArray(rawValue) ? rawValue.join(', ') : rawValue;
    if (value == null) continue;
    headers[rawKey] = String(value);
  }

  if (!headers['user-agent'] && !headers['User-Agent']) {
    headers['User-Agent'] =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  }
  headers['Accept-Encoding'] = 'identity';

  const cookie = cookieHeaderFor(target.cookies, url);
  if (cookie) headers.Cookie = cookie;

  let sameOrigin = target.origin;
  try {
    sameOrigin = new URL(url).origin;
  } catch {
    /* ignore */
  }

  // Translate the browser's /fx/<token>/… referer back into the tool's own URL
  // space so sites that validate Referer keep working.
  let mappedReferer = '';
  const rawReferer = String(clientHeaders?.referer || clientHeaders?.Referer || '');
  if (rawReferer) {
    try {
      const refPath = new URL(rawReferer).pathname;
      const prefix = `${PROXY_BASE}/${encodeURIComponent(target.token)}`;
      if (refPath === prefix || refPath.startsWith(`${prefix}/`)) {
        const remainder = `${refPath.slice(prefix.length) || '/'}${new URL(rawReferer).search}`;
        mappedReferer = fromProxyPath(target, remainder) || '';
      }
    } catch {
      /* ignore */
    }
  }

  // Panel unlock Referer wins when set (Pak SEO algorithm). Otherwise map the
  // browser's proxy-path Referer back to the real tool URL.
  const referer =
    String(refererOverride || target.referrer || '').trim() || mappedReferer || `${sameOrigin}/`;
  headers.Referer = referer;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      headers.Origin = new URL(referer).origin;
    } catch {
      headers.Origin = sameOrigin;
    }
  }
  return headers;
}

export type ForwardResult = { cookies: JarCookie[]; referrerUsed?: string };

/**
 * Core proxy: forward one client request to the tool and write the response.
 * Rewrites HTML/CSS only; everything else is streamed untouched.
 * For panel tools, retries with alternate dashboard Referers (Pak SEO algorithm).
 */
export async function forwardRequest(opts: {
  target: ProxyTarget;
  req: any;
  res: any;
  url: string;
  /** True when this is a top-level document load (adds the runtime + HTML rewrite). */
  document?: boolean;
}): Promise<ForwardResult> {
  const { target, req, res } = opts;
  const method = String(req.method || 'GET').toUpperCase();

  let body: Buffer | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    const contentType = String(req.headers?.['content-type'] || '');
    if (Buffer.isBuffer(req.body)) body = req.body;
    else if (typeof req.body === 'string') body = Buffer.from(req.body);
    else if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) {
      body = /application\/x-www-form-urlencoded/i.test(contentType)
        ? Buffer.from(new URLSearchParams(req.body as Record<string, string>).toString())
        : Buffer.from(JSON.stringify(req.body));
    }
  }

  const referrerList: string[] = [];
  const pushRef = (v?: string) => {
    const s = String(v || '').trim();
    if (s && !referrerList.includes(s)) referrerList.push(s);
  };
  pushRef(target.referrer);
  for (const c of target.referrerCandidates || []) pushRef(c);
  if (!referrerList.length) referrerList.push('');

  let cookies = target.cookies;
  let chosenReferrer = referrerList[0] || '';
  let finalUrl = opts.url;
  let finalUpstream: Response | null = null;
  let finalBuf: Buffer | null = null;

  for (let r = 0; r < referrerList.length; r++) {
    const refererOverride = referrerList[r] || undefined;
    let current = opts.url;
    let upstream: Response | null = null;
    let hopCookies = cookies;

    for (let hop = 0; hop < 8; hop++) {
      const activeTarget: ProxyTarget = { ...target, cookies: hopCookies, referrer: refererOverride || '' };
      const headers = buildRequestHeaders(
        activeTarget,
        req.headers || {},
        current,
        hop === 0 ? method : 'GET',
        refererOverride,
      );
      if (body && hop === 0) headers['Content-Length'] = String(body.byteLength);

      upstream = await proxyAwareFetch(current, {
        method: hop === 0 ? method : 'GET',
        redirect: 'manual',
        headers,
        body: hop === 0 && method !== 'GET' && method !== 'HEAD' ? body : undefined,
      });
      hopCookies = mergeSetCookies(hopCookies, upstream, current);

      if (upstream.status < 300 || upstream.status >= 400) break;
      const location = upstream.headers.get('location');
      if (!location) break;
      const next = resolveAgainst(current, location);
      if (!next) break;

      if (opts.document) {
        cookies = hopCookies;
        res.status(upstream.status);
        res.setHeader('Location', toProxyPath({ ...target, cookies }, next));
        res.end();
        return { cookies, referrerUsed: refererOverride || '' };
      }
      current = next;
    }

    if (!upstream) continue;

    const contentType = upstream.headers.get('content-type') || '';
    const shouldRewriteHtml = REWRITE_HTML.test(contentType);
    const shouldRewriteCss = REWRITE_CSS.test(contentType);
    const shouldStream =
      !shouldRewriteHtml && !shouldRewriteCss && (STREAM_TYPES.test(contentType) || !contentType);

    // Only buffer when we may need to inspect for panel denial + retry.
    const mayRetry = r < referrerList.length - 1 && Boolean(target.referrer || target.referrerCandidates?.length);
    if (shouldStream && !mayRetry) {
      cookies = hopCookies;
      for (const [key, value] of upstream.headers.entries()) {
        if (STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) continue;
        res.setHeader(key, value);
      }
      res.setHeader('Cache-Control', 'no-store');
      if (/event-stream/i.test(contentType)) res.setHeader('X-Accel-Buffering', 'no');
      res.status(upstream.status);
      if (!upstream.body) {
        res.end();
        return { cookies, referrerUsed: refererOverride || '' };
      }
      if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();
      // @ts-expect-error Node typings for Readable.fromWeb
      Readable.fromWeb(upstream.body).pipe(res);
      return { cookies, referrerUsed: refererOverride || '' };
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    const preview = buf.subarray(0, 4096).toString('utf8');
    cookies = hopCookies;
    finalUpstream = upstream;
    finalBuf = buf;
    finalUrl = upstream.url || current;
    chosenReferrer = refererOverride || '';

    if (mayRetry && isPanelDenied(upstream.status, contentType, preview)) {
      continue;
    }
    break;
  }

  if (!finalUpstream || !finalBuf) {
    res.status(502).json({ error: 'No upstream response' });
    return { cookies, referrerUsed: chosenReferrer };
  }

  const activeTarget: ProxyTarget = { ...target, cookies, referrer: chosenReferrer };
  const contentType = finalUpstream.headers.get('content-type') || '';

  for (const [key, value] of finalUpstream.headers.entries()) {
    if (STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) continue;
    res.setHeader(key, value);
  }
  const location = finalUpstream.headers.get('location');
  if (location) {
    const abs = resolveAgainst(finalUrl, location);
    if (abs) res.setHeader('Location', toProxyPath(activeTarget, abs));
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(finalUpstream.status);

  if (REWRITE_HTML.test(contentType)) {
    let html = rewriteHtml(activeTarget, finalBuf.toString('utf8'), finalUrl);
    // Friendly page when a panel still rejects after every Referer candidate.
    if (
      opts.document &&
      target.referrer &&
      isPanelDenied(finalUpstream.status, contentType, finalBuf.subarray(0, 4096).toString('utf8'))
    ) {
      html = `<!doctype html><meta charset="utf-8"><title>Panel locked</title>
<body style="font-family:system-ui;background:#0d0908;color:#fecaca;padding:2.5rem;max-width:36rem;margin:auto">
<h1 style="font-size:1.2rem">Panel session rejected</h1>
<p style="color:#94a3b8;font-size:.9rem;line-height:1.5">
We tried every dashboard Referer (including <code>app.pakseotools.com</code>).
The panel still said <em>Session expired</em> — so this is <strong>not a proxy/Referer bug</strong>.
The <code>proxy_token</code> cookie is expired or was copied before the panel was unlocked.
</p>
<ol style="color:#cbd5e1;font-size:.85rem;line-height:1.6">
<li>Log into the <strong>original seller dashboard</strong> (Pak SEO / aitoolzmart) and open this tool until it loads.</li>
<li>While that unlocked tab is open, Copy Cookies and paste them in Admin → Cookies.</li>
<li>Panel unlock referrer = <code>https://app.pakseotools.com/</code> (not /login).</li>
<li>Save, close this tab, open again from your dashboard.</li>
</ol>
<p style="color:#64748b;font-size:.75rem">Tried referrer: ${String(chosenReferrer || '—')}</p>
</body>`;
    }
    res.setHeader('Content-Type', contentType || 'text/html; charset=utf-8');
    res.send(html);
    return { cookies, referrerUsed: chosenReferrer };
  }

  if (REWRITE_CSS.test(contentType)) {
    const css = rewriteCss(activeTarget, finalBuf.toString('utf8'), finalUrl);
    res.setHeader('Content-Type', contentType || 'text/css; charset=utf-8');
    res.send(css);
    return { cookies, referrerUsed: chosenReferrer };
  }

  if (contentType) res.setHeader('Content-Type', contentType);
  res.send(finalBuf);
  return { cookies, referrerUsed: chosenReferrer };
}
