/** Temporary DNR rule ids for panel Referer unlock (session rules). */
const UNLOCK_RULE_TTL_MS = 45000;
/** Settle after clearing + writing cookies so ChatGPT/session jar is ready before navigate. */
const SETTLE_MS = 280;
/** Pak SEO opens panels from the app dashboard host — prefer this Referer. */
const DEFAULT_PANEL_REFERRER = 'https://app.pakseotools.com/';
const APEX_PANEL_REFERRER = 'https://pakseotools.com/';
const APP_PANEL_REFERRER = DEFAULT_PANEL_REFERRER;
const MEMBER_PANEL_REFERRER = 'https://app.pakseotools.com/member';
let nextRuleId = 900001;
const activeUnlockByTab = new Map(); // tabId -> { ruleIds, timer }

function destinationHost(destinationUrl) {
  try {
    return new URL(destinationUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function normalizeDomain(domain) {
  return String(domain || '').trim().toLowerCase().replace(/^\./, '');
}

function isToolAccessHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  return host === 'toolaccess.click' || host.endsWith('.toolaccess.click');
}

function cookieUrlFor(host, path, secure) {
  const cleanHost = String(host || '').replace(/^\./, '');
  const cleanPath = path && String(path).startsWith('/') ? String(path) : `/${path || ''}`;
  return `${secure ? 'https' : 'http'}://${cleanHost}${cleanPath || '/'}`;
}

function sameSite(value) {
  const raw = String(value || '').toLowerCase();
  if (raw === 'lax') return 'lax';
  if (raw === 'strict') return 'strict';
  if (raw === 'no_restriction' || raw === 'none') return 'no_restriction';
  return undefined;
}

function expirationDate(cookie) {
  if (cookie.expirationDate != null && cookie.expirationDate !== '') {
    const n = Number(cookie.expirationDate);
    return Number.isFinite(n) ? n : undefined;
  }
  if (cookie.expires != null && cookie.expires !== '' && cookie.expires !== -1) {
    const n = Number(cookie.expires);
    if (!Number.isFinite(n)) return undefined;
    return n > 1e12 ? n / 1000 : n;
  }
  return undefined;
}

function buildSetDetails(cookie, url, domain) {
  const secureDest = /^https:/i.test(url);
  let secure = cookie.secure;
  if (secure == null) secure = secureDest;
  else secure = Boolean(secure);

  const site = sameSite(cookie.sameSite);
  if (site === 'no_restriction') secure = true;

  const details = {
    url,
    name: String(cookie.name),
    value: String(cookie.value ?? ''),
    path: cookie.path || '/',
    secure: Boolean(secure),
    httpOnly: Boolean(cookie.httpOnly),
  };
  if (domain) details.domain = domain;
  const exp = expirationDate(cookie);
  if (exp != null) details.expirationDate = exp;
  if (site) details.sameSite = site;
  return details;
}

async function setOne(details) {
  try {
    await chrome.cookies.set(details);
    return true;
  } catch (error) {
    console.warn('Could not set cookie', details.name, details.url, details.domain, error);
    return false;
  }
}

async function removeOne(cookie) {
  try {
    const host = normalizeDomain(cookie.domain) || destinationHost(cookie.url || '');
    if (!host && !cookie.url) return false;
    const url =
      cookie.url ||
      cookieUrlFor(host, cookie.path || '/', cookie.secure !== false);
    await chrome.cookies.remove({ url, name: String(cookie.name) });
    return true;
  } catch (error) {
    console.warn('Could not remove cookie', cookie?.name, error);
    return false;
  }
}

/**
 * Wipe existing cookies for destination + export domains BEFORE applying admin
 * cookies. Otherwise a customer's personal ChatGPT/session cookies can win.
 */
async function clearSiteCookies(destinationUrl, cookieList) {
  const hosts = new Set();
  const pushHost = (raw) => {
    const host = normalizeDomain(raw);
    if (!host) return;
    hosts.add(host);
    const parts = host.split('.');
    if (parts.length >= 2) hosts.add(parts.slice(-2).join('.'));
  };

  pushHost(destinationHost(destinationUrl));
  for (const cookie of Array.isArray(cookieList) ? cookieList : []) {
    if (!cookie) continue;
    if (cookie.domain) pushHost(cookie.domain);
    if (cookie.url) pushHost(destinationHost(String(cookie.url)));
  }

  // ChatGPT / OpenAI aliases — personal sessions often live across these hosts.
  if ([...hosts].some((h) => /chatgpt\.com|openai\.com|oaistatic\.com/i.test(h))) {
    pushHost('chatgpt.com');
    pushHost('chat.openai.com');
    pushHost('auth0.openai.com');
    pushHost('auth.openai.com');
    pushHost('oaistatic.com');
  }

  let removed = 0;
  for (const host of hosts) {
    try {
      const existing = await chrome.cookies.getAll({ domain: host });
      for (const cookie of existing || []) {
        if (await removeOne(cookie)) removed += 1;
      }
    } catch (error) {
      console.warn('Could not list cookies for', host, error);
    }
  }
  return removed;
}

/**
 * For *.toolaccess.click destinations: write matching cookies as
 * host-only on the exact subdomain AND on parent .toolaccess.click.
 * Never remaps foreign domains (e.g. chatgpt.com) onto the panel.
 */
async function applyOnToolAccessPanel(cookie, destHost, path, destIsHttps) {
  let setCount = 0;
  const destUrl = cookieUrlFor(destHost, path, destIsHttps);
  if (await setOne(buildSetDetails(cookie, destUrl, undefined))) setCount += 1;

  const parent = '.toolaccess.click';
  const parentUrl = cookieUrlFor('toolaccess.click', path, destIsHttps);
  if (await setOne(buildSetDetails(cookie, parentUrl, parent))) setCount += 1;

  if (destHost !== 'toolaccess.click') {
    const apexUrl = cookieUrlFor('toolaccess.click', path, destIsHttps);
    if (await setOne(buildSetDetails(cookie, apexUrl, undefined))) setCount += 1;
  }
  return setCount;
}

async function removeUnlockRules(ruleIds) {
  const ids = (ruleIds || []).filter((id) => Number.isFinite(id));
  if (!ids.length || !chrome.declarativeNetRequest?.updateSessionRules) return;
  try {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ids, addRules: [] });
  } catch (error) {
    console.warn('Could not remove unlock DNR rules', error);
  }
}

