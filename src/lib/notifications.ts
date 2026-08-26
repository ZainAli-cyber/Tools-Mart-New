import { supabase } from './db';

export type InboxNote = {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  audience?: string | null;
  recipient_id?: string | null;
  created_at?: string;
};

export function noteVisible(note: InboxNote, account: { id: string; role: string }) {
  const type = String(note.type || '');
  if (account.role === 'admin') {
    if (note.recipient_id || type.startsWith('direct-') || type.startsWith('broadcast-')) return false;
    return true;
  }
  if (note.recipient_id) return note.recipient_id === account.id;
  if (type === `direct-${account.id}`) return true;
  if (type === 'broadcast-sellers') return account.role === 'reseller';
  if (type === 'broadcast-customers') return account.role === 'user';
  if (note.audience === 'reseller') return account.role === 'reseller';
  if (note.audience === 'user') return account.role === 'user';
  return false;
}

/** Incoming alert: visible, unread, and not an admin "sent" copy. */
export function shouldAlertNote(note: InboxNote, account: { id: string; role: string }) {
  if (!note?.id || note.read) return false;
  const type = String(note.type || '');
  if (type.startsWith('sent-')) return false;
  return noteVisible(note, account);
}

export function asInboxNote(row: any): InboxNote | null {
  if (!row || !row.id) return null;
  return {
    id: String(row.id),
    type: String(row.type || ''),
    title: String(row.title || ''),
    message: String(row.message || ''),
    time: String(row.time || ''),
    read: !!row.read,
    audience: row.audience ?? null,
    recipient_id: row.recipient_id ?? null,
    created_at: row.created_at,
  };
}

export async function loadNotes(): Promise<InboxNote[]> {
  const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(400);
  return (data || []) as InboxNote[];
}

export async function markNoteRead(id: string) {
  await markNotesRead([id]);
}

export async function markNotesRead(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from('notifications').update({ read: true }).in('id', ids);
  if (error) {
    await notesApi('read', ids, error.message);
    return;
  }
  const { data } = await supabase.from('notifications').select('id,read').in('id', ids);
  const leftover = (data || []).filter(n => !n.read).map(n => n.id);
  if (leftover.length) await notesApi('read', leftover, 'Could not mark as read');
}

export async function deleteNote(id: string) {
  await deleteNotes([id]);
}

export async function deleteNotes(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from('notifications').delete().in('id', ids);
  if (error) {
    await notesApi('delete', ids, error.message);
    return;
  }
  const { data } = await supabase.from('notifications').select('id').in('id', ids);
  const leftover = (data || []).map(n => n.id);
  if (leftover.length) await notesApi('delete', leftover, 'Could not delete notification');
}

