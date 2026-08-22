import type { AccountRole } from './accountStore';

const KEY = 'atm_portal_profile';

export type PortalSession = {
  id: string;
  authUserId: string;
  customerCode: string;
  name: string;
  email: string;
  role: AccountRole;
  expiry: number;
};

export function savePortalSession(session: PortalSession) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function readPortalSession(): PortalSession | null {
  try {
    const session = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!session?.authUserId || !session?.expiry || Date.now() >= session.expiry) {
      clearPortalSession();
      return null;
    }
    return session as PortalSession;
  } catch {
    clearPortalSession();
    return null;
  }
}

export function clearPortalSession() {
  localStorage.removeItem(KEY);
  // Remove obsolete, unsigned sessions from the previous implementation.
  localStorage.removeItem('atm_reseller_session');
  localStorage.removeItem('aitoolzmart_admin_session');
  localStorage.removeItem('admin_jwt');
}
