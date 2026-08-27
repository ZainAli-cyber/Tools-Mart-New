import React from 'react';
import { LayoutDashboard, Users, CreditCard, LogOut, ChevronLeft, Menu, MessageCircle, Home, ArrowRight, Bell, FileText, Inbox } from 'lucide-react';
import { ThemeToggle } from '../../components/ThemeToggle';

export type ResellerPage = 'overview' | 'members' | 'payments' | 'invoices' | 'notifications' | 'inbox';

const NAV: { id: ResellerPage; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview',   icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'members',  label: 'My Members', icon: <Users className="w-4 h-4" /> },
  { id: 'payments', label: 'Payments',   icon: <CreditCard className="w-4 h-4" /> },
  { id: 'invoices', label: 'Invoices',   icon: <FileText className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { id: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" /> },
];

interface Props {
  current: ResellerPage;
  onChange: (p: ResellerPage) => void;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
  adminWhatsapp: string;
  adminWaLink: string;
  name: string;
  email: string;
  onBackToDashboard: () => void;
  unreadCount?: number;
}

export const ResellerSidebar: React.FC<Props> = ({
  current, onChange, collapsed, onToggle, onLogout, adminWhatsapp, adminWaLink, name, email, onBackToDashboard, unreadCount = 0,
}) => (
  <aside className={`fixed left-0 top-0 h-full z-30 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'} bg-[var(--bg-input)] border-r border-[var(--border-subtle)]`}
    style={{ boxShadow: 'var(--shadow-panel)' }}>

    {/* Brand */}
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-3 border-b border-[#2a1e1c] h-16`}>
      {!collapsed ? (
        <img src="/logo.png" alt="ZynexTools" className="h-9 w-auto max-w-[140px] object-contain object-left" />
      ) : (
        <img src="/logo.png" alt="ZynexTools" className="h-8 w-8 object-contain" />
      )}
      <button onClick={onToggle} className="p-1.5 hover:bg-[#1a1210] rounded-xl transition cursor-pointer text-slate-400 hover:text-white">
        {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>

    <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
      {!collapsed && <p className="px-2 pb-1 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Navigation</p>}

      {NAV.map(item => (
        <button key={item.id} onClick={() => onChange(item.id)} title={collapsed ? item.label : undefined}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-xl text-left transition cursor-pointer group relative ${
            current === item.id
              ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
              : 'text-slate-400 hover:text-white hover:bg-[#1a1210]'
          }`}>
          <span className="shrink-0">{item.icon}</span>
          {!collapsed && <span className="text-xs font-semibold flex-1">{item.label}</span>}
          {!collapsed && item.id === 'notifications' && unreadCount > 0 && (
            <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1210] border border-[#3a2a26] text-white text-xs rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
              {item.label}
            </div>
          )}
        </button>
      ))}

      {/* Administrator WhatsApp */}
      {!collapsed && (
        <div className="mt-4 mx-1 bg-[#130d0d] border border-[#2a1e1c] rounded-xl p-3 space-y-2">
          <div className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Administrator WhatsApp</div>
          <div className="text-xs font-bold text-white">{adminWhatsapp}</div>
          <a href={adminWaLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-lg transition">
            <MessageCircle className="w-3 h-3" /> Contact Admin
          </a>
        </div>
      )}

      {/* Switch back to the member's own dashboard */}
      {!collapsed && <p className="px-2 pt-4 pb-1 text-[9px] font-bold text-slate-600 uppercase tracking-widest">My Account</p>}
      {collapsed ? (
        <button onClick={onBackToDashboard} title="Switch to My Dashboard"
          className="mt-4 w-full flex items-center justify-center px-2 py-2.5 rounded-xl bg-red-600/15 border border-red-500/40 text-red-400 hover:bg-red-600/25 transition cursor-pointer group relative">
          <Home className="w-4 h-4 shrink-0" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1210] border border-[#3a2a26] text-white text-xs rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
            Switch to My Dashboard
          </div>
        </button>
      ) : (
        <button onClick={onBackToDashboard}
          className="w-full bg-red-600/10 hover:bg-red-600/20 border border-red-500/40 rounded-xl px-3 py-2.5 transition cursor-pointer text-left group">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs font-bold text-white flex-1">My Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5 text-red-400 group-hover:translate-x-0.5 transition" />
          </div>
          <p className="text-[9px] text-slate-500 mt-1 ml-6">My tools · Shop · Tutorials</p>
        </button>
      )}
    </nav>

    {/* Account footer */}
    <div className="p-2 border-t border-[#2a1e1c] space-y-1">
      <div className={`flex ${collapsed ? 'justify-center' : 'px-1'}`}>
        <ThemeToggle className={collapsed ? '' : 'w-full'} variant={collapsed ? 'compact' : 'labeled'} />
      </div>
      {!collapsed && (
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-red-600/30 flex items-center justify-center text-xs font-black text-red-300 shrink-0">
            {(name || '?')[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">{name}</div>
            <div className="text-[9px] text-slate-500 truncate">{email}</div>
          </div>
        </div>
      )}
      <button onClick={onLogout}
        className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-xl text-red-400 hover:bg-red-600/10 transition cursor-pointer`}>
        <LogOut className="w-4 h-4 shrink-0" />
        {!collapsed && <span className="text-xs font-semibold">Logout</span>}
      </button>
    </div>
  </aside>
);
