import { apiUrl } from './portalBase';

export type PushDispatchRow = {
  recipient_id?: string;
  accountId?: string;
  title?: string;
  message?: string;
  read?: boolean;
};

/** Ask the API to send FCM push (browser/client path). */
export async function requestPushDispatch(rows: PushDispatchRow[]) {
  if (!rows.length) return;
  try {
    const { supabase } = await import('../db');
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch(apiUrl('/api/mobile/push/dispatch'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rows }),
    });
  } catch {
    /* push must never break main flow */
  }
}

/** Node/server path — dynamic import avoids bundling firebase-admin in the browser. */
export async function dispatchPushOnServer(rows: Record<string, any>[]) {
  if (typeof window !== 'undefined') return;
  try {
    const { dispatchPushForNoteRows } = await import('../mobileRoutes');
    await dispatchPushForNoteRows(rows);
  } catch {
    try {
      const { sendPushForNoteRows } = await import('../pushEngine');
      await sendPushForNoteRows(rows);
    } catch {
      /* ignore */
    }
  }
}
