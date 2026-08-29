import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, ChevronRight } from 'lucide-react';
import {
  appendTicketReply,
  createChatbotTicket,
  findOpenChatbotTicket,
  formatTicketDbError,
  getTicket,
  isTicketOpen,
  isTicketReopenLocked,
  subscribeTickets,
  type SupportTicket,
  type TicketReply,
} from '../lib/tickets';
import { readPortalSession } from '../lib/sessionStore';
import { supabase } from '../lib/db';
import { SUPPORT_CHAT_EVENT } from '../lib/supportChat';
import { isMobileApp } from '../lib/mobile/toolLauncher';
import { BrandLogo } from './BrandLogo';

type GuestIdentity = { name: string; phone: string };
type ChatRole = 'bot' | 'user' | 'staff';
type ChatMsg = { id: string; role: ChatRole; text: string; replyKey?: string };

type Phase =
  | 'identity'
  | 'menu'
  | 'support-subject'
  | 'support-message'
  | 'support-confirm'
  | 'done'
  | 'ticket-thread';

const GUEST_KEY = 'atm_chatbot_guest';
const TICKET_KEY = 'atm_chatbot_ticket_id';

const PLANS_COPY = `Here are our current group-buy plans (PKR / month):

• Basic — Rs 1,390 · 42+ tools (Canva, Envato, Grammarly, streaming & more)
• Standard — Rs 1,946 · 60+ tools (adds Semrush, Jasper, LinkedIn Learning…)
• Premium — Rs 2,780 · 80+ tools + 24/7 VIP support (Most Popular)
• Custom — Rs 1,112 · pick any 5 tools

Reseller panels start at Lite Rs 5,560 / mo. Visit /plans for full details, or tap Contact support if you want help choosing.`;

const INFO_COPY = `ZynexTools gives you shared access to 80+ premium SEO, AI, design & learning tools — Semrush, Ahrefs, Canva Pro, ChatGPT Plus, Envato and more — in one affordable plan.

• Activation usually within ~5 minutes after payment confirmation
• Use from your member dashboard (/dashboard after login)
• Support via this chat or WhatsApp

Need billing help or a tool that isn’t working? Choose Contact support and we’ll open a ticket for our team.`;

const SUGGESTIONS: { id: string; label: string }[] = [
  { id: 'pricing', label: 'Pricing' },
  { id: 'plans', label: 'Plans & info' },
  { id: 'support', label: 'Contact support' },
];

const CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'pricing', label: 'Pricing / plans' },
  { id: 'billing', label: 'Billing' },
  { id: 'technical', label: 'Technical' },
  { id: 'access', label: 'Access / login' },
];

function loadGuest(): GuestIdentity | null {
  try {
    const raw = sessionStorage.getItem(GUEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.name && parsed?.phone) return { name: String(parsed.name), phone: String(parsed.phone) };
  } catch { /* ignore */ }
  return null;
}

function saveGuest(g: GuestIdentity) {
  sessionStorage.setItem(GUEST_KEY, JSON.stringify(g));
}

function loadTicketId(): string | null {
  try {
    return sessionStorage.getItem(TICKET_KEY) || null;
  } catch {
    return null;
  }
}

function saveTicketId(id: string) {
  sessionStorage.setItem(TICKET_KEY, id);
}

function clearTicketId() {
  try {
    sessionStorage.removeItem(TICKET_KEY);
  } catch { /* ignore */ }
}

function msg(role: ChatRole, text: string, replyKey?: string): ChatMsg {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    text,
    ...(replyKey ? { replyKey } : {}),
  };
}

function replyKeyOf(r: TicketReply, index: number) {
  return `${r.from}|${r.at}|${index}|${(r.text || '').slice(0, 40)}`;
}

function isStaffFrom(from: string) {
  const f = (from || '').toLowerCase();
  return f === 'admin' || f === 'reseller' || f === 'staff' || f === 'support';
}

