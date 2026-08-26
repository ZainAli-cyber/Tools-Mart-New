import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Bell, ArrowLeft, Briefcase } from 'lucide-react';
import { resellerAuth } from './store/resellerAuth';
import { LoginPage } from '../pages/LoginPage';
import { ResellerSidebar, ResellerPage } from './components/ResellerSidebar';
import { UserSidebar, UserPage } from './components/UserSidebar';
import { OverviewPage } from './pages/OverviewPage';
import { MyMembersPage } from './pages/MyMembersPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { MyDashboardPage } from './pages/MyDashboardPage';
import { TutorialsPage } from './pages/TutorialsPage';
import { ExtensionsPage } from './pages/ExtensionsPage';
import { MobileAppPage } from './pages/MobileAppPage';
import { CustomerShopPage } from './pages/CustomerShopPage';
import { ResellerPage as ResellerPortalContent } from '../pages/ResellerPage';
import { AccountProfileForm } from '../components/AccountProfileForm';
import { RModal } from './components/ResellerUI';
import { updateMyProfile } from '../lib/accountApi';
import { savePortalSession } from '../lib/sessionStore';
import { supabase } from '../lib/db';
import { db } from '../admin/data/adminStore';
import { loadCatalogTools } from '../lib/toolCookies';
import {
  accountMetaFromRow, paymentFromRow, waLink, daysLeft, planIsActive,
  type ResellerPayment, type AccountMeta,
} from '../lib/accountStore';
import type { ResellerMember } from './types';
import { InboxPage } from './pages/InboxPage';
import { TicketsInbox } from '../components/TicketsInbox';
import { useLiveNotes } from '../lib/useLiveNotes';
import { NoteAlertToast } from '../components/NoteAlertToast';
import { ChatBotWidget } from '../components/ChatBotWidget';
import { isMobileApp } from '../lib/mobile/toolLauncher';
import { MobileAppNav, mobileAppContentClass, type MobileRole } from './components/MobileAppNav';
import { SupportPage } from './pages/SupportPage';
import { MobileProfilePage } from './pages/MobileProfilePage';
import { OrdersPage as AdminOrdersPage } from '../admin/pages/OrdersPage';
import { CustomersPage as AdminCustomersPage, SupportPage as AdminSupportPage, SettingsPage as AdminSettingsPage } from '../admin/pages/OtherPages';
import { DashboardPage as AdminDashboardPage } from '../admin/pages/DashboardPage';

/** Which half of the portal is showing. */
type Section = 'personal' | 'panel';

const BLANK_META: AccountMeta = { role: 'user', plan: '', fee: 0, days: 0, expiry: '' };

