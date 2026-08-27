import React, { useState, useMemo, useEffect } from 'react';
import { LayoutGrid, Search, Lock, Check, ArrowUpRight, MessageCircle, ShoppingBag, Video, User, Copy, IdCard } from 'lucide-react';
import { Pill } from '../components/ResellerUI';
import { useToolLaunch } from '../components/ToolLaunchFlow';
import { fmtDate, daysLeft, planIsActive, waLink, type AccountMeta } from '../../lib/accountStore';
import type { Tool } from '../../admin/data/adminStore';

type ToolTab = 'all' | 'accessible' | 'locked';

/** Badge from Admin Cookies access_method — hide when unknown. */
function accessMethodLabel(method?: string | null): 'ONE CLICK' | 'EXTENSION' | null {
  const m = String(method || '').trim().toLowerCase();
  if (m === 'one_click') return 'ONE CLICK';
  if (m === 'extension' || m === 'by_extension') return 'EXTENSION';
  return null;
}

interface Props {
  name: string;
  customerId: string;
  joinDate: string;
  meta: AccountMeta;
  /** Tool names this account is subscribed to. */
  ownedTools: string[];
  allTools: Tool[];
  adminWhatsapp: string;
  adminWaLink: string;
  onShop: () => void;
  onTutorials: () => void;
  onProfile: () => void;
  onExtensions: () => void;
}

