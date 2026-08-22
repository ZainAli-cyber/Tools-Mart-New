import { supabase } from '../../lib/db';
import { tokenStore } from '../../lib/apiClient';
import { clearPortalSession, readPortalSession } from '../../lib/sessionStore';
import { resellerAuth } from '../../reseller/store/resellerAuth';

export const authStore = {
  async login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const result = await resellerAuth.login(email, password);
    if (!result.ok) return result;
    const session = readPortalSession();
    if (session?.role !== 'admin') {
      await this.logout();
      return { ok: false, error: 'This account does not have administrator access' };
    }
    // Sync access token for /api/admin/* callers that still read admin_jwt.
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) tokenStore.save(token);
    } catch {
      /* ignore */
    }
    return { ok: true };
  },
  async logout() {
    clearPortalSession();
    tokenStore.clear();
    await supabase.auth.signOut();
  },
  isAuthenticated(): boolean {
    return readPortalSession()?.role === 'admin';
  },
};
