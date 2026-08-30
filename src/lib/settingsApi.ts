import { supabase } from './db';
import { deviceHeaders } from './deviceFingerprint';

async function authorizedFetch(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Your session expired. Please log in again.');

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...deviceHeaders(),
        ...(init.headers || {}),
      },
    });
  } catch (e: any) {
    throw new Error(`Network error: ${e?.message || 'Could not reach server'}`);
  }

  const text = await response.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    if (!response.ok) {
      throw new Error(`Server error ${response.status}: ${text.slice(0, 120) || 'non-JSON response'}`);
    }
    body = {};
  }

  if (!response.ok) {
    throw new Error(body.error || body.message || `Request failed (${response.status})`);
  }
  return body;
}

export type GlobalProxySettings = {
  enabled: boolean;
  ready: boolean;
  url?: string;
  maskedUrl?: string;
  setupRequired?: boolean;
  hint?: string;
};

export function getGlobalProxySettings() {
  return authorizedFetch('/api/settings/global-proxy') as Promise<GlobalProxySettings>;
}

export function saveGlobalProxySettings(input: { enabled: boolean; url: string }) {
  return authorizedFetch('/api/settings/global-proxy', {
    method: 'PATCH',
    body: JSON.stringify(input),
  }) as Promise<GlobalProxySettings>;
}

export function removeGlobalProxySettings() {
  return authorizedFetch('/api/settings/global-proxy', {
    method: 'DELETE',
  }) as Promise<GlobalProxySettings>;
}

export function testGlobalProxySettings(url?: string) {
  return authorizedFetch('/api/settings/global-proxy/test', {
    method: 'POST',
    body: JSON.stringify(url ? { url } : {}),
  }) as Promise<{
    ok: boolean;
    ip?: string;
    isp?: string;
    hosting?: boolean;
    residentialLikely?: boolean;
    chatgptHtml?: number;
    chatgptBlocked?: boolean;
    udemyHtml?: number;
    udemyBlocked?: boolean;
    oneClickReady?: boolean;
    warnings?: string[];
    message?: string;
    error?: string;
  }>;
}

export function getToolAccessLabelsSetting() {
  return authorizedFetch('/api/settings/tool-access-labels') as Promise<{
    enabled: boolean;
    setupRequired?: boolean;
  }>;
}

export function setToolAccessLabelsSetting(enabled: boolean) {
  return authorizedFetch('/api/settings/tool-access-labels', {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  }) as Promise<{ enabled: boolean }>;
}

export type BrandingSettingsDto = {
  websiteLogoUrl: string;
  websiteLogoHeight: number;
  appLogoUrl: string;
  appLogoHeight: number;
  invoiceLogoUrl: string;
  invoiceLogoHeight: number;
  invoiceFooterLogoUrl: string;
  invoiceFooterLogoHeight: number;
};

export function getBrandingSettingsApi() {
  return fetch('/api/settings/branding')
    .then(async res => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not load branding');
      return body as { ok?: boolean; branding: BrandingSettingsDto; setupRequired?: boolean };
    });
}

export function saveBrandingSettingsApi(branding: Partial<BrandingSettingsDto>) {
  return authorizedFetch('/api/settings/branding', {
    method: 'PATCH',
    body: JSON.stringify({ branding }),
  }) as Promise<{ ok?: boolean; branding: BrandingSettingsDto }>;
}

export type SiteBannerDto = {
  id: string;
  imageUrl: string;
  link: string;
  active: boolean;
  order: number;
};

export function getPublicBannersApi() {
  return fetch('/api/settings/banners')
    .then(async res => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not load banners');
      return body as { ok?: boolean; banners: SiteBannerDto[] };
    });
}

export function getAdminBannersApi() {
  return authorizedFetch('/api/settings/banners?all=1') as Promise<{
    ok?: boolean;
    banners: SiteBannerDto[];
    setupRequired?: boolean;
  }>;
}

export function saveAdminBannersApi(banners: SiteBannerDto[]) {
  return authorizedFetch('/api/settings/banners', {
    method: 'PUT',
    body: JSON.stringify({ banners }),
  }) as Promise<{ ok?: boolean; banners: SiteBannerDto[] }>;
}

export function getColorSchemeSettingsApi() {
  return fetch('/api/settings/colors')
    .then(async res => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not load colors');
      return body as { ok?: boolean; scheme: any; setupRequired?: boolean };
    });
}

export function saveColorSchemeSettingsApi(scheme: any) {
  return authorizedFetch('/api/settings/colors', {
    method: 'PATCH',
    body: JSON.stringify({ scheme }),
  }) as Promise<{ ok?: boolean; scheme: any }>;
}