export const MyDashboardPage: React.FC<Props> = ({
  name, customerId, joinDate, meta, ownedTools, allTools, adminWhatsapp, adminWaLink,   onShop, onTutorials, onProfile, onExtensions,
}) => {
  const [tab, setTab] = useState<ToolTab>('all');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAccessLabels, setShowAccessLabels] = useState(false);
  const { launch, ui: launchUi } = useToolLaunch({ onOpenExtensionsPage: onExtensions });

  useEffect(() => {
    void (async () => {
      try {
        const { getToolAccessLabelsSetting } = await import('../../lib/settingsApi');
        const data = await getToolAccessLabelsSetting();
        setShowAccessLabels(Boolean(data.enabled));
      } catch {
        setShowAccessLabels(false);
      }
    })();
  }, []);

  const now = new Date();
  const owned = useMemo(() => new Set(ownedTools.map(t => t.toLowerCase())), [ownedTools]);

  const decorated = useMemo(
    () => allTools.map(t => ({ tool: t, unlocked: owned.has(t.name.toLowerCase()) })),
    [allTools, owned],
  );

  const accessibleCount = decorated.filter(d => d.unlocked).length;
  const lockedCount = decorated.length - accessibleCount;

  const visible = decorated
    .filter(d => tab === 'all' || (tab === 'accessible' ? d.unlocked : !d.unlocked))
    .filter(d => !search || d.tool.name.toLowerCase().includes(search.toLowerCase()));

  const left = daysLeft(meta.expiry);
  const planActive = planIsActive(meta.plan, meta.expiry);

  const tabs: { id: ToolTab; label: string; count: number }[] = [
    { id: 'all',        label: 'All Tools',  count: decorated.length },
    { id: 'accessible', label: 'Accessible', count: accessibleCount },
    { id: 'locked',     label: 'Locked',     count: lockedCount },
  ];

  const heroBtn = 'px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5';

  return (
    <div className="space-y-5">
      {launchUi}
      {/* Hero — reseller-band: soft light surface in light mode; dark gradient stays in dark */}
      <div className="reseller-band relative overflow-hidden rounded-2xl border border-red-500/30 p-5 sm:p-6"
        style={{ background: 'linear-gradient(120deg, #4a0f14 0%, #2a0d0d 55%, #130d0d 100%)' }}>
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-red-600/20 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 bg-red-600/25 border border-red-500/40 text-red-300 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Live Dashboard
            </span>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">Good day, {name}</h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">Manage your subscriptions and explore your premium tools.</p>
              {joinDate && <p className="text-[11px] text-red-400 font-semibold mt-2">Member since {fmtDate(joinDate)}</p>}
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-black/20 px-3 py-2">
              <IdCard className="w-4 h-4 text-red-300" />
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Customer ID</div>
                <div className="text-sm font-black tracking-wider text-white">{customerId}</div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(customerId);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                }}
                className="ml-2 rounded-lg border border-white/15 bg-white/10 p-2 text-slate-300 hover:bg-white/20 hover:text-white transition cursor-pointer"
                title="Copy Customer ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={onShop} className={heroBtn}><ShoppingBag className="w-3 h-3" /> Shop Plans</button>
              <a href={adminWaLink} target="_blank" rel="noopener noreferrer" className={heroBtn}><MessageCircle className="w-3 h-3" /> Support</a>
              <button onClick={onProfile} className={heroBtn}><User className="w-3 h-3" /> My Profile</button>
              <button onClick={onTutorials} className={heroBtn}><Video className="w-3 h-3" /> Tutorials</button>
            </div>
          </div>

          <div className="text-left lg:text-right shrink-0">
            <div className="text-xs font-bold text-slate-300">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-lg font-black text-white/70">
              {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            {meta.plan && (
              <div className="mt-3 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Current Plan</div>
                <div className="text-xs font-black text-red-300">{meta.plan}</div>
                {meta.expiry && (
                  left >= 0
                    ? <Pill variant={left <= 7 ? 'amber' : 'green'}>{left}d left</Pill>
                    : <Pill variant="red">Expired</Pill>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium tools header */}
      <div className="reseller-band bg-gradient-to-r from-red-900/40 to-[#130d0d] border border-red-500/25 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-600/25 border border-red-500/30 flex items-center justify-center shrink-0">
          <LayoutGrid className="w-5 h-5 text-red-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-extrabold text-white">Your Premium Tools</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {accessibleCount > 0 ? `${accessibleCount} tool${accessibleCount > 1 ? 's' : ''} available` : 'No tools assigned yet'}
          </p>
        </div>
        <span className="bg-[#1a1210] border border-[#3a2a26] text-slate-300 text-[10px] font-black px-3 py-1.5 rounded-full whitespace-nowrap">
          {accessibleCount} total
        </span>
      </div>

      {/* Search + tabs */}
      <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools by name…"
            className="w-full bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/50 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  tab === t.id ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : 'bg-[#1a1210] border border-[#2a1e1c] text-slate-400 hover:text-white'
                }`}>
                {t.label} ({t.count})
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-500">Showing {visible.length} of {decorated.length} tools</span>
        </div>
      </div>

      {/* Tool grid */}
      {visible.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map(({ tool, unlocked }) => {
            // A tool the member owns is only usable while their plan is live.
            const usable = unlocked && planActive;
            const methodLabel = showAccessLabels ? accessMethodLabel(tool.accessMethod) : null;
            return (
              <div key={tool.id}
                className={`bg-[#130d0d] border rounded-2xl overflow-hidden flex flex-col transition ${
                  unlocked ? 'border-red-500/25 hover:border-red-500/50' : 'border-[#2a1e1c] hover:border-[#3a2a26]'
                }`}>
                {/* Logo area */}
                <div className="relative bg-[#1a1210] border-b border-[#2a1e1c] p-5 flex items-center justify-center">
                  <span className={`absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    unlocked ? 'bg-red-600 text-white border-red-500' : 'bg-slate-700/40 text-slate-400 border-slate-600/40'
                  }`}>
                    {unlocked ? 'Premium' : 'Locked'}
                  </span>

                  <div className={`w-16 h-16 rounded-2xl bg-white p-2.5 flex items-center justify-center shadow-lg ${unlocked ? '' : 'grayscale opacity-50'}`}>
                    {tool.favicon
                      ? <img src={tool.favicon} alt={tool.name} className="w-full h-full object-contain"
                          onError={e => { (e.target as any).style.display = 'none'; }} />
                      : <span className="text-xl font-black text-slate-800">{tool.name[0]}</span>}
                  </div>
                </div>

                {/* Name */}
                <div className="p-3 text-center flex-1">
                  <div className="text-sm font-bold text-white leading-tight">{tool.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{tool.category}</div>
                  {methodLabel && (
                    <span
                      className={`mt-1.5 inline-flex text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        methodLabel === 'ONE CLICK'
                          ? 'bg-red-600/15 text-red-400 border-red-500/35'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                      title={
                        methodLabel === 'ONE CLICK'
                          ? 'One click from dashboard. Cookie auto-login still needs Access extension when admin saved cookies.'
                          : 'Requires ZynexTools Access extension for cookie auto-login'
                      }
                    >
                      {methodLabel}
                    </span>
                  )}
                </div>

                {/* Status + launch */}
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-[#1a1210]">
                  {!unlocked ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  ) : usable ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                      <Check className="w-3 h-3" /> Access
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                      <Check className="w-3 h-3" /> Offline
                    </span>
                  )}

                  {usable ? (
                    <button
                      type="button"
                      title={`Open ${tool.name}`}
                      onClick={() => launch(tool)}
                      className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition shrink-0 cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  ) : unlocked ? (
                    <span title="Your plan is not active — renew to restore access"
                      className="w-7 h-7 rounded-lg bg-[#1a1210] border border-[#2a1e1c] flex items-center justify-center text-slate-600 shrink-0 cursor-not-allowed">
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  ) : (
                    <a href={waLink(adminWhatsapp, `Hi, I want to subscribe to ${tool.name}.`)}
                      target="_blank" rel="noopener noreferrer" title={`Subscribe to ${tool.name}`}
                      className="px-2 h-7 rounded-lg bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 flex items-center justify-center text-[9px] font-black text-red-400 transition shrink-0">
                      SUBSCRIBE
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#1a1210] border border-[#2a1e1c] flex items-center justify-center">
            <Search className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">No tools available</p>
            <p className="text-xs text-slate-500 mt-1">There are no tools in this category.</p>
          </div>
        </div>
      )}
    </div>
  );
};
