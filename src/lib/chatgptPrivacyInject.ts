/**
 * Always inject on ChatGPT: hide Account / Settings so members cannot change
 * the shared subscription email (or other account fields).
 */
export function chatgptAccountLockScript(): string {
  return `<script data-zynex-account-lock="1">(function(){
  if (window.__ZYNEX_ACCOUNT_LOCK__) return;
  window.__ZYNEX_ACCOUNT_LOCK__ = true;

  var style = document.createElement('style');
  style.setAttribute('data-zynex-account-lock-css', '1');
  style.textContent = [
    '/* Hide ChatGPT account / settings entry points */',
    'a[href*="/account"], a[href*="account.openai.com"], a[href*="/settings"],',
    'a[href*="auth0.openai.com"], a[href*="pay.openai.com"],',
    '[data-testid="accounts-profile-button"] ~ *,',
    '[data-testid="profile-button"] + *,',
    '[data-zynex-account-hide="1"] { display: none !important; visibility: hidden !important; }'
  ].join('\\n');
  (document.head || document.documentElement).appendChild(style);

  var BLOCK_LABELS = [
    'Settings', 'Account settings', 'Account', 'My plan', 'Plan', 'Upgrade plan',
    'Get ChatGPT Plus', 'Get Plus', 'Manage subscription', 'Subscription',
    'Billing', 'Payment', 'Email', 'Change email', 'Profile', 'Log out', 'Logout',
    'Sign out', 'Delete account', 'Data controls', 'Builder profile', 'Help',
    'Custom instructions', 'General', 'Security', 'Connected apps'
  ];

  function isAccountUrl(href){
    var h = String(href || '').toLowerCase();
    return /\\/settings|\\/account|account\\.openai|auth0\\.openai|pay\\.openai|chatgpt\\.com\\/\\#settings|chatgpt\\.com\\/settings/i.test(h);
  }

  function markAccountUi(){
    try {
      document.querySelectorAll('a, button, div[role="menuitem"], div[role="option"]').forEach(function(el){
        var href = el.getAttribute && (el.getAttribute('href') || '');
        var t = String(el.textContent || '').replace(/\\s+/g, ' ').trim();
        if (isAccountUrl(href) || (t && t.length < 48 && BLOCK_LABELS.indexOf(t) >= 0)) {
          var box = el.closest('[role="menuitem"]') || el.closest('a') || el.closest('button') || el;
          if (box && box !== document.body) box.setAttribute('data-zynex-account-hide', '1');
        }
      });
    } catch (e) {}
  }

  function blockSettingsNav(){
    try {
      var path = String(location.pathname || '') + String(location.hash || '');
      if (isAccountUrl(path) || isAccountUrl(location.href)) {
        location.replace('https://chatgpt.com/');
      }
    } catch (e) {}
  }

  document.addEventListener('click', function(ev){
    try {
      var el = ev.target;
      if (!el) return;
      var node = el.closest ? (el.closest('a') || el.closest('button') || el.closest('[role="menuitem"]') || el) : el;
      var href = (node.getAttribute && node.getAttribute('href')) || '';
      var t = String(node.textContent || '').replace(/\\s+/g, ' ').trim();
      if (isAccountUrl(href) || (t && BLOCK_LABELS.indexOf(t) >= 0)) {
        ev.preventDefault();
        ev.stopPropagation();
        if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
        return false;
      }
    } catch (e) {}
  }, true);

  setInterval(function(){ markAccountUi(); blockSettingsNav(); }, 700);
  markAccountUi();
  blockSettingsNav();
})();</script>`;
}

/**
 * Injected into ChatGPT (proxy + extension) when a member must not see the
 * shared-account history. Keeps only conversations tagged for their email key
 * in localStorage so the same login sees the same private history again.
 */
