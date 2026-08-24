import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Edit, Trash2, Plus, Eye, Check, X, Send, Download, Printer, RefreshCw, ClipboardList, Wrench, Ban, ChevronDown, ChevronRight, BarChart2, MoreHorizontal, FileText, MessageCircle, MonitorSmartphone } from 'lucide-react';
import { db, Tool, bannerDb } from '../data/adminStore';
import { saveCatalogTool, useCatalogTools } from '../../lib/toolCookies';
import { SectionHeader, AdminTable, Th, Td, Tr, StatusBadge, AdminBtn, SearchInput, Badge, ProgressBar, DaysLeftBadge } from '../components/AdminUI';
import { ToolEditor } from '../components/ToolEditor';
import { DeviceLimitsToggle } from '../components/DeviceLimitsToggle';
import { GlobalProxyEngine } from '../components/GlobalProxyEngine';
import {
  AccountRole, AccountMeta, PLAN_OPTIONS, accountMetaFromRow,
  addDays, daysLeft, fmtDate, shortId, waLink,
} from '../../lib/accountStore';
import { createAccount, deleteAccount, updateAccount } from '../../lib/accountApi';
import { AccountProfileForm } from '../../components/AccountProfileForm';
import { DevicesManager } from '../../components/DevicesManager';
import { CustomPlanFields, CUSTOM_PLAN_KEY, applyCatalogPlan } from '../../components/CustomPlanFields';
import { PeriodPills } from '../../components/PeriodPills';
import { inPeriod, moneyTick, periodFrom, trendKey, trendPoints, type PeriodKey } from '../../lib/period';
import { accountForSale, collectSales, isApprovedSale, invoiceDateOnly, invoiceMonthsFromDays, invoiceNumberFor, liveSubscription, type SaleRow } from '../../lib/sales';
import { InvoiceModal } from '../../components/InvoiceModal';
import { SellerTrendPanel } from '../../components/SellerTrendPanel';
import { TicketsInbox } from '../../components/TicketsInbox';
import { NotesInbox } from '../../components/NotesInbox';
import { supabase } from '../../lib/db';
import { deleteNote, deleteNotes, loadNotes, markNoteRead, markNotesRead, noteVisible, sendNotes, type InboxNote } from '../../lib/notifications';

const PIE_COLORS = ['#cc1a1a','#dc2626','#f97316','#ef4444','#b91c1c'];
const Tip = ({active,payload,label}:any) => !active||!payload?.length ? null : (
  <div className="bg-[#1a1210] border border-[#3a2a26] rounded-xl px-3 py-2 text-xs shadow-xl"><p className="text-slate-400 mb-1">{label}</p>{payload.map((p:any,i:number)=><p key={i} style={{color:p.color}} className="font-bold">{p.name}: {p.value}</p>)}</div>
);

/* ══ ACCOUNTS (Customers + Resellers) ══ */
type AccountFilter = 'all' | 'members' | 'subcustomers' | 'resellers' | 'admins';

const inpCls = 'w-full bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition';
const lblCls = 'text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5';

const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, footer, wide }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
    <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'} bg-[#130d0d] border border-[#3a2a26] rounded-3xl shadow-2xl`} onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between p-5 border-b border-[#2a1e1c]">
        <h3 className="text-base font-extrabold text-white">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-[#1a1210] rounded-xl text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4"/></button>
      </div>
      <div className="p-5">{children}</div>
      {footer && <div className="p-5 border-t border-[#2a1e1c] flex gap-2 justify-end">{footer}</div>}
    </div>
  </div>
);

