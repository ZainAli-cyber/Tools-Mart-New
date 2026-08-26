import React from 'react';
import {
  LayoutDashboard, ShoppingBag, Headphones, Inbox, Users,
  ShoppingCart, Briefcase,
} from 'lucide-react';
import { isMobileApp } from '../../lib/mobile/toolLauncher';
import type { UserPage } from './UserSidebar';

export type MobileRole = 'user' | 'reseller' | 'admin';

type TabDef = { id: string; page: UserPage; label: string; icon: typeof LayoutDashboard };

function tabsForRole(role: MobileRole): TabDef[] {
  if (role === 'admin') {
    return [
      { id: 'home', page: 'dashboard', label: 'Home', icon: LayoutDashboard },
      { id: 'orders', page: 'orders', label: 'Orders', icon: ShoppingCart },
      { id: 'accounts', page: 'accounts', label: 'Accounts', icon: Users },
      { id: 'tickets', page: 'inbox', label: 'Tickets', icon: Inbox },
    ];
  }
  if (role === 'reseller') {
    return [
      { id: 'home', page: 'dashboard', label: 'Home', icon: LayoutDashboard },
      { id: 'shop', page: 'shop', label: 'Shop', icon: ShoppingBag },
      { id: 'members', page: 'members', label: 'Members', icon: Briefcase },
      { id: 'tickets', page: 'inbox', label: 'Tickets', icon: Inbox },
    ];
  }
  return [
    { id: 'home', page: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'shop', page: 'shop', label: 'Shop', icon: ShoppingBag },
    { id: 'support', page: 'support', label: 'Support', icon: Headphones },
  ];
}

function activeTab(page: UserPage, role: MobileRole): string {
  const tabs = tabsForRole(role);
  // Customers: Support + Tickets are the same screen
  if (role === 'user' && page === 'inbox') return 'support';
  const hit = tabs.find(t => t.page === page);
  if (hit) return hit.id;
  if (page === 'notifications' || page === 'profile' || page === 'settings') return '';
  return tabs[0]?.id || 'home';
}

export const MobileAppNav: React.FC<{
  role: MobileRole;
  current: UserPage;
  onChange: (page: UserPage) => void;
  unreadTickets?: number;
}> = ({ role, current, onChange, unreadTickets = 0 }) => {
  if (!isMobileApp()) return null;

  const tabs = tabsForRole(role);
  const active = activeTab(current, role);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border-subtle)] bg-[var(--bg-page)]/98 backdrop-blur-md"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-2">
        {tabs.map(({ id, page, label, icon: Icon }) => {
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(page)}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 transition cursor-pointer ${
                on ? 'text-red-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className={`h-5 w-5 ${on ? 'text-red-500' : ''}`} />
              <span className="text-[10px] font-bold">{label}</span>
              {id === 'tickets' && unreadTickets > 0 && (
                <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[8px] font-black text-white">
                  {unreadTickets > 9 ? '9+' : unreadTickets}
                </span>
              )}
              {on && <span className="absolute -top-0.5 h-0.5 w-8 rounded-full bg-red-600" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

/** Extra bottom padding so content clears the mobile nav bar. */
export function mobileAppContentClass(): string {
  return isMobileApp() ? 'pb-24' : '';
}
