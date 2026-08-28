import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, RefreshCw, ClipboardList, Wrench, Ban, Trash2, MessageCircle, Edit, MoreHorizontal, FileText, MonitorSmartphone } from 'lucide-react';
import { RTable, Th, Td, Tr, Pill, RSearch, RModal, GhostBtn, RedBtn, inpCls, lblCls } from '../components/ResellerUI';
import {
  MEMBER_PLAN_OPTIONS, daysLeft, fmtDate,
  shortId, today, waLink, type ResellerPayment,
  extendPlanExpiry, planExpiryDate,
} from '../../lib/accountStore';
import { supabase } from '../../lib/db';
import { useCatalogTools } from '../../lib/toolCookies';
import { createAccount, deleteAccount, updateAccount } from '../../lib/accountApi';
import { AccountProfileForm } from '../../components/AccountProfileForm';
import { DevicesManager } from '../../components/DevicesManager';
import { CustomPlanFields, CUSTOM_PLAN_KEY, applyCatalogPlan } from '../../components/CustomPlanFields';
import { InvoiceModal } from '../../components/InvoiceModal';
import { invoiceFromResellerMember } from '../../lib/sales';
import type { ResellerMember } from '../types';

interface Props {
  ownerId: string;
  ownerName: string;
  /** Seller's own max_devices — ceiling for member limits. */
  ownerMaxDevices?: number;
  members: ResellerMember[];
  payments?: ResellerPayment[];
  onReload: () => void;
}

