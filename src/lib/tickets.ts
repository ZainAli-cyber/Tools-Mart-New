import { supabase } from './db';
import { notifyTicketCreated, notifyTicketReply } from './notifications';

export type AssigneeRole = 'admin' | 'reseller';

export type TicketReply = {
  from: string;
  text: string;
  at: string;
  name?: string;
};

export type TicketRoute = {
  customer_id: string;
  assignee_role: AssigneeRole;
  owner_id: string | null;
};

export type SupportTicket = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  category: string;
  source: string;
  reopen_locked: boolean;
  replies: TicketReply[];
  created_at: string;
  customer_id: string | null;
  assignee_role: AssigneeRole;
  owner_id: string | null;
};

const POLL_MS = 12000;

/** Shown when DB is missing chatbot / reopen_locked columns. */
export const CHATBOT_TICKETS_SQL_HINT =
  'Run supabase_chatbot_tickets.sql in the Supabase SQL editor, then refresh.';

export function isMissingColumn(error: { message?: string; code?: string } | null) {
  const msg = (error?.message || '').toLowerCase();
  return msg.includes('column') || msg.includes('schema cache') || error?.code === 'PGRST204';
}

export function formatTicketDbError(message: string) {
  const msg = message || 'Ticket request failed';
  if (isMissingColumn({ message: msg }) && /reopen_locked|customer_phone|category|\bsource\b/i.test(msg)) {
    return `${msg} — ${CHATBOT_TICKETS_SQL_HINT}`;
  }
  return msg;
}

/** Select ticket fields; soft-fallback if reopen_locked (or other chatbot cols) are missing. */
async function selectTicketRow(id: string, colsWithLock: string, colsWithoutLock: string) {
  const full = await supabase.from('tickets').select(colsWithLock).eq('id', id).maybeSingle();
  if (!full.error) return { data: full.data, missingLockCol: false as boolean };
  if (!isMissingColumn(full.error)) throw new Error(full.error.message);
  const slim = await supabase.from('tickets').select(colsWithoutLock).eq('id', id).maybeSingle();
  if (slim.error) throw new Error(formatTicketDbError(slim.error.message));
  return { data: slim.data, missingLockCol: true as boolean };
}

function isRouteMarker(item: any) {
  return item && typeof item === 'object' && item._route;
}

export function parseReplies(raw: any): { route: Partial<TicketRoute> | null; replies: TicketReply[] } {
  const arr = Array.isArray(raw) ? raw : [];
  let route: Partial<TicketRoute> | null = null;
  const replies: TicketReply[] = [];
  for (const item of arr) {
    if (isRouteMarker(item)) {
      route = item._route;
      continue;
    }
    replies.push({
      from: String(item?.from || 'customer'),
      text: String(item?.text || item?.message || ''),
      at: String(item?.at || item?.time || ''),
      name: item?.name ? String(item.name) : undefined,
    });
  }
  return { route, replies };
}

function encodeReplies(replies: TicketReply[], route: Partial<TicketRoute> | null | undefined, persistRoute: boolean) {
  const clean = replies.map(r => ({
    from: r.from,
    text: r.text,
    at: r.at,
    ...(r.name ? { name: r.name } : {}),
  }));
  if (persistRoute && route) return [{ _route: route }, ...clean];
  return clean;
}

function normalizeRow(row: any): SupportTicket {
  const { route, replies } = parseReplies(row.replies);
  const assignee = (row.assignee_role || route?.assignee_role || 'admin') as AssigneeRole;
  const status = row.status || 'open';
  const locked = Boolean(row.reopen_locked) || !isTicketOpen(status);
  return {
    id: String(row.id),
    customer_name: row.customer_name || row.customerName || '',
    customer_email: row.customer_email || row.customerEmail || '',
    customer_phone: row.customer_phone || row.customerPhone || '',
    subject: row.subject || '',
    message: row.message || '',
    status,
    priority: row.priority || 'medium',
    category: row.category || 'general',
    source: row.source || 'portal',
    reopen_locked: locked,
    replies,
    created_at: row.created_at || row.createdAt || '',
    customer_id: row.customer_id || row.customerId || route?.customer_id || null,
    assignee_role: assignee === 'reseller' ? 'reseller' : 'admin',
    owner_id: row.owner_id || row.ownerId || route?.owner_id || null,
  };
}

