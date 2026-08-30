import { createPrivilegedSupabase } from './db';

export const BANNERS_SETTINGS_KEY = 'site_banners';

export type SiteBanner = {
  id: string;
  imageUrl: string;
  link: string;
  active: boolean;
  order: number;
};

const CACHE_MS = 15_000;
let cache: { value: SiteBanner[]; at: number; setupRequired?: boolean } | null = null;

function serviceClient() {
  return createPrivilegedSupabase();
}

function isAppSettingsMissing(message?: string) {
  return /app_settings|does not exist|schema cache|Could not find the table/i.test(String(message || ''));
}

function normalizeBanner(raw: any, index: number): SiteBanner | null {
  if (!raw || typeof raw !== 'object') return null;
  const imageUrl = String(raw.imageUrl || raw.image_url || '').trim();
  if (!imageUrl) return null;
  return {
    id: String(raw.id || `BNR${Date.now()}-${index}`),
    imageUrl,
    link: String(raw.link || '').trim(),
    active: raw.active !== false,
    order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : index,
  };
}

export function normalizeBanners(input?: unknown): SiteBanner[] {
  const list = Array.isArray(input) ? input : [];
  return list
    .map((item, i) => normalizeBanner(item, i))
    .filter((b): b is SiteBanner => Boolean(b))
    .sort((a, b) => a.order - b.order);
}

function parseStored(value: unknown): unknown {
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return value;
}

export async function getSiteBanners(admin?: ReturnType<typeof createPrivilegedSupabase>): Promise<{
  banners: SiteBanner[];
  setupRequired?: boolean;
}> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS && !cache.setupRequired) {
    return { banners: cache.value };
  }
  try {
    const db = admin || serviceClient();
    const { data, error } = await db
      .from('app_settings')
      .select('value')
      .eq('key', BANNERS_SETTINGS_KEY)
      .maybeSingle();
    if (error) {
      const setupRequired = isAppSettingsMissing(error.message);
      cache = { value: [], at: now, setupRequired };
      return { banners: [], setupRequired: setupRequired || undefined };
    }
    const banners = normalizeBanners(parseStored(data?.value));
    cache = { value: banners, at: now };
    return { banners };
  } catch (err: any) {
    const setupRequired = isAppSettingsMissing(err?.message);
    cache = { value: [], at: now, setupRequired };
    return { banners: [], setupRequired: setupRequired || undefined };
  }
}

export async function setSiteBanners(
  input: SiteBanner[],
  admin?: ReturnType<typeof createPrivilegedSupabase>,
): Promise<SiteBanner[]> {
  const db = admin || serviceClient();
  const next = normalizeBanners(input).map((b, i) => ({ ...b, order: i }));
  const { error } = await db.from('app_settings').upsert(
    {
      key: BANNERS_SETTINGS_KEY,
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

export function clearBannerCache() {
  cache = null;
}

export const BANNERS_UPDATED_EVENT = 'zynex-banners-updated';
