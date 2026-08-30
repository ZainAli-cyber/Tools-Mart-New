import { createPrivilegedSupabase } from './db';

export const BRANDING_SETTINGS_KEY = 'branding_logos';

export type BrandingSettings = {
  websiteLogoUrl: string;
  websiteLogoHeight: number;
  appLogoUrl: string;
  appLogoHeight: number;
  invoiceLogoUrl: string;
  invoiceLogoHeight: number;
  invoiceFooterLogoUrl: string;
  invoiceFooterLogoHeight: number;
};

/** Matches current live sizes (header ~40px, app chrome ~36px, invoice 56px). */
export const DEFAULT_BRANDING: BrandingSettings = {
  websiteLogoUrl: '/logo.png',
  websiteLogoHeight: 40,
  appLogoUrl: '/app-logo.png',
  appLogoHeight: 36,
  invoiceLogoUrl: '/app-logo.png',
  invoiceLogoHeight: 56,
  invoiceFooterLogoUrl: '/app-logo.png',
  invoiceFooterLogoHeight: 36,
};

const CACHE_MS = 20_000;
let cache: { value: BrandingSettings; at: number; setupRequired?: boolean } | null = null;

function serviceClient() {
  return createPrivilegedSupabase();
}

function isAppSettingsMissing(message?: string) {
  return /app_settings|does not exist|schema cache|Could not find the table/i.test(String(message || ''));
}

function clampHeight(n: unknown, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(16, Math.min(160, Math.round(v)));
}

function asUrl(raw: unknown, fallback: string): string {
  const s = String(raw || '').trim();
  if (!s) return fallback;
  if (s.startsWith('data:image/')) return s;
  if (s.startsWith('/') || /^https?:\/\//i.test(s)) return s;
  return fallback;
}

export function normalizeBranding(input?: Partial<BrandingSettings> | null): BrandingSettings {
  const src = input && typeof input === 'object' ? input : {};
  return {
    websiteLogoUrl: asUrl(src.websiteLogoUrl, DEFAULT_BRANDING.websiteLogoUrl),
    websiteLogoHeight: clampHeight(src.websiteLogoHeight, DEFAULT_BRANDING.websiteLogoHeight),
    appLogoUrl: asUrl(src.appLogoUrl, DEFAULT_BRANDING.appLogoUrl),
    appLogoHeight: clampHeight(src.appLogoHeight, DEFAULT_BRANDING.appLogoHeight),
    invoiceLogoUrl: asUrl(src.invoiceLogoUrl, DEFAULT_BRANDING.invoiceLogoUrl),
    invoiceLogoHeight: clampHeight(src.invoiceLogoHeight, DEFAULT_BRANDING.invoiceLogoHeight),
    invoiceFooterLogoUrl: asUrl(
      src.invoiceFooterLogoUrl || src.invoiceLogoUrl,
      DEFAULT_BRANDING.invoiceFooterLogoUrl,
    ),
    invoiceFooterLogoHeight: clampHeight(
      src.invoiceFooterLogoHeight,
      DEFAULT_BRANDING.invoiceFooterLogoHeight,
    ),
  };
}

function parseStored(value: unknown): Partial<BrandingSettings> | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Partial<BrandingSettings>;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') return value as Partial<BrandingSettings>;
  return null;
}

export async function getBrandingSettings(admin?: ReturnType<typeof createPrivilegedSupabase>): Promise<{
  branding: BrandingSettings;
  setupRequired?: boolean;
}> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS && !cache.setupRequired) {
    return { branding: cache.value };
  }
  try {
    const db = admin || serviceClient();
    const { data, error } = await db
      .from('app_settings')
      .select('value')
      .eq('key', BRANDING_SETTINGS_KEY)
      .maybeSingle();
    if (error) {
      const setupRequired = isAppSettingsMissing(error.message);
      const branding = DEFAULT_BRANDING;
      cache = { value: branding, at: now, setupRequired };
      return { branding, setupRequired: setupRequired || undefined };
    }
    const branding = normalizeBranding(parseStored(data?.value));
    cache = { value: branding, at: now };
    return { branding };
  } catch (err: any) {
    const setupRequired = isAppSettingsMissing(err?.message);
    cache = { value: DEFAULT_BRANDING, at: now, setupRequired };
    return { branding: DEFAULT_BRANDING, setupRequired: setupRequired || undefined };
  }
}

export async function setBrandingSettings(
  input: Partial<BrandingSettings>,
  admin?: ReturnType<typeof createPrivilegedSupabase>,
): Promise<BrandingSettings> {
  const db = admin || serviceClient();
  const current = await getBrandingSettings(db);
  const next = normalizeBranding({ ...current.branding, ...input });
  const { error } = await db.from('app_settings').upsert(
    {
      key: BRANDING_SETTINGS_KEY,
      value: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );
  if (error) {
    if (isAppSettingsMissing(error.message)) {
      throw new Error(
        'Run supabase_device_limits_toggle.sql (creates app_settings) in Supabase, then try again.',
      );
    }
    throw new Error(error.message);
  }
  cache = { value: next, at: Date.now() };
  return next;
}

export function clearBrandingCache() {
  cache = null;
}

export const BRANDING_UPDATED_EVENT = 'zynex-branding-updated';
