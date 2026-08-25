import React, { useCallback, useEffect, useState } from 'react';
import { Globe2, Loader2, Trash2 } from 'lucide-react';

type Props = {
  className?: string;
};

/**
 * Admin: Global Proxy Engine — residential sticky HTTP proxy for one-click tools.
 */
export const GlobalProxyEngine: React.FC<Props> = ({ className = '' }) => {
  const [enabled, setEnabled] = useState(false);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const { getGlobalProxySettings } = await import('../../lib/settingsApi');
      const data = await getGlobalProxySettings();
      setEnabled(Boolean(data.enabled));
      setUrl(String(data.url || ''));
      setError('');
      setHint(
        data.setupRequired
          ? data.hint || 'Run supabase_global_proxy_engine.sql in the Supabase SQL Editor.'
          : '',
      );
    } catch (err: any) {
      setEnabled(false);
      const msg = String(err?.message || 'Could not load proxy settings');
      if (/app_settings|global_proxy|schema cache|does not exist/i.test(msg)) {
        setHint(msg);
        setError('');
      } else {
        setHint('');
        setError(msg);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    setError('');
    setOkMsg('');
    setWarnings([]);
    setReady(false);
    try {
      const { saveGlobalProxySettings } = await import('../../lib/settingsApi');
      const data = await saveGlobalProxySettings({ enabled, url: url.trim() });
      setEnabled(Boolean(data.enabled));
      setUrl(String(data.url || url.trim()));
      setOkMsg(
        data.ready
          ? 'Proxy saved. Click “Test one-click” — only green “One-click ready” means ChatGPT/Udemy can work without the extension.'
          : 'Proxy saved (engine off until enabled with a URL).',
      );
      setHint(data.setupRequired ? data.hint || '' : '');
    } catch (err: any) {
      const msg = String(err?.message || 'Could not save proxy');
      if (/app_settings|supabase_global_proxy|schema cache|503/i.test(msg)) {
        setHint(msg.replace(/^Request failed \(\d+\):\s*/i, '') || msg);
        setError('');
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Remove the Global Proxy Engine URL and turn it off?')) return;
    setBusy(true);
    setError('');
    setOkMsg('');
    setWarnings([]);
    setReady(false);
    try {
      const { removeGlobalProxySettings } = await import('../../lib/settingsApi');
      await removeGlobalProxySettings();
      setEnabled(false);
      setUrl('');
      setOkMsg('Proxy removed.');
    } catch (err: any) {
      setError(String(err?.message || 'Could not remove proxy'));
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setError('');
    setOkMsg('');
    setWarnings([]);
    setReady(false);
    try {
      const { testGlobalProxySettings } = await import('../../lib/settingsApi');
      const data = await testGlobalProxySettings(url.trim() || undefined);
      setReady(Boolean(data.oneClickReady));
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      setOkMsg(data.message || (data.ip ? `Outbound IP ${data.ip}` : 'Proxy test finished'));
      if (!data.oneClickReady) {
        setError(
          data.chatgptBlocked || data.hosting
            ? 'This proxy is not strong enough for one-click. Replace it with a residential sticky HTTP proxy, then test again.'
            : '',
        );
      }
    } catch (err: any) {
      setError(String(err?.message || 'Proxy test failed'));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#2a1e1c] bg-[#130d0d] shadow-lg ${className}`}
    >
      <div className="border-b border-red-900/40 bg-red-950/35 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-red-400" />
          <h3 className="text-sm font-extrabold text-red-200">Global Proxy Engine</h3>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          One-click opens tools on the server. That only works with a{' '}
          <strong className="text-slate-300">residential sticky HTTP</strong> proxy — not AWS/VPS
          datacenter IPs. Extension mode still uses the member&apos;s real browser (no proxy needed).
        </p>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-3 py-2.5 text-[11px] leading-relaxed text-amber-100/90">
          <p className="font-bold text-amber-200">Setup for ChatGPT / Udemy one-click</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4 text-amber-100/80">
            <li>
              Buy <strong>residential</strong> proxies (Webshare Residential, IPRoyal, Bright Data,
              PacketStream — not datacenter / “premium shared VPS”).
            </li>
            <li>
              Copy the <strong>HTTP</strong> URL, e.g.{' '}
              <code className="text-amber-50">http://user:pass@host:80/</code> (enable sticky/session
              if the provider shows it).
            </li>
            <li>
              Paste below → Enable → Save → <strong>Test one-click</strong> until you see green
              “One-click ready”.
            </li>
            <li>
              Keep Cloudflare-heavy sites (Canva, some Udemy IPs) on <strong>By extension</strong> if
              the test still flags them.
            </li>
          </ol>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#2a1e1c] bg-[#0d0908] px-3 py-2.5">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            className="h-4 w-4 accent-red-600"
          />
          <span className="text-xs font-bold text-slate-200">Enable proxy routing</span>
        </label>

        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
            Residential HTTP proxy URL
          </label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="http://fygrkybx-us:PASSWORD@p.webshare.io:80/"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-[#2a1e1c] bg-[#0d0908] px-3 py-2.5 text-xs text-white outline-none ring-red-600/40 placeholder:text-slate-600 focus:ring-2"
          />
          <p className="mt-1 text-[10px] text-slate-500">
            Use port <strong className="text-slate-400">:80</strong>, Sticky session (not Rotating),
            and US username like <code className="text-slate-400">user-us</code>. Each tool tab
            auto-adds sticky. Your old AWS IP (e.g. 16.x) will fail — that is expected.
          </p>
        </div>

        {hint && <p className="text-[11px] text-amber-400/90">{hint}</p>}
        {error && <p className="text-[11px] text-red-400">{error}</p>}
        {okMsg && (
          <p className={`text-[11px] ${ready ? 'text-emerald-400' : 'text-slate-300'}`}>{okMsg}</p>
        )}
        {warnings.map(w => (
          <p key={w} className="text-[11px] text-amber-400/90">
            {w}
          </p>
        ))}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save Proxy'}
          </button>
          <button
            type="button"
            disabled={testing || busy || !url.trim()}
            onClick={() => void test()}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-[#2a1e1c] bg-[#0d0908] px-4 py-2 text-xs font-bold text-slate-300 transition hover:border-red-500/40 disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Test one-click
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-red-500/25 bg-red-600/10 px-4 py-2 text-xs font-bold text-red-300 transition hover:bg-red-600/20 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};
