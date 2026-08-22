/**
 * Stable extension + browser device id for concurrent session limits.
 * Kept separate from background.js so other agents can edit launch/referrer
 * logic without merge conflicts.
 */
(function (global) {
  const STORAGE_KEY = 'atm_ext_device_id';

  function hashString(input) {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  function randomId() {
    if (global.crypto && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '');
    }
    return `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }

  async function getExtensionDeviceId() {
    try {
      const stored = await chrome.storage.local.get([STORAGE_KEY]);
      if (stored[STORAGE_KEY] && String(stored[STORAGE_KEY]).length >= 8) {
        return String(stored[STORAGE_KEY]);
      }
      const next = randomId();
      await chrome.storage.local.set({ [STORAGE_KEY]: next });
      return next;
    } catch {
      return randomId();
    }
  }

  async function getDeviceFingerprint() {
    const extId = await getExtensionDeviceId();
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    const uaHash = hashString(ua);
    // Combine extension-stable id with UA hash (no localStorage in extension popup needed)
    const deviceId = `${extId}_${uaHash}`;
    let label = 'Extension';
    if (/Edg\//i.test(ua)) label = 'Edge · Extension';
    else if (/Chrome\//i.test(ua)) label = 'Chrome · Extension';
    else if (/Firefox\//i.test(ua)) label = 'Firefox · Extension';
    return { deviceId, deviceLabel: label, extensionDeviceId: extId };
  }

  global.ATMDevice = { getDeviceFingerprint, getExtensionDeviceId };
})(typeof globalThis !== 'undefined' ? globalThis : window);