export const ResellerApp: React.FC = () => {
  const [session, setSession] = useState(resellerAuth.session());
  const [section, setSection] = useState<Section>('personal');
  const [userPage, setUserPage] = useState<UserPage>('dashboard');
  const [panelPage, setPanelPage] = useState<ResellerPage>('overview');
  const [collapsed, setCollapsed] = useState(false);

  const [self, setSelf] = useState<{ customer_code: string; join_date: string; tools: string[]; phone: string; avatar: string; email: string; name: string; meta: AccountMeta; owner_id: string | null; max_devices: number }>({
    customer_code: '', join_date: '', tools: [], phone: '', avatar: '', email: '', name: '', meta: BLANK_META, owner_id: null, max_devices: 1,
  });
  const [members, setMembers] = useState<ResellerMember[]>([]);
  const [payments, setPayments] = useState<ResellerPayment[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotices, setShowNotices] = useState(false);
  const live = useLiveNotes(session ? { id: session.id, role: session.role } : null, !!session);
  const inbox = live.notes;

  const [catalogTools, setCatalogTools] = useState(db.getTools());
  const adminWhatsapp = db.getSettings().whatsapp || '+923275855578';
  const adminWa = waLink(adminWhatsapp, 'Hi Admin, I need help with my account.');
  const allTools = catalogTools;

  const load = useCallback(async () => {
    const current = resellerAuth.session();
    if (!current) return;

    const full =
      'id,customer_code,name,email,phone,status,join_date,tools,role,plan,fee,plan_days,expiry,owner_id,avatar,max_devices';
    const base =
      'id,customer_code,name,email,phone,status,join_date,tools,role,plan,fee,plan_days,expiry,owner_id';
    const first = await supabase.from('customers').select(full).order('created_at', { ascending: false });
    const retry = first.error
      ? await supabase.from('customers').select(base).order('created_at', { ascending: false })
      : first;
    const rows: any[] = retry.data || [];

    const mine = rows.find(c => c.id === current.id);
    if (mine?.status === 'blocked') {
      await resellerAuth.logout();
      setSession(null);
      return;
    }

    try {
      if (String(current.role || '').toLowerCase() !== 'admin') {
        const { registerMyDevice } = await import('../lib/deviceApi');
        await registerMyDevice();
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (/device limit/i.test(msg)) {
        await resellerAuth.logout();
        setSession(null);
        return;
      }
    }

    setSelf({
      customer_code: mine?.customer_code || current.customerCode || current.id,
      join_date: mine?.join_date || '',
      phone: mine?.phone || '',
      avatar: mine?.avatar || '',
      email: mine?.email || current.email,
      name: mine?.name || current.name,
      tools: Array.isArray(mine?.tools) ? mine!.tools : [],
      meta: accountMetaFromRow(mine),
      owner_id: mine?.owner_id || null,
      max_devices: Math.max(1, Number(mine?.max_devices) || 1),
    });
    setCatalogTools(await loadCatalogTools({ includeCookies: false }));

    if (current.role === 'reseller') {
      const owned = rows
        .map(c => ({ ...c, meta: accountMetaFromRow(c) }))
        .filter(c => c.owner_id === current.id)
        .map(c => ({
          id: c.id,
          customer_code: c.customer_code || c.id,
          name: c.name || '',
          email: c.email || '',
          phone: c.phone || '',
          avatar: c.avatar || '',
          status: c.status || 'active',
          join_date: c.join_date || '',
          tools: Array.isArray(c.tools) ? c.tools : [],
          max_devices: Math.max(1, Number(c.max_devices) || 1),
          meta: c.meta,
        }));
      setMembers(owned);
      const { data: paymentRows } = await supabase
        .from('reseller_payments')
        .select('*')
        .eq('owner_id', current.id)
        .order('created_at', { ascending: false });
      setPayments((paymentRows || []).map(paymentFromRow));
    } else {
      setMembers([]);
      setPayments([]);
    }
  }, []);

  useEffect(() => { if (session) load(); }, [session, load]);

  useEffect(() => {
    if (!session) return;
    void import('../lib/mobile/pushSetup').then(m => m.initMobilePush());
  }, [session]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (!resellerAuth.isAuthenticated()) setSession(null);
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = () => {
    void resellerAuth.logout();
    setSession(null);
    setSection('personal');
    setUserPage('dashboard');
    setShowProfile(false);
    setShowNotices(false);
  };

  if (!session) {
    return (
      <LoginPage
        embedded
        onSuccess={() => {
          const next = resellerAuth.session();
          if (next?.role === 'admin' && !isMobileApp()) {
            window.location.href = '/admin';
            return;
          }
          setSession(next);
        }}
        onNavigate={path => { window.location.href = path; }}
      />
    );
  }

  const isReseller = session.role === 'reseller';
  const isAdmin = session.role === 'admin';
  const nativeApp = isMobileApp();
  const mobileRole: MobileRole = isAdmin ? 'admin' : isReseller ? 'reseller' : 'user';
  const sideW = nativeApp ? 0 : collapsed ? 64 : 224;
  const unreadInbox = live.unread;
  const ticketAccount = {
    id: session.id,
    name: self.name || session.name,
    email: self.email || session.email,
    role: session.role,
    ownerId: self.owner_id,
    avatar: self.avatar,
  };
  const onReadNote = (id: string) => { void live.markRead(id); };
  const onReadAllNotes = () => { void live.markAllRead(); };
  const onDeleteNote = (id: string) => { void live.remove(id); };
  const onDeleteReadNotes = () => { void live.removeRead(); };
  const openNotes = () => {
    live.dismissToast();
    setShowNotices(false);
    if (section === 'panel' && isReseller) setPanelPage('notifications');
    else setUserPage('notifications');
  };
  const openProfile = () => {
    setShowNotices(false);
    if (nativeApp) setUserPage('profile');
    else setShowProfile(true);
  };
  const toastEl = (
    <NoteAlertToast note={live.toast} onOpen={openNotes} onClose={live.dismissToast} />
  );

  // Notices derived from the signed-in account's own subscription
  const left = daysLeft(self.meta.expiry);
  const accessActive = planIsActive(self.meta.plan, self.meta.expiry);
  const notices: string[] = [];
  if (self.meta.expiry && left >= 0 && left <= 7) notices.push(`Your ${self.meta.plan || 'plan'} expires in ${left} day(s).`);
  if (self.meta.expiry && left < 0) notices.push(`Your ${self.meta.plan || 'plan'} has expired. Renew to restore access.`);
  if (!self.meta.plan) notices.push('No plan assigned yet — contact the administrator to get started.');
  const bellCount = unreadInbox;

  /* ── Reseller management panel (web only — mobile uses full-screen tabs) ── */
  if (section === 'panel' && isReseller && !nativeApp) {
    const renderPanel = () => {
      switch (panelPage) {
        case 'members':  return <MyMembersPage ownerId={session.id} ownerName={session.name} ownerMaxDevices={self.max_devices} members={members} payments={payments} onReload={load} />;
        case 'payments': return <PaymentsPage payments={payments} members={members} />;
        case 'invoices': return <InvoicesPage ownerName={session.name} members={members} payments={payments} />;
        case 'notifications':
          return <InboxPage notes={inbox} onRead={onReadNote} onReadAll={onReadAllNotes} onDelete={onDeleteNote} onDeleteRead={onDeleteReadNotes} />;
        case 'inbox':
          return <TicketsInbox mode="seller-inbox" account={ticketAccount} />;
        default:
          return (
            <OverviewPage
              members={members}
              payments={payments}
              adminWhatsapp={adminWhatsapp}
              adminWaLink={adminWa}
              onManageAll={() => setPanelPage('members')}
            />
          );
      }
    };

    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-slate-100 font-sans">
        <ResellerSidebar
          current={panelPage}
          onChange={setPanelPage}
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          onLogout={handleLogout}
          adminWhatsapp={adminWhatsapp}
          adminWaLink={adminWa}
          name={session.name}
          email={session.email}
          onBackToDashboard={() => setSection('personal')}
          unreadCount={unreadInbox}
        />

        <div className="transition-all duration-300 min-h-screen flex flex-col" style={{ marginLeft: `${sideW}px` }}>
          <header className="sticky top-0 z-20 bg-[#0d0908]/95 backdrop-blur border-b border-[#2a1e1c] flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3">
            <div>
              <h1 className="text-lg font-black text-white">Reseller <span className="text-red-500">Dashboard</span></h1>
              <p className="text-xs text-slate-400 mt-0.5">Manage members, subscriptions, and revenue</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSection('personal')}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1210] hover:bg-[#231a18] border border-[#3a2a26] text-slate-300 hover:text-white text-[11px] font-bold rounded-xl transition cursor-pointer">
                <ArrowLeft className="w-3.5 h-3.5" /> My Dashboard
              </button>
              <a href={adminWa} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp ({adminWhatsapp.replace('+92', '0')})
              </a>
              <span className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
              </span>
              <button onClick={() => setPanelPage('notifications')}
                className="relative p-2 bg-[#1a1210] hover:bg-[#231a18] border border-[#2a1e1c] rounded-xl text-slate-400 hover:text-white transition cursor-pointer">
                <Bell className="w-4 h-4" />
                {unreadInbox > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {unreadInbox}
                  </span>
                )}
              </button>
            </div>
          </header>

          <main className="flex-1 p-5 lg:p-6">{renderPanel()}</main>

          <footer className="border-t border-[#1a1210] px-6 py-3 flex items-center justify-between text-xs text-slate-700">
            <span>AI TOOLZ MART Reseller Panel · v1.0</span>
            <span>{new Date().getFullYear()} · Secure Session</span>
          </footer>
        </div>

        <a href={adminWa} target="_blank" rel="noopener noreferrer" title="Contact Admin on WhatsApp"
          className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-900/40 transition">
          <MessageCircle className="w-6 h-6 text-white" />
        </a>
        {toastEl}
      </div>
    );
  }

  /* ── Personal dashboard ── */
  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-slate-100 font-sans">
      {!nativeApp && (
      <UserSidebar
        current={userPage}
        onChange={setUserPage}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        onLogout={handleLogout}
        showResellerPanel={isReseller}
        onOpenResellerPanel={() => { setSection('panel'); setPanelPage('overview'); }}
        name={session.name}
        avatar={self.avatar}
        roleLabel={isReseller ? 'Reseller' : 'Member'}
        unreadCount={unreadInbox}
      />
      )}

      <div className={`transition-all duration-300 min-h-screen flex flex-col ${mobileAppContentClass()}`} style={{ marginLeft: `${sideW}px` }}>
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-[#0d0908]/95 backdrop-blur border-b border-[#2a1e1c] flex items-center justify-between gap-3 px-5 py-3">
          {nativeApp ? (
            <div className="flex items-center gap-3 min-w-0">
              <img src="/logo.png" alt="AI Toolz Mart" className="h-10 w-auto shrink-0 object-contain" />
              <div className="min-w-0">
                <h1 className="text-sm font-black text-white truncate">AI Toolz Mart</h1>
                <p className="text-[10px] text-slate-500 truncate">Hi, {session.name}</p>
              </div>
            </div>
          ) : (
          <div>
            <h1 className="text-base sm:text-lg font-black text-white">
              Welcome back, <span className="text-red-500">{session.name}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          )}

          <div className="flex items-center gap-2">
            {isReseller && !nativeApp && (
              <button onClick={() => { setSection('panel'); setPanelPage('overview'); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-xl transition cursor-pointer">
                <Briefcase className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Reseller Panel</span>
              </button>
            )}

            <div className="relative">
              <button onClick={() => {
                if (nativeApp) openNotes();
                else setShowNotices(s => !s);
              }}
                className="relative p-2 bg-[#1a1210] hover:bg-[#231a18] border border-[#2a1e1c] rounded-xl text-slate-400 hover:text-white transition cursor-pointer">
                <Bell className="w-4 h-4" />
                {bellCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {bellCount}
                  </span>
                )}
              </button>
              {!nativeApp && showNotices && (
                <div className="absolute right-0 mt-2 w-72 bg-[#130d0d] border border-[#3a2a26] rounded-2xl shadow-2xl p-3 z-40 space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notifications</p>
                  {inbox.slice(0, 5).map(note => (
                    <button key={note.id} type="button" onClick={() => { setUserPage('notifications'); setShowNotices(false); void onReadNote(note.id); }}
                      className="w-full text-left text-xs text-slate-300 bg-[#0d0908] border border-[#2a1e1c] rounded-xl px-3 py-2 cursor-pointer hover:border-red-500/30">
                      <span className="font-bold text-white">{note.title}</span>
                      {!note.read && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-red-500 align-middle" />}
                      <span className="block text-slate-500 mt-0.5 line-clamp-2">{note.message}</span>
                    </button>
                  ))}
                  {notices.map((n, i) => (
                    <p key={`plan-${i}`} className="text-xs text-slate-300 bg-[#0d0908] border border-[#2a1e1c] rounded-xl px-3 py-2">{n}</p>
                  ))}
                  {!inbox.length && !notices.length && <p className="text-xs text-slate-500">You're all caught up.</p>}
                  <button type="button" onClick={() => { setUserPage('notifications'); setShowNotices(false); }}
                    className="w-full text-[11px] font-bold text-red-400 hover:text-red-300 cursor-pointer">
                    Open notifications
                  </button>
                </div>
              )}
            </div>

            <button onClick={openProfile}
              className="w-8 h-8 rounded-full overflow-hidden bg-red-600 flex items-center justify-center text-xs font-black text-white cursor-pointer hover:bg-red-700 transition"
              title="My Profile">
              {self.avatar
                ? <img src={self.avatar} alt="" className="w-full h-full object-cover" />
                : (session.name || '?')[0]?.toUpperCase()}
            </button>
          </div>
        </header>

        {userPage === 'shop' ? (
          <main className={isReseller ? 'flex-1' : 'flex-1 p-5 lg:p-6'}>
            {isReseller ? (
              <ResellerPortalContent />
            ) : (
              <CustomerShopPage
                allTools={allTools}
                ownedTools={self.tools}
                planActive={accessActive}
                adminWhatsapp={adminWhatsapp}
                onExtensions={() => setUserPage('extensions')}
              />
            )}
          </main>
        ) : (
          <main className="flex-1 p-5 lg:p-6">
            {userPage === 'profile' ? (
              <MobileProfilePage
                mode={isReseller ? 'self-seller' : 'self-user'}
                roleLabel={isAdmin ? 'Admin' : isReseller ? 'Reseller' : 'Member'}
                account={{
                  customer_code: self.customer_code || session.customerCode || session.id,
                  name: self.name || session.name,
                  email: self.email || session.email,
                  phone: self.phone || '',
                  avatar: self.avatar || '',
                  max_devices: self.max_devices,
                }}
                onSaved={() => { void load(); }}
                onLogout={handleLogout}
                onOpenSettings={isAdmin ? () => setUserPage('settings') : undefined}
              />
            ) : userPage === 'members' && isReseller ? (
              <MyMembersPage ownerId={session.id} ownerName={session.name} ownerMaxDevices={self.max_devices} members={members} payments={payments} onReload={load} />
            ) : userPage === 'orders' && isAdmin ? (
              <AdminOrdersPage />
            ) : userPage === 'accounts' && isAdmin ? (
              <AdminCustomersPage />
            ) : userPage === 'settings' && isAdmin ? (
              <AdminSettingsPage />
            ) : userPage === 'tutorials' ? (
              <TutorialsPage adminWaLink={adminWa} />
            ) : userPage === 'extensions' ? (
              <ExtensionsPage customerId={self.customer_code || session.customerCode || session.id} />
            ) : userPage === 'mobile-app' ? (
              <MobileAppPage customerId={self.customer_code || session.customerCode || session.id} />
            ) : userPage === 'support' || (userPage === 'inbox' && !isReseller && !isAdmin) ? (
              <SupportPage
                account={ticketAccount}
                adminWaLink={adminWa}
                adminWhatsapp={adminWhatsapp}
              />
            ) : userPage === 'notifications' ? (
              <InboxPage notes={inbox} onRead={onReadNote} onReadAll={onReadAllNotes} onDelete={onDeleteNote} onDeleteRead={onDeleteReadNotes} />
            ) : userPage === 'inbox' ? (
              isAdmin
                ? <AdminSupportPage />
                : <TicketsInbox mode={isReseller ? 'seller-inbox' : 'mine'} account={ticketAccount} />
            ) : isAdmin ? (
              <AdminDashboardPage onNavigate={p => {
                if (p === 'orders') setUserPage('orders');
                else if (p === 'customers') setUserPage('accounts');
                else if (p === 'support') setUserPage('inbox');
                else if (p === 'notifications') setUserPage('notifications');
                else if (p === 'settings') setUserPage('settings');
              }} />
            ) : (
              <MyDashboardPage
                name={session.name}
                customerId={self.customer_code || session.customerCode || session.id}
                joinDate={self.join_date}
                meta={self.meta}
                ownedTools={self.tools}
                allTools={allTools}
                adminWhatsapp={adminWhatsapp}
                adminWaLink={adminWa}
                onShop={() => setUserPage('shop')}
                onTutorials={() => setUserPage('tutorials')}
                onProfile={openProfile}
                onExtensions={() => setUserPage('extensions')}
              />
            )}
          </main>
        )}

        {!nativeApp && (
        <footer className="border-t border-[#1a1210] px-6 py-3 flex items-center justify-between text-xs text-slate-700">
          <span>AI TOOLZ MART · Digital Tools Suite</span>
          <span>{new Date().getFullYear()} · Secure Session</span>
        </footer>
        )}
      </div>

      {/* Profile modal — web only; mobile uses full-screen Profile page */}
      {!nativeApp && showProfile && (
        <RModal title="My Profile" sub="Update your account details. Your unique ID never changes." onClose={() => setShowProfile(false)}>
          <AccountProfileForm
            mode={isReseller ? 'self-seller' : 'self-user'}
            account={{
              customer_code: self.customer_code || session.customerCode || session.id,
              name: self.name || session.name,
              email: self.email || session.email,
              phone: self.phone || '',
              avatar: self.avatar || '',
              max_devices: self.max_devices,
            }}
            onCancel={() => setShowProfile(false)}
            onSaved={() => { setShowProfile(false); load(); }}
            save={async payload => {
              const result = await updateMyProfile(payload);
              const next = resellerAuth.session();
              if (next) {
                savePortalSession({
                  ...next,
                  name: result.account?.name || payload.name || next.name,
                  email: result.account?.email || next.email,
                });
                setSession(resellerAuth.session());
              }
            }}
          />
        </RModal>
      )}

      {/* Live chat widget — website only (not in the mobile APK) */}
      {!isAdmin && !nativeApp && <ChatBotWidget />}

      {!nativeApp && (
      <a href={adminWa} target="_blank" rel="noopener noreferrer" title="Contact Admin on WhatsApp"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-900/40 transition">
        <MessageCircle className="w-6 h-6 text-white" />
        {notices.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
            {notices.length}
          </span>
        )}
      </a>
      )}

      {nativeApp && (
        <MobileAppNav
          role={mobileRole}
          current={userPage === 'inbox' && mobileRole === 'user' ? 'support' : userPage}
          onChange={page => {
            setUserPage(page);
          }}
        />
      )}

      {toastEl}
    </div>
  );
};