async function notesApi(action: 'read' | 'delete', ids: string[], fallbackError: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error(fallbackError);
  const response = await fetch('/api/notifications/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ids }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || fallbackError);
}

function stamp() {
  return new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function insertNoteRows(rows: Record<string, any>[]) {
  if (!rows.length) return;
  const full = await supabase.from('notifications').insert(rows);
  if (!full.error) return;
  const fallback = rows.map(({ audience: _a, recipient_id: _r, ...rest }) => rest);
  const retry = await supabase.from('notifications').insert(fallback);
  if (retry.error) throw new Error(retry.error.message);
}

function noteId(suffix = '') {
  return `N${Date.now()}${suffix}${Math.random().toString(36).slice(2, 6)}`;
}

function adminNote(title: string, message: string, type: string) {
  return {
    id: noteId('A'),
    type,
    audience: 'admin',
    recipient_id: null,
    title,
    message,
    time: stamp(),
    read: false,
  };
}

function directNote(account: { id: string; role: string }, title: string, message: string, type?: string) {
  const role = account.role === 'reseller' ? 'reseller' : 'user';
  return {
    id: noteId(account.id.slice(-4)),
    type: type || `direct-${account.id}`,
    audience: role,
    recipient_id: account.id,
    title,
    message,
    time: stamp(),
    read: false,
  };
}

async function ownerOfCustomer(hint: {
  customerId?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
}): Promise<string | null> {
  let row: any = null;
  if (hint.customerId) {
    const { data } = await supabase.from('customers').select('id,owner_id,role').eq('id', hint.customerId).maybeSingle();
    row = data;
  }
  if (!row && hint.customerPhone) {
    const { data } = await supabase.from('customers').select('id,owner_id,role').eq('phone', hint.customerPhone).maybeSingle();
    row = data;
  }
  if (!row && hint.customerEmail) {
    const { data } = await supabase.from('customers').select('id,owner_id,role').eq('email', hint.customerEmail).maybeSingle();
    row = data;
  }
  const ownerId = row?.owner_id || null;
  if (!ownerId || ownerId === row?.id) return null;
  return String(ownerId);
}

/** Admin inbox row (no recipient) plus optional seller/customer direct rows. */
export async function pushNotes(rows: Record<string, any>[]) {
  try {
    await insertNoteRows(rows);
  } catch {
    /* bell insert should never fail the main action */
  }
  void dispatchPushAfterNotes(rows);
}

async function dispatchPushAfterNotes(rows: Record<string, any>[]) {
  if (!rows.length) return;
  // Browser / Vite: HTTP only — never pull firebase-admin into the client bundle.
  if (typeof window !== 'undefined') {
    try {
      const { requestPushDispatch } = await import('./mobile/pushClient');
      await requestPushDispatch(rows);
    } catch {
      /* ignore */
    }
    return;
  }
  // Node API / server.ts — @vite-ignore keeps firebase-admin out of vite build analysis.
  try {
    const mod = await import(/* @vite-ignore */ './pushDispatchServer');
    await mod.dispatchPushOnServer(rows);
  } catch {
    /* ignore */
  }
}

export async function notifyAdminAndOwner(input: {
  title: string;
  message: string;
  type: string;
  customerId?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
}) {
  const rows: Record<string, any>[] = [adminNote(input.title, input.message, input.type)];
  try {
    const ownerId = await ownerOfCustomer(input);
    if (ownerId) {
      rows.push(directNote({ id: ownerId, role: 'reseller' }, input.title, input.message, `direct-${ownerId}`));
    }
  } catch { /* owner lookup optional */ }
  await pushNotes(rows);
}

export async function notifyTicketCreated(ticket: {
  customer_name: string;
  subject: string;
  customer_id?: string | null;
  customer_phone?: string | null;
  source?: string | null;
  assignee_role?: string;
  owner_id?: string | null;
}) {
  const fromChat = (ticket.source || '') === 'chatbot';
  const title = fromChat ? 'New Chatbot Query' : 'New Support Ticket';
  const phoneNote = ticket.customer_phone ? ` · ${ticket.customer_phone}` : '';
  const message = `${ticket.customer_name}${phoneNote}: ${ticket.subject}`;
  const rows: Record<string, any>[] = [];

  if (ticket.assignee_role === 'reseller' && ticket.owner_id) {
    rows.push(directNote({ id: ticket.owner_id, role: 'reseller' }, title, message, `direct-${ticket.owner_id}`));
  } else {
    rows.push(adminNote(title, message, fromChat ? 'chatbot-ticket' : 'ticket'));
  }

  if (ticket.customer_id) {
    rows.push(
      directNote(
        { id: ticket.customer_id, role: 'user' },
        'Support ticket opened',
        `We received your query: ${ticket.subject}`,
        `direct-${ticket.customer_id}`,
      ),
    );
  }

  await pushNotes(rows);
}

export async function notifyTicketReply(ticket: {
  customer_name: string;
  subject: string;
  customer_id?: string | null;
  customer_email?: string;
  assignee_role?: string;
  owner_id?: string | null;
}, from: string) {
  const title = 'New Support Message';
  const message = `${ticket.customer_name} · ${ticket.subject}`;
  if (from === 'customer') {
    if (ticket.assignee_role === 'reseller' && ticket.owner_id) {
      await pushNotes([directNote({ id: ticket.owner_id, role: 'reseller' }, title, message, `direct-${ticket.owner_id}`)]);
      return;
    }
    await pushNotes([adminNote(title, message, 'ticket')]);
    return;
  }
  let customerId = ticket.customer_id || null;
  let customerRole = 'user';
  if (!customerId && ticket.customer_email) {
    const { data } = await supabase.from('customers').select('id,role').eq('email', ticket.customer_email).maybeSingle();
    if (data?.id) {
      customerId = String(data.id);
      customerRole = data.role === 'reseller' ? 'reseller' : 'user';
    }
  }
  if (customerId) {
    await pushNotes([directNote({ id: customerId, role: customerRole }, 'Support replied', message, `direct-${customerId}`)]);
  }
}

export type NotesEvent = {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | 'POLL';
  note: InboxNote | null;
};

export function subscribeNotes(onChange: (ev?: NotesEvent) => void, pollMs = 9000) {
  const channel = supabase
    .channel(`notes-bell-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, payload => {
      const event = (payload.eventType || 'UPDATE') as 'INSERT' | 'UPDATE' | 'DELETE';
      const raw = event === 'DELETE' ? payload.old : payload.new;
      onChange({ event, note: asInboxNote(raw) });
    })
    .subscribe();
  const iv = setInterval(() => onChange({ event: 'POLL', note: null }), pollMs);
  return () => {
    clearInterval(iv);
    void supabase.removeChannel(channel);
  };
}

export async function sendNotes(input: {
  title: string;
  message: string;
  mode: 'sellers' | 'customers' | 'selected';
  selected?: { id: string; role: string }[];
}) {
  const title = input.title.trim();
  const message = input.message.trim();
  let targets = input.selected || [];
  if (input.mode !== 'selected') {
    const want = input.mode === 'sellers' ? 'reseller' : 'user';
    const { data } = await supabase.from('customers').select('id,role');
    targets = (data || [])
      .filter((row: any) => (row.role || 'user') === want)
      .map((row: any) => ({ id: row.id, role: row.role || 'user' }));
  }
  if (!targets.length) {
    throw new Error(input.mode === 'selected' ? 'Select at least one recipient' : 'No accounts in that group');
  }

  const now = Date.now();
  const time = stamp();
  const sentType = input.mode === 'sellers' ? 'sent-sellers' : input.mode === 'customers' ? 'sent-customers' : 'sent-selected';
  const rows: Record<string, any>[] = [
    {
      id: `N${now}A`,
      type: sentType,
      audience: 'admin',
      recipient_id: null,
      title,
      message,
      time,
      read: true,
    },
    ...targets.map((account, index) => ({
      id: `N${now}${index}`,
      type: `direct-${account.id}`,
      audience: account.role === 'reseller' ? 'reseller' : 'user',
      recipient_id: account.id,
      title,
      message,
      time,
      read: false,
    })),
  ];

  const full = await supabase.from('notifications').insert(rows);
  if (!full.error) {
    void dispatchPushAfterNotes(rows);
    return;
  }
  const fallback = rows.map(({ audience: _a, recipient_id: _r, ...rest }) => rest);
  const retry = await supabase.from('notifications').insert(fallback);
  if (retry.error) throw new Error(retry.error.message);
  void dispatchPushAfterNotes(rows);
}