export const ChatBotWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [identity, setIdentity] = useState<GuestIdentity | null>(() => loadGuest());
  const [nameInput, setNameInput] = useState(identity?.name || '');
  const [phoneInput, setPhoneInput] = useState(identity?.phone || '');
  const [phase, setPhase] = useState<Phase>(identity ? 'menu' : 'identity');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [subject, setSubject] = useState('');
  const [supportBody, setSupportBody] = useState('');
  const [category, setCategory] = useState('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [account, setAccount] = useState<{
    id: string; name: string; email: string; role: string; ownerId?: string | null;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenStaffKeys = useRef<Set<string>>(new Set());
  const ticketIdRef = useRef<string | null>(loadTicketId());
  const phaseRef = useRef(phase);
  const openRef = useRef(open);
  const staffSyncPrimed = useRef(false);
  phaseRef.current = phase;
  openRef.current = open;

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(SUPPORT_CHAT_EVENT, handler);
    return () => window.removeEventListener(SUPPORT_CHAT_EVENT, handler);
  }, []);

  // Logged-in members: skip guest identity form and open straight into the assistant.
  useEffect(() => {
    if (!open || !account) return;
    if (identity) return;
    const name = String(account.name || nameInput || '').trim();
    const phone = String(phoneInput || '').trim();
    if (!name) return;
    const guest = { name, phone: phone || '—' };
    saveGuest(guest);
    setIdentity(guest);
    setPhase('menu');
    setMessages([
      msg('bot', `Hi ${guest.name}! How can we help today? Pick a suggestion or ask about pricing, plans, or support.`),
    ]);
  }, [open, account, identity, nameInput, phoneInput]);

  useEffect(() => {
    const session = readPortalSession();
    if (!session || session.role === 'admin') return;
    void (async () => {
      const { data } = await supabase
        .from('customers')
        .select('id,name,email,phone,role,owner_id')
        .eq('id', session.id)
        .maybeSingle();
      if (!data) {
        setAccount({
          id: session.id,
          name: session.name,
          email: session.email,
          role: session.role,
        });
        if (!identity) {
          setNameInput(session.name);
        }
        return;
      }
      setAccount({
        id: String(data.id),
        name: data.name || session.name,
        email: data.email || session.email,
        role: data.role || session.role,
        ownerId: data.owner_id || null,
      });
      if (!identity) {
        setNameInput(data.name || session.name);
        if (data.phone) setPhoneInput(String(data.phone));
      }
    })();
  }, [identity]);

  useEffect(() => {
    if (!open) return;
    if (phase === 'menu' && messages.length === 0 && identity) {
      setMessages([
        msg('bot', `Hi ${identity.name}! How can we help today? Pick a suggestion or ask about pricing, plans, or support.`),
      ]);
    }
  }, [open, phase, identity, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, phase, open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const mergeStaffReplies = useCallback((ticket: SupportTicket, opts?: { announce?: boolean }) => {
    const staff = ticket.replies
      .map((r, i) => ({ r, key: replyKeyOf(r, i) }))
      .filter(({ r }) => isStaffFrom(r.from));

    const fresh = staff.filter(({ key }) => !seenStaffKeys.current.has(key));
    const allowAnnounce = Boolean(opts?.announce && staffSyncPrimed.current);

    if (fresh.length) {
      for (const { key } of fresh) seenStaffKeys.current.add(key);
      setMessages(prev => {
        const next = [...prev];
        for (const { r, key } of fresh) {
          if (next.some(m => m.replyKey === key)) continue;
          const who = r.name || (r.from === 'reseller' ? 'Support' : 'Support team');
          next.push(msg('staff', `${who}: ${r.text}`, key));
        }
        return next;
      });
    }

    staffSyncPrimed.current = true;

    if (allowAnnounce && fresh.length) {
      setToast(fresh.length === 1 ? 'New reply from support' : `${fresh.length} new replies from support`);
      if (!openRef.current) setOpen(true);
    }
  }, []);

  const syncTicket = useCallback(async (opts?: { announce?: boolean; seedThread?: boolean }) => {
    const id = ticketIdRef.current;
    let ticket: SupportTicket | null = null;
    try {
      if (id) {
        ticket = await getTicket(id);
      }
      if (!ticket && identity?.phone) {
        ticket = await findOpenChatbotTicket(identity.phone);
        if (ticket) {
          ticketIdRef.current = ticket.id;
          saveTicketId(ticket.id);
        }
      }
    } catch {
      return;
    }

    if (!ticket) {
      setActiveTicket(null);
      return;
    }

    setActiveTicket(ticket);
    const currentPhase = phaseRef.current;

    if (opts?.seedThread && (currentPhase === 'menu' || currentPhase === 'done' || currentPhase === 'ticket-thread')) {
      // Ensure original customer message context exists once when resuming.
      setMessages(prev => {
        if (prev.some(m => m.replyKey === `seed:${ticket!.id}`)) return prev;
        return [
          ...prev,
          msg('bot', `Continuing ticket ${ticket!.id}: ${ticket!.subject}`, `seed:${ticket!.id}`),
          msg('user', ticket!.message, `seed-msg:${ticket!.id}`),
        ];
      });
      setPhase('ticket-thread');
    } else if (isTicketOpen(ticket.status) && !isTicketReopenLocked(ticket)) {
      if (currentPhase === 'done' || currentPhase === 'menu') setPhase('ticket-thread');
    }

    mergeStaffReplies(ticket, { announce: opts?.announce });

    if (isTicketReopenLocked(ticket) || !isTicketOpen(ticket.status)) {
      setMessages(prev => {
        const key = `closed:${ticket!.id}:${ticket!.status}`;
        if (prev.some(m => m.replyKey === key)) return prev;
        return [
          ...prev,
          msg(
            'bot',
            `Ticket ${ticket!.id} is ${ticket!.status}. You can’t reply on this ticket — start a new one via Contact support.`,
            key,
          ),
        ];
      });
    }
  }, [identity?.phone, mergeStaffReplies]);

  // Restore active chatbot ticket when widget opens / guest known.
  useEffect(() => {
    if (!open || !identity) return;
    void syncTicket({ seedThread: Boolean(ticketIdRef.current), announce: false });
  }, [open, identity, syncTicket]);

  // Poll + realtime while guest session may have an open chatbot ticket.
  useEffect(() => {
    if (!identity) return;
    return subscribeTickets(() => {
      void syncTicket({ announce: true });
    });
  }, [identity, syncTicket]);

  const canStart = nameInput.trim().length >= 2 && phoneInput.trim().length >= 7;

  const startChat = () => {
    if (!canStart) return;
    const g = { name: nameInput.trim(), phone: phoneInput.trim() };
    saveGuest(g);
    setIdentity(g);
    setPhase('menu');
    setMessages([
      msg('bot', `Hi ${g.name}! How can we help today? Pick a suggestion or ask about pricing, plans, or support.`),
    ]);
    setError('');
  };

  const pushBot = (text: string) => setMessages(prev => [...prev, msg('bot', text)]);
  const pushUser = (text: string) => setMessages(prev => [...prev, msg('user', text)]);

  const onSuggestion = (id: string) => {
    const label = SUGGESTIONS.find(s => s.id === id)?.label || id;
    pushUser(label);
    if (id === 'pricing') {
      pushBot(PLANS_COPY);
      return;
    }
    if (id === 'plans') {
      pushBot(INFO_COPY);
      return;
    }
    if (activeTicket && isTicketOpen(activeTicket.status) && !isTicketReopenLocked(activeTicket)) {
      setPhase('ticket-thread');
      pushBot(`You already have open ticket ${activeTicket.id}. Type a message to continue that conversation, or ask about pricing/plans.`);
      return;
    }
    setPhase('support-subject');
    pushBot('Sure — let’s open a support ticket. What’s the subject of your request?');
  };

  const sendCustomerTicketReply = async (text: string) => {
    if (!activeTicket) return;
    if (isTicketReopenLocked(activeTicket) || !isTicketOpen(activeTicket.status)) {
      setError('This ticket is closed. Start a new one via Contact support.');
      clearTicketId();
      ticketIdRef.current = null;
      setActiveTicket(null);
      setPhase('menu');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await appendTicketReply(activeTicket, {
        from: 'customer',
        text,
        at: new Date().toISOString(),
        name: identity?.name || account?.name,
      });
      const refreshed = await getTicket(activeTicket.id);
      if (refreshed) setActiveTicket(refreshed);
    } catch (e: any) {
      setError(formatTicketDbError(e?.message || 'Could not send message'));
    } finally {
      setSaving(false);
    }
  };

  const onSendDraft = () => {
    const text = draft.trim();
    if (!text || saving) return;
    setDraft('');
    pushUser(text);

    if (phase === 'support-subject') {
      setSubject(text);
      setPhase('support-message');
      pushBot('Got it. Please describe the issue in a bit more detail (one message).');
      return;
    }
    if (phase === 'support-message') {
      setSupportBody(text);
      setPhase('support-confirm');
      pushBot('Almost done — pick a category below, then confirm to open your ticket with our support team.');
      return;
    }
    if (phase === 'ticket-thread' || (phase === 'done' && activeTicket && isTicketOpen(activeTicket.status))) {
      void sendCustomerTicketReply(text);
      return;
    }
    if (phase === 'menu' || phase === 'done') {
      const lower = text.toLowerCase();
      if (lower.includes('price') || lower.includes('pricing') || lower.includes('cost') || lower.includes('rs')) {
        pushBot(PLANS_COPY);
      } else if (lower.includes('plan') || lower.includes('tool') || lower.includes('info')) {
        pushBot(INFO_COPY);
      } else if (lower.includes('support') || lower.includes('help') || lower.includes('ticket') || lower.includes('human')) {
        if (activeTicket && isTicketOpen(activeTicket.status) && !isTicketReopenLocked(activeTicket)) {
          setPhase('ticket-thread');
          pushBot(`Continuing ticket ${activeTicket.id}. Type your message for the support team.`);
        } else {
          setPhase('support-subject');
          pushBot('I’ll help you reach support. What’s the subject of your request?');
        }
      } else if (activeTicket && isTicketOpen(activeTicket.status) && !isTicketReopenLocked(activeTicket)) {
        setPhase('ticket-thread');
        void sendCustomerTicketReply(text);
      } else {
        pushBot('I can help with Pricing, Plans & info, or Contact support. Tap a suggestion below, or type one of those.');
      }
    }
  };

  const confirmTicket = async () => {
    if (!identity || !subject.trim() || !supportBody.trim()) return;
    setSaving(true);
    setError('');
    try {
      const created = await createChatbotTicket({
        name: identity.name,
        phone: identity.phone,
        subject,
        message: supportBody,
        category,
        account,
      });
      ticketIdRef.current = created.id;
      saveTicketId(created.id);
      seenStaffKeys.current = new Set();
      staffSyncPrimed.current = true;
      setActiveTicket(created);
      pushBot(
        `Ticket ${created.id} is open. Our team will reply here in this chat` +
          (account ? ' and in your support inbox (Notifications Center too).' : '.') +
          ' Keep this window handy — staff replies appear here automatically.' +
          ' If this ticket is closed or resolved later, you’ll need to start a new one.',
      );
      setPhase('ticket-thread');
      setToast('Support ticket opened — we’ll get back to you soon.');
      setSubject('');
      setSupportBody('');
    } catch (e: any) {
      setError(formatTicketDbError(e?.message || 'Could not open ticket'));
    } finally {
      setSaving(false);
    }
  };

  const resetSupport = () => {
    setPhase(activeTicket && isTicketOpen(activeTicket.status) ? 'ticket-thread' : 'menu');
    setSubject('');
    setSupportBody('');
    setCategory('general');
    setError('');
    pushBot(
      activeTicket && isTicketOpen(activeTicket.status)
        ? `Back to ticket ${activeTicket.id}. Type a message for support, or choose Pricing / Plans.`
        : 'Anything else? Choose Pricing, Plans & info, or Contact support.',
    );
  };

  const bubbleClass = (role: ChatRole) => {
    if (role === 'user') return 'bg-red-600 text-white rounded-br-md';
    if (role === 'staff') return 'bg-emerald-600 text-white rounded-bl-md';
    return 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-bl-md';
  };

  const chatBottom = isMobileApp() ? 'bottom-24' : 'bottom-6';
  const panelBottom = isMobileApp() ? 'bottom-36' : 'bottom-24';
  const native = isMobileApp();

  return (
    <>
      {toast && (
        <div className={`fixed ${panelBottom} right-6 z-[90] max-w-xs bg-[#130d0d] border border-red-500/40 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl`}>
          {toast}
        </div>
      )}

      {open && (
        <div
          className={
            native
              ? 'fixed inset-0 z-[90] flex flex-col bg-[#0d0908]'
              : `fixed ${panelBottom} right-4 sm:right-6 z-[90] w-[min(100vw-2rem,380px)] h-[min(62vh,480px)] flex flex-col bg-[#130d0d] border border-[#2a1e1c] rounded-2xl shadow-2xl overflow-hidden`
          }
          style={native ? { paddingTop: 'max(env(safe-area-inset-top), 0px)', paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' } : undefined}
        >
          <div className="px-4 py-3 border-b border-red-800/40 bg-red-700 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <BrandLogo variant="app" height={32} className="w-auto object-contain shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-black truncate" style={{ color: '#ffffff' }}>ZynexTools</div>
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {activeTicket && isTicketOpen(activeTicket.status)
                    ? `Ticket ${activeTicket.id}`
                    : 'Live chat assistant'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-xl bg-red-800/50 border border-white/20 text-white hover:bg-red-800 flex items-center justify-center cursor-pointer"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {phase === 'identity' ? (
              <div className="space-y-3 p-1">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Welcome! Enter your name and phone number to start chatting with our assistant.
                </p>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Name</label>
                  <input
                    className="w-full bg-[#1a1210] border border-[#2a1e1c] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    placeholder="Your name"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone</label>
                  <input
                    className="w-full bg-[#1a1210] border border-[#2a1e1c] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50"
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value)}
                    placeholder="e.g. 03XX XXXXXXX"
                    inputMode="tel"
                  />
                </div>
                <button
                  type="button"
                  disabled={!canStart}
                  onClick={startChat}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-black cursor-pointer"
                >
                  Start chat
                </button>
              </div>
            ) : (
              <>
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[88%] px-3 py-2 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed ${bubbleClass(m.role)}`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}

                {(phase === 'menu' || phase === 'done') && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onSuggestion(s.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold bg-red-600/15 text-red-300 border border-red-500/30 hover:bg-red-600/25 cursor-pointer"
                      >
                        {s.label} <ChevronRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}

                {phase === 'ticket-thread' && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPhase('menu');
                        pushBot('Sure — Pricing, Plans & info, or continue your ticket anytime.');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold bg-red-600/15 text-red-300 border border-red-500/30 hover:bg-red-600/25 cursor-pointer"
                    >
                      Menu <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {phase === 'support-confirm' && (
                  <div className="space-y-2 p-2 rounded-xl bg-[#130d0d] border border-[#2a1e1c]">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Category</div>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCategory(c.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                            category === c.id
                              ? 'bg-red-600 text-white'
                              : 'bg-[#1a1210] text-slate-400 border border-[#2a1e1c]'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      <span className="text-slate-300 font-bold">{subject}</span>
                      {' — '}
                      confirm to notify our support team.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void confirmTicket()}
                        className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black disabled:opacity-50 cursor-pointer"
                      >
                        {saving ? 'Opening…' : 'Confirm & open ticket'}
                      </button>
                      <button
                        type="button"
                        onClick={resetSupport}
                        className="px-3 py-2 rounded-xl bg-[#1a1210] border border-[#2a1e1c] text-slate-400 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </>
            )}
          </div>

          {phase !== 'identity' && phase !== 'support-confirm' && (
            <div className="p-3 border-t border-[#2a1e1c] space-y-1.5">
              {error && <p className="text-[10px] text-red-400">{error}</p>}
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSendDraft();
                    }
                  }}
                  placeholder={
                    phase === 'support-subject'
                      ? 'Type a subject…'
                      : phase === 'support-message'
                        ? 'Describe your issue…'
                        : phase === 'ticket-thread'
                          ? 'Reply to support…'
                          : 'Type a message…'
                  }
                  className="flex-1 bg-[#1a1210] border border-[#2a1e1c] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50"
                />
                <button
                  type="button"
                  disabled={!draft.trim() || saving}
                  onClick={onSendDraft}
                  className="w-10 h-10 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white flex items-center justify-center cursor-pointer"
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!native && (
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={`fixed ${chatBottom} right-6 z-50 w-14 h-14 bg-red-700 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-red-950/50 transition-transform hover:scale-110 cursor-pointer`}
          title={open ? 'Close chat' : 'Chat with us'}
          aria-label={open ? 'Close chat' : 'Open chat'}
        >
          {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
        </button>
      )}
    </>
  );
};
