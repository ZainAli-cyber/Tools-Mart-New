import React, { useState, useEffect } from 'react';
import { authStore } from './store/authStore';
import { LoginPage } from '../pages/LoginPage';
import { AdminSidebar, AdminPage } from './components/AdminSidebar';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import {
  CustomersPage, ToolsPage, AnalyticsPage, PaymentsPage,
  SupportPage, CouponsPage, NotificationsPage, InvoicesPage, SettingsPage, BannersPage,
} from './pages/OtherPages';
import { CookiesPage } from './pages/CookiesPage';
import { Bell, Search, LogOut } from 'lucide-react';
import { useLiveNotes } from '../lib/useLiveNotes';
import { NoteAlertToast } from '../components/NoteAlertToast';
import { resellerAuth } from '../reseller/store/resellerAuth';
import { isMobileApp } from '../lib/mobile/toolLauncher';
import { supabase } from '../lib/db';
import { tokenStore } from '../lib/apiClient';

export const AdminApp: React.FC = () => {
  const [authed, setAuthed] = useState(authStore.isAuthenticated());
  const [page, setPage] = useState<AdminPage>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const inbox = useLiveNotes(authed ? { id: 'admin', role: 'admin' } : null, authed);
  const unread = inbox.unread;

  // Keep Supabase JWT in sync while the portal session is active (cookie saves need it).
  useEffect(() => {
    if (!authed) return;
    void (async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        const token = String(data.session?.access_token || '').trim();
        if (!error && token) tokenStore.save(token);
      } catch {
        /* ignore */
      }
    })();
  }, [authed]);

  // Auto-expire check
  useEffect(() => {
    const iv = setInterval(() => {
      if (!authStore.isAuthenticated()) setAuthed(false);
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  // Mobile APK loads /dashboard — send admins there for the native shell
  useEffect(() => {
    if (authed && isMobileApp()) {
      window.location.href = '/dashboard';
    }
  }, [authed]);

  const handleLogout = () => {
    authStore.logout();
    setAuthed(false);
  };

  if (!authed) {
    return (
      <LoginPage
        embedded
        onSuccess={async () => {
          const session = resellerAuth.session();
          if (String(session?.role || '').toLowerCase() !== 'admin') {
            window.location.href = '/dashboard';
            return;
          }
          try {
            const { data, error } = await supabase.auth.refreshSession();
            const token = String(data.session?.access_token || '').trim();
            if (!error && token) tokenStore.save(token);
          } catch {
            /* ignore */
          }
          setAuthed(true);
        }}
        onNavigate={path => { window.location.href = path; }}
      />
    );
  }

  const sideW = collapsed ? 64 : 224;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage onNavigate={setPage} />;
      case 'orders': return <OrdersPage />;
      case 'customers': return <CustomersPage />;
      case 'tools': return <ToolsPage onNavigateToPreview={(id) => window.open(`/tools/${id}`, '_blank')} />;
      case 'cookies': return <CookiesPage />;
      case 'analytics': return <AnalyticsPage />;
      case 'payments': return <PaymentsPage />;
      case 'support': return <SupportPage />;
      case 'coupons': return <CouponsPage />;
      case 'banners': return <BannersPage />;
      case 'notifications': return (
        <NotificationsPage
          notes={inbox.notes}
          onChange={() => { void inbox.refresh(); }}
          onRead={inbox.markRead}
          onReadAll={inbox.markAllRead}
          onDelete={inbox.remove}
          onDeleteRead={inbox.removeRead}
        />
      );
      case 'invoices': return <InvoicesPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage onNavigate={setPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-slate-100 font-sans">
      <AdminSidebar
        current={page}
        onChange={p => setPage(p)}
        unreadCount={unread}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        onLogout={handleLogout}
      />

      <div className="transition-all duration-300 min-h-screen flex flex-col" style={{ marginLeft: `${sideW}px` }}>
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 bg-[var(--bg-input)]/95 backdrop-blur border-b border-[var(--border-subtle)] flex items-center justify-between px-5 gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-extrabold text-white">{page === 'notifications' ? 'Notifications Center' : page === 'cookies' ? 'Cookies' : page.charAt(0).toUpperCase() + page.slice(1)}</h1>
            <span className="text-slate-500 hidden sm:block">·</span>
            <span className="text-xs text-slate-500 hidden sm:block">ZynexTools Admin</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} placeholder="Search…"
                className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500/30 transition w-44" />
            </div>

            <button onClick={() => setPage('notifications')}
              className="relative p-2 hover:bg-[var(--bg-elevated)] rounded-xl transition cursor-pointer text-slate-400 hover:text-white">
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">{unread}</span>
              )}
            </button>

            <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5">
              <div className="w-6 h-6 rounded-xl bg-red-600 flex items-center justify-center text-xs font-black text-white">E</div>
              <span className="text-xs font-semibold text-slate-300 hidden sm:block">Emaan</span>
            </div>

            <button onClick={handleLogout}
              className="p-2 hover:bg-red-600/10 rounded-xl transition cursor-pointer text-slate-500 hover:text-red-400">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-6">
          {renderPage()}
        </main>

        <footer className="border-t border-[var(--border-subtle)] px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>ZynexTools Admin Panel · v1.0</span>
          <span>{new Date().getFullYear()} · Secure Session</span>
        </footer>
      </div>

      <NoteAlertToast
        note={inbox.toast}
        onOpen={() => { inbox.dismissToast(); setPage('notifications'); }}
        onClose={inbox.dismissToast}
      />
    </div>
  );
};
