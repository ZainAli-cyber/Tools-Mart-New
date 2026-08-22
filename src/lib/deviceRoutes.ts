import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  loadAccountDevices,
  loadAccountMaxDevices,
  registerOrHeartbeatDevice,
  revokeDeviceSession,
  setAccountMaxDevices,
  readDeviceFromRequest,
  getDeviceLimitsSetting,
  setDeviceLimitsEnabled,
  DEVICE_LIMITS_SQL_HINT,
} from './deviceSessions';

const router = Router();

function clients() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is missing. Open Supabase → Project Settings → API, copy the service_role secret, add it to .env, then restart the server.',
    );
  }
  return {
    auth: createClient(url, anonKey, { auth: { persistSession: false } }),
    admin: createClient(url, serviceKey, { auth: { persistSession: false } }),
  };
}

async function actor(req: any) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { auth, admin } = clients();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;

  // Prefer max_devices when migrated; fall back if the column is missing.
  let profile: {
    id: string;
    role: string;
    status: string;
    owner_id: string | null;
    max_devices?: number;
  } | null = null;

  const full = await admin
    .from('customers')
    .select('id,role,status,owner_id,max_devices')
    .eq('auth_user_id', data.user.id)
    .maybeSingle();
  if (full.error && /max_devices|column|schema cache/i.test(full.error.message || '')) {
    const basic = await admin
      .from('customers')
      .select('id,role,status,owner_id')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();
    profile = basic.data as typeof profile;
  } else {
    profile = (full.data as typeof profile) || null;
  }

  if (!profile || profile.status === 'blocked') return null;
  return {
    id: profile.id,
    role: profile.role,
    status: profile.status,
    owner_id: profile.owner_id,
    max_devices: Math.max(1, Math.min(50, Number(profile.max_devices) || 1)),
  };
}

async function canManageAccount(
  current: { id: string; role: string },
  targetId: string,
  admin: ReturnType<typeof clients>['admin'],
) {
  if (current.role === 'admin') return { ok: true as const, self: current.id === targetId };
  if (current.id === targetId) return { ok: true as const, self: true };

  const { data: target } = await admin
    .from('customers')
    .select('id,owner_id,role')
    .eq('id', targetId)
    .maybeSingle();
  if (!target) return { ok: false as const, error: 'Account not found', status: 404 };
  if (current.role === 'reseller' && target.owner_id === current.id && target.role === 'user') {
    return { ok: true as const, self: false, target };
  }
  return { ok: false as const, error: 'Not authorized', status: 403 };
}

/** GET /api/devices/limits-enabled — global master switch (any signed-in account) */
router.get('/limits-enabled', async (req, res) => {
  try {
    const current = await actor(req);
    if (!current) return res.status(401).json({ error: 'Not authorized' });
    const { admin } = clients();
    const setting = await getDeviceLimitsSetting(admin);
    // Always 200 with { enabled } — missing app_settings soft-defaults to OFF.
    return res.json({
      enabled: Boolean(setting.enabled),
      ...(setting.setupRequired ? { setupRequired: true, hint: DEVICE_LIMITS_SQL_HINT } : {}),
    });
  } catch (error: any) {
    // Last-resort soft-fail so the admin toggle never shows a raw transport failure.
    return res.json({
      enabled: false,
      setupRequired: true,
      hint: error?.message || DEVICE_LIMITS_SQL_HINT,
    });
  }
});

