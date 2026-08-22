const $ = (id) => document.getElementById(id);
const loginForm = $('loginForm');
const accountView = $('accountView');
const message = $('message');

function normalizePortal(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function showMessage(text) {
  message.textContent = text || '';
  message.classList.toggle('hidden', !text);
}

function setBusy(busy) {
  $('loginButton').disabled = busy;
  $('loginButton').textContent = busy ? 'Signing in…' : 'Sign In';
}

async function stored() {
  return chrome.storage.local.get(['portalUrl', 'accessToken', 'refreshToken', 'expiresAt']);
}

async function api(path, options = {}) {
  const state = await stored();
  const fp = (typeof ATMDevice !== 'undefined' && ATMDevice.getDeviceFingerprint)
    ? await ATMDevice.getDeviceFingerprint()
    : { deviceId: '', deviceLabel: 'Extension' };
  const response = await fetch(`${state.portalUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.accessToken ? { Authorization: `Bearer ${state.accessToken}` } : {}),
      ...(fp.deviceId ? { 'X-Device-Id': fp.deviceId, 'X-Device-Label': fp.deviceLabel } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

async function refreshSession() {
  const state = await stored();
  if (!state.refreshToken) throw new Error('Please sign in again.');
  const data = await api('/api/extension/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: state.refreshToken }),
  });
  await chrome.storage.local.set(data);
}

async function loadEntitlements(retry = true) {
  showMessage('');
  try {
    let state = await stored();
    if (state.expiresAt && Date.now() / 1000 > Number(state.expiresAt) - 60) {
      await refreshSession();
      state = await stored();
    }
    const access = await api('/api/extension/entitlements');
    renderAccount(access);
  } catch (error) {
    if (retry) {
      try {
        await refreshSession();
        return loadEntitlements(false);
      } catch {}
    }
    await logout();
    showMessage(error.message || 'Session expired. Please sign in again.');
  }
}

function renderAccount(access) {
  loginForm.classList.add('hidden');
  accountView.classList.remove('hidden');
  $('statusDot').classList.add('online');
  $('accountName').textContent = access.name || 'Member';
  $('customerId').textContent = access.customerId || '—';
  $('planName').textContent = access.plan || 'No plan';
  $('planStatus').textContent = access.planActive ? 'Active' : 'Inactive';
  $('planStatus').classList.toggle('offline', !access.planActive);

  const tools = Array.isArray(access.tools) ? access.tools : [];
  $('toolsList').innerHTML = '';
  if (!tools.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = access.planActive
      ? 'No tools assigned. Contact the administrator.'
      : 'Activate or renew a plan to access tools.';
    $('toolsList').appendChild(empty);
  } else {
    tools.forEach((item) => {
      const tool = typeof item === 'string' ? { name: item, accessMethod: 'extension' } : item;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'tool launch';
      row.innerHTML = `<span>${tool.name || 'Tool'}</span><small>${tool.accessMethod === 'one_click' ? 'On one click' : 'By extension'}</small>`;
      row.addEventListener('click', () => launchFromPopup(tool));
      $('toolsList').appendChild(row);
    });
  }
}

async function launchFromPopup(tool) {
  showMessage('');
  try {
    const state = await stored();
    if (tool.accessMethod !== 'one_click' || !tool.id) {
      chrome.tabs.create({ url: `${state.portalUrl}/reseller` });
      return;
    }
    const data = await api(`/api/extension/launch/${encodeURIComponent(tool.id)}`);
    const dest = String(data.url || tool.toolUrl || '').trim();
    if (!dest) throw new Error('No destination URL is set for this tool.');
    const cookies = Array.isArray(data.cookies) ? data.cookies : [];
    if (!cookies.length) {
      throw new Error('No cookies are configured for this tool. Ask admin to save Cookies settings.');
    }
    const unlockReferrer = String(data.unlockReferrer || data.panelReferrer || data.referrer || '').trim();
    const referrerCandidates = [
      unlockReferrer,
      'https://pakseotools.com/',
      'https://app.pakseotools.com/',
    ].filter(Boolean);
    const result = await chrome.runtime.sendMessage({
      type: 'APPLY_COOKIES',
      cookies,
      url: dest,
      openTab: true,
      unlockReferrer,
      panelReferrer: unlockReferrer,
      referrer: unlockReferrer,
      referrerCandidates,
    });
    if (!result?.ok) throw new Error(result?.error || 'Could not apply cookies before opening.');
    if (/toolaccess\.click/i.test(dest) && !(Number(result.unlockRules) > 0)) {
      throw new Error(
        'Panel Referer unlock did not install. Reload the extension (v1.3.2+), then try again.',
      );
    }
  } catch (error) {
    showMessage(error.message || 'Could not open this tool');
  }
}

async function logout() {
  await chrome.storage.local.remove(['accessToken', 'refreshToken', 'expiresAt']);
  accountView.classList.add('hidden');
  loginForm.classList.remove('hidden');
  $('statusDot').classList.remove('online');
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('');
  setBusy(true);
  try {
    const portalUrl = normalizePortal($('portalUrl').value);
    await chrome.storage.local.set({ portalUrl });
    const fp = (typeof ATMDevice !== 'undefined' && ATMDevice.getDeviceFingerprint)
      ? await ATMDevice.getDeviceFingerprint()
      : { deviceId: '', deviceLabel: 'Extension' };
    const response = await fetch(`${portalUrl}/api/extension/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(fp.deviceId ? { 'X-Device-Id': fp.deviceId, 'X-Device-Label': fp.deviceLabel } : {}),
      },
      body: JSON.stringify({
        email: $('email').value,
        password: $('password').value,
        deviceId: fp.deviceId,
        deviceLabel: fp.deviceLabel,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not sign in');
    await chrome.storage.local.set({
      portalUrl,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    });
    $('password').value = '';
    await loadEntitlements(false);
  } catch (error) {
    showMessage(error.message || 'Could not sign in');
  } finally {
    setBusy(false);
  }
});

$('refreshButton').addEventListener('click', () => loadEntitlements());
$('logoutButton').addEventListener('click', logout);
$('dashboardButton').addEventListener('click', async () => {
  const state = await stored();
  chrome.tabs.create({ url: `${state.portalUrl}/reseller` });
});

(async () => {
  const state = await stored();
  if (state.portalUrl) $('portalUrl').value = state.portalUrl;
  if (state.accessToken || state.refreshToken) await loadEntitlements();
})();
