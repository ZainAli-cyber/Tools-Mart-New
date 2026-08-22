import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/* ── Stat Card ── */
export const StatCard: React.FC<{
  label: string; value: string | number; sub?: string; icon: React.ReactNode;
  trend?: number; color?: string;
}> = ({ label, value, sub, icon, trend, color = 'text-red-400 bg-red-600/10 border-red-500/20' }) => (
  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 space-y-3 hover:border-[var(--border)] transition"
    style={{ boxShadow: '0 4px 20px color-mix(in srgb, var(--text-primary) 8%, transparent)' }}>
    <div className="flex items-start justify-between">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${color}`}>{icon}</div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-bold ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  </div>
);

/* ── Badge ── */
export const Badge: React.FC<{ children: React.ReactNode; variant?: 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'gray' }> = ({ children, variant = 'gray' }) => {
  const cls = {
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    red: 'bg-red-600/10 text-red-400 border-red-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    gray: 'bg-slate-700/20 text-slate-400 border-slate-700/30',
  }[variant];
  return <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`}>{children}</span>;
};

/* ── Status → Badge ── */
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'gray'> = {
    approved: 'green', active: 'green', paid: 'green', open: 'blue', resolved: 'green',
    pending: 'amber', suspended: 'amber', renewed: 'blue',
    rejected: 'red', cancelled: 'red', expired: 'red', failed: 'red', blocked: 'red', closed: 'gray',
  };
  return <Badge variant={map[status] || 'gray'}>{status}</Badge>;
};

/* ── Progress Bar ── */
export const ProgressBar: React.FC<{ value: number; max?: number; color?: string }> = ({ value, max = 100, color = 'bg-red-500' }) => {
  const pct = Math.min(100, (value / max) * 100);
  const barColor = pct > 50 ? color : pct > 20 ? 'bg-amber-500' : 'bg-red-600';
  return (
    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

/* ── Section Header ── */
export const SectionHeader: React.FC<{ title: string; sub?: string; action?: React.ReactNode }> = ({ title, sub, action }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h2 className="text-lg font-extrabold text-white">{title}</h2>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

/* ── Table Wrapper ── */
export const AdminTable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)]">
    <table className="w-full text-xs">{children}</table>
  </div>
);

export const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <th className={`text-left p-3 text-slate-500 font-bold uppercase tracking-wider bg-[var(--bg-input)] border-b border-[var(--border-subtle)] whitespace-nowrap ${className}`}>{children}</th>
);

export const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`p-3 text-slate-300 border-b border-[var(--border-subtle)] ${className}`}>{children}</td>
);

export const Tr: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => (
  <tr onClick={onClick} className={`hover:bg-[var(--bg-elevated)] transition ${onClick ? 'cursor-pointer' : ''}`}>{children}</tr>
);

/* ── Admin Button ── */
export const AdminBtn: React.FC<{
  children: React.ReactNode; onClick?: () => void; variant?: 'red' | 'ghost' | 'green' | 'amber' | 'blue';
  size?: 'sm' | 'md'; className?: string; disabled?: boolean;
}> = ({ children, onClick, variant = 'ghost', size = 'sm', className = '', disabled }) => {
  const v = {
    red: 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20',
    green: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    amber: 'bg-amber-600 hover:bg-amber-700 text-white',
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    ghost: 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-alt)] border border-[var(--border)] text-slate-300 hover:text-white',
  }[variant];
  const s = size === 'sm' ? 'px-2.5 py-1.5 text-[11px]' : 'px-4 py-2 text-xs';
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${v} ${s} font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${className}`}>
      {children}
    </button>
  );
};

/* ── Search Input ── */
export const SearchInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || 'Search…'}
      className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] focus:border-red-500/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition w-full sm:w-56" />
  </div>
);

/* ── Days Left indicator (matches Accounts: expired only when expiry is past) ── */
export const DaysLeftBadge: React.FC<{ days: number; expiry?: string }> = ({ days, expiry }) => {
  if (expiry !== undefined && !expiry) {
    return (
      <span className="text-slate-500 bg-slate-700/20 border-slate-700/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full border">—</span>
    );
  }
  const expired = days < 0;
  const color = expired ? 'text-red-400' : days > 14 ? 'text-emerald-400' : days > 5 ? 'text-amber-400' : 'text-red-400';
  const bg = expired ? 'bg-red-600/10 border-red-500/30' : days > 14 ? 'bg-emerald-500/10 border-emerald-500/30' : days > 5 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-600/10 border-red-500/30';
  return (
    <span className={`${color} ${bg} text-[10px] font-extrabold px-2 py-0.5 rounded-full border`}>
      {days >= 0 ? `${days}d left` : 'Expired'}
    </span>
  );
};
