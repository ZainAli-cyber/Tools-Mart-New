import { Capacitor } from '@capacitor/core';

const DEFAULT_PORTAL = 'https://www.zynextools.com';

/** Production portal origin — used for API calls when the WebView has no same-origin /api. */
export function getPortalBaseUrl(): string {
  const env = String(
    (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_PORTAL_URL || '',
  )
    .trim()
    .replace(/\/$/, '');
  if (typeof window === 'undefined') return env || DEFAULT_PORTAL;
  if (!Capacitor.isNativePlatform()) return '';
  const origin = window.location.origin || '';
  if (
    origin &&
    !origin.startsWith('capacitor://') &&
    !origin.startsWith('ionic://') &&
    !origin.includes('localhost')
  ) {
    return origin.replace(/\/$/, '');
  }
  return env || DEFAULT_PORTAL;
}

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = getPortalBaseUrl();
  return base ? `${base}${p}` : p;
}
