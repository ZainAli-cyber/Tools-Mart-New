import { apiUrl } from './portalBase';

export type PushDispatchRow = {
  recipient_id?: string;
  accountId?: string;
  title?: string;
  message?: string;
  read?: boolean;
};

/** Ask the API to send FCM push. Safe for the browser bundle (no firebase-admin). */
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
