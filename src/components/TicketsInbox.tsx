import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Inbox, Plus, Search, Send, Check, X, MessageCircle, RotateCcw, ArrowLeft } from 'lucide-react';
import {
  appendTicketReply,
  createTicket,
  filterAdminInbox,
  filterMine,
  filterSellerInbox,
  formatTicketTime,
  isTicketOpen,
  isTicketReopenLocked,
  lastTicketPreview,
  listTickets,
  loadTicketPeople,
  matchesStatusFilter,
  subscribeTickets,
  ticketMatchesQuery,
  ticketNeedsReply,
  ticketStatusLabel,
  updateTicketStatus,
  formatTicketDbError,
  type SupportTicket,
  type TicketPerson,
  type TicketStatusFilter,
} from '../lib/tickets';
import { supabase } from '../lib/db';
import { waLink } from '../lib/accountStore';
import { isMobileApp } from '../lib/mobile/toolLauncher';

export type TicketsInboxMode = 'mine' | 'seller-inbox' | 'admin';

export type TicketAccount = {
  id: string;
  name: string;
  email: string;
  role: string;
  ownerId?: string | null;
  avatar?: string;
};

const card = 'bg-[#130d0d] border border-[#2a1e1c] rounded-2xl';
const btnRed = 'inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50';
const btnGhost = 'inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1a1210] hover:bg-[#231a18] border border-[#2a1e1c] text-slate-300 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer';
const inputCls = 'w-full bg-[#1a1210] border border-[#2a1e1c] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition';

function mineSide(from: string) {
  return from === 'customer';
}

function ownBubble(from: string, mode: TicketsInboxMode) {
  if (mode === 'admin') return from === 'admin';
  if (mode === 'seller-inbox') return from === 'reseller';
  return mineSide(from);
}

function personFor(ticket: SupportTicket, people: Record<string, TicketPerson>) {
  return people[ticket.customer_id || ''] || people[`email:${(ticket.customer_email || '').toLowerCase()}`];
}

function senderLabel(from: string, ticket: SupportTicket, people: Record<string, TicketPerson>, replyName?: string) {
  if (from === 'admin') return 'Admin';
  if (from === 'reseller') return people[ticket.owner_id || '']?.name || replyName || 'Seller';
  return personFor(ticket, people)?.name || ticket.customer_name || 'Customer';
}

function customerCode(ticket: SupportTicket, people: Record<string, TicketPerson>) {
  return personFor(ticket, people)?.customer_code || '';
}

