import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServiceSupabase } from './db';

export const DEVICE_LIMIT_MESSAGE =
  'Device limit reached. Ask admin/reseller to manage devices or remove an old device.';

export const DEVICE_LIMITS_SETTING_KEY = 'device_limits_enabled';

export type DeviceSessionRow = {
  id: string;
  account_id: string;
  device_id: string;
  device_label: string | null;
  user_agent: string | null;
  last_seen: string;
  created_at: string;
};

export type DeviceCheckResult =
  | { ok: true; session: DeviceSessionRow; maxDevices: number; deviceCount: number }
  | { ok: false; error: string; status: number; maxDevices?: number; deviceCount?: number };

function serviceClient(): SupabaseClient {
  return createServiceSupabase();
}

function isAdminRole(role: unknown): boolean {
  return String(role || '').trim().toLowerCase() === 'admin';
}

function softPassDevice(input: {
  accountId: string;
  deviceId: string;
  deviceLabel?: string;
  maxDevices?: number;
  deviceCount?: number;
}): DeviceCheckResult {
  const now = new Date().toISOString();
  return {
    ok: true,
    session: {
      id: 'exempt',
      account_id: input.accountId,
      device_id: input.deviceId,
      device_label: normalizeDeviceLabel(input.deviceLabel),
      user_agent: null,
      last_seen: now,
      created_at: now,
    },
    maxDevices: input.maxDevices ?? 999,
    deviceCount: input.deviceCount ?? 0,
  };
}

/** In-memory cache so login/launch/heartbeat do not hit DB every request. */
let deviceLimitsEnabledCache: { value: boolean; at: number; setupRequired?: boolean } | null = null;
const DEVICE_LIMITS_CACHE_MS = 15_000;

function parseSettingBool(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw === 1;
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'on';
  }
  return false;
}

export const DEVICE_LIMITS_SQL_HINT =
  'Run supabase_device_limits_toggle.sql in the Supabase SQL Editor, then try again.';

function isAppSettingsMissing(message: unknown): boolean {
  return /app_settings|does not exist|schema cache|Could not find the table/i.test(
    String(message || ''),
  );
}

export type DeviceLimitsSetting = {
  enabled: boolean;
  /** True when app_settings is missing / unmigrated — treat as OFF. */
  setupRequired?: boolean;
};

/**
 * Global master switch. Default OFF when missing/unmigrated so testing is unblocked.
 */
export async function getDeviceLimitsSetting(admin?: SupabaseClient): Promise<DeviceLimitsSetting> {
  const now = Date.now();
  if (
    deviceLimitsEnabledCache &&
    now - deviceLimitsEnabledCache.at < DEVICE_LIMITS_CACHE_MS &&
    !deviceLimitsEnabledCache.setupRequired
  ) {
    return { enabled: deviceLimitsEnabledCache.value };
  }
  try {
    const db = admin || serviceClient();
    const { data, error } = await db
      .from('app_settings')
      .select('value')
      .eq('key', DEVICE_LIMITS_SETTING_KEY)
      .maybeSingle();
    if (error) {
      const setupRequired = isAppSettingsMissing(error.message);
      deviceLimitsEnabledCache = { value: false, at: now, setupRequired };
      return { enabled: false, setupRequired: setupRequired || undefined };
    }
    if (!data) {
      // Row missing but table exists — default OFF (insert on first PATCH).
      deviceLimitsEnabledCache = { value: false, at: now };
      return { enabled: false };
    }
    const enabled = parseSettingBool(data.value);
    deviceLimitsEnabledCache = { value: enabled, at: now };
    return { enabled };
  } catch (err: any) {
    const setupRequired = isAppSettingsMissing(err?.message);
    deviceLimitsEnabledCache = { value: false, at: now, setupRequired };
    return { enabled: false, setupRequired: setupRequired || undefined };
  }
}

export async function areDeviceLimitsEnabled(admin?: SupabaseClient): Promise<boolean> {
  const setting = await getDeviceLimitsSetting(admin);
  return setting.enabled;
}