export function ticketRouteFor(account: { id: string; role: string; ownerId?: string | null }): TicketRoute {
  const ownerId = account.ownerId || null;
  if (account.role === 'user' && ownerId) {
    return { customer_id: account.id, assignee_role: 'reseller', owner_id: ownerId };
  }
  return { customer_id: account.id, assignee_role: 'admin', owner_id: null };
}

export async function listTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(formatTicketDbError(error.message));
  return (data || []).map(row => normalizeRow(row));
}

export async function getTicket(id: string): Promise<SupportTicket | null> {
  if (!id) return null;
  const { data, error } = await supabase.from('tickets').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(formatTicketDbError(error.message));
  return data ? normalizeRow(data) : null;
}

/** Open chatbot ticket for this guest phone (latest first). Falls back if source/phone cols missing. */
export async function findOpenChatbotTicket(phone: string): Promise<SupportTicket | null> {
  const normalized = (phone || '').trim();
  if (!normalized) return null;

  const withSource = await supabase
    .from('tickets')
    .select('*')
    .eq('customer_phone', normalized)
    .eq('source', 'chatbot')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!withSource.error) {
    const open = (withSource.data || []).map(normalizeRow).find(t => isTicketOpen(t.status));
    return open || null;
  }

  if (!isMissingColumn(withSource.error)) throw new Error(formatTicketDbError(withSource.error.message));

  // Column missing: scan recent tickets client-side (best-effort before migration).
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(formatTicketDbError(error.message));
  const phoneDigits = normalized.replace(/\D/g, '');
  return (data || [])
    .map(normalizeRow)
    .find(t => {
      if (!isTicketOpen(t.status)) return false;
      const p = (t.customer_phone || '').replace(/\D/g, '');
      return Boolean(phoneDigits && p && (p === phoneDigits || p.endsWith(phoneDigits) || phoneDigits.endsWith(p)));
    }) || null;
}

export function filterMine(tickets: SupportTicket[], customerId: string, email?: string) {
  const em = (email || '').trim().toLowerCase();
  return tickets.filter(t => {
    if (customerId && t.customer_id === customerId) return true;
    if (!t.customer_id && em && (t.customer_email || '').toLowerCase() === em) return true;
    return false;
  });
}

export function filterSellerInbox(tickets: SupportTicket[], sellerId: string) {
  return tickets.filter(t => t.assignee_role === 'reseller' && t.owner_id === sellerId);
}

export function filterAdminInbox(tickets: SupportTicket[], all: boolean) {
  if (all) return tickets;
  return tickets.filter(t => t.assignee_role !== 'reseller');
}

export type TicketStatusFilter = 'all' | 'open' | 'closed';

export function isTicketOpen(status: string) {
  const s = (status || 'open').toLowerCase();
  return s === 'open' || s === 'unresolved' || s === 'pending';
}

/** Closed or resolved tickets cannot be reopened by the customer. */
export function isTicketReopenLocked(ticket: Pick<SupportTicket, 'status' | 'reopen_locked'>) {
  if (ticket.reopen_locked) return true;
  const s = (ticket.status || '').toLowerCase();
  return s === 'closed' || s === 'resolved';
}

export function ticketStatusLabel(status: string) {
  const s = (status || 'open').toLowerCase();
  if (s === 'resolved') return 'Resolved';
  if (s === 'closed') return 'Closed';
  if (s === 'pending') return 'Pending';
  return 'Open';
}

export function matchesStatusFilter(ticket: SupportTicket, filter: TicketStatusFilter) {
  if (filter === 'all') return true;
  if (filter === 'open') return isTicketOpen(ticket.status);
  return !isTicketOpen(ticket.status);
}

export function lastTicketPreview(ticket: SupportTicket) {
  const last = ticket.replies[ticket.replies.length - 1];
  return last?.text || ticket.message || '';
}

export function ticketNeedsReply(ticket: SupportTicket) {
  if (!isTicketOpen(ticket.status)) return false;
  const last = ticket.replies[ticket.replies.length - 1];
  if (!last) return true;
  return last.from === 'customer';
}