function clearTabUnlock(tabId) {
  const entry = activeUnlockByTab.get(tabId);
  if (!entry) return;
  if (entry.timer) clearTimeout(entry.timer);
  activeUnlockByTab.delete(tabId);
  void removeUnlockRules(entry.ruleIds);
}

function normalizeUnlockReferrer(raw) {
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

function buildReferrerCandidates(primary, extraList) {
  const out = [];
  const push = (v) => {
    const s = String(v || '').trim();
    if (s && !out.includes(s)) out.push(s);
  };
  const list = Array.isArray(extraList) ? extraList : [];
  push(normalizeUnlockReferrer(primary));
  push(primary);
  for (const item of list) {
    push(normalizeUnlockReferrer(item));
    push(item);
  }
  push(DEFAULT_PANEL_REFERRER);
  push(APEX_PANEL_REFERRER);
  push(MEMBER_PANEL_REFERRER);
  push(APP_PANEL_REFERRER);
  return out;
}

function allocRuleId() {
  const id = nextRuleId++;
  if (nextRuleId > 990000) nextRuleId = 900001;
  return id;
}

/**
 * Install temporary session DNR rules to set Referer (and Origin when allowed)
 * on requests to the toolaccess host. Tries candidate Referers (highest priority first).
 * Returns rule ids or [] if unavailable.
 */
async function installUnlockReferrerRules(destinationUrl, referrerUrl, referrerCandidates) {
  const destHost = destinationHost(destinationUrl);
  if (!isToolAccessHost(destHost)) return { ruleIds: [], mode: 'none', referrer: '' };
  if (!chrome.declarativeNetRequest?.updateSessionRules) {
    return { ruleIds: [], mode: 'unsupported', referrer: '' };
  }

  const candidates = buildReferrerCandidates(referrerUrl, referrerCandidates);
  if (!candidates.length) {
    return { ruleIds: [], mode: 'invalid', referrer: '' };
  }

  const resourceTypes = [
    'main_frame',
    'sub_frame',
    'xmlhttprequest',
    'websocket',
    'other',
    'script',
    'stylesheet',
    'image',
    'font',
    'ping',
  ];

  // Cover exact subdomain + parent apex (redirects / shared assets).
  const hosts = [destHost];
  if (destHost !== 'toolaccess.click') hosts.push('toolaccess.click');

  const tryAddBundle = async (referrer, withOrigin) => {
    let origin = '';
    try {
      origin = new URL(referrer).origin;
    } catch {
      throw new Error('invalid referrer');
    }

    const ruleIds = [];
    const addRules = [];
    let priority = 100 + candidates.length;

    for (const host of hosts) {
      const ruleId = allocRuleId();
      ruleIds.push(ruleId);
      const requestHeaders = [{ header: 'Referer', operation: 'set', value: referrer }];
      if (withOrigin) {
        requestHeaders.push({ header: 'Origin', operation: 'set', value: origin });
      }
      addRules.push({
        id: ruleId,
        priority: priority--,
        action: { type: 'modifyHeaders', requestHeaders },
        condition: {
          requestDomains: [host],
          resourceTypes,
        },
      });
    }

    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: ruleIds,
      addRules,
    });
    return ruleIds;
  };

  // Prefer first candidate (normalized admin value). Only one Referer can win per request;
  // we install that winner for dest + apex hosts.
  let lastError = null;
  for (const referrer of candidates) {
    try {
      const ruleIds = await tryAddBundle(referrer, true);
      return { ruleIds, mode: 'referer+origin', referrer };
    } catch (err1) {
      lastError = err1;
      console.warn('DNR Origin rewrite rejected, trying Referer only', referrer, err1);
      try {
        const ruleIds = await tryAddBundle(referrer, false);
        return { ruleIds, mode: 'referer', referrer };
      } catch (err2) {
        lastError = err2;
        console.warn('DNR Referer rewrite failed for candidate', referrer, err2);
      }
    }
  }

  console.warn('DNR Referer rewrite unavailable for all candidates', lastError);
  return { ruleIds: [], mode: 'failed', referrer: candidates[0] || '' };
}

