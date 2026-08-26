import React, { useEffect, useState } from 'react';
import {
  Smartphone, Download, CheckCircle2, RefreshCw, ShieldCheck, Zap, Cookie, AlertTriangle,
} from 'lucide-react';
import { apiUrl } from '../../lib/mobile/portalBase';

type MobileInfo = {
  ok?: boolean;
  apkUrl?: string;
  version?: string;
  minAndroid?: number;
  appName?: string;
  note?: string;
};

const DEFAULT_APK = '/downloads/aitoolzmart.apk';

export const MobileAppPage: React.FC<{ customerId: string }> = ({ customerId }) => {
  const [info, setInfo] = useState<MobileInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/mobile/info'));
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setInfo(data);
      } catch {
        if (!cancelled) setInfo({ apkUrl: DEFAULT_APK, version: '1.0.0' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const apkHref = apiUrl(String(info?.apkUrl || DEFAULT_APK));
  const version = String(info?.version || '1.0.0');

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/60 to-[#130d0d] p-5 sm:p-6">
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-red-600/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="" className="h-14 w-auto object-contain" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-600/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-red-300">
                <Smartphone className="h-3 w-3" /> Android App
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-black text-white">AI Toolz Mart for Mobile</h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">
              One tap opens every tool inside the app — <strong className="text-slate-300">no extension</strong>.
              Fresh cookies from admin on every launch. Built-in <strong className="text-red-300">support tickets</strong> and WhatsApp help.
            </p>
            <div className="mt-3 inline-flex rounded-xl border border-red-500/25 bg-black/20 px-3 py-2 text-xs">
              <span className="text-slate-500">Customer ID:</span>
              <strong className="ml-2 tracking-wider text-red-400">{customerId}</strong>
            </div>
          </div>

          <a
            href={apkHref}
            download
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-900/30 transition hover:bg-red-500"
          >
            <Download className="h-4 w-4" />
            Download APK {loading ? '' : `(v${version})`}
          </a>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="rounded-2xl border border-[#2a1e1c] bg-[#130d0d] p-5">
          <h3 className="text-base font-black text-white">Install & use</h3>
          <ol className="mt-4 space-y-4 text-xs leading-5 text-slate-400">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-red-600/20 text-[10px] font-black text-red-400">1</span>
              <span>Download and install the APK (Android 7+).</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-red-600/20 text-[10px] font-black text-red-400">2</span>
              <span>Sign in with your Tools-Mart email and password.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-red-600/20 text-[10px] font-black text-red-400">3</span>
              <span>Tap <strong className="text-slate-300">Open</strong> on any tool — opens in-app with admin session.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-red-600/20 text-[10px] font-black text-red-400">4</span>
              <span>Use bottom bar: <strong className="text-slate-300">Chat</strong> for support, <strong className="text-slate-300">Tickets</strong> to track replies.</span>
            </li>
          </ol>
        </section>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-[#2a1e1c] bg-[#130d0d] p-4">
            <div className="flex items-center gap-2 text-red-400">
              <RefreshCw className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-wider">Auto-updates</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Cookie changes apply on next Open. No reinstall when admin refreshes sessions.
            </p>
          </div>
          <div className="rounded-2xl border border-[#2a1e1c] bg-[#130d0d] p-4">
            <div className="flex items-center gap-2 text-red-400">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-wider">Same brand</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              App uses the same logo, dark red theme, and dashboard as the website.
            </p>
          </div>
        </aside>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Zap, title: 'One tap open', text: 'Every entitled tool from your dashboard.' },
          { icon: Cookie, title: 'Fresh cookies', text: 'Fetched from admin on every launch.' },
          { icon: CheckCircle2, title: 'Support built-in', text: 'Ticket inbox and WhatsApp support in the app.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-[#2a1e1c] bg-[#130d0d] p-4">
            <Icon className="h-5 w-5 text-red-500" />
            <h4 className="mt-2 text-sm font-bold text-white">{title}</h4>
            <p className="mt-1 text-[11px] text-slate-500">{text}</p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-[11px] text-amber-200/90">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p>
          iPhone app coming later. On desktop, use the Access extension. If Android blocks install, enable
          &quot;Install unknown apps&quot; for your browser.
        </p>
      </div>
    </div>
  );
};
