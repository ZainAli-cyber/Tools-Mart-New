import React from 'react';
import { LayoutDashboard, ShoppingBag, Headphones, Inbox, User } from 'lucide-react';
import { isMobileApp } from '../../lib/mobile/toolLauncher';
import type { UserPage } from './UserSidebar';

type Tab = 'dashboard' | 'shop' | 'support' | 'inbox';

const tabs: { id: Tab; page: UserPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', page: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'shop', page: 'shop', label: 'Tools', icon: ShoppingBag },
  { id: 'support', page: 'support', label: 'Chat', icon: Headphones },
  { id: 'inbox', page: 'inbox', label: 'Tickets', icon: Inbox },
];

function tabForPage(page: UserPage): Tab {
  if (page === 'shop') return 'shop';
  if (page === 'support') return 'support';
  if (page === 'inbox') return 'inbox';
  return 'dashboard';
}

export const MobileAppNav: React.FC<{
  current: UserPage;
  onChange: (page: UserPage) => void;
  onProfile: () => void;
  unreadTickets?: number;
}> = ({ current, onChange, onProfile, unreadTickets = 0 }) => {
  if (!isMobileApp()) return null;

  const active = tabForPage(current);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#2a1e1c] bg-[#0d0908]/98 backdrop-blur-md safe-area-pb"
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
              {id === 'inbox' && unreadTickets > 0 && (
                <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[8px] font-black text-white">
                  {unreadTickets > 9 ? '9+' : unreadTickets}
                </span>
              )}
              {on && <span className="absolute -top-0.5 h-0.5 w-8 rounded-full bg-red-600" />}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onProfile}
          className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-slate-500 transition hover:text-slate-300 cursor-pointer"
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </div>
    </nav>
  );
};

/** Extra bottom padding so content clears the mobile nav bar. */
export function mobileAppContentClass(): string {
  return isMobileApp() ? 'pb-24' : '';
}
