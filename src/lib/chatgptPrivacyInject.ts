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
    '[data-testid*="history-up-button"],',
    'nav a[href*="project"],',
    '[class*="ProjectSidebar"], [class*="project-sidebar"] { display: none !important; }',
    '/* Soft-hide unowned history rows until JS tags them */',
    '[data-zynex-hide="1"] { display: none !important; }'
  ].join('\\n');
  (document.head || document.documentElement).appendChild(style);

  function hideSharedChrome(){
    try {
      var labels = ['Projects', 'Project', 'Library', 'GPTs', 'Explore GPTs', 'Pinned', 'Pinned chats', 'Pinned projects'];
      document.querySelectorAll('nav button, nav a, aside button, aside a, h2, h3, span').forEach(function(el){
        var t = String(el.textContent || '').trim();
        if (!t || t.length > 40) return;
        if (labels.indexOf(t) >= 0) {
          var box = el.closest('section') || el.closest('div') || el;
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
