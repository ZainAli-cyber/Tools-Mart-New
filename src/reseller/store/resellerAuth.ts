import { supabase } from '../../lib/db';
import {
  clearPortalSession, readPortalSession, savePortalSession,
  type PortalSession as ResellerSession,
} from '../../lib/sessionStore';
import { getDeviceFingerprint } from '../../lib/deviceFingerprint';

const SETUP_MESSAGE =
  'Login accounts are not set up yet. Run supabase_account_auth_migration.sql in the Supabase SQL Editor.';

/** True when the account columns added by the migration are missing. */
async function migrationMissing(): Promise<boolean> {
  const { error } = await supabase.from('customers').select('auth_user_id').limit(1);
  return Boolean(error);
}

function parseDeviceRegisterBody(text: string): { error?: string } {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as { error?: string };
  } catch {
    return {};
  }
}

/** True when the devices API is unreachable or not deployed — never block login. */
function shouldSoftPassDeviceRegister(response: Response, body: { error?: string }): boolean {
  if (response.status === 405 || response.status === 404) return true;
  if (response.status >= 500) return true;
  if (response.status === 403 && body.error) return false;
  return true;
}

async function registerDeviceForSession(accessToken: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const fp = getDeviceFingerprint();
  try {
    const response = await fetch('/api/devices/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Device-Id': fp.deviceId,
        'X-Device-Label': fp.deviceLabel,
      },
      body: JSON.stringify({
        deviceId: fp.deviceId,
        deviceLabel: fp.deviceLabel,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      }),
    });
    const text = await response.text();
    const body = parseDeviceRegisterBody(text);
    if (!response.ok) {
      if (shouldSoftPassDeviceRegister(response, body)) {
        return { ok: true };
      }
      return {
        ok: false,
        error:
          body.error ||
          'Device limit reached. Ask admin/reseller to manage devices or remove an old device.',
      };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

export const resellerAuth = {
  async login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const clean = email.trim().toLowerCase();
    if (!clean || !password) return { ok: false, error: 'Email and password are required' };

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: clean,
      password,
    });
    if (authError || !authData.user || !authData.session) {
      if (await migrationMissing()) return { ok: false, error: SETUP_MESSAGE };
      return { ok: false, error: 'Invalid email or password' };
    }

    const { data: account, error } = await supabase
      .from('customers')
      .select('id,customer_code,auth_user_id,name,email,status,role')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (error || !account) {
      await supabase.auth.signOut();
      if (await migrationMissing()) return { ok: false, error: SETUP_MESSAGE };
      return { ok: false, error: 'Your account profile is not configured. Contact the administrator.' };
    }
    if (account.status === 'blocked') {
      await supabase.auth.signOut();
      return { ok: false, error: 'This account is suspended. Contact the administrator.' };
    }

    // Admins never need device registration (server also exempts role=admin).
    if (String(account.role || '').toLowerCase() !== 'admin') {
      const device = await registerDeviceForSession(authData.session.access_token);
      if (device.ok === false) {
        await supabase.auth.signOut();
        clearPortalSession();
        return { ok: false, error: device.error };
      }
    }

    const session: ResellerSession = {
      id: account.id,
      authUserId: authData.user.id,
      customerCode: account.customer_code || account.id,
      name: account.name || 'Member',
      email: account.email || clean,
      role: account.role || 'user',
      expiry: authData.session.expires_at
        ? authData.session.expires_at * 1000
        : Date.now() + 60 * 60 * 1000,
    };
    savePortalSession(session);
    try {
      const token = String(authData.session.access_token || '').trim();
      if (token) localStorage.setItem('admin_jwt', token);
    } catch {
      /* ignore */
    }
    return { ok: true };
  },

  async logout() {
    clearPortalSession();
    await supabase.auth.signOut();
  },

  session(): ResellerSession | null {
    return readPortalSession();
  },

  isAuthenticated(): boolean { return this.session() !== null; },
};
