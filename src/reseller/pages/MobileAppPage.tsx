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
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 to-[#130d0d] p-5 sm:p-6">
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-emerald-600/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
              <Smartphone className="h-3 w-3" /> Mobile App
            </span>
            <h2 className="mt-3 text-2xl font-black text-white">AI Toolz Mart for Android</h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">
              Open every assigned tool with <strong className="text-slate-300">one tap</strong> — no Chrome
              extension, no proxy URL. The app fetches the <strong className="text-slate-300">latest cookies</strong> from
              admin each time you open a tool. When admin updates cookies in the dashboard, you get them
              automatically — <strong className="text-emerald-400">no APK reinstall</strong>.
            </p>
            <div className="mt-3 inline-flex rounded-xl border border-emerald-500/25 bg-black/20 px-3 py-2 text-xs">
              <span className="text-slate-500">Your Customer ID:</span>
              <strong className="ml-2 tracking-wider text-emerald-400">{customerId}</strong>
            </div>
          </div>

          <a
            href={apkHref}
            download
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500"
          >
            <Download className="h-4 w-4" />
            Download APK {loading ? '' : `(v${version})`}
          </a>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="rounded-2xl border border-[#2a1e1c] bg-[#130d0d] p-5">
          <h3 className="text-base font-black text-white">How it works</h3>
          <ol className="mt-4 space-y-4 text-xs leading-5 text-slate-400">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20 text-[10px] font-black text-emerald-400">1</span>
              <span>Install the APK once (Android 7+).</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20 text-[10px] font-black text-emerald-400">2</span>
              <span>Sign in with your Tools-Mart email and password.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20 text-[10px] font-black text-emerald-400">3</span>
              <span>Tap <strong className="text-slate-300">Open</strong> on any tool — cookies are fetched live from the server and applied inside the app browser.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20 text-[10px] font-black text-emerald-400">4</span>
              <span>ChatGPT, Canva, Semrush panels, and other tools open in full-screen in-app browser with the real site UI.</span>
            </li>
          </ol>
        </section>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-[#2a1e1c] bg-[#130d0d] p-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <RefreshCw className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-wider">Auto-updates</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Cookie and tool URL changes from admin apply on the next Open. Dashboard UI also updates when loaded from the portal.
            </p>
          </div>
          <div className="rounded-2xl border border-[#2a1e1c] bg-[#130d0d] p-4">
            <div className="flex items-center gap-2 text-red-400">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-wider">Same security</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Plan check, device limits, and tool assignment — same rules as the web dashboard and extension.
            </p>
          </div>
        </aside>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Zap, title: 'One tap open', text: 'No extension install steps on phone.' },
          { icon: Cookie, title: 'Fresh cookies', text: 'Fetched from admin on every tool launch.' },
          { icon: CheckCircle2, title: 'Real tool UI', text: 'In-app browser loads the actual website.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-[#2a1e1c] bg-[#130d0d] p-4">
            <Icon className="h-5 w-5 text-emerald-500" />
            <h4 className="mt-2 text-sm font-bold text-white">{title}</h4>
            <p className="mt-1 text-[11px] text-slate-500">{text}</p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-[11px] text-amber-200/90">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p>
          iPhone app coming later. On desktop, keep using the Access extension for the best experience.
          If Android blocks the install, enable &quot;Install unknown apps&quot; for your browser, then try again.
        </p>
      </div>
    </div>
  );
};
