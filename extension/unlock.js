/**
 * Fallback navigation when DNR cannot set Referer.
 * Chrome often still omits a custom Referer from extension pages — DNR is preferred.
 * We navigate via location.replace so the top-level load happens from this context.
 */
(function () {
  const params = new URLSearchParams(location.search);
  const dest = params.get('dest') || '';
  const ref = params.get('ref') || '';
  const hint = document.getElementById('hint');
  if (!dest) {
    if (hint) hint.textContent = 'Missing destination URL.';
    return;
  }
  if (hint && ref) {
    hint.innerHTML = 'Fallback open (DNR Referer unavailable).<br/><code></code>';
    const code = hint.querySelector('code');
    if (code) code.textContent = dest;
  }
  // Brief delay so service worker cookies/DNR settle
  setTimeout(() => {
    try {
      location.replace(dest);
    } catch {
      location.href = dest;
    }
  }, 120);
})();
