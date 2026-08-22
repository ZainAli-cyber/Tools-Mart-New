import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Check, X, RefreshCw, Trash2, Plus } from 'lucide-react';
import { Order } from '../data/adminStore';
import { supabase } from '../../lib/db';
import { notifyAdminAndOwner } from '../../lib/notifications';
import { accountForSale, collectSales, liveSubscription, type SaleRow } from '../../lib/sales';
import { SectionHeader, AdminTable, Th, Td, Tr, StatusBadge, DaysLeftBadge, AdminBtn, SearchInput, ProgressBar, Badge } from '../components/AdminUI';

const PAYMENT_METHODS = ['easypaisa','jazzcash','bank','whatsapp','screenshot','prepaid','other'];
const TOOLS_LIST = ['Semrush','Canva Pro','ChatGPT Plus','CapCut Pro','Envato Elements','Udemy','Ahrefs','Grammarly','Adobe CC','Midjourney','Other'];

function toCamel(o: any): Order {
  return {
    id: o.id, invoiceNo: o.invoice_no, orderDate: o.order_date,
    customerName: o.customer_name, customerEmail: o.customer_email,
    customerPhone: o.customer_phone, customerCity: o.customer_city || '',
    whatsapp: o.whatsapp || '', tool: o.tool, duration: o.duration,
    amount: o.amount, discount: o.discount || 0, finalAmount: o.final_amount,
    status: o.status, paymentMethod: o.payment_method, paymentStatus: o.payment_status,
    transactionId: o.transaction_id || '', notes: o.notes || '',
    adminNotes: o.admin_notes || '', subStatus: o.sub_status || 'pending',
    activationDate: o.activation_date || '', expiryDate: o.expiry_date || '',
    daysLeft: o.days_left || 0, screenshot: o.screenshot || null,
  };
}

type OrderSource = SaleRow['source'];
type DisplayOrder = Order & { source: OrderSource };

function dateOnly(value: string) {
  return String(value || '').slice(0, 10);
}

function monthsFromDays(days: number) {
  if (!days || days <= 0) return 0;
  return Math.max(1, Math.round(days / 30));
}

function saleToDisplay(row: SaleRow, shopById: Map<string, Order>, customersById: Map<string, any>, paymentsById: Map<string, any>): DisplayOrder {
  const shop = row.source === 'shop' ? shopById.get(row.id) : undefined;
  const payment = row.source === 'reseller' ? paymentsById.get(row.id) : undefined;
  const account = accountForSale(row, customersById, { payment, shop });
  const sub = liveSubscription(account, row.expiry || shop?.expiryDate || '', row.daysLeft ?? shop?.daysLeft);

  if (row.source === 'shop' && shop) {
    return {
      ...shop,
      source: 'shop',
      expiryDate: sub.expiry || shop.expiryDate,
      daysLeft: sub.daysLeft,
      subStatus: sub.subStatus || shop.subStatus || 'pending',
    };
  }

  return {
    id: row.id,
    invoiceNo: row.id,
    orderDate: dateOnly(row.date),
    customerName: account?.name || row.name,
    customerEmail: account?.email || '',
    customerPhone: account?.phone || payment?.member_phone || '',
    customerCity: account?.city || '',
    whatsapp: account?.phone || '',
    tool: sub.plan || row.label,
    duration: monthsFromDays(sub.planDays),
    amount: row.amount,
    discount: 0,
    finalAmount: row.amount,
    status: row.status || 'approved',
    paymentMethod: row.method,
    paymentStatus: 'paid',
    transactionId: payment?.id || '',
    notes: '',
    adminNotes: '',
    subStatus: sub.subStatus,
    activationDate: dateOnly(row.date),
    expiryDate: sub.expiry,
    daysLeft: sub.daysLeft,
    screenshot: null,
    source: row.source,
  };
}

function sourceLabel(source: OrderSource) {
  if (source === 'direct') return 'Plan sale';
  if (source === 'reseller') return 'Reseller sale';
  return 'Shop order';
}

