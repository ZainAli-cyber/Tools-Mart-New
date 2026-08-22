// ── Unified sign-in for all three roles ────────────────────────────────────
// One form handles admin, reseller and customer logins. The correct dashboard
// is resolved from the account role so there is no separate login page.

import { supabase } from './db';
import { resellerAuth } from '../reseller/store/resellerAuth';
import { readPortalSession } from './sessionStore';

export type AuthResult = { ok: boolean; redirect?: string; error?: string };

const ADMIN_DASHBOARD = '/admin';
const MEMBER_DASHBOARD = '/reseller';

/** Signs in an admin, reseller or customer from a single set of credentials. */
export async function portalLogin(email: string, password: string): Promise<AuthResult> {
  const clean = email.trim().toLowerCase();
  if (!clean || !password) return { ok: false, error: 'Email and password are required' };

  const result = await resellerAuth.login(clean, password);
  if (!result.ok) return { ok: false, error: result.error || 'Invalid email or password' };
  const session = resellerAuth.session();
  return {
    ok: true,
    redirect: session?.role === 'admin' ? ADMIN_DASHBOARD : MEMBER_DASHBOARD,
  };
}

/**
 * Creates a plain customer account. It starts with no plan and no tools, so
 * everything shows as locked until the admin activates a package.
 */
export async function portalSignup(input: {
  name: string; email: string; phone: string; password: string;
}): Promise<AuthResult> {
  const name = input.name.trim();
  const clean = input.email.trim().toLowerCase();

  if (!name) return { ok: false, error: 'Full name is required' };
  if (!/^\S+@\S+\.\S+$/.test(clean)) return { ok: false, error: 'Enter a valid email address' };
  if (input.password.length < 8) return { ok: false, error: 'Password must be at least 8 characters' };

  const { data, error } = await supabase.auth.signUp({
    email: clean,
    password: input.password,
    options: {
      data: {
        name,
        phone: input.phone.trim(),
        role: 'user',
      },
    },
  });
  if (error) return { ok: false, error: error.message };

  // Projects with email confirmation enabled intentionally do not return a
  // session. The user can sign in after confirming the Supabase email.
  if (!data.session) {
    return {
      ok: false,
      error: 'Account created. Check your email to confirm it, then log in.',
    };
  }

  const login = await resellerAuth.login(clean, input.password);
  if (!login.ok) return { ok: false, error: login.error || 'Account created — please log in.' };
  return { ok: true, redirect: MEMBER_DASHBOARD };
}

export type PortalStatus = {
  loggedIn: boolean;
  /** Where the header's Dashboard button should point. */
  dashboard: string;
  label: string;
};

/** Current sign-in state, used by the public header. */
export function portalStatus(): PortalStatus {
  const session = readPortalSession();
  if (session?.role === 'admin') {
    return { loggedIn: true, dashboard: ADMIN_DASHBOARD, label: 'Dashboard' };
  }
  if (session) {
    return { loggedIn: true, dashboard: MEMBER_DASHBOARD, label: 'Dashboard' };
  }
  return { loggedIn: false, dashboard: '/login', label: 'Login' };
}

export async function portalLogout() {
  await resellerAuth.logout();
}

/** Role of the signed-in member, when there is one. */
export function currentRole(): string | null {
  return readPortalSession()?.role || null;
}
