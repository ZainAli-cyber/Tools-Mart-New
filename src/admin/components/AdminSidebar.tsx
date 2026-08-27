import React from 'react';
import {
  LayoutDashboard, ShoppingCart, Users, Wrench, BarChart2, Bell,
  MessageCircle, Tag, Settings, LogOut, ChevronRight,
  CreditCard, Receipt, Menu, X, Cookie,
} from 'lucide-react';
import { ThemeToggle } from '../../components/ThemeToggle';

export type AdminPage = 'dashboard' | 'orders' | 'customers' | 'tools' | 'cookies' | 'analytics' |
  'notifications' | 'support' | 'coupons' | 'payments' | 'invoices' | 'settings' | 'banners';

interface SidebarProps {
  current: AdminPage;
  onChange: (p: AdminPage) => void;
  unreadCount: number;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

const NAV: { id: AdminPage; label: string; icon: React.ReactNode; badge?: number }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'orders', label: 'Orders', icon: <ShoppingCart className="w-4 h-4" /> },
  { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'customers', label: 'Accounts', icon: <Users className="w-4 h-4" /> },
  { id: 'tools', label: 'Tools', icon: <Wrench className="w-4 h-4" /> },
  { id: 'cookies', label: 'Cookies', icon: <Cookie className="w-4 h-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'support', label: 'Support', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'coupons', label: 'Coupons', icon: <Tag className="w-4 h-4" /> },
  { id: 'invoices', label: 'Invoices', icon: <Receipt className="w-4 h-4" /> },
  { id: 'banners', label: 'Banners', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications Center', icon: <Bell className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export const AdminSidebar: React.FC<SidebarProps> = ({ current, onChange, unreadCount, collapsed, onToggle, onLogout }) => {
  return (
    <aside className={`fixed left-0 top-0 h-full z-30 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'} bg-[var(--bg-input)] border-r border-[var(--border-subtle)]`}
      style={{ boxShadow: 'var(--shadow-panel)' }}>

      {/* Header */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-3 border-b border-[var(--border-subtle)] h-16`}>
        {!collapsed ? (
          <img src="/logo.png" alt="ZynexTools" className="h-9 w-auto max-w-[140px] object-contain object-left" />
        ) : (
          <img src="/logo.png" alt="ZynexTools" className="h-8 w-8 object-contain" />
        )}
        <button onClick={onToggle} className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-xl transition cursor-pointer text-slate-400 hover:text-white">
          {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {NAV.map(item => (
          <button key={item.id} onClick={() => onChange(item.id)}
            title={collapsed ? item.label : undefined}
            className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-xl text-left transition cursor-pointer relative group ${
              current === item.id
                ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                : 'text-slate-400 hover:text-white hover:bg-[var(--bg-elevated)]'
            }`}>
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span className="text-xs font-semibold flex-1">{item.label}</span>}
            {!collapsed && item.id === 'notifications' && unreadCount > 0 && (
              <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
            {!collapsed && current === item.id && <ChevronRight className="w-3 h-3 text-red-400" />}
            {/* Tooltip when collapsed */}
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-[var(--bg-elevated)] border border-[var(--border)] text-white text-xs rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                {item.label}
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-[var(--border-subtle)] space-y-1">
        <div className={`flex ${collapsed ? 'justify-center' : 'px-1'}`}>
          <ThemeToggle className={collapsed ? '' : 'w-full'} variant={collapsed ? 'compact' : 'labeled'} />
        </div>
        <button onClick={onLogout}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-xl text-red-400 hover:bg-red-600/10 transition cursor-pointer`}>
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-xs font-semibold">Logout</span>}
        </button>
      </div>
    </aside>
  );
};
