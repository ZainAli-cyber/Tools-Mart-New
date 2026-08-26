import React from 'react';
import { LogOut, Settings } from 'lucide-react';
import { AccountProfileForm } from '../../components/AccountProfileForm';
import { ThemeToggle } from '../../components/ThemeToggle';
import { updateMyProfile } from '../../lib/accountApi';
import { savePortalSession } from '../../lib/sessionStore';
import { resellerAuth } from '../store/resellerAuth';

type Account = {
  customer_code: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  max_devices: number;
};

type Props = {
  mode: 'self-seller' | 'self-user';
  account: Account;
  roleLabel: string;
  onSaved: () => void;
  onLogout: () => void;
  /** Optional: open portal settings page (admin). */
  onOpenSettings?: () => void;
};

export const MobileProfilePage: React.FC<Props> = ({
  mode, account, roleLabel, onSaved, onLogout, onOpenSettings,
}) => {
  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-red-600 flex items-center justify-center text-lg font-black text-white shrink-0">
          {account.avatar
            ? <img src={account.avatar} alt="" className="w-full h-full object-cover" />
            : (account.name || '?')[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-white truncate">{account.name}</h2>
          <p className="text-xs text-slate-400 truncate">{account.email}</p>
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mt-0.5">{roleLabel}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">Appearance</p>
            <p className="text-[11px] text-slate-500">Switch between dark and light theme</p>
          </div>
          <ThemeToggle variant="labeled" />
        </div>
      </section>

      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 text-left cursor-pointer hover:border-red-500/30"
        >
          <Settings className="w-5 h-5 text-red-400" />
          <div>
            <p className="text-sm font-bold text-white">Portal settings</p>
            <p className="text-[11px] text-slate-500">WhatsApp, site options, and more</p>
          </div>
        </button>
      )}

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
        <p className="text-sm font-bold text-white mb-1">Account details</p>
        <p className="text-[11px] text-slate-500 mb-4">Update your profile. Your unique ID never changes.</p>
        <AccountProfileForm
          mode={mode}
          account={account}
          onCancel={() => {}}
          hideCancel
          onSaved={onSaved}
          save={async payload => {
            const result = await updateMyProfile(payload);
            const next = resellerAuth.session();
            if (next) {
              savePortalSession({
                ...next,
                name: result.account?.name || payload.name || next.name,
                email: result.account?.email || next.email,
              });
            }
          }}
        />
      </section>

      <button
        type="button"
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-600/15 border border-red-500/40 text-red-300 hover:bg-red-600 hover:text-white py-3.5 text-sm font-black transition cursor-pointer"
      >
        <LogOut className="w-4 h-4" /> Log out
      </button>
    </div>
  );
};