export function chatgptPrivacyScript(opts: {
  isolationKey: string;
  brandName?: string;
}): string {
  const key = JSON.stringify(String(opts.isolationKey || 'anon').slice(0, 120));
  const brand = JSON.stringify(String(opts.brandName || 'ZynexTools'));
  return `<script data-zynex-privacy="1">(function(){
  if (window.__ZYNEX_PRIVACY__) return;
  window.__ZYNEX_PRIVACY__ = true;
  var KEY = 'zynex_hist_' + ${key};
  var BRAND = ${brand};

  function mine(){
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function save(ids){
    try { localStorage.setItem(KEY, JSON.stringify(ids.slice(-300))); } catch (e) {}
  }
  function remember(id){
    if (!id) return;
    var a = mine();
    if (a.indexOf(id) < 0) { a.push(id); save(a); }
  }
  function currentId(){
    try {
      var m = String(location.pathname || '').match(/\\/c\\/([a-zA-Z0-9_-]+)/);
      return m ? m[1] : '';
    } catch (e) { return ''; }
  }

  try {
    document.title = BRAND;
    var obs = new MutationObserver(function(){
      if (document.title !== BRAND) document.title = BRAND;
    });
    obs.observe(document.querySelector('title') || document.head, { childList: true, characterData: true, subtree: true });
  } catch (e) {}

  var style = document.createElement('style');
  style.setAttribute('data-zynex-privacy-css', '1');
  style.textContent = [
    '/* Hide shared library / projects / GPTs / pinned chrome */',
    'a[href="/library"], a[href*="/library"],',
    'a[href="/projects"], a[href*="/projects"],',
    'a[href*="/gpts"], a[href="/gpts"],',
    'a[href*="/settings"], a[href*="/account"], a[href*="account.openai"],',
    '[data-testid*="history-up-button"],',
    'nav a[href*="project"],',
    '[class*="ProjectSidebar"], [class*="project-sidebar"],',
    '[data-zynex-account-hide="1"] { display: none !important; }',
    '/* Soft-hide unowned history rows until JS tags them */',
    '[data-zynex-hide="1"] { display: none !important; }'
  ].join('\\n');
  (document.head || document.documentElement).appendChild(style);

  function hideSharedChrome(){
    try {
      var labels = [
        'Projects', 'Project', 'Library', 'GPTs', 'Explore GPTs', 'Pinned', 'Pinned chats', 'Pinned projects',
        'Settings', 'Account settings', 'Account', 'My plan', 'Log out', 'Logout', 'Sign out'
      ];
      document.querySelectorAll('nav button, nav a, aside button, aside a, h2, h3, span, div[role="menuitem"]').forEach(function(el){
        var t = String(el.textContent || '').trim();
        if (!t || t.length > 40) return;
        if (labels.indexOf(t) >= 0) {
          var box = el.closest('section') || el.closest('[role="menuitem"]') || el.closest('div') || el;
          if (box && box !== document.body) box.setAttribute('data-zynex-hide', '1');
        }
      });
    } catch (e) {}
  }

  function filterHistory(){
    try {
      var allowed = {};
      mine().forEach(function(id){ allowed[id] = true; });
      var cur = currentId();
      if (cur) remember(cur);

      document.querySelectorAll('a[href*="/c/"]').forEach(function(a){
        var href = a.getAttribute('href') || '';
        var m = href.match(/\\/c\\/([a-zA-Z0-9_-]+)/);
        if (!m) return;
        var id = m[1];
        var row = a.closest('li') || a.closest('[data-testid]') || a.parentElement;
        if (!row) return;
        if (allowed[id] || id === cur) {
          row.removeAttribute('data-zynex-hide');
          row.style.display = '';
        } else {
          row.setAttribute('data-zynex-hide', '1');
          row.style.display = 'none';
        }
      });
      hideSharedChrome();
    } catch (e) {}
  }

  // New chat / navigation → remember this member's conversation ids
  setInterval(function(){
    var cur = currentId();
    if (cur) remember(cur);
    filterHistory();
  }, 900);

  document.addEventListener('click', function(){
    setTimeout(function(){
      var cur = currentId();
      if (cur) remember(cur);
      filterHistory();
    }, 400);
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', filterHistory);
  } else {
    filterHistory();
  }
})();</script>`;
}

export function isolationKeyFromEmail(email?: string | null, accountId?: string | null): string {
  const e = String(email || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._+-]/g, '');
  if (e) return e;
  return String(accountId || 'anon');
}
