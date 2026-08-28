import { createPrivilegedSupabase } from './db';

export const TOOL_ACCESS_LABELS_KEY = 'show_tool_access_labels';

const CACHE_MS = 15_000;
let cache: { value: boolean; at: number; setupRequired?: boolean } | null = null;

function serviceClient() {
  return createPrivilegedSupabase();
}

function isAppSettingsMissing(message?: string) {
  return /app_settings|does not exist|schema cache|Could not find the table/i.test(String(message || ''));
}

function parseBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
    if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  }
  if (value && typeof value === 'object' && 'enabled' in (value as any)) {
    return Boolean((value as any).enabled);
  }
  return false;
}

/** Default OFF — admin can enable labels on tool cards. */
export async function getShowToolAccessLabels(admin?: SupabaseClient): Promise<{
  enabled: boolean;
  setupRequired?: boolean;
}> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS && !cache.setupRequired) {
    return { enabled: cache.value };
  }
  try {
    const db = admin || serviceClient();
    const { data, error } = await db
      .from('app_settings')
      .select('value')
      .eq('key', TOOL_ACCESS_LABELS_KEY)
      .maybeSingle();
    if (error) {
      const setupRequired = isAppSettingsMissing(error.message);
      cache = { value: false, at: now, setupRequired };
      return { enabled: false, setupRequired: setupRequired || undefined };
    }
    if (!data) {
      cache = { value: false, at: now };
      return { enabled: false };
    }
    const enabled = parseBool(data.value);
    cache = { value: enabled, at: now };
    return { enabled };
  } catch (err: any) {
    const setupRequired = isAppSettingsMissing(err?.message);
    cache = { value: false, at: now, setupRequired };
    return { enabled: false, setupRequired: setupRequired || undefined };
  }
}

export async function setShowToolAccessLabels(
  enabled: boolean,
  admin?: SupabaseClient,
): Promise<boolean> {
  const db = admin || serviceClient();
  const value = Boolean(enabled);
  const { error } = await db.from('app_settings').upsert(
    {
      key: TOOL_ACCESS_LABELS_KEY,
      value,
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
  cache = { value, at: Date.now() };
  return value;
}

export function clearToolAccessLabelsCache() {
  cache = null;
}
