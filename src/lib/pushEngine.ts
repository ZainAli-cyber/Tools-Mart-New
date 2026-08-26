/**
 * Server-side FCM push (Firebase Cloud Messaging).
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON env var on Vercel.
 */
import { createClient } from '@supabase/supabase-js';

export type PushItem = {
  accountId: string;
  title: string;
  message: string;
};

let firebaseReady: boolean | null = null;
let messaging: import('firebase-admin/messaging').Messaging | null = null;

function serviceDb() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getMessaging() {
  if (firebaseReady === false) return null;
  if (messaging) return messaging;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  if (!raw.trim()) {
    firebaseReady = false;
    return null;
  }
  try {
    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
      const cred = JSON.parse(raw);
      admin.initializeApp({ credential: admin.credential.cert(cred) });
    }
    messaging = admin.messaging();
    firebaseReady = true;
    return messaging;
  } catch (err) {
    console.error('[push] Firebase init failed', (err as any)?.message || err);
    firebaseReady = false;
    return null;
  }
}

export function pushConfigured(): boolean {
  return Boolean(String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim());
}

export async function registerPushToken(accountId: string, token: string, platform = 'android') {
  const db = serviceDb();
  const acc = String(accountId || '').trim();
  const tok = String(token || '').trim();
  if (!acc || !tok) throw new Error('accountId and token required');
  const { error } = await db.from('push_tokens').upsert(
    {
      account_id: acc,
      token: tok,
      platform: platform || 'android',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'account_id,token' },
  );
  if (error) throw new Error(error.message);
}

export async function unregisterPushToken(accountId: string, token: string) {
  const db = serviceDb();
  await db.from('push_tokens').delete().eq('account_id', accountId).eq('token', token);
}

async function tokensForAccounts(accountIds: string[]): Promise<string[]> {
  const ids = [...new Set(accountIds.map(id => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return [];
  const db = serviceDb();
  const { data, error } = await db.from('push_tokens').select('token').in('account_id', ids);
  if (error) {
    console.error('[push] token lookup failed', error.message);
    return [];
  }
  return [...new Set((data || []).map(r => String(r.token || '').trim()).filter(Boolean))];
}

export async function sendPushToAccounts(items: PushItem[]) {
  const msg = await getMessaging();
  if (!msg) return { sent: 0, skipped: true };

  const grouped = new Map<string, PushItem>();
  for (const item of items) {
    const id = String(item.accountId || '').trim();
    if (!id) continue;
    grouped.set(id, {
      accountId: id,
      title: String(item.title || 'AI Toolz Mart').trim() || 'AI Toolz Mart',
      message: String(item.message || '').trim(),
    });
  }
  if (!grouped.size) return { sent: 0, skipped: false };

  let sent = 0;
  for (const item of grouped.values()) {
    const tokens = await tokensForAccounts([item.accountId]);
    if (!tokens.length) continue;
    const body = item.message.slice(0, 500);
    try {
      const res = await msg.sendEachForMulticast({
        tokens,
        notification: { title: item.title, body },
        data: { accountId: item.accountId, type: 'notification' },
        android: {
          priority: 'high',
          notification: {
            channelId: 'aitoolzmart_alerts',
            sound: 'default',
            defaultVibrateTimings: true,
            priority: 'high' as any,
            visibility: 'public' as any,
          },
        },
      });
      sent += res.successCount;
      if (res.failureCount) {
        console.warn('[push] partial failure', item.accountId, res.failureCount);
      }
    } catch (err) {
      console.error('[push] send failed', item.accountId, (err as any)?.message || err);
    }
  }
  return { sent, skipped: false };
}

/** After in-app notification rows are inserted. */
export async function sendPushForNoteRows(rows: Record<string, any>[]) {
  const items: PushItem[] = [];
  for (const row of rows) {
    const accountId = String(row.recipient_id || '').trim();
    if (!accountId) continue;
    if (row.read === true) continue;
    items.push({
      accountId,
      title: String(row.title || 'AI Toolz Mart'),
      message: String(row.message || ''),
    });
  }
  if (!items.length) return { sent: 0, skipped: false };
  return sendPushToAccounts(items);
}