export async function setDeviceLimitsEnabled(
  enabled: boolean,
  admin?: SupabaseClient,
): Promise<boolean> {
  const db = admin || serviceClient();
  const value = Boolean(enabled);
  // Store as jsonb boolean (not a JSON string) so parses stay stable.
  const { error } = await db.from('app_settings').upsert(
    {
      key: DEVICE_LIMITS_SETTING_KEY,
      value: value as unknown as boolean,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );
  if (error) {
    if (isAppSettingsMissing(error.message)) {
      throw new Error(DEVICE_LIMITS_SQL_HINT);
    }
    throw new Error(error.message);
  }
  deviceLimitsEnabledCache = { value, at: Date.now() };
  return value;
}

export function normalizeDeviceId(raw: unknown): string {
  return String(raw || '').trim().slice(0, 200);
}

export function normalizeDeviceLabel(raw: unknown): string {
  return String(raw || '').trim().slice(0, 160) || 'Browser';
}

export async function loadAccountDevices(accountId: string, admin?: SupabaseClient) {
  const db = admin || serviceClient();
  const { data, error } = await db
    .from('device_sessions')
    .select('*')
    .eq('account_id', accountId)
    .order('last_seen', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as DeviceSessionRow[];
}

export async function loadAccountMaxDevices(accountId: string, admin?: SupabaseClient) {
  const db = admin || serviceClient();
  const { data, error } = await db
    .from('customers')
    .select('id,max_devices,status,role,owner_id')
    .eq('id', accountId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const max = Math.max(1, Math.min(50, Number(data.max_devices) || 1));
  return { ...data, max_devices: max };
}

/**
 * Register or heartbeat a device for an account.
 * Existing device → refresh last_seen.
 * New device under limit → insert.
 * At limit → reject.
 */
export async function registerOrHeartbeatDevice(input: {
  accountId: string;
  deviceId: string;
  deviceLabel?: string;
  userAgent?: string;
  admin?: SupabaseClient;
}): Promise<DeviceCheckResult> {
  const deviceId = normalizeDeviceId(input.deviceId);
  if (!deviceId) {
    return { ok: false, error: 'Device id is required', status: 400 };
  }

  const db = input.admin || serviceClient();
  let account: Awaited<ReturnType<typeof loadAccountMaxDevices>>;
  try {
    account = await loadAccountMaxDevices(input.accountId, db);
  } catch (err: any) {
    // Schema not migrated yet — do not block login/launch.
    if (/max_devices|does not exist|schema cache|column/i.test(String(err?.message || ''))) {
      return {
        ok: true,
        session: {
          id: 'pending',
          account_id: input.accountId,
          device_id: deviceId,
          device_label: normalizeDeviceLabel(input.deviceLabel),
          user_agent: null,
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        maxDevices: 1,
        deviceCount: 0,
      };
    }
    throw err;
  }
  if (!account) return { ok: false, error: 'Account not found', status: 404 };
  if (account.status === 'blocked') {
    return { ok: false, error: 'Account suspended', status: 403 };
  }

  const label = normalizeDeviceLabel(input.deviceLabel);

  // Admins never register against device limits — any portal/admin/API path.
  if (isAdminRole(account.role)) {
    return softPassDevice({
      accountId: input.accountId,
      deviceId,
      deviceLabel: label,
      maxDevices: 999,
      deviceCount: 0,
    });
  }

  // Global master switch OFF → soft-pass for everyone (default until enabled).
  const limitsOn = await areDeviceLimitsEnabled(db);
  if (!limitsOn) {
    return softPassDevice({
      accountId: input.accountId,
      deviceId,
      deviceLabel: label,
      maxDevices: account.max_devices,
      deviceCount: 0,
    });
  }

  const maxDevices = account.max_devices;
  const ua = String(input.userAgent || '').slice(0, 400) || null;
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await db
    .from('device_sessions')
    .select('*')
    .eq('account_id', input.accountId)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (existingError && /device_sessions|does not exist|schema cache/i.test(existingError.message || '')) {
    return {
      ok: true,
      session: {
        id: 'pending',
        account_id: input.accountId,
        device_id: deviceId,
        device_label: label,
        user_agent: ua,
        last_seen: now,
        created_at: now,
      },
      maxDevices,
      deviceCount: 0,
    };
  }

  if (existing) {
    const { data: updated, error } = await db
      .from('device_sessions')
      .update({
        last_seen: now,
        device_label: label || existing.device_label,
        user_agent: ua || existing.user_agent,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return { ok: false, error: error.message, status: 500 };
    const sessions = await loadAccountDevices(input.accountId, db);
    return {
      ok: true,
      session: (updated || existing) as DeviceSessionRow,
      maxDevices,
      deviceCount: sessions.length,
    };
  }

  let sessions: DeviceSessionRow[] = [];
  try {
    sessions = await loadAccountDevices(input.accountId, db);
  } catch (err: any) {
    if (/device_sessions|does not exist|schema cache/i.test(String(err?.message || ''))) {
      return {
        ok: true,
        session: {
          id: 'pending',
          account_id: input.accountId,
          device_id: deviceId,
          device_label: label,
          user_agent: ua,
          last_seen: now,
          created_at: now,
        },
        maxDevices,
        deviceCount: 0,
      };
    }
    throw err;
  }

  if (sessions.length >= maxDevices) {
    return {
      ok: false,
      error: DEVICE_LIMIT_MESSAGE,
      status: 403,
      maxDevices,
      deviceCount: sessions.length,
    };
  }

  const { data: created, error: insertError } = await db
    .from('device_sessions')
    .insert({
      account_id: input.accountId,
      device_id: deviceId,
      device_label: label,
      user_agent: ua,
      last_seen: now,
      created_at: now,
    })
    .select()
    .single();

  if (insertError) {
    if (/device_sessions|does not exist|schema cache/i.test(insertError.message || '')) {
      return {
        ok: true,
        session: {
          id: 'pending',
          account_id: input.accountId,
          device_id: deviceId,
          device_label: label,
          user_agent: ua,
          last_seen: now,
          created_at: now,
        },
        maxDevices,
        deviceCount: 0,
      };
    }
    // Race: another request registered the same device
    if (/duplicate|unique/i.test(insertError.message || '')) {
      const { data: raced } = await db
        .from('device_sessions')
        .select('*')
        .eq('account_id', input.accountId)
        .eq('device_id', deviceId)
        .maybeSingle();
      if (raced) {
        await db.from('device_sessions').update({ last_seen: now }).eq('id', raced.id);
        const again = await loadAccountDevices(input.accountId, db);
        return { ok: true, session: raced as DeviceSessionRow, maxDevices, deviceCount: again.length };
      }
    }
    return { ok: false, error: insertError.message, status: 500 };
  }

  return {
    ok: true,
    session: created as DeviceSessionRow,
    maxDevices,
    deviceCount: sessions.length + 1,
  };
}

export async function revokeDeviceSession(input: {
  accountId: string;
  sessionId: string;
  admin?: SupabaseClient;
}) {
  const db = input.admin || serviceClient();
  const { data, error } = await db
    .from('device_sessions')
    .delete()
    .eq('id', input.sessionId)
    .eq('account_id', input.accountId)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.id);
}

export async function setAccountMaxDevices(input: {
  accountId: string;
  maxDevices: number;
  admin?: SupabaseClient;
}) {
  const db = input.admin || serviceClient();
  const max = Math.max(1, Math.min(50, Math.floor(Number(input.maxDevices) || 1)));
  const { data, error } = await db
    .from('customers')
    .update({ max_devices: max })
    .eq('id', input.accountId)
    .select('id,max_devices')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export function readDeviceFromRequest(req: {
  headers?: Record<string, any>;
  body?: any;
}): { deviceId: string; deviceLabel: string; userAgent: string } {
  const headers = req.headers || {};
  const body = req.body || {};
  const deviceId =
    normalizeDeviceId(headers['x-device-id'] || headers['X-Device-Id']) ||
    normalizeDeviceId(body.deviceId || body.device_id);
  const deviceLabel =
    normalizeDeviceLabel(headers['x-device-label'] || headers['X-Device-Label']) ||
    normalizeDeviceLabel(body.deviceLabel || body.device_label);
  const userAgent = String(headers['user-agent'] || body.userAgent || '').slice(0, 400);
  return { deviceId, deviceLabel, userAgent };
}