const MemberActionsMenu: React.FC<{
  member: ResellerMember;
  onEdit: () => void;
  onRenew: () => void;
  onPlan: () => void;
  onTools: () => void;
  onDevices: () => void;
  onInvoice: () => void;
  whatsappHref?: string;
  onSuspend: () => void;
  onDelete: () => void;
}> = ({ member, onEdit, onRenew, onPlan, onTools, onDevices, onInvoice, whatsappHref, onSuspend, onDelete }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const extra = (whatsappHref ? 1 : 0) + 2;
  const menuH = 232 + extra * 36;

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const menuW = 176;
      const left = Math.min(Math.max(8, r.right - menuW), window.innerWidth - menuW - 8);
      const openUp = r.bottom + 8 + menuH > window.innerHeight - 8;
      const top = openUp ? r.top - 8 - menuH : r.bottom + 4;
      setPos({ top, left });
    };
    place();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, menuH]);

  const pick = (fn: () => void) => () => { setOpen(false); fn(); };
  const itemCls = 'w-full px-3 py-2 text-left text-[11px] font-bold flex items-center gap-2 cursor-pointer transition rounded-lg';

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const menuW = 176;
      const left = Math.min(Math.max(8, r.right - menuW), window.innerWidth - menuW - 8);
      const openUp = r.bottom + 8 + menuH > window.innerHeight - 8;
      setPos({ top: openUp ? r.top - 8 - menuH : r.bottom + 4, left });
    }
    setOpen(true);
  };

  return (
    <div className="relative inline-flex">
      <button ref={btnRef} type="button" aria-haspopup="menu" aria-expanded={open}
        onClick={toggle}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
          open
            ? 'bg-red-600 text-white border-red-500'
            : 'bg-[#1a1210] border-[#3a2a26] text-slate-300 hover:text-white hover:border-red-500/40'
        }`}>
        <MoreHorizontal className="w-3.5 h-3.5"/> Actions
      </button>
      {open && createPortal(
        <div ref={menuRef} role="menu"
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[80] w-44 p-1 bg-[#130d0d] border border-[#3a2a26] rounded-xl shadow-2xl">
          <button type="button" role="menuitem" onClick={pick(onEdit)}
            className={`${itemCls} text-emerald-400 hover:bg-emerald-500/10`}>
            <Edit className="w-3 h-3"/> Edit
          </button>
          <button type="button" role="menuitem" onClick={pick(onRenew)}
            className={`${itemCls} text-blue-400 hover:bg-blue-500/10`}>
            <RefreshCw className="w-3 h-3"/> Renew
          </button>
          <button type="button" role="menuitem" onClick={pick(onPlan)}
            className={`${itemCls} text-red-300 hover:bg-red-500/10`}>
            <ClipboardList className="w-3 h-3"/> Plan
          </button>
          <button type="button" role="menuitem" onClick={pick(onTools)}
            className={`${itemCls} text-red-400 hover:bg-red-500/10`}>
            <Wrench className="w-3 h-3"/> Tools
          </button>
          <button type="button" role="menuitem" onClick={pick(onDevices)}
            className={`${itemCls} text-sky-300 hover:bg-sky-500/10`}>
            <MonitorSmartphone className="w-3 h-3"/> Devices
          </button>
          <button type="button" role="menuitem" onClick={pick(onInvoice)}
            className={`${itemCls} text-amber-300 hover:bg-amber-500/10`}>
            <FileText className="w-3 h-3"/> Invoice
          </button>
          {whatsappHref && (
            <a role="menuitem" href={whatsappHref} target="_blank" rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={`${itemCls} text-emerald-400 hover:bg-emerald-500/10`}>
              <MessageCircle className="w-3 h-3"/> WhatsApp
            </a>
          )}
          <div className="my-1 border-t border-[#2a1e1c]"/>
          <button type="button" role="menuitem" onClick={pick(onSuspend)}
            className={`${itemCls} text-purple-300 hover:bg-purple-500/10`}>
            <Ban className="w-3 h-3"/> {member.status === 'blocked' ? 'Activate' : 'Suspend'}
          </button>
          <button type="button" role="menuitem" onClick={pick(onDelete)}
            className={`${itemCls} text-purple-300 hover:bg-purple-500/10`}>
            <Trash2 className="w-3 h-3"/> Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

/* ── Add member ── */
const AddMemberModal: React.FC<{ ownerId: string; ownerName: string; onClose: () => void; onSaved: () => void }> = ({ ownerId, ownerName, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', plan: '' });
  const [customName, setCustomName] = useState('');
  const [fee, setFee] = useState(0);
  const [days, setDays] = useState(30);
  const [tools, setTools] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const allTools = useCatalogTools();

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setError(''); };
  const pickPlan = (value: string) => {
    set('plan', value);
    const catalog = applyCatalogPlan(value, MEMBER_PLAN_OPTIONS);
    if (catalog) { setFee(catalog.fee); setDays(catalog.days); setCustomName(''); }
  };
  const toggleTool = (n: string) => setTools(t => t.includes(n) ? t.filter(x => x !== n) : [...t, n]);

  const save = async () => {
    if (!form.name.trim())                  return setError('Full Name is required');
    if (!form.email.trim())                 return setError('Email Address is required');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address');
    if (form.password.length < 8)           return setError('Password must be at least 8 characters');
    if (!form.plan)                         return setError('Please select a plan');
    const planName = form.plan === CUSTOM_PLAN_KEY ? customName.trim() : form.plan;
    if (!planName)                          return setError('Enter a custom package name');
    if (days < 1)                           return setError('Duration must be at least 1 day');

    setSaving(true);
    const join = today();
    try {
      await createAccount({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        password: form.password,
        role: 'user',
        plan: planName,
        fee,
        planDays: days,
        expiry: planExpiryDate(join, days),
        tools,
      });
    } catch (error: any) {
      setSaving(false);
      return setError(error.message);
    }
    setSaving(false); onSaved(); onClose();
  };

  return (
    <RModal title="Add New Member" sub="Create an account and assign a plan" onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Cancel</GhostBtn><RedBtn onClick={save} disabled={saving}>{saving ? 'Creating…' : 'Create Member'}</RedBtn></>}>
      <div className="space-y-4">
        {error && <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-3 py-2 text-xs text-red-300">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lblCls}>Full Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={inpCls} placeholder="e.g. Ali Hassan" />
          </div>
          <div>
            <label className={lblCls}>Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inpCls} placeholder="+92…" />
          </div>
        </div>

        <div>
          <label className={lblCls}>Email Address *</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inpCls} placeholder="user@example.com" />
        </div>

        <div>
          <label className={lblCls}>Password * (min 8 chars)</label>
          <input type="password" value={form.password} onChange={e => set('password', e.target.value)} className={inpCls} placeholder="••••••••" />
        </div>

        <CustomPlanFields
          options={MEMBER_PLAN_OPTIONS}
          plan={form.plan}
          customName={customName}
          fee={fee}
          days={days}
          required
          allowEmpty
          onPlan={pickPlan}
          onCustomName={setCustomName}
          onFee={setFee}
          onDays={setDays}
        />

        <div>
          <label className={lblCls}>Assign Tools</label>
          <div className="bg-[#0d0908] border border-[#2a1e1c] rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
            {allTools.length === 0 && <p className="text-xs text-slate-600">No tools available</p>}
            {allTools.map(t => (
              <label key={t.id} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white cursor-pointer">
                <input type="checkbox" checked={tools.includes(t.name)} onChange={() => toggleTool(t.name)}
                  className="w-4 h-4 rounded border-[#3a2a26] bg-[#1a1210] accent-red-600 cursor-pointer" />
                {t.name}
              </label>
            ))}
          </div>
        </div>
      </div>
    </RModal>
  );
};

/* ── Renew ── */
const RenewModal: React.FC<{ ownerId: string; member: ResellerMember; onClose: () => void; onSaved: () => void }> = ({ ownerId, member, onClose, onSaved }) => {
  const [days, setDays] = useState(member.meta.days || 30);
  const [fee, setFee] = useState(member.meta.fee || 0);
  const base = daysLeft(member.meta.expiry) >= 0 ? member.meta.expiry : today();

  const save = async () => {
    await supabase.from('customers').update({
      expiry: extendPlanExpiry(base, days),
      plan_days: days || member.meta.days,
      fee: fee || member.meta.fee,
      plan: member.meta.plan || 'Monthly Plan',
    }).eq('id', member.id);
    await supabase.from('reseller_payments').insert({
      owner_id: ownerId,
      member_id: member.id,
      member_name: member.name,
      amount: fee,
      method: 'Renewal',
      status: 'paid',
      payment_date: today(),
    });
    onSaved(); onClose();
  };

  return (
    <RModal title={`Renew — ${member.name}`} sub="Extend the subscription and log a payment" onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Cancel</GhostBtn><RedBtn onClick={save}>Renew</RedBtn></>}>
      <div className="space-y-3">
        <p className="text-xs text-slate-400">Current expiry: <span className="text-white font-semibold">{member.meta.expiry ? fmtDate(member.meta.expiry) : 'No expiry'}</span></p>
        <div><label className={lblCls}>Extend by (days)</label><input type="number" min={1} value={days} onChange={e => setDays(Number(e.target.value) || 0)} className={inpCls} /></div>
        <div><label className={lblCls}>Selling price (PKR)</label><input type="number" min={0} value={fee} onChange={e => setFee(Number(e.target.value) || 0)} className={inpCls} /></div>
        <p className="text-[11px] text-emerald-400">New expiry will be: {fmtDate(extendPlanExpiry(base, days))}</p>
      </div>
    </RModal>
  );
};

/* ── Plan ── */
const PlanModal: React.FC<{ ownerId: string; member: ResellerMember; onClose: () => void; onSaved: () => void }> = ({ ownerId, member, onClose, onSaved }) => {
  const known = MEMBER_PLAN_OPTIONS.some(p => p.name === member.meta.plan);
  const [plan, setPlan] = useState(member.meta.plan ? (known ? member.meta.plan : CUSTOM_PLAN_KEY) : '');
  const [customName, setCustomName] = useState(known ? '' : (member.meta.plan || ''));
  const [fee, setFee] = useState(member.meta.fee || 0);
  const [days, setDays] = useState(member.meta.days || 30);
  const pickPlan = (value: string) => {
    setPlan(value);
    const catalog = applyCatalogPlan(value, MEMBER_PLAN_OPTIONS);
    if (catalog) { setFee(catalog.fee); setDays(catalog.days); setCustomName(''); }
  };

  const save = async () => {
    if (!plan) {
      await supabase.from('customers').update({ plan: '', fee: 0, plan_days: 0, expiry: null }).eq('id', member.id);
      onSaved(); onClose(); return;
    }
    const planName = plan === CUSTOM_PLAN_KEY ? customName.trim() : plan;
    if (!planName) return;
    await supabase.from('customers').update({
      plan: planName, fee, plan_days: days,
      expiry: planExpiryDate(today(), days),
    }).eq('id', member.id);
    if (fee > 0) {
      await supabase.from('reseller_payments').insert({
        owner_id: ownerId,
        member_id: member.id,
        member_name: member.name,
        amount: fee,
        method: 'Plan sale',
        status: 'paid',
        payment_date: today(),
      });
    }
    onSaved(); onClose();
  };

  return (
    <RModal title={`Assign Plan — ${member.name}`} onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Cancel</GhostBtn><RedBtn onClick={save}>Save Plan</RedBtn></>}>
      <CustomPlanFields
        options={MEMBER_PLAN_OPTIONS}
        plan={plan}
        customName={customName}
        fee={fee}
        days={days}
        allowEmpty
        onPlan={pickPlan}
        onCustomName={setCustomName}
        onFee={setFee}
        onDays={setDays}
      />
    </RModal>
  );
};

/* ── Tools ── */
const ToolsModal: React.FC<{ member: ResellerMember; onClose: () => void; onSaved: () => void }> = ({ member, onClose, onSaved }) => {
  const allTools = useCatalogTools();
  const [selected, setSelected] = useState<string[]>(Array.isArray(member.tools) ? member.tools : []);
  const [saving, setSaving] = useState(false);
  const toggle = (n: string) => setSelected(s => s.includes(n) ? s.filter(x => x !== n) : [...s, n]);

  const save = async () => {
    setSaving(true);
    await supabase.from('customers').update({ tools: selected }).eq('id', member.id);
    setSaving(false); onSaved(); onClose();
  };

  return (
    <RModal title={`Tools Access — ${member.name}`} sub={`${selected.length} tool(s) selected`} onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Cancel</GhostBtn><RedBtn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Tools'}</RedBtn></>}>
      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
        {allTools.map(t => (
          <button key={t.id} type="button" onClick={() => toggle(t.name)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
              selected.includes(t.name) ? 'bg-red-600/20 border-red-500/40 text-red-300' : 'bg-[#0d0908] border-[#2a1e1c] text-slate-400 hover:text-white'
            }`}>
            {t.favicon && <img src={t.favicon} alt="" className="w-4 h-4 rounded" onError={e => { (e.target as any).style.display = 'none'; }} />}
            {t.name}
          </button>
        ))}
      </div>
    </RModal>
  );
};