/** PATCH /api/devices/limits-enabled — admin only master switch */
router.patch('/limits-enabled', async (req, res) => {
  try {
    const current = await actor(req);
    if (!current) return res.status(401).json({ error: 'Not authorized' });
    if (current.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { admin } = clients();
    const raw = req.body?.enabled ?? req.body?.device_limits_enabled;
    if (typeof raw !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }
    const enabled = await setDeviceLimitsEnabled(raw, admin);
    return res.json({ enabled });
  } catch (error: any) {
    const message = error?.message || 'Could not update device limits setting';
    const setup = message === DEVICE_LIMITS_SQL_HINT || /app_settings|does not exist|schema cache/i.test(message);
    return res.status(setup ? 503 : 500).json({
      error: setup ? DEVICE_LIMITS_SQL_HINT : message,
      enabled: false,
      setupRequired: setup || undefined,
    });
  }
});

/** GET /api/devices/me — list my devices + heartbeat current if device id sent */
router.get('/me', async (req, res) => {
  try {
    const current = await actor(req);
    if (!current) return res.status(401).json({ error: 'Not authorized' });
    const { admin } = clients();
    const fp = readDeviceFromRequest(req);
    if (fp.deviceId) {
      const check = await registerOrHeartbeatDevice({
        accountId: current.id,
        deviceId: fp.deviceId,
        deviceLabel: fp.deviceLabel,
        userAgent: fp.userAgent,
        admin,
      });
      if (check.ok === false) {
        return res.status(check.status).json({
          error: check.error,
          maxDevices: check.maxDevices,
          deviceCount: check.deviceCount,
        });
      }
    }
    const account = await loadAccountMaxDevices(current.id, admin);
    const devices = await loadAccountDevices(current.id, admin);
    return res.json({
      accountId: current.id,
      maxDevices: account?.max_devices ?? 1,
      currentDeviceId: fp.deviceId || null,
      devices,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Could not load devices' });
  }
});

/** GET /api/devices/account/:id — admin or owner reseller */
router.get('/account/:id', async (req, res) => {
  try {
    const current = await actor(req);
    if (!current) return res.status(401).json({ error: 'Not authorized' });
    const { admin } = clients();
    const access = await canManageAccount(current, req.params.id, admin);
    if (!access.ok) return res.status(access.status!).json({ error: access.error });
    const account = await loadAccountMaxDevices(req.params.id, admin);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const devices = await loadAccountDevices(req.params.id, admin);
    return res.json({
      accountId: account.id,
      maxDevices: account.max_devices,
      devices,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Could not load devices' });
  }
});

/** POST /api/devices/register — register / heartbeat current device */
router.post('/register', async (req, res) => {
  try {
    const current = await actor(req);
    if (!current) return res.status(401).json({ error: 'Not authorized' });
    const { admin } = clients();
    const fp = readDeviceFromRequest(req);
    if (!fp.deviceId) return res.status(400).json({ error: 'deviceId is required' });

    const check = await registerOrHeartbeatDevice({
      accountId: current.id,
      deviceId: fp.deviceId,
      deviceLabel: fp.deviceLabel,
      userAgent: fp.userAgent,
      admin,
    });
    if (check.ok === false) {
      return res.status(check.status).json({
        error: check.error,
        maxDevices: check.maxDevices,
        deviceCount: check.deviceCount,
      });
    }
    return res.json({
      ok: true,
      session: check.session,
      maxDevices: check.maxDevices,
      deviceCount: check.deviceCount,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Device registration failed' });
  }
});

/** PATCH /api/devices/account/:id/max — set max_devices (admin; reseller for owned members) */
router.patch('/account/:id/max', async (req, res) => {
  try {
    const current = await actor(req);
    if (!current) return res.status(401).json({ error: 'Not authorized' });
    const { admin } = clients();
    const targetId = req.params.id;
    const requested = Math.floor(Number(req.body?.maxDevices ?? req.body?.max_devices));
    if (!Number.isFinite(requested) || requested < 1 || requested > 50) {
      return res.status(400).json({ error: 'maxDevices must be an integer from 1 to 50' });
    }

    if (current.role === 'admin') {
      const row = await setAccountMaxDevices({ accountId: targetId, maxDevices: requested, admin });
      return res.json({ account: row });
    }

    if (current.role === 'reseller') {
      const { data: target } = await admin
        .from('customers')
        .select('id,owner_id,role,max_devices')
        .eq('id', targetId)
        .maybeSingle();
      if (!target || target.owner_id !== current.id || target.role !== 'user') {
        return res.status(403).json({ error: 'Not authorized' });
      }
      const sellerCap = Math.max(1, Math.min(50, Number(current.max_devices) || 1));
      if (requested > sellerCap) {
        return res.status(400).json({
          error: `Cannot exceed your seller device limit (${sellerCap}). Ask admin to raise it.`,
        });
      }
      const row = await setAccountMaxDevices({ accountId: targetId, maxDevices: requested, admin });
      return res.json({ account: row });
    }

    return res.status(403).json({ error: 'Not authorized to change device limits' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Could not update max devices' });
  }
});

/** DELETE /api/devices/:sessionId — revoke a device (self, admin, or owner reseller) */
router.delete('/:sessionId', async (req, res) => {
  try {
    const current = await actor(req);
    if (!current) return res.status(401).json({ error: 'Not authorized' });
    const { admin } = clients();
    const sessionId = String(req.params.sessionId || '');
    if (sessionId === 'me' || sessionId === 'account' || sessionId === 'register' || sessionId === 'limits-enabled') {
      return res.status(404).json({ error: 'Device not found' });
    }
    const { data: row } = await admin
      .from('device_sessions')
      .select('id,account_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (!row) return res.status(404).json({ error: 'Device not found' });

    const access = await canManageAccount(current, row.account_id, admin);
    if (!access.ok) return res.status(access.status!).json({ error: access.error });

    await revokeDeviceSession({ accountId: row.account_id, sessionId: row.id, admin });
    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Could not revoke device' });
  }
});

export default router;
