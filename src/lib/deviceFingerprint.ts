import { Capacitor } from '@capacitor/core';

const BROWSER_KEY = 'atm_device_browser_id';

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function hashString(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function getBrowserId(): string {
  try {
    const existing = localStorage.getItem(BROWSER_KEY);
    if (existing && existing.length >= 8) return existing;
    const next = randomId();
    localStorage.setItem(BROWSER_KEY, next);
    return next;
  } catch {
    return randomId();
  }
}

function shortUaLabel(ua: string): string {
  const text = ua || 'Browser';
  if (/Edg\//i.test(text)) return 'Edge';
  if (/Chrome\//i.test(text) && !/Edg\//i.test(text)) return 'Chrome';
  if (/Firefox\//i.test(text)) return 'Firefox';
  if (/Safari\//i.test(text) && !/Chrome\//i.test(text)) return 'Safari';
  return 'Browser';
}

export type DeviceFingerprint = {
  deviceId: string;
  deviceLabel: string;
  browserId: string;
  uaHash: string;
};

/**
 * Stable browser fingerprint: localStorage id + userAgent hash.
 * Optional extensionDeviceId (from the Chrome extension) is folded in when present.
 */
export function getDeviceFingerprint(extensionDeviceId?: string | null): DeviceFingerprint {
  const browserId = getBrowserId();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const uaHash = hashString(ua);
  const ext = String(extensionDeviceId || '').trim();
  const deviceId = ext
    ? `${browserId}_${uaHash}_${hashString(ext).slice(0, 8)}`
    : `${browserId}_${uaHash}`;
  const platform =
    typeof navigator !== 'undefined'
      ? String((navigator as any).userAgentData?.platform || navigator.platform || '').trim()
      : '';
  const deviceLabel = [shortUaLabel(ua), platform || null, ext ? 'Extension' : null]
    .filter(Boolean)
    .join(' · ');
  return { deviceId, deviceLabel, browserId, uaHash };
}

export function deviceHeaders(extra?: Record<string, string>): Record<string, string> {
  const fp = getDeviceFingerprint();
  let label = fp.deviceLabel;
  if (Capacitor.isNativePlatform()) {
    label = `Mobile App · ${Capacitor.getPlatform()}`;
  }
  return {
    'X-Device-Id': fp.deviceId,
    'X-Device-Label': label,
    ...(extra || {}),
  };
}