export const MyMembersPage: React.FC<Props> = ({ ownerId, ownerName, ownerMaxDevices = 1, members, payments = [], onReload }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [renewTarget, setRenewTarget] = useState<ResellerMember | null>(null);
  const [planTarget, setPlanTarget] = useState<ResellerMember | null>(null);
  const [toolsTarget, setToolsTarget] = useState<ResellerMember | null>(null);
  const [devicesTarget, setDevicesTarget] = useState<ResellerMember | null>(null);
  const [editTarget, setEditTarget] = useState<ResellerMember | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<ReturnType<typeof invoiceFromResellerMember> | null>(null);
  const perPage = 10;

  const filtered = members.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.name?.toLowerCase().includes(q)
      || m.email?.toLowerCase().includes(q)
      || m.phone?.includes(search)
      || m.customer_code?.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * perPage, pageSafe * perPage);

  const suspend = async (m: ResellerMember) => {
    const next = m.status === 'active' ? 'blocked' : 'active';
    if (!confirm(next === 'blocked' ? `Suspend ${m.name}?` : `Activate ${m.name}?`)) return;
    await supabase.from('customers').update({ status: next }).eq('id', m.id);
    onReload();
  };

  const del = async (m: ResellerMember) => {
    if (!confirm(`Delete member "${m.name}"? This cannot be undone.`)) return;
    await deleteAccount(m.id);
    onReload();
  };

  const openInvoice = (m: ResellerMember) => {
    const paid = payments.filter(p => p.memberId === m.id && p.status === 'paid');
    const latest = [...paid].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    setInvoiceTarget(invoiceFromResellerMember({ member: m, payment: latest, issuer: ownerName }));
  };

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="bg-gradient-to-r from-red-900/60 to-red-950/40 border border-red-500/30 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-black text-white">My Member Accounts</h3>
          <p className="text-xs text-red-200/70 mt-0.5">{members.length} accounts · Full payment &amp; expiry tracking</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <RSearch value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search name, email or Customer ID…" />
          <button onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-red-50 text-red-600 text-xs font-black rounded-xl transition cursor-pointer whitespace-nowrap shadow">
            <Plus className="w-3.5 h-3.5" /> Add Member
          </button>
        </div>
      </div>

      {/* Table */}
      <RTable>
        <thead>
          <tr>
            <Th>Member</Th><Th>Contact</Th><Th>Plan &amp; Fee (PKR)</Th>
            <Th>Joined</Th><Th>Expiry</Th><Th>Status</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {paged.map(m => {
            const left = daysLeft(m.meta.expiry);
            return (
              <Tr key={m.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-red-600/30 flex items-center justify-center text-xs font-black text-red-300">
                      {m.avatar
                        ? <img src={m.avatar} alt="" className="w-full h-full object-cover" />
                        : (m.name || '?')[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{m.name}</div>
                      <div className="text-[10px] font-bold text-red-400">ID: {m.customer_code || shortId(m.id)}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="text-white text-[11px]">{m.email || '—'}</div>
                  <div className="text-[10px] text-slate-500">{m.phone || '—'}</div>
                </Td>
                <Td>
                  {m.meta.plan ? (
                    <div>
                      <div className="text-red-400 font-bold text-[11px] uppercase">{m.meta.plan}</div>
                      <div className="text-emerald-400 text-[10px] font-semibold">Rs. {Number(m.meta.fee || 0).toLocaleString()} / {m.meta.days || 0}d</div>
                    </div>
                  ) : <span className="text-slate-600 text-[11px]">No plan</span>}
                </Td>
                <Td><span className="text-[11px]">{fmtDate(m.join_date)}</span></Td>
                <Td>
                  {m.meta.expiry ? (
                    <div className="space-y-1">
                      <div className="text-[11px] text-white">{fmtDate(m.meta.expiry)}</div>
                      {left >= 0 ? <Pill variant={left <= 7 ? 'amber' : 'green'}>{left}d left</Pill> : <Pill variant="red">Expired</Pill>}
                    </div>
                  ) : <span className="text-slate-600 text-[11px]">— No expiry</span>}
                </Td>
                <Td><Pill variant={m.status === 'blocked' ? 'amber' : 'green'}>{m.status === 'blocked' ? 'Suspended' : 'Active'}</Pill></Td>
                <Td>
                  <MemberActionsMenu
                    member={m}
                    onEdit={() => setEditTarget(m)}
                    onRenew={() => setRenewTarget(m)}
                    onPlan={() => setPlanTarget(m)}
                    onTools={() => setToolsTarget(m)}
                    onDevices={() => setDevicesTarget(m)}
                    onInvoice={() => openInvoice(m)}
                    whatsappHref={m.phone ? waLink(m.phone, `Hi ${m.name}, regarding your ZynexTools subscription.`) : undefined}
                    onSuspend={() => suspend(m)}
                    onDelete={() => del(m)}
                  />
                </Td>
              </Tr>
            );
          })}
          {paged.length === 0 && (
            <tr><td colSpan={7} className="p-6 text-center text-slate-600 text-sm border-b border-[#1a1210]">No accounts found.</td></tr>
          )}
        </tbody>
      </RTable>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Page {pageSafe} of {totalPages}</span>
        <div className="flex gap-2">
          <button disabled={pageSafe <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-xl border border-[#2a1e1c] bg-[#1a1210] text-slate-300 disabled:opacity-40 cursor-pointer hover:text-white transition">Previous</button>
          <button disabled={pageSafe >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 rounded-xl border border-[#2a1e1c] bg-[#1a1210] text-slate-300 disabled:opacity-40 cursor-pointer hover:text-white transition">Next</button>
        </div>
      </div>

      {showAdd && <AddMemberModal ownerId={ownerId} ownerName={ownerName} onClose={() => setShowAdd(false)} onSaved={onReload} />}
      {editTarget && (
        <RModal title="Edit Member" sub="Unique ID and email stay locked" onClose={() => setEditTarget(null)}>
          <AccountProfileForm
            mode="seller-member"
            account={{
              customer_code: editTarget.customer_code,
              name: editTarget.name || '',
              email: editTarget.email || '',
              phone: editTarget.phone || '',
              avatar: editTarget.avatar || '',
              max_devices: editTarget.max_devices ?? 1,
            }}
            sellerMaxDevices={ownerMaxDevices}
            onCancel={() => setEditTarget(null)}
            onSaved={() => { setEditTarget(null); onReload(); }}
            save={async payload => {
              const { maxDevices, ...profile } = payload;
              await updateAccount(editTarget.id, profile);
              if (maxDevices != null) {
                const { setMaxDevices } = await import('../../lib/deviceApi');
                await setMaxDevices(editTarget.id, Number(maxDevices));
              }
            }}
          />
        </RModal>
      )}
      {devicesTarget && (
        <RModal title={`Devices — ${devicesTarget.name}`} sub="Manage concurrent device access" onClose={() => setDevicesTarget(null)}>
          <DevicesManager
            accountId={devicesTarget.id}
            accountName={devicesTarget.name}
            canEditMax
            maxCapHint={ownerMaxDevices}
            onClose={() => setDevicesTarget(null)}
          />
        </RModal>
      )}
      {renewTarget && <RenewModal ownerId={ownerId} member={renewTarget} onClose={() => setRenewTarget(null)} onSaved={onReload} />}
      {planTarget && <PlanModal ownerId={ownerId} member={planTarget} onClose={() => setPlanTarget(null)} onSaved={onReload} />}
      {toolsTarget && <ToolsModal member={toolsTarget} onClose={() => setToolsTarget(null)} onSaved={onReload} />}
      {invoiceTarget && (
        <InvoiceModal order={invoiceTarget} onClose={() => setInvoiceTarget(null)} />
      )}
    </div>
  );
};