export function ticketMatchesQuery(
  ticket: SupportTicket,
  query: string,
  person?: { name?: string; customer_code?: string } | null,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    ticket.id,
    ticket.customer_name,
    ticket.customer_email,
    ticket.customer_phone,
    ticket.subject,
    ticket.message,
    ticket.category,
    ticket.source,
    lastTicketPreview(ticket),
    ...ticket.replies.map(r => r.text),
    person?.name,
    person?.customer_code,
  ].join(' ').toLowerCase();
  return hay.includes(q);
}

export async function createTicket(input: {
  subject: string;
  message: string;
  account: { id: string; name: string; email: string; role: string; ownerId?: string | null };
  phone?: string;
  category?: string;
  source?: string;
}) {
  const route = ticketRouteFor(input.account);
  const id = `T${Date.now()}`;
  const base = {
    id,
    customer_name: input.account.name,
    customer_email: input.account.email,
    customer_phone: (input.phone || '').trim(),
    subject: input.subject.trim(),
    message: input.message.trim(),
    status: 'open',
    priority: 'medium',
    category: (input.category || 'general').trim() || 'general',
    source: (input.source || 'portal').trim() || 'portal',
    reopen_locked: false,
    replies: [] as any[],
  };
  const full = { ...base, ...route };
  const first = await supabase.from('tickets').insert(full).select().single();
  if (!first.error) {
    const created = normalizeRow(first.data);
    void notifyTicketCreated(created);
    return created;
  }

  if (!isMissingColumn(first.error)) throw new Error(formatTicketDbError(first.error.message));

  const { customer_phone: _p, category: _c, source: _s, reopen_locked: _r, ...legacy } = base;
  const slim = { ...legacy, replies: [{ _route: route }] };
  const retry = await supabase.from('tickets').insert(slim).select().single();
  if (retry.error) throw new Error(formatTicketDbError(retry.error.message));
  const created = normalizeRow(retry.data);
  void notifyTicketCreated(created);
  return created;
}

/** Guest / website chatbot ticket (name + phone required). Links account when logged in. */
export async function createChatbotTicket(input: {
  name: string;
  phone: string;
  subject: string;
  message: string;
  category?: string;
  account?: { id: string; name: string; email: string; role: string; ownerId?: string | null } | null;
}) {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const subject = input.subject.trim();
  const message = input.message.trim();
  if (!name) throw new Error('Name is required');
  if (!phone) throw new Error('Phone number is required');
  if (!subject) throw new Error('Subject is required');
  if (!message) throw new Error('Message is required');

  const account = input.account;
  if (account?.id) {
    return createTicket({
      subject,
      message,
      account: { ...account, name: name || account.name },
      phone,
      category: input.category || 'general',
      source: 'chatbot',
    });
  }

  const id = `T${Date.now()}`;
  const base = {
    id,
    customer_name: name,
    customer_email: '',
    customer_phone: phone,
    subject,
    message,
    status: 'open',
    priority: 'medium',
    category: (input.category || 'general').trim() || 'general',
    source: 'chatbot',
    reopen_locked: false,
    customer_id: null as string | null,
    assignee_role: 'admin' as AssigneeRole,
    owner_id: null as string | null,
    replies: [] as any[],
  };

  const first = await supabase.from('tickets').insert(base).select().single();
  if (!first.error) {
    const created = normalizeRow(first.data);
    void notifyTicketCreated(created);
    return created;
  }

  if (!isMissingColumn(first.error)) throw new Error(formatTicketDbError(first.error.message));

  const slim = {
    id: base.id,
    customer_name: base.customer_name,
    customer_email: base.customer_email,
    subject: base.subject,
    message: base.message,
    status: base.status,
    priority: base.priority,
    replies: base.replies,
  };
  const retry = await supabase.from('tickets').insert(slim).select().single();
  if (retry.error) throw new Error(formatTicketDbError(retry.error.message));
  const created = normalizeRow({ ...retry.data, customer_phone: phone, source: 'chatbot', category: base.category });
  void notifyTicketCreated(created);
  return created;
}

