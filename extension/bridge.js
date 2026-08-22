window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== 'aitoolzmart') return;

  const requestId = data.requestId;

  if (data.action === 'ping') {
    try {
      chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
        const err = chrome.runtime.lastError;
        window.postMessage(
          {
            source: 'aitoolzmart-extension',
            action: 'pong',
            requestId,
            ok: !err && Boolean(response?.ok),
            version: response?.version,
            error: err ? err.message : undefined,
          },
          window.origin,
        );
      });
    } catch (error) {
      window.postMessage(
        {
          source: 'aitoolzmart-extension',
          action: 'pong',
          requestId,
          ok: false,
          error: error?.message || String(error),
        },
        window.origin,
      );
    }
    return;
  }

  if (data.action !== 'apply-cookies') return;

  try {
    const unlockReferrer =
      data.unlockReferrer || data.panelReferrer || data.referrer || '';
    const referrerCandidates = Array.isArray(data.referrerCandidates)
      ? data.referrerCandidates
      : [];
    chrome.runtime.sendMessage(
      {
        type: 'APPLY_COOKIES',
        cookies: data.cookies || [],
        url: data.url || '',
        openTab: Boolean(data.openTab),
        unlockReferrer,
        panelReferrer: unlockReferrer,
        referrer: unlockReferrer,
        referrerCandidates,
      },
      (response) => {
        const err = chrome.runtime.lastError;
        window.postMessage(
          {
            source: 'aitoolzmart-extension',
            action: 'apply-cookies-result',
            requestId,
            ok: !err && Boolean(response?.ok),
            count: response?.count,
            setCount: response?.setCount,
            unlockMode: response?.unlockMode,
            unlockRules: response?.unlockRules,
            unlockReferrer: response?.unlockReferrer,
            error: err ? err.message : response?.error,
          },
          window.origin,
        );
      },
    );
  } catch (error) {
    window.postMessage(
      {
        source: 'aitoolzmart-extension',
        action: 'apply-cookies-result',
        requestId,
        ok: false,
        error: error?.message || String(error),
      },
      window.origin,
    );
  }
});
