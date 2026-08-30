import React from 'react';
import { X } from 'lucide-react';
import { isMobileApp } from '../../lib/mobile/toolLauncher';

export const inpCls = 'w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition';
export const lblCls = 'text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5';

/* ── Panel card ── */
export const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl ${className}`}>{children}</div>
);

/* ── Table ── */
export const RTable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)]">
    <table className="w-full text-xs">{children}</table>
  </div>
);

export const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="text-left p-3 text-slate-500 font-bold uppercase tracking-wider bg-[var(--bg-input)] border-b border-[var(--border-subtle)] whitespace-nowrap">{children}</th>
);

export const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`p-3 text-slate-300 border-b border-[var(--border-subtle)] ${className}`}>{children}</td>
);

export const Tr: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tr className="hover:bg-[var(--bg-elevated)] transition">{children}</tr>
);

/* ── Badge ── */
export const Pill: React.FC<{ children: React.ReactNode; variant?: 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'gray' }> = ({ children, variant = 'gray' }) => {
  const cls = {
    green:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    red:    'bg-red-600/10 text-red-400 border-red-500/30',
    amber:  'bg-amber-500/10 text-amber-400 border-amber-500/30',
    blue:   'bg-blue-500/10 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    gray:   'bg-slate-700/20 text-slate-400 border-slate-700/30',
  }[variant];
  return <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`}>{children}</span>;
};

/* ── Stat card (gradient tiles on the overview) ── */
export const StatTile: React.FC<{
  label: string; value: string | number; sub: string; tone: 'red' | 'blue' | 'amber' | 'rose';
}> = ({ label, value, sub, tone }) => {
  const bg = {
    red:   'from-red-600/30 to-red-900/10 border-red-500/30',
    blue:  'from-blue-600/25 to-blue-900/10 border-blue-500/30',
    amber: 'from-amber-600/25 to-amber-900/10 border-amber-500/30',
    rose:  'from-rose-600/25 to-rose-900/10 border-rose-500/30',
  }[tone];
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${bg} border rounded-2xl p-4`}>
      <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/5" />
      <div className="relative">
        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-black text-white mt-1">{value}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
      </div>
    </div>
  );
};

/* ── Search input ── */
export const RSearch: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || 'Search…'}
      className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] focus:border-red-500/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition w-full sm:w-56" />
  </div>
);

/* ── Modal shell (full-screen page on mobile app — no stacked popups) ── */
export const RModal: React.FC<{
  title: string; sub?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode;
}> = ({ title, sub, onClose, children, footer }) => {
  const fullScreen = isMobileApp();
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col bg-[var(--bg-page)]" role="dialog" aria-modal="true">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-page)] px-4 py-3"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-white truncate">{title}</h3>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
          </div>
          <button type="button" onClick={onClose}
            className="p-2 shrink-0 bg-red-600/10 hover:bg-red-600/20 rounded-xl text-red-400 cursor-pointer transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4" style={{ paddingBottom: 24 }}>{children}</div>
        {footer && (
          <div
            className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-page)] px-4 py-3 flex gap-2 justify-end"
            style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 72px), 84px)' }}
          >
            {footer}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl shadow-2xl my-auto"
        style={{ boxShadow: '0 0 60px var(--red-glow)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-lg font-black text-white">{title}</h3>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
          </div>
          <button onClick={onClose} className="p-2 bg-red-600/10 hover:bg-red-600/20 rounded-xl text-red-400 hover:text-red-300 cursor-pointer transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto">{children}</div>
        {footer && <div className="p-5 border-t border-[var(--border-subtle)] flex gap-2 justify-end shrink-0">{footer}</div>}
      </div>
    </div>
  );
};

/* ── Buttons ── */
export const GhostBtn: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean }> = ({ children, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    className="px-5 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-alt)] border border-[var(--border)] text-slate-300 hover:text-white text-sm font-bold rounded-xl transition cursor-pointer disabled:opacity-50">
    {children}
  </button>
);

export const RedBtn: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean }> = ({ children, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-black rounded-xl transition cursor-pointer shadow-lg shadow-red-900/30">
    {children}
  </button>
);
