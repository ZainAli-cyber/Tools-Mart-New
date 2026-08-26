/**
 * Server-only push dispatch. Do not import this from React/Vite entry files
 * with a static path — use the dynamic import in notifications.ts with @vite-ignore.
 */
export async function dispatchPushOnServer(rows: Record<string, any>[]) {
  if (typeof window !== 'undefined') return;
  try {
    const { sendPushForNoteRows } = await import('./pushEngine');
    await sendPushForNoteRows(rows);
  } catch (err) {
    console.error('[push] server dispatch failed', (err as any)?.message || err);
  }
}
