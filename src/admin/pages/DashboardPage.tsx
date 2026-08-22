import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ShoppingCart, Users, DollarSign, Wrench, Clock, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/db';
import { StatCard, SectionHeader, ProgressBar, StatusBadge, DaysLeftBadge } from '../components/AdminUI';
import { PeriodPills } from '../../components/PeriodPills';
import { inPeriod, moneyTick, periodFrom, trendKey, trendPoints, type PeriodKey } from '../../lib/period';
import { noteVisible } from '../../lib/notifications';
import { collectSales, isApprovedSale } from '../../lib/sales';
import { daysLeft } from '../../lib/accountStore';

const PIE_COLORS = ['#cc1a1a','#dc2626','#f97316','#ef4444','#b91c1c'];
const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return <div className="bg-[#1a1210] border border-[#3a2a26] rounded-xl px-3 py-2 text-xs shadow-xl"><p className="text-slate-400 mb-1">{label}</p>{payload.map((p:any,i:number)=><p key={i} style={{color:p.color}} className="font-bold">{p.name}: {p.value}</p>)}</div>;
};

function useCount(target: number) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = Date.now(); const dur = 1200;
    const tick = () => { const p=Math.min((Date.now()-start)/dur,1); setVal(Math.floor(p*target)); if(p<1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, [target]);
  return val;
}

