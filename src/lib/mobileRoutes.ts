import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  pushConfigured,
  registerPushToken,
  sendPushForNoteRows,
  sendPushToAccounts,
  unregisterPushToken,
  type PushItem,
} from './pushEngine';

const router = Router();

function config() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase authentication is not configured');
  return { url, anon };
}

function authClient(token?: string) {
  const { url, anon } = config();
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}

async function profileForToken(token: string) {
  const client = authClient(token);
  const { data: userData, error } = await client.auth.getUser(token);
  if (error || !userData.user) return null;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const db = createClient(url!, serviceKey || anon!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile } = await db
    .from('customers')
    .select('id,role,status')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();
  if (!profile || profile.status === 'blocked') return null;
  return profile;
}

function canDispatch(profile: { id: string; role: string }, items: PushItem[]) {
  if (profile.role === 'admin') return true;
  return items.every(item => item.accountId === profile.id);
}

/** Public mobile app metadata — APK download link for dashboard. */
router.get('/info', (_req, res) => {
  const apkUrl = String(process.env.MOBILE_APK_URL || '/downloads/aitoolzmart.apk').trim();
  const version = String(process.env.MOBILE_APK_VERSION || '1.1.0').trim();
  res.json({
    ok: true,
    platform: 'android',
    apkUrl,
    version,
    minAndroid: 24,
    appName: 'AI Toolz Mart',
    pushEnabled: pushConfigured(),
    note: 'Install once. Tools and cookies update automatically when you open them — no reinstall needed.',
  });
});

/** Save FCM device token for the logged-in member (mobile APK). */
router.post('/push/register', async (req, res) => {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const profile = await profileForToken(token);
    if (!profile) return res.status(401).json({ error: 'Session expired' });

    const fcmToken = String(req.body?.token || '').trim();
    const platform = String(req.body?.platform || 'android').trim();
    if (!fcmToken) return res.status(400).json({ error: 'token is required' });

    await registerPushToken(String(profile.id), fcmToken, platform);
    return res.json({ ok: true, pushEnabled: pushConfigured() });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Could not register push token' });
  }
});

router.post('/push/unregister', async (req, res) => {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const profile = await profileForToken(token);
    if (!profile) return res.status(401).json({ error: 'Session expired' });

    const fcmToken = String(req.body?.token || '').trim();
    if (fcmToken) await unregisterPushToken(String(profile.id), fcmToken);
    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Could not unregister push token' });
  }
});

/** Dispatch push after in-app notification rows (client-side inserts). */
router.post('/push/dispatch', async (req, res) => {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const profile = await profileForToken(token);
    if (!profile) return res.status(401).json({ error: 'Session expired' });

    const items: PushItem[] = Array.isArray(req.body?.items)
      ? req.body.items
          .map((row: any) => ({
            accountId: String(row.accountId || row.account_id || '').trim(),
            title: String(row.title || 'AI Toolz Mart'),
            message: String(row.message || ''),
          }))
          .filter((row: PushItem) => row.accountId)
      : [];

    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    for (const row of rows) {
      const accountId = String(row.recipient_id || row.accountId || '').trim();
      if (!accountId || row.read === true) continue;
      items.push({
        accountId,
        title: String(row.title || 'AI Toolz Mart'),
        message: String(row.message || ''),
      });
    }

    if (!items.length) return res.json({ ok: true, sent: 0 });
    if (!canDispatch(profile, items)) {
      return res.status(403).json({ error: 'Not allowed to push to these recipients' });
    }

    const result = await sendPushToAccounts(items);
    return res.json({ ok: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Push dispatch failed' });
  }
});

export default router;

/** Server-side hook — call after notification rows insert. */
export async function dispatchPushForNoteRows(rows: Record<string, any>[]) {
  try {
    return await sendPushForNoteRows(rows);
  } catch (err) {
    console.error('[push] dispatch notes failed', (err as any)?.message || err);
    return { sent: 0, skipped: false };
  }
}