function AvatarCircle({ name, src, size = 'md' }: { name: string; src?: string; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  return (
    <div className={`${cls} rounded-full overflow-hidden bg-red-600 shrink-0 flex items-center justify-center font-black text-white`}>
      {src
        ? <img src={src} alt="" className="w-full h-full object-cover" />
        : (name || '?')[0]?.toUpperCase()}
    </div>
  );
}

function statusBadgeClass(status: string) {
  if (isTicketOpen(status)) return 'bg-red-600/20 text-red-400';
  if ((status || '').toLowerCase() === 'resolved') return 'bg-emerald-600/20 text-emerald-400';
  return 'bg-slate-700/40 text-slate-400';
}

export const TicketsInbox: React.FC<{
  mode: TicketsInboxMode;
  account: TicketAccount;
}> = ({ mode, account }) => {
  const deskMode = mode === 'admin' || mode === 'seller-inbox';
  const [all, setAll] = useState<SupportTicket[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [adminAll, setAdminAll] = useState(false);
  const [people, setPeople] = useState<Record<string, TicketPerson>>({});
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatusFilter>(deskMode ? 'open' : 'all');
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const rows = await listTickets();
      setAll(rows);
      setError('');
    } catch (e: any) {
      setError(formatTicketDbError(e?.message || 'Could not load tickets'));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => subscribeTickets(() => { void load(); }), [load]);

  useEffect(() => {
    const ids = all.flatMap(t => [t.customer_id, t.owner_id]);
    if (account.id && account.id !== 'admin') ids.push(account.id);
    void (async () => {
      const map = await loadTicketPeople(ids.filter(Boolean) as string[]);
      const emails = [...new Set(all.filter(t => !t.customer_id && t.customer_email).map(t => t.customer_email.toLowerCase()))];
      if (emails.length) {
        const { data } = await supabase.from('customers').select('id,name,avatar,customer_code,phone,role,email').in('email', emails);
        for (const row of data || []) {
          const person: TicketPerson = {
            id: String(row.id),
            name: row.name || '',
            avatar: row.avatar || '',
            customer_code: row.customer_code || '',
            phone: row.phone || '',
            role: row.role || 'user',
          };
          map[person.id] = person;
          if (row.email) map[`email:${String(row.email).toLowerCase()}`] = person;
        }
      }
      setPeople(map);
    })();
  }, [all, account.id]);

  const scoped = useMemo(() => {
    if (mode === 'mine') return filterMine(all, account.id, account.email);
    if (mode === 'seller-inbox') return filterSellerInbox(all, account.id);
    return filterAdminInbox(all, adminAll);
  }, [all, mode, account.id, account.email, adminAll]);

  const openCount = useMemo(() => scoped.filter(t => isTicketOpen(t.status)).length, [scoped]);
  const needsReplyCount = useMemo(() => scoped.filter(ticketNeedsReply).length, [scoped]);
  const closedCount = scoped.length - openCount;

  const tickets = useMemo(() => {
    const q = query.trim();
    return scoped
      .filter(t => matchesStatusFilter(t, deskMode ? statusFilter : 'all'))
      .filter(t => ticketMatchesQuery(t, q, personFor(t, people)))
      .sort((a, b) => {
        const wait = Number(ticketNeedsReply(b)) - Number(ticketNeedsReply(a));
        if (wait) return wait;
        const open = Number(isTicketOpen(b.status)) - Number(isTicketOpen(a.status));
        if (open) return open;
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
  }, [scoped, deskMode, statusFilter, query, people]);

  useEffect(() => {
    if (activeId && !scoped.some(t => t.id === activeId)) setActiveId(null);
  }, [scoped, activeId]);

  const active = scoped.find(t => t.id === activeId) || null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.id, active?.replies.length]);

  const canCompose = mode === 'mine';
  const myFrom = mode === 'admin' ? 'admin' : mode === 'seller-inbox' ? 'reseller' : 'customer';

  const submitNew = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSaving(true);
    try {
      const created = await createTicket({ subject, message, account });
      setSubject('');
      setMessage('');
      setComposing(false);
      await load();
      setActiveId(created.id);
    } catch (e: any) {
      setError(formatTicketDbError(e?.message || 'Could not submit ticket'));
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    if (mode === 'mine' && isTicketReopenLocked(active)) {
      setError('This ticket is closed or resolved and cannot be reopened. Submit a new ticket instead.');
      return;
    }
    setSaving(true);
    try {
      await appendTicketReply(active, {
        from: myFrom,
        text: reply.trim(),
        at: new Date().toISOString(),
        name: account.name,
      }, { allowOnLocked: false });
      setReply('');
      await load();
    } catch (e: any) {
      setError(formatTicketDbError(e?.message || 'Could not send reply'));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status: string) => {
    if (!active) return;
    if (mode === 'mine') {
      setError('You cannot change ticket status. If this ticket is closed, submit a new one.');
      return;
    }
    try {
      await updateTicketStatus(active.id, status);
      await load();
    } catch (e: any) {
      setError(formatTicketDbError(e?.message || 'Could not update ticket'));
    }
  };

  const title = mode === 'admin' ? 'Support Center' : mode === 'seller-inbox' ? 'Member Inbox' : 'Inbox';
  const sub = mode === 'admin'
    ? `${openCount} open${needsReplyCount ? ` · ${needsReplyCount} need reply` : ''}${adminAll ? ' · showing all tickets' : ' · assigned to admin'}`
    : mode === 'seller-inbox'
      ? `${openCount} open from your members${needsReplyCount ? ` · ${needsReplyCount} need reply` : ''}`
      : 'Chat with support';

  const pills: { id: TicketStatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: scoped.length },
    { id: 'open', label: 'Open', count: openCount },
    { id: 'closed', label: 'Closed', count: closedCount },
  ];

  const emptyListCopy = !scoped.length
    ? (canCompose ? 'No tickets yet. Submit one to reach support.' : 'No tickets in this inbox yet.')
    : (query.trim() || (deskMode && statusFilter !== 'all'))
      ? 'No tickets match this search or filter.'
      : 'No tickets to show.';

  const locked = active ? isTicketReopenLocked(active) : false;
  const staffClosed = deskMode && active && locked;
  // Customers cannot reply on closed/resolved tickets (no reopen). Staff must reopen first.
  const canReply = active && isTicketOpen(active.status) && !locked;
  const mobile = isMobileApp();
  const chatOpen = mobile && (!!activeId || composing);

  const closeChat = () => {
    setActiveId(null);
    setComposing(false);
    setReply('');
  };

  const listPane = (
        <div className={`${card} overflow-hidden flex flex-col ${mobile ? 'min-h-[calc(100vh-200px)] h-[calc(100vh-200px)]' : ''}`}>
          <div className="p-3 border-b border-[#2a1e1c] space-y-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tickets</span>
              <div className="flex items-center gap-2">
                {deskMode && openCount > 0 && (
                  <span className="text-[10px] font-black text-red-400 bg-red-600/15 px-1.5 py-0.5 rounded-md">{openCount} open</span>
                )}
                {mobile && canCompose && (
                  <button type="button" onClick={() => { setComposing(true); setActiveId(null); }} className={btnRed}>
                    <Plus className="w-3.5 h-3.5" /> New
                  </button>
                )}
              </div>
            </div>
            {deskMode && (
              <>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    className={`${inputCls} pl-8`}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search name, ID, subject, message…"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {pills.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setStatusFilter(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        statusFilter === p.id
                          ? 'bg-red-600 text-white'
                          : 'bg-[#1a1210] text-slate-400 hover:text-white border border-[#2a1e1c]'
                      }`}
                    >
                      {p.label} {p.count}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#1a1210]">
            {tickets.map(t => {
              const person = personFor(t, people);
              const code = person?.customer_code;
              const waiting = ticketNeedsReply(t);
              return (
              <button key={t.id} type="button" onClick={() => { setActiveId(t.id); setComposing(false); }}
                className={`w-full p-4 text-left transition cursor-pointer ${activeId === t.id ? 'bg-red-600/10' : 'hover:bg-[#1a1210]'} ${waiting ? 'border-l-2 border-l-red-500' : ''}`}>
                <div className="flex items-start gap-2 mb-1">
                  {mode !== 'mine' && <AvatarCircle name={person?.name || t.customer_name} src={person?.avatar} size="sm" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">{t.subject}</span>
                      <span className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${statusBadgeClass(t.status)}`}>
                        {ticketStatusLabel(t.status)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {mode === 'mine' ? lastTicketPreview(t) : (person?.name || t.customer_name)}
                      {t.source === 'chatbot' && mode !== 'mine' ? ' · Chatbot' : ''}
                    </div>
                    {mode !== 'mine' && (
                      <div className="text-[10px] text-slate-500 truncate">{lastTicketPreview(t)}</div>
                    )}
                    {mode !== 'mine' && code && <div className="text-[10px] font-bold text-red-400">ID: {code}</div>}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[10px] text-slate-600">{formatTicketTime(t.created_at)}</span>
                      {waiting && <span className="text-[9px] font-black uppercase text-red-400">Needs reply</span>}
                    </div>
                  </div>
                </div>
              </button>
              );
            })}
            {!tickets.length && (
              <div className="p-8 text-center space-y-3">
                <Inbox className="w-8 h-8 text-slate-700 mx-auto" />
                <p className="text-sm font-bold text-slate-400">{emptyListCopy}</p>
                {deskMode && (query.trim() || statusFilter !== 'all') && scoped.length > 0 && (
                  <button type="button" onClick={() => { setQuery(''); setStatusFilter('all'); }} className={btnGhost}>
                    Clear search & filters
                  </button>
                )}
                {canCompose && !scoped.length && (
                  <button type="button" onClick={() => setComposing(true)} className={btnRed}>
                    <Plus className="w-3.5 h-3.5" /> Submit New Ticket
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
  );

  const threadPane = (
        <div className={`${mobile ? 'fixed inset-0 z-[70] flex flex-col bg-[#0d0908]' : `lg:col-span-2 ${card} flex flex-col overflow-hidden`}`}>
          {composing && canCompose ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[#2a1e1c] flex items-center gap-3"
                style={mobile ? { paddingTop: 'max(env(safe-area-inset-top), 12px)' } : undefined}>
                {mobile && (
                  <button type="button" onClick={closeChat} className="p-2 rounded-xl bg-[#1a1210] border border-[#2a1e1c] text-slate-300 cursor-pointer">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <h3 className="text-sm font-bold text-white">Submit New Ticket</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {account.role === 'user' && account.ownerId
                      ? 'This goes to your reseller.'
                      : 'This goes to Admin Support.'}
                  </p>
                </div>
              </div>
              <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Subject</label>
                <input className={inputCls} value={subject} onChange={e => setSubject(e.target.value)} placeholder="What do you need help with?" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Message</label>
                <textarea className={`${inputCls} min-h-[140px] resize-none`} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe the issue…" />
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={saving || !subject.trim() || !message.trim()} onClick={() => void submitNew()} className={btnRed}>
                  <Send className="w-3.5 h-3.5" /> Submit
                </button>
                <button type="button" onClick={closeChat} className={btnGhost}>Cancel</button>
              </div>
              </div>
            </div>
          ) : active ? (
            <>
              <div className="p-3 sm:p-4 border-b border-[#2a1e1c] flex flex-wrap items-center justify-between gap-2 bg-[#130d0d]"
                style={mobile ? { paddingTop: 'max(env(safe-area-inset-top), 12px)' } : undefined}>
                <div className="flex items-center gap-3 min-w-0">
                  {mobile && (
                    <button type="button" onClick={closeChat} className="p-2 rounded-xl bg-[#1a1210] border border-[#2a1e1c] text-slate-300 cursor-pointer shrink-0">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <AvatarCircle
                    name={personFor(active, people)?.name || active.customer_name}
                    src={personFor(active, people)?.avatar}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{active.subject}</div>
                      <span className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${statusBadgeClass(active.status)}`}>
                        {ticketStatusLabel(active.status)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {personFor(active, people)?.name || active.customer_name}
                      {customerCode(active, people) ? ` · ID: ${customerCode(active, people)}` : ''}
                    </div>
                    {!mobile && (
                    <div className="text-[10px] text-slate-500 truncate">
                      {active.customer_email}
                      {active.customer_phone ? ` · ${active.customer_phone}` : ''}
                      {active.source === 'chatbot' ? ' · Chatbot' : ''}
                      {active.assignee_role === 'reseller' ? ' · Reseller inbox' : ' · Admin'}
                      {active.id ? ` · ${active.id}` : ''}
                    </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {deskMode && (() => {
                    const phone = personFor(active, people)?.phone || active.customer_phone;
                    const href = phone ? waLink(phone, `Hi ${active.customer_name}, regarding ticket: ${active.subject}`) : '';
                    return href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition">
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    ) : (
                      <span className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1a1210] border border-[#2a1e1c] text-slate-600 text-xs font-bold rounded-xl opacity-50 cursor-not-allowed" title="No phone on this profile">
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </span>
                    );
                  })()}
                  {deskMode && isTicketOpen(active.status) && (
                    <>
                      <button type="button" onClick={() => void setStatus('resolved')} className={btnGhost}>
                        <Check className="w-3 h-3" /> Resolve
                      </button>
                      <button type="button" onClick={() => void setStatus('closed')} className={btnGhost}>
                        <X className="w-3 h-3" /> Close
                      </button>
                    </>
                  )}
                  {deskMode && locked && (
                    <button type="button" onClick={() => void setStatus('open')} className={btnRed} title="Staff only — customers must open a new ticket">
                      <RotateCcw className="w-3 h-3" /> Reopen (staff)
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0808]">
                <Bubble
                  mine={ownBubble('customer', mode)}
                  name={senderLabel('customer', active, people)}
                  code={customerCode(active, people)}
                  avatar={personFor(active, people)?.avatar}
                  at={active.created_at}
                  text={active.message}
                />
                {active.replies.map((rep, i) => {
                  const isCustomer = rep.from === 'customer';
                  const staff = rep.from === 'reseller' ? people[active.owner_id || ''] : undefined;
                  const avatar = isCustomer
                    ? personFor(active, people)?.avatar
                    : (staff?.avatar || (rep.from === 'admin' ? undefined : account.avatar));
                  return (
                    <Bubble
                      key={`${rep.at}-${i}`}
                      mine={ownBubble(rep.from, mode)}
                      name={senderLabel(rep.from, active, people, rep.name)}
                      code={isCustomer ? customerCode(active, people) : ''}
                      avatar={avatar}
                      at={rep.at}
                      text={rep.text}
                    />
                  );
                })}
                <div ref={bottomRef} />
              </div>
              {mode === 'mine' && locked ? (
                <div className="p-4 border-t border-[#2a1e1c] space-y-2 bg-[#130d0d]"
                  style={mobile ? { paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' } : undefined}>
                  <p className="text-xs text-slate-400">
                    This ticket is {ticketStatusLabel(active.status).toLowerCase()} and cannot be reopened.
                    Submit a <span className="text-white font-bold">new ticket</span> if you still need help.
                  </p>
                  <button type="button" onClick={() => { setComposing(true); setActiveId(null); }} className={btnRed}>
                    <Plus className="w-3.5 h-3.5" /> Submit New Ticket
                  </button>
                </div>
              ) : staffClosed ? (
                <div className="p-4 border-t border-[#2a1e1c] text-xs text-slate-500 bg-[#130d0d]">
                  This ticket is {ticketStatusLabel(active.status).toLowerCase()}. Customers cannot reopen it — they must start a new ticket. Use Reopen (staff) only if you need to continue this thread.
                </div>
              ) : canReply ? (
                <div className="p-3 border-t border-[#2a1e1c] space-y-2 bg-[#130d0d]"
                  style={mobile ? { paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' } : undefined}>
                  <div className="flex gap-2 items-end">
                    <input
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="Type a message…"
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendReply(); } }}
                      className={`${inputCls} py-3`}
                    />
                    <button type="button" disabled={saving || !reply.trim()} onClick={() => void sendReply()}
                      className="shrink-0 w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white flex items-center justify-center cursor-pointer">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t border-[#2a1e1c] text-xs text-slate-500 bg-[#130d0d]">This ticket is closed.</div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Inbox className="w-10 h-10 text-slate-700" />
              <p className="text-sm font-bold text-slate-400">{tickets.length ? 'Select a ticket' : emptyListCopy}</p>
              <p className="text-xs text-slate-600">{tickets.length ? 'Choose a conversation from the list to reply.' : 'Support tickets stay in this inbox — not in Notifications.'}</p>
              {canCompose && (
                <button type="button" onClick={() => setComposing(true)} className={btnRed}>
                  <Plus className="w-3.5 h-3.5" /> Submit New Ticket
                </button>
              )}
            </div>
          )}
        </div>
  );

  return (
    <div className="space-y-4">
      {!mobile && (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">{title}</h2>
          <p className="text-xs text-slate-500">{sub}</p>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'admin' && (
            <button type="button" onClick={() => setAdminAll(v => !v)} className={btnGhost}>
              {adminAll ? 'Assigned to me' : 'See all tickets'}
            </button>
          )}
          {canCompose && (
            <button type="button" onClick={() => { setComposing(true); setActiveId(null); }} className={btnRed}>
              <Plus className="w-3.5 h-3.5" /> Submit New Ticket
            </button>
          )}
        </div>
      </div>
      )}

      {error && (
        <div className="text-xs text-red-400 bg-red-600/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</div>
      )}

      {mobile ? (
        <>
          {!chatOpen && listPane}
          {chatOpen && threadPane}
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[560px] h-[calc(100vh-240px)]">
          {listPane}
          {threadPane}
        </div>
      )}
    </div>
  );
};

const Bubble: React.FC<{ mine: boolean; name: string; at: string; text: string; avatar?: string; code?: string }> = ({ mine, name, at, text, avatar, code }) => (
  <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
    {!mine && <AvatarCircle name={name} src={avatar} size="sm" />}
    <div
      className={`max-w-[80%] p-3 rounded-2xl ${
        mine
          ? 'bg-red-600 text-white rounded-tr-sm'
          : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-tl-sm'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className={`text-[10px] font-bold ${mine ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
          {name}
          {code ? <span className={`ml-1.5 ${mine ? 'text-white' : 'text-red-500'}`}>ID: {code}</span> : null}
        </span>
        <span className={`text-[9px] ${mine ? 'text-white/60' : 'text-[var(--text-faint)]'}`}>{formatTicketTime(at)}</span>
      </div>
      <div className="text-xs whitespace-pre-wrap leading-relaxed">{text}</div>
    </div>
    {mine && <AvatarCircle name={name} src={avatar} size="sm" />}
  </div>
);