/* ── Add Order Modal ── */
const AddOrderModal: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [custMode, setCustMode] = useState<'select'|'new'>('select');
  const [selectedCust, setSelectedCust] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerName: '', customerEmail: '', customerPhone: '', customerCity: '',
    tool: TOOLS_LIST[0], customTool: '', duration: 1, amount: 0, discount: 0,
    paymentMethod: 'easypaisa', transactionId: '', paymentStatus: 'paid',
    status: 'approved', subStatus: 'active', notes: '',
    activationDate: new Date().toISOString().slice(0,10), expiryDate: '',
  });

  useEffect(() => {
    supabase.from('customers').select('*').order('created_at', { ascending: false }).then(({ data }) => setCustomers(data || []));
  }, []);

  useEffect(() => {
    if (selectedCust) {
      const c = customers.find(x => x.id === selectedCust);
      if (c) setForm(f => ({ ...f, customerName: c.name, customerEmail: c.email || '', customerPhone: c.phone || '', customerCity: c.city || '' }));
    }
  }, [selectedCust, customers]);

  useEffect(() => {
    if (form.activationDate && form.duration) {
      const d = new Date(form.activationDate);
      d.setMonth(d.getMonth() + Number(form.duration));
      setForm(f => ({ ...f, expiryDate: d.toISOString().slice(0,10) }));
    }
  }, [form.activationDate, form.duration]);

  const finalAmount = Math.max(0, Number(form.amount) - Number(form.discount));
  const toolName = form.tool === 'Other' ? form.customTool : form.tool;

  const save = async () => {
    if (!form.customerName || !toolName || !form.amount) return alert('Fill required fields');
    setSaving(true);
    const orderId = 'ORD' + Date.now();
    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const invoiceNo = `INV-${String(100 + (count || 0)).padStart(4,'0')}`;

    // Upsert customer
    let custId = selectedCust;
    if (custMode === 'new' || !custId) {
      const { data: nc } = await supabase.from('customers').insert({
        name: form.customerName, email: form.customerEmail,
        phone: form.customerPhone, city: form.customerCity,
        status: 'active', total_orders: 1, total_spend: finalAmount,
        join_date: new Date().toISOString().slice(0,10),
      }).select().single();
      custId = nc?.id || '';
    } else {
      const c = customers.find(x => x.id === custId);
      if (c) await supabase.from('customers').update({ total_orders: (c.total_orders||0)+1, total_spend: (c.total_spend||0)+finalAmount }).eq('id', custId);
    }

    await supabase.from('orders').insert({
      id: orderId, invoice_no: invoiceNo,
      order_date: new Date().toISOString().slice(0,10),
      customer_id: custId || null,
      customer_name: form.customerName, customer_email: form.customerEmail,
      customer_phone: form.customerPhone, customer_city: form.customerCity,
      whatsapp: form.customerPhone, tool: toolName, duration: Number(form.duration),
      amount: Number(form.amount), discount: Number(form.discount), final_amount: finalAmount,
      status: form.status, payment_method: form.paymentMethod,
      payment_status: form.paymentStatus, transaction_id: form.transactionId,
      notes: form.notes, admin_notes: '', sub_status: form.subStatus,
      activation_date: form.activationDate || null, expiry_date: form.expiryDate || null,
      days_left: 0,
    });

    // Add payment record
    await supabase.from('activity_log').insert({
      id: 'PAY' + Date.now(), action: 'Payment',
      detail: `${form.customerName} paid Rs ${finalAmount.toLocaleString()} via ${form.paymentMethod} for ${toolName} (${invoiceNo}) — Txn: ${form.transactionId || 'N/A'}`,
      created_at: new Date().toISOString(),
    });

    await notifyAdminAndOwner({
      title: '💰 New Order',
      message: `${form.customerName} ordered ${toolName} via ${form.paymentMethod} — Rs ${finalAmount.toLocaleString()}`,
      type: 'order',
      customerId: custId || null,
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail,
    });

    setSaving(false);
    onSaved();
    onClose();
  };

  const inp = 'w-full bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition';
  const lbl = 'text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl bg-[#130d0d] border border-[#3a2a26] rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#2a1e1c]">
          <h3 className="text-base font-extrabold text-white">➕ Add Manual Order</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#1a1210] rounded-xl text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-5 space-y-5">

          {/* Customer Section */}
          <div>
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">👤 Customer</div>
            <div className="flex gap-2 mb-3">
              {(['select','new'] as const).map(m => (
                <button key={m} onClick={()=>setCustMode(m)} className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${custMode===m?'bg-red-600 text-white':'bg-[#1a1210] border border-[#2a1e1c] text-slate-400 hover:text-white'}`}>
                  {m === 'select' ? '📋 Select Existing' : '➕ New Customer'}
                </button>
              ))}
            </div>
            {custMode === 'select' ? (
              <div>
                <label className={lbl}>Select Customer</label>
                <select value={selectedCust} onChange={e=>setSelectedCust(e.target.value)} className={inp}>
                  <option value="">— Choose customer —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone || c.email})</option>)}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[['Name *','customerName','text'],['Phone *','customerPhone','text'],['Email','customerEmail','email'],['City','customerCity','text']].map(([l,k,t]) => (
                  <div key={k}>
                    <label className={lbl}>{l}</label>
                    <input type={t} value={(form as any)[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className={inp} placeholder={l.replace(' *','')}/>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Details */}
          <div>
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">📦 Order Details</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Tool *</label>
                <select value={form.tool} onChange={e=>setForm(f=>({...f,tool:e.target.value}))} className={inp}>
                  {TOOLS_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {form.tool === 'Other' && (
                <div>
                  <label className={lbl}>Tool Name *</label>
                  <input value={form.customTool} onChange={e=>setForm(f=>({...f,customTool:e.target.value}))} className={inp} placeholder="Enter tool name"/>
                </div>
              )}
              <div>
                <label className={lbl}>Duration (Months)</label>
                <select value={form.duration} onChange={e=>setForm(f=>({...f,duration:Number(e.target.value)}))} className={inp}>
                  {[1,2,3,6,12].map(n => <option key={n} value={n}>{n} Month{n>1?'s':''}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Amount (Rs) *</label>
                <input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:Number(e.target.value)}))} className={inp} placeholder="0"/>
              </div>
              <div>
                <label className={lbl}>Discount (Rs)</label>
                <input type="number" value={form.discount} onChange={e=>setForm(f=>({...f,discount:Number(e.target.value)}))} className={inp} placeholder="0"/>
              </div>
              <div>
                <label className={lbl}>Final Amount</label>
                <div className="bg-[#0d0908] border border-red-500/30 rounded-xl px-3 py-2.5 text-sm font-bold text-red-400">Rs {finalAmount.toLocaleString()}</div>
              </div>
              <div>
                <label className={lbl}>Activation Date</label>
                <input type="date" value={form.activationDate} onChange={e=>setForm(f=>({...f,activationDate:e.target.value}))} className={inp}/>
              </div>
              <div>
                <label className={lbl}>Expiry Date</label>
                <input type="date" value={form.expiryDate} onChange={e=>setForm(f=>({...f,expiryDate:e.target.value}))} className={inp}/>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">💳 Payment</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Payment Method *</label>
                <select value={form.paymentMethod} onChange={e=>setForm(f=>({...f,paymentMethod:e.target.value}))} className={inp}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Payment Status</label>
                <select value={form.paymentStatus} onChange={e=>setForm(f=>({...f,paymentStatus:e.target.value}))} className={inp}>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Transaction ID</label>
                <input value={form.transactionId} onChange={e=>setForm(f=>({...f,transactionId:e.target.value}))} className={inp} placeholder="Txn / Ref number"/>
              </div>
              <div>
                <label className={lbl}>Order Status</label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className={inp}>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className={lbl}>Notes</label>
              <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} className={inp + ' resize-none'} placeholder="Any notes…"/>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-[#2a1e1c] flex gap-2 justify-end">
          <AdminBtn onClick={onClose}>Cancel</AdminBtn>
          <AdminBtn variant="green" onClick={save} disabled={saving}>{saving ? 'Saving…' : '✓ Save Order'}</AdminBtn>
        </div>
      </div>
    </div>
  );
};

/* ── View Order Modal ── */
const OrderModal: React.FC<{ order: DisplayOrder; onClose: () => void; onUpdate: () => void }> = ({ order, onClose, onUpdate }) => {
  const [adminNotes, setAdminNotes] = useState(order.adminNotes);
  const isShop = order.source === 'shop';
  const update = async (patch: any) => {
    if (!isShop) return;
    const snakePatch: any = {};
    if (patch.status !== undefined) snakePatch.status = patch.status;
    if (patch.paymentStatus !== undefined) snakePatch.payment_status = patch.paymentStatus;
    if (patch.subStatus !== undefined) snakePatch.sub_status = patch.subStatus;
    if (patch.activationDate !== undefined) snakePatch.activation_date = patch.activationDate;
    if (patch.adminNotes !== undefined) snakePatch.admin_notes = patch.adminNotes;
    await supabase.from('orders').update(snakePatch).eq('id', order.id);
    onUpdate(); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl bg-[#130d0d] border border-[#3a2a26] rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#2a1e1c]">
          <div><h3 className="text-base font-extrabold text-white">{order.invoiceNo}</h3><p className="text-xs text-slate-400">{sourceLabel(order.source)} · {order.id} · {order.orderDate}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-[#1a1210] rounded-xl text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3 text-xs">
          {[['Customer',order.customerName],['Email',order.customerEmail],['Phone',order.customerPhone],['WhatsApp',order.whatsapp],['City',order.customerCity],['Tool',order.tool],['Duration',`${order.duration} Month(s)`],['Amount',`Rs ${order.amount.toLocaleString()}`],['Discount',`Rs ${order.discount.toLocaleString()}`],['Final',`Rs ${order.finalAmount.toLocaleString()}`],['Payment',order.paymentMethod],['Txn ID',order.transactionId||'—'],['Status',order.status],['Sub Status',order.subStatus],['Activation',order.activationDate||'—'],['Expiry',order.expiryDate||'—']].map(([k,v])=>(
            <div key={k} className="bg-[#1a1210] border border-[#2a1e1c] rounded-xl p-3"><div className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">{k}</div><div className="text-white font-semibold">{v}</div></div>
          ))}
        </div>
        {order.screenshot && <div className="px-5 pb-3"><div className="text-xs font-bold text-slate-400 mb-2">Payment Screenshot</div><img src={order.screenshot} alt="payment" className="rounded-2xl border border-[#2a1e1c] max-h-48 object-contain w-full bg-[#1a1210]"/></div>}
        {order.activationDate && order.duration > 0 && (
          <div className="px-5 pb-3">
            <div className="text-xs text-slate-400 mb-2 font-bold">Subscription Progress</div>
            <ProgressBar value={order.daysLeft} max={order.duration * 30}/>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>{order.activationDate}</span><DaysLeftBadge days={order.daysLeft} expiry={order.expiryDate}/><span>{order.expiryDate}</span></div>
          </div>
        )}
        {isShop && (
          <div className="px-5 pb-3">
            <div className="text-xs font-bold text-slate-400 mb-1">Admin Notes</div>
            <textarea value={adminNotes} onChange={e=>setAdminNotes(e.target.value)} onBlur={()=>update({adminNotes})} rows={2}
              className="w-full bg-[#1a1210] border border-[#2a1e1c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 transition resize-none" placeholder="Private admin notes…"/>
          </div>
        )}
        {isShop ? (
          <div className="p-5 border-t border-[#2a1e1c] flex flex-wrap gap-2">
            <AdminBtn variant="green" onClick={()=>update({status:'approved',paymentStatus:'paid',subStatus:'active',activationDate:new Date().toISOString().slice(0,10)})}><Check className="w-3 h-3"/> Approve</AdminBtn>
            <AdminBtn variant="red" onClick={()=>update({status:'rejected'})}><X className="w-3 h-3"/> Reject</AdminBtn>
            <AdminBtn variant="amber" onClick={()=>update({status:'approved',subStatus:'renewed'})}><RefreshCw className="w-3 h-3"/> Renew</AdminBtn>
            <AdminBtn onClick={()=>update({paymentStatus:'paid'})}>Mark Paid</AdminBtn>
            <AdminBtn onClick={()=>update({status:'refunded'})}>Refund</AdminBtn>
            <AdminBtn variant="red" onClick={()=>update({subStatus:'suspended'})}>Suspend</AdminBtn>
          </div>
        ) : (
          <div className="p-5 border-t border-[#2a1e1c] text-[11px] text-slate-500">This {sourceLabel(order.source).toLowerCase()} is recorded from accounts/payments and is view-only.</div>
        )}
      </div>
    </div>
  );
};

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<DisplayOrder|null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const loadOrders = useCallback(async () => {
    const [{ data: orderRows }, { data: customerRows }, { data: paymentRows }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('reseller_payments').select('*').order('created_at', { ascending: false }),
    ]);
    const shopById = new Map((orderRows || []).map(row => [row.id, toCamel(row)]));
    const customersById = new Map((customerRows || []).map(row => [row.id, row]));
    const paymentsById = new Map((paymentRows || []).map(row => [row.id, row]));
    setOrders(collectSales({
      orders: orderRows || [],
      customers: customerRows || [],
      payments: paymentRows || [],
    }).map(row => saleToDisplay(row, shopById, customersById, paymentsById)));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
    const iv = setInterval(loadOrders, 15000);
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { void loadOrders(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => { void loadOrders(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reseller_payments' }, () => { void loadOrders(); })
      .subscribe();
    return () => {
      clearInterval(iv);
      void supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  const deleteOrder = async (id: string) => {
    if (!confirm('Delete?')) return;
    await supabase.from('orders').delete().eq('id', id);
    loadOrders();
  };

  const quickApprove = async (id: string) => {
    await supabase.from('orders').update({ status: 'approved', payment_status: 'paid', sub_status: 'active', activation_date: new Date().toISOString().slice(0,10) }).eq('id', id);
    loadOrders();
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const hay = [o.customerName, o.invoiceNo, o.tool, o.id, o.customerEmail, o.customerPhone, o.paymentMethod, sourceLabel(o.source)].join(' ').toLowerCase();
    return (!q || hay.includes(q)) && (filter === 'all' || o.status === filter);
  });

  return (
    <div className="space-y-5">
      <SectionHeader title="Orders Management" sub={`${orders.length} total orders`}/>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[['Total',orders.length,'text-white'],['Approved',orders.filter(o=>o.status==='approved').length,'text-emerald-400'],['Pending',orders.filter(o=>o.status==='pending').length,'text-amber-400'],['Rejected',orders.filter(o=>o.status==='rejected').length,'text-red-400'],['Refunded',orders.filter(o=>o.status==='refunded').length,'text-purple-400']].map(([l,v,c])=>(
          <div key={String(l)} className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-3 text-center"><div className={`text-xl font-black ${c}`}>{v}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider">{l}</div></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search orders…"/>
        <div className="flex gap-2 flex-wrap">
          {['all','pending','approved','rejected','refunded','cancelled'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer capitalize ${filter===s?'bg-red-600 text-white':'bg-[#1a1210] border border-[#2a1e1c] text-slate-400 hover:text-white'}`}>{s}</button>
          ))}
        </div>
        <button onClick={()=>setShowAdd(true)} className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer">
          <Plus className="w-3.5 h-3.5"/> Add Order
        </button>
        <button onClick={loadOrders} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1a1210] border border-[#2a1e1c] text-slate-400 hover:text-white transition cursor-pointer">↻ Refresh</button>
      </div>
      {loading ? <div className="text-center py-12 text-slate-600 text-sm">Loading orders…</div> : (
        <AdminTable>
          <thead><tr><Th>Invoice</Th><Th>Customer</Th><Th>Tool</Th><Th>Dur</Th><Th>Amount</Th><Th>Method</Th><Th>Status</Th><Th>Sub</Th><Th>Days</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {filtered.map(o=>(
              <Tr key={o.id} onClick={()=>setSelected(o)}>
                <Td><span className="font-bold text-white">{o.invoiceNo}</span><br/><span className="text-[10px] text-slate-600">{o.orderDate}</span></Td>
                <Td><div className="font-semibold text-white">{o.customerName}</div><div className="text-[10px] text-slate-500">{o.customerCity || sourceLabel(o.source)}</div></Td>
                <Td>{o.tool}</Td><Td>{o.duration ? `${o.duration}mo` : '—'}</Td>
                <Td><span className="font-bold text-white">Rs {(o.finalAmount || 0).toLocaleString()}</span></Td>
                <Td><Badge variant="blue">{o.paymentMethod}</Badge></Td>
                <Td><StatusBadge status={o.status}/></Td>
                <Td><StatusBadge status={o.subStatus||'pending'}/></Td>
                <Td><DaysLeftBadge days={o.daysLeft ?? -1} expiry={o.expiryDate}/></Td>
                <Td><div className="flex gap-1" onClick={e=>e.stopPropagation()}>
                  <AdminBtn onClick={()=>setSelected(o)}><Eye className="w-3 h-3"/></AdminBtn>
                  {o.source === 'shop' && (
                    <>
                      <AdminBtn variant="green" onClick={()=>quickApprove(o.id)}><Check className="w-3 h-3"/></AdminBtn>
                      <AdminBtn variant="red" onClick={()=>deleteOrder(o.id)}><Trash2 className="w-3 h-3"/></AdminBtn>
                    </>
                  )}
                </div></Td>
              </Tr>
            ))}
          </tbody>
        </AdminTable>
      )}
      {!loading && !filtered.length && <div className="text-center py-12 text-slate-600 text-sm">No orders found</div>}
      {selected && <OrderModal order={selected} onClose={()=>setSelected(null)} onUpdate={loadOrders}/>}
      {showAdd && <AddOrderModal onClose={()=>setShowAdd(false)} onSaved={loadOrders}/>}
    </div>
  );
};