const AddMemberModal: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', role: 'user' as AccountRole, plan: '' });
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
    const catalog = applyCatalogPlan(value, PLAN_OPTIONS);
    if (catalog) { setFee(catalog.fee); setDays(catalog.days); setCustomName(''); }
  };
  const toggleTool = (name: string) =>
    setTools(t => t.includes(name) ? t.filter(x => x !== name) : [...t, name]);

  const save = async () => {
    if (!form.name.trim())                 return setError('Full Name is required');
    if (!form.email.trim())                return setError('Email Address is required');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address');
    if (form.password.length < 8)          return setError('Password must be at least 8 characters');
    if (!form.plan)                        return setError('Please select a plan');
    const planName = form.plan === CUSTOM_PLAN_KEY ? customName.trim() : form.plan;
    if (!planName)                         return setError('Enter a custom package name');
    if (days < 1)                          return setError('Duration must be at least 1 day');

    setSaving(true);
    const join = new Date().toISOString().slice(0, 10);
    try {
      await createAccount({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        password: form.password,
        role: form.role,
        plan: planName,
        fee,
        planDays: days,
        expiry: addDays(join, days),
        tools,
      });
    } catch (error: any) {
      setSaving(false);
      return setError(error.message);
    }
    setSaving(false); onSaved(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md bg-[#130d0d] border border-[#3a2a26] rounded-3xl shadow-2xl my-auto"
        style={{ boxShadow: '0 0 60px rgba(204,26,26,0.15)' }} onClick={e => e.stopPropagation()}>

        <div className="flex items-start justify-between p-5 border-b border-[#2a1e1c]">
          <div>
            <h3 className="text-xl font-black text-white">Add New Member</h3>
            <p className="text-xs text-slate-400 mt-0.5">Create an account and assign a plan</p>
          </div>
          <button onClick={onClose}
            className="p-2 bg-red-600/10 hover:bg-red-600/20 rounded-xl text-red-400 hover:text-red-300 cursor-pointer transition">
            <X className="w-4 h-4"/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-3 py-2 text-xs text-red-300">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lblCls}>Full Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={inpCls} placeholder="e.g. Ali Hassan"/>
            </div>
            <div>
              <label className={lblCls}>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inpCls} placeholder="+92…"/>
            </div>
          </div>

          <div>
            <label className={lblCls}>Email Address *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inpCls} placeholder="user@example.com"/>
          </div>

          <div>
            <label className={lblCls}>Password * (min 8 chars)</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} className={inpCls} placeholder="••••••••"/>
          </div>

          <div>
            <label className={lblCls}>Role</label>
            <select value={form.role} onChange={e => set('role', e.target.value)} className={inpCls}>
              <option value="user">User</option>
              <option value="reseller">Seller</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <CustomPlanFields
            options={PLAN_OPTIONS}
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
                    className="w-4 h-4 rounded border-[#3a2a26] bg-[#1a1210] accent-red-600 cursor-pointer"/>
                  {t.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-[#2a1e1c] flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-5 py-2.5 bg-[#1a1210] hover:bg-[#231a18] border border-[#3a2a26] text-slate-300 hover:text-white text-sm font-bold rounded-xl transition cursor-pointer">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-black rounded-xl transition cursor-pointer shadow-lg shadow-red-900/30">
            {saving ? 'Creating…' : 'Create Member'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RenewModal: React.FC<{ account: any; onClose: () => void; onSaved: () => void }> = ({ account, onClose, onSaved }) => {
  const meta = accountMetaFromRow(account);
  const [days, setDays] = useState(meta.days || 30);
  const [fee, setFee] = useState(meta.fee || 0);
  const save = async () => {
    const base = daysLeft(meta.expiry) > 0 ? meta.expiry : new Date().toISOString().slice(0, 10);
    const { supabase } = await import('../../lib/db');
    await supabase.from('customers').update({
      expiry: addDays(base, days),
      fee: fee || meta.fee,
      plan_days: days || meta.days,
      plan: meta.plan || 'Monthly Plan',
    }).eq('id', account.id);
    onSaved(); onClose();
  };
  return (
    <ModalShell title={`Renew — ${account.name}`} onClose={onClose} footer={
      <><AdminBtn onClick={onClose}>Cancel</AdminBtn><AdminBtn variant="blue" onClick={save}><RefreshCw className="w-3 h-3"/> Renew</AdminBtn></>
    }>
      <div className="space-y-3">
        <p className="text-xs text-slate-400">Current expiry: <span className="text-white font-semibold">{meta.expiry ? fmtDate(meta.expiry) : 'No expiry'}</span></p>
        <div><label className={lblCls}>Extend by (days)</label><input type="number" min={1} value={days} onChange={e=>setDays(Number(e.target.value)||0)} className={inpCls}/></div>
        <div><label className={lblCls}>Selling price (PKR)</label><input type="number" min={0} value={fee} onChange={e=>setFee(Number(e.target.value)||0)} className={inpCls}/></div>
        <p className="text-[11px] text-emerald-400">New expiry will be: {fmtDate(addDays(daysLeft(meta.expiry) > 0 ? meta.expiry : new Date().toISOString().slice(0,10), days))}</p>
      </div>
    </ModalShell>
  );
};

const PlanModal: React.FC<{ account: any; onClose: () => void; onSaved: () => void }> = ({ account, onClose, onSaved }) => {
  const meta = accountMetaFromRow(account);
  const known = PLAN_OPTIONS.some(p => p.name === meta.plan);
  const [plan, setPlan] = useState(meta.plan ? (known ? meta.plan : CUSTOM_PLAN_KEY) : '');
  const [customName, setCustomName] = useState(known ? '' : (meta.plan || ''));
  const [fee, setFee] = useState(meta.fee || 0);
  const [days, setDays] = useState(meta.days || 30);
  const pickPlan = (value: string) => {
    setPlan(value);
    const catalog = applyCatalogPlan(value, PLAN_OPTIONS);
    if (catalog) { setFee(catalog.fee); setDays(catalog.days); setCustomName(''); }
  };
  const save = async () => {
    const { supabase } = await import('../../lib/db');
    if (!plan) {
      await supabase.from('customers').update({ plan: '', fee: 0, plan_days: 0, expiry: null }).eq('id', account.id);
      onSaved(); onClose(); return;
    }
    const planName = plan === CUSTOM_PLAN_KEY ? customName.trim() : plan;
    if (!planName) return;
    const start = new Date().toISOString().slice(0, 10);
    await supabase.from('customers').update({
      plan: planName, fee, plan_days: days,
      expiry: addDays(start, days),
      role: planName.toLowerCase().includes('reseller') ? 'reseller' : meta.role,
    }).eq('id', account.id);
    onSaved(); onClose();
  };
  return (
    <ModalShell title={`Assign Plan — ${account.name}`} onClose={onClose} footer={
      <><AdminBtn onClick={onClose}>Cancel</AdminBtn><AdminBtn variant="red" onClick={save}><ClipboardList className="w-3 h-3"/> Save Plan</AdminBtn></>
    }>
      <CustomPlanFields
        options={PLAN_OPTIONS}
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
    </ModalShell>
  );
};

const ToolsModal: React.FC<{ account: any; onClose: () => void; onSaved: () => void }> = ({ account, onClose, onSaved }) => {
  const allTools = useCatalogTools();
  const [selected, setSelected] = useState<string[]>(Array.isArray(account.tools) ? account.tools : []);
  const [saving, setSaving] = useState(false);
  const toggle = (name: string) => setSelected(s => s.includes(name) ? s.filter(x => x !== name) : [...s, name]);
  const save = async () => {
    setSaving(true);
    const { supabase } = await import('../../lib/db');
    await supabase.from('customers').update({ tools: selected }).eq('id', account.id);
    setSaving(false); onSaved(); onClose();
  };
  return (
    <ModalShell title={`Tools Access — ${account.name}`} onClose={onClose} wide footer={
      <><AdminBtn onClick={onClose}>Cancel</AdminBtn><AdminBtn variant="red" onClick={save} disabled={saving}><Wrench className="w-3 h-3"/> {saving ? 'Saving…' : 'Save Tools'}</AdminBtn></>
    }>
      <p className="text-xs text-slate-400 mb-3">{selected.length} tool(s) selected</p>
      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
        {allTools.map(t => (
          <button key={t.id} type="button" onClick={() => toggle(t.name)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
              selected.includes(t.name) ? 'bg-red-600/20 border-red-500/40 text-red-300' : 'bg-[#0d0908] border-[#2a1e1c] text-slate-400 hover:text-white'
            }`}>
            {t.favicon && <img src={t.favicon} alt="" className="w-4 h-4 rounded" onError={e=>{(e.target as any).style.display='none'}}/>}
            {t.name}
          </button>
        ))}
      </div>
    </ModalShell>
  );
};

const AccountActionsMenu: React.FC<{
  account: any;
  onEdit: () => void;
  onTrend?: () => void;
  onRenew: () => void;
  onPlan: () => void;
  onTools: () => void;
  onDevices: () => void;
  whatsappHref?: string;
  onSuspend: () => void;
  onDelete: () => void;
}> = ({ account, onEdit, onTrend, onRenew, onPlan, onTools, onDevices, whatsappHref, onSuspend, onDelete }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const menuH = (onTrend ? 268 : 232) + 72;

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
          {onTrend && (
            <button type="button" role="menuitem" onClick={pick(onTrend)}
              className={`${itemCls} text-amber-300 hover:bg-amber-500/10`}>
              <BarChart2 className="w-3 h-3"/> Trend
            </button>
          )}
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
          {whatsappHref ? (
            <a role="menuitem" href={whatsappHref} target="_blank" rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={`${itemCls} text-emerald-400 hover:bg-emerald-500/10`}>
              <MessageCircle className="w-3 h-3"/> WhatsApp
            </a>
          ) : (
            <button type="button" role="menuitem"
              onClick={() => { setOpen(false); alert('No phone number on this account.'); }}
              className={`${itemCls} text-emerald-400 hover:bg-emerald-500/10 opacity-50`}>
              <MessageCircle className="w-3 h-3"/> WhatsApp
            </button>
          )}
          <div className="my-1 border-t border-[#2a1e1c]"/>
          <button type="button" role="menuitem" onClick={pick(onSuspend)}
            className={`${itemCls} text-purple-300 hover:bg-purple-500/10`}>
            <Ban className="w-3 h-3"/> {account.status === 'blocked' ? 'Activate' : 'Suspend'}
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

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AccountFilter>('all');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [renewTarget, setRenewTarget] = useState<any>(null);
  const [planTarget, setPlanTarget] = useState<any>(null);
  const [toolsTarget, setToolsTarget] = useState<any>(null);
  const [devicesTarget, setDevicesTarget] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [openSellerId, setOpenSellerId] = useState<string | null>(null);
  const [trendSeller, setTrendSeller] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [tick, setTick] = useState(0);
  const perPage = 10;

  const load = async () => {
    const { supabase } = await import('../../lib/db');
    const [{ data }, { data: p }] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('reseller_payments').select('*').order('created_at', { ascending: false }),
    ]);
    setCustomers(data || []);
    setPayments(p || []);
    setTick(t => t + 1);
  };

  useEffect(() => { load(); }, []);

  const accounts = useMemo(() => customers.map(c => {
    const meta = accountMetaFromRow(c);
    return { ...c, _meta: meta, _daysLeft: daysLeft(meta.expiry) };
  }), [customers, tick]);

  const roleOf = (c: any) => (c._meta?.role || c.role || 'user') as AccountRole;
  const isSeller = (c: any) => roleOf(c) === 'reseller';
  const isAdmin = (c: any) => roleOf(c) === 'admin';
  const isSubCustomer = (c: any) => roleOf(c) === 'user' && Boolean(c.owner_id);
  const isDirectCustomer = (c: any) => roleOf(c) === 'user' && !c.owner_id;

  const filtered = accounts.filter(c => {
    if (filter === 'members' && !isDirectCustomer(c)) return false;
    if (filter === 'subcustomers' && !isSubCustomer(c)) return false;
    if (filter === 'resellers' && !isSeller(c)) return false;
    if (filter === 'admins' && !isAdmin(c)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const sellerName = String(customers.find(s => s.id === c.owner_id)?.name || '').toLowerCase();
    return c.name?.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q)
      || c.phone?.includes(search)
      || String(c.customer_code || '').toLowerCase().includes(q)
      || String(c.id).toLowerCase().includes(q)
      || sellerName.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * perPage, pageSafe * perPage);

  const suspend = async (c: any) => {
    const next = c.status === 'active' ? 'blocked' : 'active';
    if (!confirm(next === 'blocked' ? `Suspend ${c.name}?` : `Activate ${c.name}?`)) return;
    const { supabase } = await import('../../lib/db');
    await supabase.from('customers').update({ status: next }).eq('id', c.id);
    load();
  };

  const del = async (c: any) => {
    if (!confirm(`Delete account "${c.name}"? This cannot be undone.`)) return;
    await deleteAccount(c.id);
    load();
  };

  const membersOf = (sellerId: string) =>
    accounts.filter(a => a.owner_id === sellerId);

  const toggleSeller = (sellerId: string) =>
    setOpenSellerId(cur => cur === sellerId ? null : sellerId);

  const roleBadge = (role: AccountRole) => {
    if (role === 'reseller') return <Badge variant="purple">Reseller</Badge>;
    if (role === 'admin') return <Badge variant="red">Admin</Badge>;
    return <Badge variant="gray">User</Badge>;
  };

  const avatarColor = (role: AccountRole) =>
    role === 'reseller' ? 'bg-purple-600/30 text-purple-300' :
    role === 'admin' ? 'bg-red-600/40 text-red-200' : 'bg-red-600/30 text-red-300';

  const accountActions = (c: any) => (
    <AccountActionsMenu
      account={c}
      onEdit={() => setEditTarget(c)}
      onTrend={(c._meta?.role || c.role) === 'reseller' ? () => setTrendSeller(c) : undefined}
      onRenew={() => setRenewTarget(c)}
      onPlan={() => setPlanTarget(c)}
      onTools={() => setToolsTarget(c)}
      onDevices={() => setDevicesTarget(c)}
      whatsappHref={c.phone ? waLink(c.phone, `Hi ${c.name}, regarding your AI TOOLZ MART subscription.`) : undefined}
      onSuspend={() => suspend(c)}
      onDelete={() => del(c)}
    />
  );

  const tabs: { id: AccountFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All Accounts', count: accounts.length },
    { id: 'members', label: 'For Customer', count: accounts.filter(isDirectCustomer).length },
    { id: 'subcustomers', label: 'Sub-customer', count: accounts.filter(isSubCustomer).length },
    { id: 'resellers', label: 'For Seller', count: accounts.filter(isSeller).length },
    { id: 'admins', label: 'Admins', count: accounts.filter(isAdmin).length },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="Accounts" sub="All Users & Resellers — full payment & expiry tracking"/>

      <DeviceLimitsToggle />
      <GlobalProxyEngine />

      {/* Banner */}
      <div className="bg-gradient-to-r from-red-900/60 to-red-950/40 border border-red-500/30 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-black text-white">All Users & Resellers</h3>
          <p className="text-xs text-red-200/70 mt-0.5">{accounts.length} accounts · Full payment & expiry tracking</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search name, email, Customer ID or seller…"/>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-red-50 text-red-600 text-xs font-black rounded-xl transition cursor-pointer whitespace-nowrap shadow">
            <Plus className="w-3.5 h-3.5"/> Add Member
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setFilter(t.id); setPage(1); }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              filter === t.id
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                : 'bg-[#1a1210] border border-[#2a1e1c] text-slate-400 hover:text-white'
            }`}>
            {t.label}
            <span className="ml-1.5 opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <AdminTable>
        <thead>
          <tr>
            <Th>Member</Th>
            <Th>Contact</Th>
            <Th>Seller</Th>
            <Th>Role</Th>
            <Th>Plan & Fee (PKR)</Th>
            <Th>Joined</Th>
            <Th>Expiry</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {paged.map(c => {
            const meta = c._meta as AccountMeta;
            const left = c._daysLeft as number;
            const sellerMembers = meta.role === 'reseller' ? membersOf(c.id) : [];
            const sellerOpen = openSellerId === c.id;
            const owner = customers.find(s => s.id === c.owner_id);
            return (
              <React.Fragment key={c.id}>
              <Tr>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-black ${avatarColor(meta.role)}`}>
                      {c.avatar
                        ? <img src={c.avatar} alt="" className="w-full h-full object-cover" />
                        : (c.name || '?')[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{c.name}</div>
                      <div className="text-[10px] font-bold text-red-400">ID: {c.customer_code || shortId(c.id)}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="text-white text-[11px]">{c.email || '—'}</div>
                  <div className="text-[10px] text-slate-500">{c.phone || '—'}</div>
                </Td>
                <Td>
                  {meta.role === 'reseller' ? (
                    <button type="button" onClick={() => toggleSeller(c.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                        sellerOpen
                          ? 'bg-red-600 text-white border-red-500'
                          : 'bg-[#1a1210] border-[#3a2a26] text-slate-300 hover:text-white hover:border-red-500/40'
                      }`}>
                      {sellerOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      {sellerMembers.length} customer{sellerMembers.length === 1 ? '' : 's'}
                    </button>
                  ) : owner ? (
                    <button type="button" onClick={() => { setFilter('resellers'); setPage(1); setOpenSellerId(owner.id); }}
                      className="text-left cursor-pointer hover:opacity-80 transition">
                      <div className="text-white text-[11px] font-semibold">{owner.name}</div>
                      <div className="text-[10px] font-bold text-red-400">{owner.customer_code || shortId(owner.id)}</div>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-600">Direct</span>
                  )}
                </Td>
                <Td>{roleBadge(meta.role || 'user')}</Td>
                <Td>
                  {meta.plan ? (
                    <div>
                      <div className="text-red-400 font-bold text-[11px] uppercase">{meta.plan}</div>
                      <div className="text-emerald-400 text-[10px] font-semibold">Rs. {Number(meta.fee || 0).toLocaleString()} / {meta.days || 0}d</div>
                    </div>
                  ) : <span className="text-slate-600 text-[11px]">No plan</span>}
                </Td>
                <Td><span className="text-[11px]">{fmtDate(c.join_date)}</span></Td>
                <Td>
                  {meta.expiry ? (
                    <div className="space-y-1">
                      <div className="text-[11px] text-white">{fmtDate(meta.expiry)}</div>
                      {left >= 0
                        ? <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">{left}d left ✓</span>
                        : <span className="inline-flex text-[10px] font-extrabold px-2 py-0.5 rounded-full border bg-red-600/10 text-red-400 border-red-500/30">Expired</span>}
                    </div>
                  ) : <span className="text-slate-600 text-[11px]">— No expiry</span>}
                </Td>
                <Td><StatusBadge status={c.status === 'blocked' ? 'suspended' : (c.status || 'active')}/></Td>
                <Td>{accountActions(c)}</Td>
              </Tr>
              {meta.role === 'reseller' && sellerOpen && (
                <tr>
                  <td colSpan={9} className="p-0">
                    <div className="bg-[#0d0908] border-b border-red-500/20 px-4 py-3 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
                        Customers of {c.name}
                      </p>
                      {sellerMembers.length === 0 ? (
                        <p className="text-xs text-slate-500">No customers assigned to this seller yet.</p>
                      ) : sellerMembers.map(member => {
                        const mMeta = member._meta as AccountMeta;
                        const mLeft = member._daysLeft as number;
                        return (
                          <div key={member.id} className="flex flex-col lg:flex-row lg:items-center gap-3 bg-[#130d0d] border border-[#2a1e1c] rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-2 min-w-[180px]">
                              <div className="w-7 h-7 rounded-full overflow-hidden bg-red-600/30 flex items-center justify-center text-[10px] font-black text-red-300">
                                {member.avatar
                                  ? <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                                  : (member.name || '?')[0]?.toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white">{member.name}</div>
                                <div className="text-[10px] font-bold text-red-400">ID: {member.customer_code || shortId(member.id)}</div>
                              </div>
                            </div>
                            <div className="min-w-[140px]">
                              <div className="text-[11px] text-white">{member.email || '—'}</div>
                              <div className="text-[10px] text-slate-500">{member.phone || '—'}</div>
                            </div>
                            <div className="min-w-[120px]">
                              {mMeta.plan ? (
                                <div>
                                  <div className="text-red-400 font-bold text-[10px] uppercase">{mMeta.plan}</div>
                                  <div className="text-emerald-400 text-[10px]">Rs. {Number(mMeta.fee || 0).toLocaleString()}</div>
                                </div>
                              ) : <span className="text-[11px] text-slate-600">No plan</span>}
                            </div>
                            <div className="text-[11px] text-slate-400 min-w-[90px]">
                              {mMeta.expiry
                                ? (mLeft >= 0 ? `${mLeft}d left` : 'Expired')
                                : 'No expiry'}
                            </div>
                            <StatusBadge status={member.status === 'blocked' ? 'suspended' : (member.status || 'active')}/>
                            <div className="lg:ml-auto">{accountActions(member)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            );
          })}
        </tbody>
      </AdminTable>

      {!filtered.length && <div className="text-center py-12 text-slate-600 text-sm">No accounts found</div>}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Page {pageSafe} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={pageSafe <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border border-[#2a1e1c] bg-[#1a1210] text-slate-300 disabled:opacity-40 cursor-pointer hover:text-white transition">Previous</button>
            <button disabled={pageSafe >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl border border-[#2a1e1c] bg-[#1a1210] text-slate-300 disabled:opacity-40 cursor-pointer hover:text-white transition">Next</button>
          </div>
        </div>
      )}

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} onSaved={load}/>}
      {editTarget && (
        <ModalShell title="Edit Account" onClose={() => setEditTarget(null)} wide>
          <AccountProfileForm
            mode="admin"
            account={{
              customer_code: editTarget.customer_code,
              name: editTarget.name || '',
              email: editTarget.email || '',
              phone: editTarget.phone || '',
              avatar: editTarget.avatar || '',
              role: editTarget._meta?.role || editTarget.role || 'user',
              owner_id: editTarget.owner_id || '',
              max_devices: editTarget.max_devices ?? 1,
            }}
            sellers={customers.filter(s => (s.role || s._meta?.role) === 'reseller').map(s => ({
              id: s.id, name: s.name, customer_code: s.customer_code,
            }))}
            onCancel={() => setEditTarget(null)}
            onSaved={() => { setEditTarget(null); load(); }}
            save={async payload => {
              const { maxDevices, ...profile } = payload;
              await updateAccount(editTarget.id, profile);
              if (maxDevices != null) {
                const { setMaxDevices } = await import('../../lib/deviceApi');
                await setMaxDevices(editTarget.id, Number(maxDevices));
              }
            }}
          />
        </ModalShell>
      )}
      {devicesTarget && (
        <ModalShell title={`Devices — ${devicesTarget.name}`} onClose={() => setDevicesTarget(null)} wide>
          <DevicesManager
            accountId={devicesTarget.id}
            accountName={devicesTarget.name}
            canEditMax
            onClose={() => setDevicesTarget(null)}
          />
        </ModalShell>
      )}
      {renewTarget && <RenewModal account={renewTarget} onClose={() => setRenewTarget(null)} onSaved={load}/>}
      {planTarget && <PlanModal account={planTarget} onClose={() => setPlanTarget(null)} onSaved={load}/>}
      {toolsTarget && <ToolsModal account={toolsTarget} onClose={() => setToolsTarget(null)} onSaved={load}/>}
      {trendSeller && (
        <SellerTrendPanel
          seller={trendSeller}
          members={customers.filter(a => a.owner_id === trendSeller.id)}
          payments={payments.filter(p => p.owner_id === trendSeller.id)}
          onClose={() => setTrendSeller(null)}
        />
      )}
    </div>
  );
};

/* ══ TOOLS ══ */
export const ToolsPage: React.FC<{ onNavigateToPreview?: (id: string) => void }> = ({ onNavigateToPreview }) => {
  const [,r]=useState(0); const refresh=()=>r(n=>n+1);
  const [editor,setEditor]=useState<Tool|null|'none'>('none');
  const [toast,setToast]=useState('');
  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),3000);};

  const tools = db.getTools();
  const groupTools = tools.filter(t=>!t.isPrivate&&!t.isSemiPrivate);
  const privateTools = tools.filter(t=>t.isPrivate||t.isSemiPrivate);

  const handleSave=async (tool:Tool)=>{
    const normalized={...tool, showOnHome: tool.showOnHome !== false};
    await saveCatalogTool(normalized);
    db.log('Tool Saved',`${normalized.name} saved`);
    showToast(`✅ "${normalized.name}" saved — /tools/${normalized.id} is live`);
    setEditor('none'); refresh();
  };
  const handleDelete=(id:string)=>{
    if(!confirm('Delete this tool from the site?')) return;
    db.deleteTool(id); db.log('Tool Deleted',`Deleted tool ${id}`);
    showToast('🗑️ Tool deleted'); refresh();
  };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-5 right-5 z-[100] bg-[#1a1210] border border-red-500/40 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl">{toast}</div>}
      <SectionHeader title="Tool Management" sub={`${tools.length} tools · changes go live instantly`}
        action={<button onClick={()=>setEditor(null)} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl transition cursor-pointer"><Plus className="w-4 h-4"/> Add New Tool</button>}/>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Total',tools.length],['Group Buy',groupTools.length],['Private',privateTools.length],['Active',tools.length]].map(([l,v])=>(
          <div key={String(l)} className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-3 text-center"><div className="text-xl font-black text-white">{v}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{l}</div></div>
        ))}
      </div>
      {[{label:'🛒 Group Buy Tools',list:groupTools},{label:'🔒 Private / Semi-Private',list:privateTools}].map(section=>(
        <div key={section.label} className="space-y-3">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">{section.label}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.list.map(t=>(
              <div key={t.id} className="bg-[#130d0d] border border-[#2a1e1c] hover:border-[#3a2a26] rounded-2xl p-4 space-y-3 transition">
                <div className="flex items-center gap-3">
                  {t.favicon && <img src={t.favicon} alt={t.name} className="w-10 h-10 rounded-xl bg-white p-0.5 object-contain" onError={e=>{(e.target as any).style.display='none'}}/>}
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-white">{t.name}</span>
                      {(t as any).badge && <Badge variant="red">{(t as any).badge}</Badge>}
                      {t.isPrivate && <Badge variant="purple">Private</Badge>}
                      {t.isSemiPrivate && <Badge variant="amber">Semi</Badge>}
                    </div>
                    <div className="text-[10px] text-red-400 font-mono mt-0.5">/tools/{t.id}</div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2">{t.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-red-400">Rs {t.price?.toLocaleString()}/mo</span>
                  {t.originalPrice && <span className="text-[10px] text-slate-600 line-through">Rs {t.originalPrice?.toLocaleString()}</span>}
                </div>
                <div className="flex gap-2 pt-1 border-t border-[#1a1210]">
                  <button onClick={()=>setEditor(t)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#1a1210] hover:bg-[#231a18] border border-[#2a1e1c] text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"><Edit className="w-3 h-3"/> Edit</button>
                  {onNavigateToPreview && <button onClick={()=>onNavigateToPreview(t.id)} className="px-3 py-2 bg-[#1a1210] hover:bg-[#231a18] border border-[#2a1e1c] text-slate-400 hover:text-white rounded-xl text-xs transition cursor-pointer"><Eye className="w-3 h-3"/></button>}
                  <button onClick={()=>handleDelete(t.id)} className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-xs transition cursor-pointer"><Trash2 className="w-3 h-3"/></button>
                </div>
              </div>
            ))}
            <button onClick={()=>setEditor(null)} className="border-2 border-dashed border-[#2a1e1c] hover:border-red-500/30 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-slate-400 transition cursor-pointer">
              <Plus className="w-6 h-6"/><span className="text-xs font-semibold">Add Tool</span>
            </button>
          </div>
        </div>
      ))}
      {editor !== 'none' && <ToolEditor tool={editor} onSave={handleSave} onClose={()=>setEditor('none')} onPreview={(id)=>onNavigateToPreview?.(id)}/>}
    </div>
  );
};

/* ══ ANALYTICS ══ */
export const AnalyticsPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [sellerQuery, setSellerQuery] = useState('');
  const [sellerPage, setSellerPage] = useState(1);
  const [trendSeller, setTrendSeller] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { supabase } = await import('../../lib/db');
      const [{ data: o }, { data: c }, { data: p }] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('reseller_payments').select('*').order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      setOrders(o || []);
      setCustomers(c || []);
      setPayments(p || []);
    };
    load();
    const iv = setInterval(load, 15000);
    let channel: any = null;
    import('../../lib/db').then(({ supabase }) => {
      if (cancelled) return;
      channel = supabase
        .channel('admin-analytics')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { void load(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => { void load(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reseller_payments' }, () => { void load(); })
        .subscribe();
    });
    return () => {
      cancelled = true;
      clearInterval(iv);
      if (channel) void import('../../lib/db').then(({ supabase }) => supabase.removeChannel(channel));
    };
  }, []);

  const from = periodFrom(period);
  const adminSales = collectSales({ orders, customers, payments }).filter(row => inPeriod(row.date, from));
  const approved = adminSales.filter(isApprovedSale);
  const monthly = trendPoints(period);
  approved.forEach(row => {
    const key = trendKey(row.date, period);
    const point = monthly.find(item => item.key === key);
    if (point) {
      point.revenue += row.amount;
      point.orders += 1;
    }
  });
  const toolRev: Record<string, number> = {};
  approved.forEach(row => {
    const tool = row.label || 'Other';
    toolRev[tool] = (toolRev[tool] || 0) + row.amount;
  });
  const toolRevArr = Object.entries(toolRev).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue);
  const pmCount: Record<string, number> = {};
  adminSales.forEach(row => {
    const method = row.method || 'other';
    pmCount[method] = (pmCount[method] || 0) + 1;
  });
  const pmArr = Object.entries(pmCount).map(([name, value]) => ({ name, value }));
  const totalRevenue = approved.reduce((s, row) => s + row.amount, 0);
  const avgOV = approved.length ? Math.floor(totalRevenue / approved.length) : 0;

  const sellers = customers.filter(c => c.role === 'reseller');
  const sellerStats = sellers.map(seller => {
    const members = customers.filter(c => c.owner_id === seller.id);
    const newCustomers = members.filter(m => inPeriod(m.join_date || m.created_at, from)).length;
    const payRows = payments.filter(p => p.owner_id === seller.id && p.status === 'paid' && inPeriod(p.payment_date || p.created_at, from));
    const paid = payRows.reduce((s, p) => s + Number(p.amount || 0), 0);
    const fallback = members.filter(m => inPeriod(m.join_date || m.created_at, from)).reduce((s, m) => s + Number(m.fee || 0), 0);
    const revenue = paid || fallback;
    const active = members.filter(m => m.status !== 'blocked').length;
    return { seller, members, newCustomers, revenue, active, payments: payRows.length, payRows };
  }).sort((a, b) => b.revenue - a.revenue);

  const q = sellerQuery.trim().toLowerCase();
  const filteredSellers = sellerStats.filter(row => {
    if (!q) return true;
    return `${row.seller.name} ${row.seller.email} ${row.seller.customer_code} ${row.seller.phone} ${row.seller.id}`.toLowerCase().includes(q);
  });
  const perSeller = 8;
  const sellerPages = Math.max(1, Math.ceil(filteredSellers.length / perSeller));
  const sellerPageSafe = Math.min(sellerPage, sellerPages);
  const pagedSellers = filteredSellers.slice((sellerPageSafe - 1) * perSeller, sellerPageSafe * perSeller);

  const totalResellerRevenue = sellerStats.reduce((s, row) => s + row.revenue, 0);
  const totalResellerCustomers = sellerStats.reduce((s, row) => s + row.members.length, 0);
  const totalNewCustomers = sellerStats.reduce((s, row) => s + row.newCustomers, 0);
  const chartSellers = filteredSellers.slice(0, 8).map(row => ({
    name: row.seller.name || 'Seller',
    revenue: row.revenue,
    customers: row.members.length,
    newCustomers: row.newCustomers,
  }));
  const resellerMonthly = trendPoints(period);
  payments.filter(p => p.status === 'paid' && inPeriod(p.payment_date || p.created_at, from)).forEach(p => {
    const point = resellerMonthly.find(item => item.key === trendKey(p.payment_date || p.created_at, period));
    if (point) point.revenue += Number(p.amount || 0);
  });
  customers.filter(c => c.owner_id && inPeriod(c.join_date || c.created_at, from)).forEach(c => {
    const point = resellerMonthly.find(item => item.key === trendKey(c.join_date || c.created_at, period));
    if (point) point.customers += 1;
  });

  return (
    <div className="space-y-6">
      <SectionHeader title="Sales Analytics" sub="Live plans, shop orders and reseller sales"/>
      <PeriodPills value={period} onChange={setPeriod} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[['Total Revenue',`Rs ${totalRevenue.toLocaleString()}`],['Avg Order Value',`Rs ${avgOV.toLocaleString()}`],['Total Orders',adminSales.length],['Approved',approved.length]].map(([l,v])=>(
          <div key={String(l)} className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-4"><div className="text-xl font-black text-white">{v}</div><div className="text-xs text-slate-400 mt-1">{l}</div></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-white mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={200}><AreaChart data={monthly}><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#cc1a1a" stopOpacity={0.4}/><stop offset="95%" stopColor="#cc1a1a" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="label" tick={{fill:'#666',fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#666',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={moneyTick}/><Tooltip content={<Tip/>}/><Area type="monotone" dataKey="revenue" name="Revenue" stroke="#cc1a1a" fill="url(#ag)" strokeWidth={2}/></AreaChart></ResponsiveContainer>
        </div>
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-white mb-4">Revenue by Tool</h3>
          {toolRevArr.length>0?<div className="space-y-3">{toolRevArr.slice(0,8).map(t=><div key={t.name}><div className="flex items-center justify-between mb-1 text-xs"><span className="text-slate-300 truncate">{t.name}</span><span className="text-white font-bold shrink-0 ml-2">Rs {t.revenue.toLocaleString()}</span></div><ProgressBar value={t.revenue} max={toolRevArr[0]?.revenue||1}/></div>)}</div>:<div className="h-32 flex items-center justify-center text-slate-600 text-xs">Approve orders to see data</div>}
        </div>
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-white mb-4">Orders</h3>
          <ResponsiveContainer width="100%" height={160}><BarChart data={monthly}><XAxis dataKey="label" tick={{fill:'#666',fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#666',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip content={<Tip/>}/><Bar dataKey="orders" name="Orders" fill="#cc1a1a" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
        </div>
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-white mb-4">Payment Methods</h3>
          {pmArr.length>0?<div className="flex items-center gap-6"><ResponsiveContainer width={120} height={120}><PieChart><Pie data={pmArr} cx="50%" cy="50%" outerRadius={50} dataKey="value" paddingAngle={3}>{pmArr.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%5]}/>)}</Pie><Tooltip content={<Tip/>}/></PieChart></ResponsiveContainer><div className="space-y-2 flex-1">{pmArr.map((p,i)=><div key={p.name} className="flex items-center justify-between text-xs"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:PIE_COLORS[i%5]}}/><span className="text-slate-400 capitalize">{p.name}</span></div><span className="text-white font-bold">{p.value}</span></div>)}</div></div>:<div className="h-32 flex items-center justify-center text-slate-600 text-xs">No data yet</div>}
        </div>
      </div>

      <SectionHeader title="Reseller Analytics" sub="Search sellers, compare performance, and open a full revenue trend"/>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          ['Sellers', sellers.length],
          ['Seller customers', totalResellerCustomers],
          ['New in period', totalNewCustomers],
          ['Reseller revenue', `Rs ${totalResellerRevenue.toLocaleString()}`],
        ].map(([l, v]) => (
          <div key={String(l)} className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-4">
            <div className="text-xl font-black text-white">{v}</div>
            <div className="text-xs text-slate-400 mt-1">{l}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#2a1e1c] flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-extrabold text-white">Seller directory</h3>
            <p className="text-[11px] text-slate-500">{filteredSellers.length} of {sellers.length} sellers</p>
          </div>
          <SearchInput value={sellerQuery} onChange={v => { setSellerQuery(v); setSellerPage(1); }} placeholder="Search seller name, email or ID…"/>
        </div>
        {pagedSellers.length ? (
          <AdminTable>
            <thead>
              <tr>
                <Th>Seller</Th>
                <Th>Customers</Th>
                <Th>New</Th>
                <Th>Sales</Th>
                <Th>Revenue</Th>
                <Th>Trend</Th>
              </tr>
            </thead>
            <tbody>
              {pagedSellers.map(row => (
                <Tr key={row.seller.id} onClick={() => setTrendSeller(row.seller)}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-600/30 flex items-center justify-center text-xs font-black text-purple-200 shrink-0">
                        {row.seller.avatar
                          ? <img src={row.seller.avatar} alt="" className="w-full h-full object-cover" />
                          : (row.seller.name || '?')[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">{row.seller.name}</div>
                        <div className="text-[10px] text-red-400 font-bold">ID: {row.seller.customer_code || shortId(row.seller.id)}</div>
                      </div>
                    </div>
                  </Td>
                  <Td><span className="text-white font-bold">{row.members.length}</span><span className="text-[10px] text-slate-500 ml-1">{row.active} active</span></Td>
                  <Td><span className="text-emerald-400 font-bold">{row.newCustomers}</span></Td>
                  <Td><span className="text-white font-bold">{row.payments}</span></Td>
                  <Td><span className="font-black text-white">Rs {row.revenue.toLocaleString()}</span></Td>
                  <Td>
                    <button type="button" onClick={e => { e.stopPropagation(); setTrendSeller(row.seller); }}
                      className="px-2.5 py-1 rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-[10px] font-bold cursor-pointer">
                      View trend
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </AdminTable>
        ) : (
          <div className="py-12 text-center text-slate-600 text-sm">{sellerQuery ? 'No sellers match that search' : 'No sellers yet'}</div>
        )}
        {sellerPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a1e1c] text-xs text-slate-400">
            <span>Page {sellerPageSafe} of {sellerPages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={sellerPageSafe <= 1} onClick={() => setSellerPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-[#2a1e1c] hover:text-white disabled:opacity-40 cursor-pointer">Prev</button>
              <button type="button" disabled={sellerPageSafe >= sellerPages} onClick={() => setSellerPage(p => Math.min(sellerPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-[#2a1e1c] hover:text-white disabled:opacity-40 cursor-pointer">Next</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-white mb-4">Revenue by Seller</h3>
          {chartSellers.some(r => r.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartSellers} layout="vertical" margin={{ left: 24 }}>
                <XAxis type="number" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#aaa', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="revenue" name="Revenue" fill="#cc1a1a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-32 flex items-center justify-center text-slate-600 text-xs">No reseller revenue yet</div>}
        </div>
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-white mb-4">New Customers by Seller</h3>
          {chartSellers.some(r => r.customers > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartSellers}>
                <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="customers" name="Customers" fill="#dc2626" radius={[4, 4, 0, 0]} />
                <Bar dataKey="newCustomers" name="New in period" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-32 flex items-center justify-center text-slate-600 text-xs">No seller customers yet</div>}
        </div>
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-white mb-4">Reseller Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={resellerMonthly}>
              <defs><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#cc1a1a" stopOpacity={0.4}/><stop offset="95%" stopColor="#cc1a1a" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={moneyTick} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#cc1a1a" fill="url(#rg2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-white mb-4">Revenue Share</h3>
          {filteredSellers.filter(r => r.revenue > 0).length ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={filteredSellers.filter(r => r.revenue > 0).slice(0, 8).map(r => ({ name: r.seller.name, value: r.revenue }))} cx="50%" cy="50%" outerRadius={55} dataKey="value" paddingAngle={3}>
                    {filteredSellers.filter(r => r.revenue > 0).slice(0, 8).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % 5]} />)}
                  </Pie>
                  <Tooltip content={<Tip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {filteredSellers.filter(r => r.revenue > 0).slice(0, 8).map((row, i) => (
                  <button key={row.seller.id} type="button" onClick={() => setTrendSeller(row.seller)}
                    className="w-full flex items-center justify-between text-xs cursor-pointer hover:bg-[#1a1210] rounded-lg px-1 py-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % 5] }} />
                      <span className="text-slate-400 truncate">{row.seller.name}</span>
                    </div>
                    <span className="text-white font-bold shrink-0 ml-2">Rs {row.revenue.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : <div className="h-32 flex items-center justify-center text-slate-600 text-xs">No reseller revenue yet</div>}
        </div>
      </div>
      {trendSeller && (
        <SellerTrendPanel
          seller={trendSeller}
          members={customers.filter(a => a.owner_id === trendSeller.id)}
          payments={payments.filter(p => p.owner_id === trendSeller.id)}
          onClose={() => setTrendSeller(null)}
        />
      )}
    </div>
  );
};

/* ══ PAYMENTS ══ */
export const PaymentsPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [resellerPays, setResellerPays] = useState<any[]>([]);
  const [tab, setTab] = useState<'verify'|'records'>('records');
  const [selected, setSelected] = useState<string|null>(null);

  const load = async () => {
    const { supabase } = await import('../../lib/db');
    const [{ data: o }, { data: c }, { data: p }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('reseller_payments').select('*').order('created_at', { ascending: false }),
    ]);
    setOrders(o || []);
    setCustomers(c || []);
    setResellerPays(p || []);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    const { supabase } = await import('../../lib/db');
    await supabase.from('orders').update({ status: 'approved', payment_status: 'paid', sub_status: 'active', activation_date: new Date().toISOString().slice(0,10) }).eq('id', id);
    load(); setSelected(null);
  };

  const reject = async (id: string) => {
    const { supabase } = await import('../../lib/db');
    await supabase.from('orders').update({ status: 'rejected', payment_status: 'failed' }).eq('id', id);
    load(); setSelected(null);
  };

  const records = collectSales({ orders, customers, payments: resellerPays });
  const totalPaid = records.filter(isApprovedSale).reduce((s, row) => s + row.amount, 0);
  const totalPending = orders.filter(o=>o.payment_status==='pending').reduce((s,o)=>s+(o.final_amount||0),0);

  const methodColors: Record<string,string> = { easypaisa:'text-emerald-400', jazzcash:'text-red-400', bank:'text-blue-400', whatsapp:'text-green-400', screenshot:'text-amber-400', prepaid:'text-purple-400', account:'text-red-400', reseller:'text-purple-400', Manual:'text-slate-300', other:'text-slate-400' };

  return (
    <div className="space-y-5">
      <SectionHeader title="Payments" sub="Payment records and verification"/>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Total Orders',records.length,'text-white'],['Paid',records.filter(isApprovedSale).length,'text-emerald-400'],['Pending',orders.filter(o=>o.payment_status==='pending').length,'text-amber-400'],['Failed',orders.filter(o=>o.payment_status==='failed').length,'text-red-400']].map(([l,v,c])=>(
          <div key={String(l)} className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-3 text-center"><div className={`text-xl font-black ${c}`}>{v}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider">{l}</div></div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#130d0d] border border-emerald-500/20 rounded-2xl p-4"><div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Total Collected</div><div className="text-xl font-black text-white">Rs {totalPaid.toLocaleString()}</div></div>
        <div className="bg-[#130d0d] border border-amber-500/20 rounded-2xl p-4"><div className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">Pending Collection</div><div className="text-xl font-black text-white">Rs {totalPending.toLocaleString()}</div></div>
      </div>
      <div className="flex gap-2">
        {([['records','📋 Payment Records'],['verify','🔍 Screenshot Verification']] as const).map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${tab===t?'bg-red-600 text-white':'bg-[#1a1210] border border-[#2a1e1c] text-slate-400 hover:text-white'}`}>{l}</button>
        ))}
        <button onClick={load} className="ml-auto px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1a1210] border border-[#2a1e1c] text-slate-400 hover:text-white transition cursor-pointer">↻ Refresh</button>
      </div>
      {tab === 'records' && (
        <AdminTable>
          <thead><tr><Th>Invoice</Th><Th>Customer</Th><Th>Amount</Th><Th>Method</Th><Th>Txn ID</Th><Th>Date</Th><Th>Status</Th></tr></thead>
          <tbody>
            {records.map(row=>(
              <Tr key={row.id}>
                <Td><span className="font-bold text-white">{row.source === 'shop' ? row.id : row.label}</span></Td>
                <Td><div className="font-semibold text-white">{row.name}</div><div className="text-[10px] text-slate-500 capitalize">{row.source}</div></Td>
                <Td><span className="font-bold text-white">Rs {(row.amount||0).toLocaleString()}</span></Td>
                <Td><span className={`font-bold capitalize ${methodColors[row.method]||'text-slate-400'}`}>{row.method}</span></Td>
                <Td><span className="text-slate-300 text-xs">—</span></Td>
                <Td><span className="text-slate-400 text-xs">{String(row.date || '').slice(0, 10)}</span></Td>
                <Td><StatusBadge status={row.status}/></Td>
              </Tr>
            ))}
          </tbody>
        </AdminTable>
      )}
      {tab === 'verify' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {orders.filter(o=>o.payment_status==='pending'||o.screenshot).map(o=>(
            <div key={o.id} className={`bg-[#130d0d] border rounded-2xl p-4 space-y-3 transition cursor-pointer ${selected===o.id?'border-red-500/50':'border-[#2a1e1c] hover:border-[#3a2a26]'}`} onClick={()=>setSelected(selected===o.id?null:o.id)}>
              <div className="flex items-start justify-between">
                <div><div className="text-sm font-bold text-white">{o.customer_name}</div><div className="text-xs text-slate-500">{o.invoice_no} · {o.tool}</div></div>
                <div className="text-right"><div className="text-sm font-black text-white">Rs {(o.final_amount||0).toLocaleString()}</div><StatusBadge status={o.payment_status||'pending'}/></div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-[#1a1210] rounded-xl p-2"><div className="text-slate-500">Method</div><div className={`font-semibold capitalize ${methodColors[o.payment_method]||'text-white'}`}>{o.payment_method}</div></div>
                <div className="bg-[#1a1210] rounded-xl p-2"><div className="text-slate-500">Date</div><div className="text-white font-semibold">{o.order_date}</div></div>
                <div className="bg-[#1a1210] rounded-xl p-2"><div className="text-slate-500">Txn</div><div className="text-white font-semibold text-[10px] truncate">{o.transaction_id||'—'}</div></div>
              </div>
              {o.screenshot?<img src={o.screenshot} alt="payment" className="w-full h-28 object-cover rounded-xl border border-[#2a1e1c]"/>:<div className="bg-[#1a1210] border border-[#2a1e1c] rounded-xl h-20 flex items-center justify-center text-slate-600 text-xs">⏳ No screenshot</div>}
              {selected===o.id && (
                <div className="flex gap-2 pt-1">
                  <AdminBtn variant="green" onClick={e=>{e.stopPropagation();approve(o.id);}}><Check className="w-3 h-3"/> Approve</AdminBtn>
                  <AdminBtn variant="red" onClick={e=>{e.stopPropagation();reject(o.id);}}><X className="w-3 h-3"/> Reject</AdminBtn>
                  {o.screenshot && <AdminBtn onClick={e=>{e.stopPropagation();const a=document.createElement('a');a.href=o.screenshot;a.download='payment.png';a.click();}}><Download className="w-3 h-3"/> Save SS</AdminBtn>}
                </div>
              )}
            </div>
          ))}
          {!orders.filter(o=>o.payment_status==='pending'||o.screenshot).length && <div className="col-span-2 text-center py-12 text-slate-600 text-sm">No pending verifications</div>}
        </div>
      )}
    </div>
  );
};

/* ══ SUPPORT ══ */
export const SupportPage: React.FC = () => (
  <TicketsInbox mode="admin" account={{ id: 'admin', name: 'Admin Support', email: '', role: 'admin' }} />
);

/* ══ COUPONS ══ */
export const CouponsPage: React.FC = () => {
  const [,r]=useState(0); const refresh=()=>r(n=>n+1);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({code:'',type:'percent',value:10,usageLimit:100,expiry:'',active:true,minPurchase:0});
  const coupons = db.getCoupons();
  const handleCreate=()=>{
    if(!form.code.trim())return;
    db.addCoupon({...form,id:`CPN${Date.now()}`,usedCount:0,code:form.code.toUpperCase()});
    setShowForm(false); setForm({code:'',type:'percent',value:10,usageLimit:100,expiry:'',active:true,minPurchase:0}); refresh();
  };
  return (
    <div className="space-y-5">
      <SectionHeader title="Coupon Management" sub="Create and manage discount codes"
        action={<AdminBtn variant="red" onClick={()=>setShowForm(!showForm)}><Plus className="w-3 h-3"/> Create Coupon</AdminBtn>}/>
      {showForm && (
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">New Coupon</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([['Code','code','text'],['Value','value','number'],['Usage Limit','usageLimit','number'],['Min Purchase (Rs)','minPurchase','number'],['Expiry','expiry','date']] as [string,string,string][]).map(([l,k,t])=>(
              <div key={k}><label className="text-slate-400 block mb-1 text-[10px] uppercase">{l}</label>
                <input type={t} value={(form as any)[k]} onChange={e=>setForm(p=>({...p,[k]:t==='number'?Number(e.target.value):e.target.value}))} className="w-full bg-[#0d0908] border border-[#2a1e1c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 transition"/></div>
            ))}
            <div><label className="text-slate-400 block mb-1 text-[10px] uppercase">Type</label>
              <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className="w-full bg-[#0d0908] border border-[#2a1e1c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none"><option value="percent">Percentage</option><option value="flat">Flat</option></select></div>
          </div>
          <div className="flex gap-2"><AdminBtn variant="red" onClick={handleCreate}>Save Coupon</AdminBtn><AdminBtn onClick={()=>setShowForm(false)}>Cancel</AdminBtn></div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map(c=>(
          <div key={c.id} className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div><div className="text-lg font-black text-white tracking-widest">{c.code}</div><div className="text-xs text-slate-400 mt-0.5">{c.type==='percent'?`${c.value}% off`:`Rs ${c.value} off`}{c.minPurchase>0&&` · Min Rs ${c.minPurchase}`}</div></div>
              <button onClick={()=>{db.updateCoupon(c.id,{active:!c.active});refresh();}} className="cursor-pointer text-xs font-bold px-2 py-1 rounded-xl border transition" style={c.active?{background:'#16a34a22',color:'#4ade80',borderColor:'#16a34a44'}:{background:'#1a1210',color:'#666',borderColor:'#2a1e1c'}}>{c.active?'Active':'Paused'}</button>
            </div>
            <div className="space-y-1"><div className="flex justify-between text-xs text-slate-400"><span>Usage</span><span className="text-white font-bold">{c.usedCount}/{c.usageLimit}</span></div><ProgressBar value={c.usedCount} max={c.usageLimit}/></div>
            <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Exp: {c.expiry||'No limit'}</span><StatusBadge status={c.active?'active':'expired'}/></div>
            <AdminBtn variant="red" onClick={()=>{if(confirm('Delete?')){db.deleteCoupon(c.id);refresh();}}}><Trash2 className="w-3 h-3"/> Delete</AdminBtn>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ══ NOTIFICATIONS ══ */
export const NotificationsPage: React.FC<{
  onChange?: () => void;
  notes?: InboxNote[];
  onRead?: (id: string) => void | Promise<void>;
  onReadAll?: () => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  onDeleteRead?: () => void | Promise<void>;
}> = ({ onChange, notes: liveNotes, onRead, onReadAll, onDelete, onDeleteRead }) => {
  const [localNotes, setLocalNotes] = useState<InboxNote[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'sellers' | 'customers' | 'selected'>('sellers');
  const [picked, setPicked] = useState<string[]>([]);
  const [pickFilter, setPickFilter] = useState<'reseller' | 'user'>('user');
  const [pickQ, setPickQ] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const notes = liveNotes || localNotes;

  const load = async () => {
    const { data: c } = await supabase.from('customers').select('id,name,email,role,customer_code').order('name');
    setAccounts(c || []);
    if (!liveNotes) {
      const n = await loadNotes();
      setLocalNotes(n.filter(note => noteVisible(note, { id: 'admin', role: 'admin' })));
    }
    onChange?.();
  };
  useEffect(() => { load(); }, []);

  const pickList = accounts.filter(a =>
    (a.role || 'user') === pickFilter &&
    (!pickQ.trim() || `${a.name} ${a.email} ${a.customer_code || ''}`.toLowerCase().includes(pickQ.trim().toLowerCase()))
  );
  const togglePick = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const send = async () => {
    if (!title.trim() || !message.trim()) return setError('Title and message are required');
    setSaving(true); setError('');
    try {
      const selected = accounts.filter(a => picked.includes(a.id)).map(a => ({ id: a.id, role: a.role || 'user' }));
      await sendNotes({ title, message, mode, selected });
      setTitle(''); setMessage(''); setPicked([]);
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not send');
    }
    setSaving(false);
  };

  const icons: Record<string, string> = {
    order: '🛒', payment: '💳', expiry: '⏰', message: '💬', refund: '↩️', ticket: '🎫',
    'sent-sellers': '🏷️', 'sent-customers': '👤', 'sent-selected': '✉️',
  };
  const audienceLabel = (n: any) => {
    if (n.type === 'sent-sellers') return 'Sent to all sellers';
    if (n.type === 'sent-customers') return 'Sent to all customers';
    if (n.type === 'sent-selected') return 'Sent to selected accounts';
    return 'Admin inbox';
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Notifications Center" sub="Send updates to sellers and customers"/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-extrabold text-white">Send notification</h3>
          {error && <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-3 py-2 text-xs text-red-300">{error}</div>}
          <div>
            <label className={lblCls}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={inpCls} placeholder="Plan update, maintenance, offer…"/>
          </div>
          <div>
            <label className={lblCls}>Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
              className={`${inpCls} resize-none`} placeholder="Write the update sellers or customers should see"/>
          </div>
          <div>
            <label className={lblCls}>Send to</label>
            <div className="flex flex-wrap gap-2">
              {([['sellers','All sellers'],['customers','All customers'],['selected','Select accounts']] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setMode(id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition ${
                    mode === id ? 'bg-red-600 text-white' : 'bg-[#1a1210] border border-[#2a1e1c] text-slate-400 hover:text-white'
                  }`}>{label}</button>
              ))}
            </div>
          </div>
          {mode === 'selected' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button type="button" onClick={() => setPickFilter('user')} className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${pickFilter==='user'?'bg-red-600 text-white':'bg-[#1a1210] text-slate-400'}`}>Customers</button>
                <button type="button" onClick={() => setPickFilter('reseller')} className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${pickFilter==='reseller'?'bg-red-600 text-white':'bg-[#1a1210] text-slate-400'}`}>Sellers</button>
              </div>
              <input value={pickQ} onChange={e => setPickQ(e.target.value)} className={inpCls} placeholder="Search name or email"/>
              <div className="flex justify-end">
                <button type="button" className="text-[10px] font-bold text-red-400 cursor-pointer"
                  onClick={() => setPicked(prev => Array.from(new Set([...prev, ...pickList.map(a => a.id)])))}>
                  Select all shown
                </button>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1 bg-[#0d0908] border border-[#2a1e1c] rounded-xl p-2">
                {pickList.map(a => (
                  <label key={a.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#1a1210] cursor-pointer text-xs text-slate-300">
                    <input type="checkbox" checked={picked.includes(a.id)} onChange={() => togglePick(a.id)} className="accent-red-600"/>
                    <span className="font-semibold text-white">{a.name}</span>
                    <span className="text-slate-500 truncate">{a.email}</span>
                  </label>
                ))}
                {!pickList.length && <p className="text-[11px] text-slate-600 p-2">No accounts in this group</p>}
              </div>
              <p className="text-[10px] text-slate-500">{picked.length} selected</p>
            </div>
          )}
          <AdminBtn variant="red" onClick={send} disabled={saving}>{saving ? 'Sending…' : 'Send notification'}</AdminBtn>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold text-white">Inbox & sent</h3>
          <NotesInbox
            notes={notes}
            icons={icons}
            meta={audienceLabel}
            onRead={async id => {
              if (onRead) await onRead(id);
              else { await markNoteRead(id); await load(); }
            }}
            onReadAll={async () => {
              if (onReadAll) await onReadAll();
              else { await markNotesRead(notes.filter(n => !n.read).map(n => n.id)); await load(); }
            }}
            onDelete={async id => {
              if (onDelete) await onDelete(id);
              else { await deleteNote(id); await load(); }
            }}
            onDeleteRead={async () => {
              if (onDeleteRead) await onDeleteRead();
              else { await deleteNotes(notes.filter(n => n.read).map(n => n.id)); await load(); }
            }}
          />
        </div>
      </div>
    </div>
  );
};

/* ══ INVOICES ══ */

type InvoiceSource = SaleRow['source'];
type InvoiceRow = {
  id: string;
  invoiceNo: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCity: string;
  tool: string;
  duration: number;
  amount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  transactionId: string;
  notes: string;
  subStatus: string;
  activationDate: string;
  expiryDate: string;
  source: InvoiceSource;
};

function invoiceSourceLabel(source: InvoiceSource) {
  if (source === 'direct') return 'Plan sale';
  if (source === 'reseller') return 'Reseller sale';
  return 'Shop order';
}

function saleToInvoice(row: SaleRow, shopById: Map<string, any>, customersById: Map<string, any>, paymentsById: Map<string, any>): InvoiceRow {
  const shop = row.source === 'shop' ? shopById.get(row.id) : undefined;
  const payment = row.source === 'reseller' ? paymentsById.get(row.id) : undefined;
  const account = accountForSale(row, customersById, { payment, shop });
  const sub = liveSubscription(account, row.expiry || shop?.expiry_date || shop?.expiryDate || '', row.daysLeft ?? shop?.days_left ?? shop?.daysLeft);

  if (row.source === 'shop' && shop) {
    const paid = shop.payment_status === 'paid' || isApprovedSale(row);
    return {
      id: shop.id,
      invoiceNo: invoiceNumberFor(row, shop.invoice_no),
      orderDate: invoiceDateOnly(shop.order_date || row.date),
      customerName: shop.customer_name || row.name,
      customerEmail: shop.customer_email || account?.email || '',
      customerPhone: shop.customer_phone || account?.phone || '',
      customerCity: shop.customer_city || '',
      tool: shop.tool || row.label,
      duration: Number(shop.duration) || invoiceMonthsFromDays(sub.planDays),
      amount: Number(shop.amount) || row.amount,
      discount: Number(shop.discount) || 0,
      finalAmount: Number(shop.final_amount ?? row.amount),
      paymentMethod: shop.payment_method || row.method,
      paymentStatus: paid ? 'paid' : (shop.payment_status || 'pending'),
      transactionId: shop.transaction_id || '',
      notes: shop.notes || '',
      subStatus: sub.subStatus || shop.sub_status || (paid ? 'active' : 'pending'),
      activationDate: shop.activation_date || '',
      expiryDate: sub.expiry || shop.expiry_date || '',
      source: 'shop',
    };
  }

  const paid = isApprovedSale(row);

  return {
    id: row.id,
    invoiceNo: invoiceNumberFor(row),
    orderDate: invoiceDateOnly(row.date),
    customerName: account?.name || row.name,
    customerEmail: account?.email || payment?.member_email || '',
    customerPhone: account?.phone || payment?.member_phone || '',
    customerCity: account?.city || '',
    tool: sub.plan || row.label,
    duration: invoiceMonthsFromDays(sub.planDays),
    amount: row.amount,
    discount: 0,
    finalAmount: row.amount,
    paymentMethod: row.method,
    paymentStatus: paid ? 'paid' : 'pending',
    transactionId: payment?.id || '',
    notes: '',
    subStatus: sub.subStatus || (paid ? 'active' : 'pending'),
    activationDate: invoiceDateOnly(row.date),
    expiryDate: sub.expiry,
    source: row.source,
  };
}

const GenerateInvoiceModal: React.FC<{
  invoices: InvoiceRow[];
  onClose: () => void;
  onPick: (row: InvoiceRow) => void;
}> = ({ invoices, onClose, onPick }) => {
  const [q, setQ] = useState('');
  const matches = invoices.filter(o => {
    const hay = [o.customerName, o.invoiceNo, o.tool, o.id, o.customerEmail, o.customerPhone, invoiceSourceLabel(o.source)].join(' ').toLowerCase();
    return !q || hay.includes(q.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#130d0d] border border-[#3a2a26] rounded-3xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#2a1e1c]">
          <div>
            <h3 className="text-base font-extrabold text-white">Generate invoice</h3>
            <p className="text-xs text-slate-500 mt-1">Pick a paid sale, then download or print the receipt</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#1a1210] rounded-xl text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-5 pb-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search sales or accounts…"/>
        </div>
        <div className="px-5 pb-5 overflow-y-auto space-y-2">
          {matches.map(o => (
            <button key={o.id} onClick={() => onPick(o)}
              className="w-full text-left bg-[#1a1210] hover:bg-[#231a18] border border-[#2a1e1c] hover:border-red-500/40 rounded-2xl px-4 py-3 transition cursor-pointer">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-white">{o.customerName}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{o.invoiceNo} · {o.tool} · {invoiceSourceLabel(o.source)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-white">Rs {(o.finalAmount || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500">{o.orderDate || '—'}</div>
                </div>
              </div>
            </button>
          ))}
          {!matches.length && (
            <div className="text-center py-10 text-slate-600 text-sm">
              No paid sales to invoice. Plan fees on Accounts and reseller payments appear here automatically.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<InvoiceRow | null>(null);
  const [autoAction, setAutoAction] = useState<'pdf' | 'print' | null>(null);
  const [actionKey, setActionKey] = useState(0);
  const [search, setSearch] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);

  const loadInvoices = useCallback(async () => {
    const [{ data: orderRows }, { data: customerRows }, { data: paymentRows }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('reseller_payments').select('*').order('created_at', { ascending: false }),
    ]);
    const shopById = new Map((orderRows || []).map(row => [row.id, row]));
    const customersById = new Map((customerRows || []).map(row => [row.id, row]));
    const paymentsById = new Map((paymentRows || []).map(row => [row.id, row]));
    setInvoices(collectSales({
      orders: orderRows || [],
      customers: customerRows || [],
      payments: paymentRows || [],
    }).map(row => saleToInvoice(row, shopById, customersById, paymentsById)));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInvoices();
    const iv = setInterval(loadInvoices, 15000);
    const channel = supabase
      .channel('admin-invoices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { void loadInvoices(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => { void loadInvoices(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reseller_payments' }, () => { void loadInvoices(); })
      .subscribe();
    return () => {
      clearInterval(iv);
      void supabase.removeChannel(channel);
    };
  }, [loadInvoices]);

  const openInvoice = (row: InvoiceRow, action: 'pdf' | 'print' | null = null) => {
    setSelected(row);
    setAutoAction(action);
    setActionKey(k => k + 1);
  };

  const monthFrom = periodFrom('month');
  const thisMonth = invoices.filter(o => inPeriod(o.orderDate, monthFrom));
  const paid = invoices.filter(o => o.paymentStatus === 'paid');
  const monthAmount = thisMonth.reduce((sum, o) => sum + (o.finalAmount || 0), 0);

  const filtered = invoices.filter(o => {
    const q = search.toLowerCase();
    const hay = [o.customerName, o.invoiceNo, o.tool, o.id, o.customerEmail, o.customerPhone, invoiceSourceLabel(o.source)].join(' ').toLowerCase();
    return !q || hay.includes(q);
  });

  return (
    <div className="space-y-5">
      <SectionHeader title="Invoices" sub={`${invoices.length} total invoices`}/>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([['Total', invoices.length, 'text-white'], ['Paid', paid.length, 'text-emerald-400'], ['This month', thisMonth.length, 'text-red-400'], ['Month total', `Rs ${monthAmount.toLocaleString()}`, 'text-white']] as const).map(([l, v, c]) => (
          <div key={l} className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-3 text-center"><div className={`text-xl font-black ${c}`}>{v}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider">{l}</div></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search invoices…"/>
        <button onClick={() => setShowGenerate(true)} className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer">
          <FileText className="w-3.5 h-3.5"/> Generate invoice
        </button>
        <button onClick={() => { void loadInvoices(); }} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1a1210] border border-[#2a1e1c] text-slate-400 hover:text-white transition cursor-pointer">↻ Refresh</button>
      </div>
      {loading ? <div className="text-center py-12 text-slate-600 text-sm">Loading invoices…</div> : (
        <AdminTable>
          <thead><tr><Th>Invoice</Th><Th>Customer</Th><Th>Tool</Th><Th>Amount</Th><Th>Date</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {filtered.map(o => (
              <Tr key={o.id} onClick={() => openInvoice(o)}>
                <Td><span className="font-bold text-white">{o.invoiceNo}</span></Td>
                <Td>
                  <div className="text-white">{o.customerName}</div>
                  <div className="text-[10px] text-slate-500">{o.customerEmail || invoiceSourceLabel(o.source)}</div>
                </Td>
                <Td>{o.tool}{o.duration ? ` · ${o.duration}mo` : ''}</Td>
                <Td><span className="font-bold text-white">Rs {(o.finalAmount || 0).toLocaleString()}</span></Td>
                <Td>{o.orderDate || '—'}</Td>
                <Td><StatusBadge status={o.paymentStatus || 'pending'}/></Td>
                <Td>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <AdminBtn onClick={() => openInvoice(o)}><Eye className="w-3 h-3"/></AdminBtn>
                    <AdminBtn variant="blue" onClick={() => openInvoice(o, 'pdf')}><Download className="w-3 h-3"/></AdminBtn>
                    <AdminBtn onClick={() => openInvoice(o, 'print')}><Printer className="w-3 h-3"/></AdminBtn>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </AdminTable>
      )}
      {!loading && !filtered.length && (
        <div className="text-center py-12 text-slate-600 text-sm">
          {invoices.length ? 'No invoices found' : 'No invoices found. Paid plan sales and reseller payments appear here automatically.'}
        </div>
      )}
      {selected && (
        <InvoiceModal
          key={`${selected.id}-${actionKey}`}
          order={selected}
          autoAction={autoAction}
          onClose={() => { setSelected(null); setAutoAction(null); }}
        />
      )}
      {showGenerate && (
        <GenerateInvoiceModal
          invoices={invoices}
          onClose={() => setShowGenerate(false)}
          onPick={row => { setShowGenerate(false); openInvoice(row); }}
        />
      )}
    </div>
  );
};

/* ══ SETTINGS ══ */
export const SettingsPage: React.FC = () => {
  const [form,setForm]=useState(db.getSettings());
  const [saved,setSaved]=useState(false);

  const save=()=>{db.saveSettings(form);setSaved(true);setTimeout(()=>setSaved(false),2000);};
  const Field=({label,k,type='text'}:{label:string;k:keyof typeof form;type?:string})=>(
    <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{label}</label>
      <input type={type} value={String(form[k])} onChange={e=>setForm(p=>({...p,[k]:type==='number'?Number(e.target.value):e.target.value}))} className="w-full bg-[#1a1210] border border-[#2a1e1c] focus:border-red-500/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition"/></div>
  );
  return (
    <div className="space-y-5 max-w-3xl">
      <SectionHeader title="Settings" sub="Configure your site and admin panel"/>
      {saved && <div className="bg-emerald-900/30 border border-emerald-500/40 text-emerald-400 text-sm font-bold px-4 py-2 rounded-xl">✅ Settings saved!</div>}
      {[{title:'General',fields:[['Site Name','siteName'],['Contact Email','contactEmail'],['WhatsApp','whatsapp'],['Currency','currency'],['Invoice Prefix','invoicePrefix'],['Tax %','taxPercent','number']]},{title:'Payment Methods',fields:[['EasyPaisa','easypaisa'],['JazzCash','jazzcash'],['PayPal Email','paypalEmail'],['Bank Name','bankName'],['Bank Account','bankAccount']]}].map(s=>(
        <div key={s.title} className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-white border-b border-[#2a1e1c] pb-3">{s.title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{s.fields.map(([l,k,t])=><span key={String(k)}><Field label={l} k={k as any} type={t}/></span>)}</div>
        </div>
      ))}
      <DeviceLimitsToggle compact />
      <GlobalProxyEngine />
      <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5 flex items-center justify-between">
        <div><h3 className="text-sm font-extrabold text-white">Maintenance Mode</h3><p className="text-xs text-slate-400 mt-1">Disable public site access</p></div>
        <button onClick={()=>setForm(p=>({...p,maintenanceMode:!p.maintenanceMode}))} className="cursor-pointer text-xs font-bold px-3 py-1.5 rounded-xl border transition" style={form.maintenanceMode?{background:'#dc262622',color:'#f87171',borderColor:'#dc262644'}:{background:'#1a1210',color:'#666',borderColor:'#2a1e1c'}}>{form.maintenanceMode?'ON':'OFF'}</button>
      </div>
      <button onClick={save} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl transition cursor-pointer">Save All Settings</button>
    </div>
  );
};

/* ══ BANNERS ══ */
export const BannersPage: React.FC = () => {
  const [,r]=useState(0); const refresh=()=>r(n=>n+1);
  const [form,setForm]=useState({imageUrl:'',link:'',active:true});
  const [showForm,setShowForm]=useState(false);
  const [uploadMode,setUploadMode]=useState<'url'|'file'>('url');
  const [uploading,setUploading]=useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const banners = bannerDb.get();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setForm(p => ({ ...p, imageUrl: dataUrl }));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = () => {
    if (!form.imageUrl.trim()) { alert('Please add an image URL or upload a file'); return; }
    bannerDb.add({ ...form, order: banners.length });
    // Trigger storage event so homepage picks it up live
    window.dispatchEvent(new Event('focus'));
    setForm({ imageUrl:'', link:'', active:true });
    setUploadMode('url');
    setShowForm(false);
    refresh();
  };

  const handleToggle = (b: any) => {
    bannerDb.update(b.id, { active: !b.active });
    window.dispatchEvent(new Event('focus'));
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this banner?')) return;
    bannerDb.remove(id);
    window.dispatchEvent(new Event('focus'));
    refresh();
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Banner Management" sub="Banners appear full-width below the hero on the home page. Multiple banners auto-slide every 5s."
        action={<AdminBtn variant="red" onClick={()=>setShowForm(!showForm)}><Plus className="w-3 h-3"/> Add Banner</AdminBtn>}/>

      {showForm && (
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">New Banner</h3>

          {/* Mode toggle */}
          <div className="flex gap-2">
            {(['url','file'] as const).map(m => (
              <button key={m} onClick={()=>setUploadMode(m)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${uploadMode===m?'bg-red-600 text-white':'bg-[#1a1210] border border-[#2a1e1c] text-slate-400 hover:text-white'}`}>
                {m === 'url' ? '🔗 Paste URL' : '📁 Upload from Device'}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {uploadMode === 'url' ? (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Image URL *</label>
                <input value={form.imageUrl} onChange={e=>setForm(p=>({...p,imageUrl:e.target.value}))}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition"/>
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Upload Image *</label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload}/>
                <button onClick={()=>fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#3a2a26] hover:border-red-500/40 rounded-xl h-24 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-300 transition cursor-pointer">
                  {uploading ? (
                    <><div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"/><span className="text-xs">Processing…</span></>
                  ) : form.imageUrl && uploadMode==='file' ? (
                    <><span className="text-emerald-400 text-xs font-bold">✓ Image loaded — click to change</span></>
                  ) : (
                    <><span className="text-2xl">📂</span><span className="text-xs">Click to choose from gallery / device</span><span className="text-[10px] text-slate-600">JPG, PNG, GIF, WebP</span></>
                  )}
                </button>
              </div>
            )}

            {/* Preview */}
            {form.imageUrl && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Preview</label>
                <img src={form.imageUrl} alt="preview" className="w-full max-h-40 object-cover rounded-xl border border-[#2a1e1c]"
                  onError={e=>(e.currentTarget.style.display='none')}/>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Click Link (optional — where banner takes user when clicked)</label>
              <input value={form.link} onChange={e=>setForm(p=>({...p,link:e.target.value}))}
                placeholder="https://yoursite.com/plans"
                className="w-full bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition"/>
            </div>

            <div className="flex gap-2">
              <AdminBtn variant="red" onClick={handleAdd} disabled={uploading}>
                {uploading ? 'Processing…' : 'Add Banner to Site'}
              </AdminBtn>
              <AdminBtn onClick={()=>{setShowForm(false);setForm({imageUrl:'',link:'',active:true});setUploadMode('url');}}>Cancel</AdminBtn>
            </div>
          </div>
        </div>
      )}

      {!banners.length && !showForm && (
        <div className="text-center py-16 bg-[#130d0d] border border-[#2a1e1c] rounded-2xl text-slate-600 text-sm space-y-2">
          <div className="text-4xl">🖼️</div><p>No banners yet. Click "Add Banner" above.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {banners.map((b:any)=>(
          <div key={b.id} className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl overflow-hidden">
            <img src={b.imageUrl} alt="banner" className="w-full max-h-48 object-cover"
              onError={e=>(e.currentTarget.style.display='none')}/>
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                  {b.imageUrl.startsWith('data:') ? '📁 Uploaded file' : '🔗 ' + b.imageUrl.slice(0,50) + '…'}
                </div>
                {b.link ? <a href={b.link} target="_blank" rel="noopener noreferrer" className="text-xs text-red-400 hover:text-red-300 truncate block">→ {b.link}</a>
                  : <span className="text-xs text-slate-600">No click link</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={()=>handleToggle(b)} className="cursor-pointer text-xs font-bold px-3 py-1.5 rounded-xl border transition"
                  style={b.active?{background:'#16a34a22',color:'#4ade80',borderColor:'#16a34a44'}:{background:'#1a1210',color:'#666',borderColor:'#2a1e1c'}}>
                  {b.active ? '● Active' : '○ Hidden'}
                </button>
                <AdminBtn variant="red" onClick={()=>handleDelete(b.id)}><Trash2 className="w-3 h-3"/></AdminBtn>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