export const DashboardPage: React.FC<{ onNavigate: (p: any) => void }> = ({ onNavigate }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [period, setPeriod] = useState<PeriodKey>('month');

  const load = useCallback(async () => {
    const [{ data: o }, { data: c }, { data: p }, { data: t }, { data: n }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('reseller_payments').select('*').order('created_at', { ascending: false }),
      supabase.from('tools').select('*'),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setOrders(o || []);
    setCustomers(c || []);
    setPayments(p || []);
    setTools(t || []);
    setNotifications(n || []);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 20000);
    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { void load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => { void load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reseller_payments' }, () => { void load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => { void load(); })
      .subscribe();
    return () => {
      clearInterval(iv);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const from = periodFrom(period);
  const accounts = customers.filter(c => c.role !== 'admin');
  const sales = collectSales({ orders, customers, payments }).filter(row => inPeriod(row.date, from));
  const approved = sales.filter(isApprovedSale);
  const totalRevenue = approved.reduce((sum, row) => sum + row.amount, 0);
  const pending = orders.filter(o => o.status === 'pending' || o.payment_status === 'pending');
  const expiring = accounts.filter(c => {
    const left = daysLeft(c.expiry || '');
    return left >= 0 && left <= 5;
  });
  const newCustomers = accounts.filter(c => inPeriod(c.join_date || c.created_at, from)).length;

  const rev = useCount(totalRevenue);
  const cust = useCount(newCustomers);
  const ord = useCount(sales.length);

  const monthly = trendPoints(period);
  approved.forEach(row => {
    const point = monthly.find(item => item.key === trendKey(row.date, period));
    if (point) { point.revenue += row.amount; point.orders += 1; }
  });

  const toolRev: Record<string,{revenue:number;sales:number}> = {};
  approved.forEach(row => {
    const name = row.label || 'Other';
    if (!toolRev[name]) toolRev[name] = { revenue: 0, sales: 0 };
    toolRev[name].revenue += row.amount;
    toolRev[name].sales += 1;
  });
  const toolRevArr = Object.entries(toolRev).map(([name,d])=>({name,...d})).sort((a,b)=>b.revenue-a.revenue);

  const pmCount: Record<string,number> = {};
  sales.forEach(row => { pmCount[row.method || 'other'] = (pmCount[row.method || 'other'] || 0) + 1; });
  const pmArr = Object.entries(pmCount).map(([name,value])=>({name,value}));

  return (
    <div className="space-y-6">
      <SectionHeader title="Dashboard Overview" sub={`${new Date().toLocaleDateString('en-PK',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}`} />
      <PeriodPills value={period} onChange={setPeriod} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`Rs ${rev.toLocaleString()}`} sub="Plans, shop & reseller sales" icon={<DollarSign className="w-5 h-5"/>} color="text-red-400 bg-red-600/10 border-red-500/20"/>
        <StatCard label="Total Orders" value={ord} sub={`${pending.length} pending now`} icon={<ShoppingCart className="w-5 h-5"/>} color="text-blue-400 bg-blue-500/10 border-blue-500/20"/>
        <StatCard label="New Customers" value={cust} sub={`${accounts.length} total`} icon={<Users className="w-5 h-5"/>} color="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"/>
        <StatCard label="Active Tools" value={tools.length} icon={<Wrench className="w-5 h-5"/>} color="text-purple-400 bg-purple-500/10 border-purple-500/20"/>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending" value={pending.length} sub="Needs action" icon={<Clock className="w-5 h-5"/>} color="text-amber-400 bg-amber-500/10 border-amber-500/20"/>
        <StatCard label="Approved" value={approved.length} icon={<CheckCircle className="w-5 h-5"/>} color="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"/>
        <StatCard label="Expiring Soon" value={expiring.length} sub="Within 5 days" icon={<AlertCircle className="w-5 h-5"/>} color="text-red-400 bg-red-600/10 border-red-500/20"/>
        <StatCard label="Unread Alerts" value={notifications.filter(n=>!n.read && noteVisible(n, { id: 'admin', role: 'admin' })).length} icon={<TrendingUp className="w-5 h-5"/>} color="text-pink-400 bg-pink-500/10 border-pink-500/20"/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-white mb-4">Revenue</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthly}>
              <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#cc1a1a" stopOpacity={0.3}/><stop offset="95%" stopColor="#cc1a1a" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="label" tick={{fill:'#666',fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#666',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={moneyTick}/>
              <Tooltip content={<Tip/>}/>
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#cc1a1a" strokeWidth={2} fill="url(#rg)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-white mb-4">Payment Methods</h3>
          {pmArr.length > 0 ? <>
            <ResponsiveContainer width="100%" height={120}><PieChart><Pie data={pmArr} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={3}>{pmArr.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%5]}/>)}</Pie><Tooltip content={<Tip/>}/></PieChart></ResponsiveContainer>
            <div className="space-y-1.5 mt-2">{pmArr.map((p,i)=><div key={p.name} className="flex items-center justify-between text-xs"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:PIE_COLORS[i%5]}}/><span className="text-slate-400 capitalize">{p.name}</span></div><span className="text-white font-bold">{p.value}</span></div>)}</div>
          </> : <div className="h-32 flex items-center justify-center text-slate-600 text-xs">No data yet</div>}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-extrabold text-white">Recent Orders</h3><button onClick={()=>onNavigate('orders')} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">View all →</button></div>
          <div className="space-y-3">
            {sales.slice(0,5).map(row=>(
              <div key={row.id} className="flex items-center gap-3 p-2 hover:bg-[#1a1210] rounded-xl transition">
                <div className="w-7 h-7 rounded-full bg-red-600/30 flex items-center justify-center text-xs font-black text-red-300">{row.name?.[0]}</div>
                <div className="flex-1 min-w-0"><div className="text-xs font-semibold text-white truncate">{row.name}</div><div className="text-[10px] text-slate-500">{row.label}</div></div>
                <div className="text-right"><div className="text-xs font-bold text-white">Rs {(row.amount||0).toLocaleString()}</div><StatusBadge status={row.status}/></div>
              </div>
            ))}
            {!sales.length && <div className="text-center py-6 text-slate-600 text-xs">No orders yet</div>}
          </div>
        </div>
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-white mb-4">Revenue by Tool</h3>
          {toolRevArr.length > 0 ? <div className="space-y-3">{toolRevArr.slice(0,6).map(t=><div key={t.name}><div className="flex items-center justify-between mb-1 text-xs"><span className="text-slate-300 truncate">{t.name}</span><span className="text-white font-bold shrink-0 ml-2">Rs {t.revenue.toLocaleString()}</span></div><ProgressBar value={t.revenue} max={toolRevArr[0]?.revenue||1}/></div>)}</div>
          : <div className="h-32 flex items-center justify-center text-slate-600 text-xs">Approve orders to see data</div>}
        </div>
      </div>
      {expiring.length > 0 && (
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-white mb-4">⚠️ Expiring Soon</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiring.slice(0,6).map(c=>{
              const left = daysLeft(c.expiry || '');
              return (
                <div key={c.id} className="bg-[#1a1210] border border-[#2a1e1c] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-white">{c.name}</span><DaysLeftBadge days={left}/></div>
                  <div className="text-[10px] text-slate-400">{c.plan || 'No plan'} · Exp: {c.expiry || '—'}</div>
                  <ProgressBar value={Math.max(0, left)} max={30}/>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
        <h3 className="text-sm font-extrabold text-white mb-4">Orders</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthly}><XAxis dataKey="label" tick={{fill:'#666',fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#666',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip content={<Tip/>}/><Bar dataKey="orders" name="Orders" fill="#cc1a1a" radius={[4,4,0,0]}/></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