export async function updateTicketStatus(id: string, status: string, opts?: { asCustomer?: boolean }) {
  const next = (status || '').toLowerCase();
  if (opts?.asCustomer) {
    throw new Error('Customers cannot change ticket status. Start a new ticket if you need more help.');
  }

  const { data: existing, missingLockCol } = await selectTicketRow(
    id,
    'status,reopen_locked',
    'status',
  );

  const wasLocked = existing
    ? isTicketReopenLocked({
        status: existing.status || 'open',
        reopen_locked: Boolean((existing as any).reopen_locked),
      })
    : false;

  // Staff reopen is allowed; customer reopen is blocked above.
  const patch: Record<string, unknown> = { status: next };
  if (!missingLockCol) {
    if (next === 'closed' || next === 'resolved') {
      patch.reopen_locked = true;
    } else if (wasLocked && (next === 'open' || next === 'pending' || next === 'unresolved')) {
      patch.reopen_locked = false;
    }
  }

  const { error } = await supabase.from('tickets').update(patch).eq('id', id);
  if (error) {
    if (isMissingColumn(error)) {
      const { error: fallback } = await supabase.from('tickets').update({ status: next }).eq('id', id);
      if (fallback) throw new Error(formatTicketDbError(fallback.message));
      return;
    }
    throw new Error(formatTicketDbError(error.message));
  }
}

export async function appendTicketReply(
  ticket: SupportTicket,
  reply: TicketReply,
  opts?: { allowOnLocked?: boolean },
) {
  const locked = isTicketReopenLocked(ticket);
  const fromCustomer = reply.from === 'customer';

  if (locked && fromCustomer) {
    throw new Error(
      'This ticket is closed or resolved and cannot be reopened. Please submit a new support ticket.',
    );
  }
  if (locked && !opts?.allowOnLocked) {
    throw new Error('This ticket is closed. Reopen it (staff) or ask the customer to start a new ticket.');
  }

  const { data: raw } = await selectTicketRow(
    ticket.id,
    'replies,status,reopen_locked',
    'replies,status',
  );
  if (!raw) throw new Error('Ticket not found');

  const liveStatus = raw.status || ticket.status;
  const liveLocked = isTicketReopenLocked({
    status: liveStatus,
    reopen_locked: Boolean((raw as any).reopen_locked ?? ticket.reopen_locked),
  });
  if (liveLocked && fromCustomer) {
    throw new Error(
      'This ticket is closed or resolved and cannot be reopened. Please submit a new support ticket.',
    );
  }

  const { route, replies } = parseReplies(raw.replies);
  const next = [...replies, reply];
  const persistRoute = Boolean(route);
  const encoded = encodeReplies(next, {
    customer_id: ticket.customer_id || route?.customer_id || '',
    assignee_role: ticket.assignee_role || route?.assignee_role || 'admin',
    owner_id: ticket.owner_id ?? route?.owner_id ?? null,
  }, persistRoute || !ticket.customer_id);

  // Do not auto-reopen locked tickets. Open tickets stay open.
  const patch: Record<string, unknown> = { replies: encoded };
  if (!liveLocked) patch.status = 'open';

  const { error } = await supabase.from('tickets').update(patch).eq('id', ticket.id);
  if (error) throw new Error(formatTicketDbError(error.message));
  void notifyTicketReply(ticket, reply.from);
}

export type TicketPerson = {
  id: string;
  name: string;
  avatar: string;
  customer_code: string;
  phone: string;
  role: string;
};

export async function loadTicketPeople(ids: string[]): Promise<Record<string, TicketPerson>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const { data } = await supabase
    .from('customers')
    .select('id,name,avatar,customer_code,phone,role')
    .in('id', unique);
  const map: Record<string, TicketPerson> = {};
  for (const row of data || []) {
    map[String(row.id)] = {
      id: String(row.id),
      name: row.name || '',
      avatar: row.avatar || '',
      customer_code: row.customer_code || '',
      phone: row.phone || '',
      role: row.role || 'user',
    };
  }
  return map;
}

export function formatTicketTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function subscribeTickets(onChange: () => void) {
  const channel = supabase
    .channel('tickets-inbox')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => onChange())
    .subscribe();
  const iv = setInterval(onChange, POLL_MS);
  return () => {
    clearInterval(iv);
    void supabase.removeChannel(channel);
  };
}