/**
 * Fallback when DNR cannot set Referer: open an extension page that navigates
 * with location.replace after a document.referrer context is limited — Chrome
 * still may not send a custom Referer from extension pages. Documented limit.
 */
async function openWithReferrerFallback(destinationUrl, referrerUrl) {
  const dest = encodeURIComponent(destinationUrl);
  const ref = encodeURIComponent(String(referrerUrl || ''));
  const url = chrome.runtime.getURL(`unlock.html?dest=${dest}&ref=${ref}`);
  return chrome.tabs.create({ url });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Apply Copy-Cookies JSON via chrome.cookies.set using each cookie's own
 * domain/url from the export (e.g. chatgpt.com cookies stay on chatgpt.com).
 *
 * For toolaccess.click destinations, also dual-write toolaccess-scoped
 * cookies onto the exact host (host-only) + parent domain before navigate.
 * When unlockReferrer is set (or panel dest), install temporary DNR Referer
 * rules and wait for cookie apply + settle before opening the tab.
 */
async function applyCookies(cookies, destinationUrl, openTab, unlockReferrer, referrerCandidates) {
  const list = Array.isArray(cookies) ? cookies : [];
  const destHost = destinationHost(destinationUrl);
  const destIsHttps = !/^http:\/\//i.test(destinationUrl || '');
  const destIsPanel = isToolAccessHost(destHost);
  const primary =
    normalizeUnlockReferrer(unlockReferrer) ||
    (destIsPanel ? DEFAULT_PANEL_REFERRER : '');
  const referrer = destIsPanel ? primary : '';
  let setCount = 0;
  let unlockMode = 'none';
  let ruleIds = [];
  let usedReferrer = '';

  // 1) DNR Referer unlock FIRST — must be active before any navigation.
  if (destIsPanel && referrer) {
    const installed = await installUnlockReferrerRules(
      destinationUrl,
      referrer,
      referrerCandidates,
    );
    ruleIds = installed.ruleIds || [];
    unlockMode = installed.mode;
    usedReferrer = installed.referrer || referrer;
  }

  // 2) Clear existing site cookies so personal sessions cannot override admin cookies.
  if (!destIsPanel) {
    await clearSiteCookies(destinationUrl, list);
  }

  // 3) Apply all cookies and wait for each set to finish.
  for (const cookie of list) {
    if (!cookie || !cookie.name) continue;
    const path = cookie.path || '/';
    const jsonDomain = cookie.domain ? String(cookie.domain) : '';
    const jsonHost = normalizeDomain(jsonDomain);
    const cookieIsToolAccess =
      isToolAccessHost(jsonHost) ||
      (cookie.url && isToolAccessHost(destinationHost(String(cookie.url))));

    let applied = false;

    // Prefer cookie.url / cookie.domain exactly as exported
    if (cookie.url) {
      const urlHost = destinationHost(String(cookie.url));
      if (!destIsPanel || isToolAccessHost(urlHost) || !urlHost) {
        applied = await setOne(buildSetDetails(cookie, String(cookie.url), jsonDomain || undefined));
        if (applied) setCount += 1;
      }
    } else if (jsonHost) {
      if (!destIsPanel || isToolAccessHost(jsonHost)) {
        const url = cookieUrlFor(jsonHost, path, cookie.secure !== false && destIsHttps);
        applied = await setOne(buildSetDetails(cookie, url, jsonDomain));
        if (applied) setCount += 1;
      }
    }

    // toolaccess destination: dual-write onto exact host + parent
    if (destIsPanel && destHost && (cookieIsToolAccess || !jsonHost)) {
      setCount += await applyOnToolAccessPanel(cookie, destHost, path, destIsHttps);
      applied = true;
    }

    // Non-panel destinations: only when JSON has no domain/url, set on dest
    if (!applied && !destIsPanel && destHost) {
      const destUrl = cookieUrlFor(destHost, path, destIsHttps);
      if (await setOne(buildSetDetails(cookie, destUrl, undefined))) setCount += 1;

      const parts = destHost.split('.');
      if (parts.length >= 2) {
        const registrable = parts.slice(-2).join('.');
        const parent = `.${registrable}`;
        const parentUrl = cookieUrlFor(registrable, path, destIsHttps);
        if (await setOne(buildSetDetails(cookie, parentUrl, parent))) setCount += 1;
      }
    }
  }

  // 4) Brief settle so session DNR + cookie jar are visible to the next navigation.
  if (openTab && destinationUrl && (ruleIds.length || setCount > 0 || destIsPanel || list.length > 0)) {
    await sleep(SETTLE_MS);
  }

  // Never open a bare toolaccess URL without Referer rules — that is the 403 path.
  if (openTab && destIsPanel && ruleIds.length === 0) {
    return {
      ok: false,
      error:
        'Could not install panel Referer unlock rules. Update or reload the Access extension (v1.3.2+), then try again.',
      count: list.length,
      setCount,
      unlockMode,
      unlockRules: 0,
      unlockReferrer: usedReferrer || referrer || '',
    };
  }

  let tab = null;
  if (openTab && destinationUrl) {
    tab = await chrome.tabs.create({ url: destinationUrl });

    if (tab?.id != null && ruleIds.length) {
      const tabId = tab.id;
      const timer = setTimeout(() => clearTabUnlock(tabId), UNLOCK_RULE_TTL_MS);
      activeUnlockByTab.set(tabId, { ruleIds, timer });
    } else if (ruleIds.length && !tab) {
      setTimeout(() => removeUnlockRules(ruleIds), UNLOCK_RULE_TTL_MS);
    }
  } else if (ruleIds.length) {
    setTimeout(() => removeUnlockRules(ruleIds), UNLOCK_RULE_TTL_MS);
  }

  return {
    ok: true,
    count: list.length,
    setCount,
    unlockMode,
    unlockRules: ruleIds.length,
    unlockReferrer: usedReferrer || referrer || '',
  };
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete' && activeUnlockByTab.has(tabId)) {
    // Keep rules briefly after first complete so XHR/subresources still get Referer.
    const entry = activeUnlockByTab.get(tabId);
    if (entry?.timer) clearTimeout(entry.timer);
    const timer = setTimeout(() => clearTabUnlock(tabId), 8000);
    activeUnlockByTab.set(tabId, { ...entry, timer });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  clearTabUnlock(tabId);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message) return;
  if (message.type === 'PING') {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return;
  }
  if (message.type !== 'APPLY_COOKIES') return;
  const unlockReferrer =
    message.unlockReferrer || message.panelReferrer || message.referrer || '';
  const referrerCandidates = Array.isArray(message.referrerCandidates)
    ? message.referrerCandidates
    : [];
  applyCookies(
    message.cookies,
    message.url,
    Boolean(message.openTab),
    unlockReferrer,
    referrerCandidates,
  )
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
  return true;
});
