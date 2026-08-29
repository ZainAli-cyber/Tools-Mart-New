import React from 'react';
import { LayoutDashboard, ShoppingBag, Video, Briefcase, LogOut, ChevronsLeft, ChevronsRight, ArrowRight, Puzzle, Bell, Inbox, Smartphone } from 'lucide-react';
import { ThemeToggle } from '../../components/ThemeToggle';
import { BrandLogo } from '../../components/BrandLogo';

export type UserPage =
  | 'dashboard'
  | 'shop'
  | 'tutorials'
  | 'extensions'
  | 'mobile-app'
  | 'support'
  | 'notifications'
  | 'inbox'
  | 'profile'
  | 'members'
  | 'orders'
  | 'accounts'
  | 'settings';

interface Props {
  current: UserPage;
  onChange: (p: UserPage) => void;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
  /** Only resellers get the management section. */
  showResellerPanel: boolean;
  onOpenResellerPanel: () => void;
  name: string;
  avatar?: string;
  roleLabel: string;
  unreadCount?: number;
}

export const UserSidebar: React.FC<Props> = ({
  current, onChange, collapsed, onToggle, onLogout,
  showResellerPanel, onOpenResellerPanel, name, avatar, roleLabel, unreadCount = 0,
}) => {
  const itemCls = (active: boolean) =>
    `w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-xl text-left transition cursor-pointer group relative ${
      active ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : 'text-slate-400 hover:text-white hover:bg-[#1a1210]'
    }`;

  const Tooltip: React.FC<{ label: string }> = ({ label }) => (
    <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1210] border border-[#3a2a26] text-white text-xs rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
      {label}
    </div>
  );

  const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    collapsed ? <div className="my-2 mx-3 border-t border-[#2a1e1c]" /> : (
      <p className="px-2 pt-4 pb-1 text-[9px] font-bold text-slate-600 uppercase tracking-widest">{children}</p>
    );

  return (
    <aside className={`fixed left-0 top-0 h-full z-30 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'} bg-[var(--bg-input)] border-r border-[var(--border-subtle)]`}
      style={{ boxShadow: 'var(--shadow-panel)' }}>

      {/* Brand */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : ''} p-3 border-b border-[#2a1e1c] h-16`}>
        <BrandLogo
          variant="app"
          height={collapsed ? 32 : undefined}
          className={`${collapsed ? 'object-contain' : 'w-auto max-w-[160px] object-contain object-left'} shrink-0`}
          style={collapsed ? { width: 32, height: 32 } : undefined}
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        <GroupLabel>Main Menu</GroupLabel>

        <div className="space-y-1">
          <button onClick={() => onChange('dashboard')} className={itemCls(current === 'dashboard')} title={collapsed ? 'Dashboard' : undefined}>
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="text-xs font-semibold flex-1">Dashboard</span>}
            {collapsed && <Tooltip label="Dashboard" />}
          </button>

          <button onClick={() => onChange('shop')} className={itemCls(current === 'shop')} title={collapsed ? 'Shop' : undefined}>
            <ShoppingBag className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="text-xs font-semibold flex-1">Shop</span>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                  current === 'shop' ? 'bg-white/20 border-white/30 text-white' : 'bg-red-600/20 border-red-500/40 text-red-400'
                }`}>NEW</span>
              </>
            )}
            {collapsed && <Tooltip label="Shop" />}
          </button>

          <button onClick={() => onChange('tutorials')} className={itemCls(current === 'tutorials')} title={collapsed ? 'Tutorials' : undefined}>
            <Video className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="text-xs font-semibold flex-1">Tutorials</span>}
            {collapsed && <Tooltip label="Tutorials" />}
          </button>

          <button onClick={() => onChange('extensions')} className={itemCls(current === 'extensions')} title={collapsed ? 'Extensions' : undefined}>
            <Puzzle className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="text-xs font-semibold flex-1">Extensions</span>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                  current === 'extensions' ? 'bg-white/20 border-white/30 text-white' : 'bg-red-600/20 border-red-500/40 text-red-400'
                }`}>NEW</span>
              </>
            )}
            {collapsed && <Tooltip label="Extensions" />}
          </button>

          <button onClick={() => onChange('mobile-app')} className={itemCls(current === 'mobile-app')} title={collapsed ? 'Mobile App' : undefined}>
            <Smartphone className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="text-xs font-semibold flex-1">Mobile App</span>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                  current === 'mobile-app' ? 'bg-white/20 border-white/30 text-white' : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                }`}>APK</span>
              </>
            )}
            {collapsed && <Tooltip label="Mobile App" />}
          </button>

          <button onClick={() => onChange('notifications')} className={itemCls(current === 'notifications')} title={collapsed ? 'Notifications' : undefined}>
            <Bell className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="text-xs font-semibold flex-1">Notifications</span>}
            {!collapsed && unreadCount > 0 && (
              <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
            {collapsed && <Tooltip label="Notifications" />}
          </button>

          <button onClick={() => onChange('inbox')} className={itemCls(current === 'inbox')} title={collapsed ? 'Inbox' : undefined}>
            <Inbox className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="text-xs font-semibold flex-1">Inbox</span>}
            {collapsed && <Tooltip label="Inbox" />}
          </button>
        </div>

        {showResellerPanel && (
          <>
            <GroupLabel>Management</GroupLabel>
            {collapsed ? (
              <button onClick={onOpenResellerPanel} title="Switch to Reseller Panel"
                className="w-full flex items-center justify-center px-2 py-2.5 rounded-xl bg-red-600/15 border border-red-500/40 text-red-400 hover:bg-red-600/25 transition cursor-pointer group relative">
                <Briefcase className="w-4 h-4 shrink-0" />
                <Tooltip label="Switch to Reseller Panel" />
              </button>
            ) : (
              <button onClick={onOpenResellerPanel}
                className="w-full bg-red-600/10 hover:bg-red-600/20 border border-red-500/40 rounded-xl px-3 py-2.5 transition cursor-pointer text-left group">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-xs font-bold text-white flex-1">Reseller Panel</span>
                  <ArrowRight className="w-3.5 h-3.5 text-red-400 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-[9px] text-slate-500 mt-1 ml-6">Members · Payments · Plans</p>
              </button>
            )}
          </>
        )}

        <GroupLabel>Account</GroupLabel>
        <button onClick={onLogout}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-xl text-red-400 hover:bg-red-600/10 transition cursor-pointer group relative`}
          title={collapsed ? 'Logout' : undefined}>
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-xs font-semibold flex-1 text-left">Logout</span>}
          {collapsed && <Tooltip label="Logout" />}
        </button>
      </nav>

      {/* Account footer + collapse */}
      <div className="border-t border-[#2a1e1c] p-2 space-y-2">
        {!collapsed ? (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-red-600/30 flex items-center justify-center text-xs font-black text-red-300 shrink-0">
              {avatar
                ? <img src={avatar} alt="" className="w-full h-full object-cover" />
                : (name || '?')[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{name}</div>
              <div className="text-[9px] text-slate-500 capitalize">{roleLabel}</div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-red-600/30 flex items-center justify-center text-xs font-black text-red-300">
              {avatar
                ? <img src={avatar} alt="" className="w-full h-full object-cover" />
                : (name || '?')[0]?.toUpperCase()}
            </div>
          </div>
        )}

        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
          <ThemeToggle />
          <button onClick={onToggle}
            className="p-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 transition cursor-pointer"
            title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </aside>
  );
};
