import React, { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink, Loader2, Puzzle, X, Cookie,
} from 'lucide-react';
import {
  EXTENSION_DISPLAY_NAME,
  fetchLaunchPayload,
  isExtensionAccess,
  isOneClick,
  isToolAccessUrl,
} from '../../lib/toolCookies';
import { applyAndOpenTool } from '../../lib/toolProxyClient';
import type { Tool } from '../../admin/data/adminStore';

const MANUAL_STEPS = [
  'Click Apply & Open tool to start a secure server session for this destination.',
  'toolaccess panels unlock on our proxy using admin-saved cookies and panel referrer (never shown here).',
  'Prefer the Access extension when available — it auto-applies the same session on your browser.',
];

export type CookieSessionApplyScreenProps = {
  tool: Tool;
  onClose: () => void;
  /** Switch to the full Installation Guide (optional). */
  onShowInstallGuide?: () => void;
};

/**
 * Sub-screen when the Chrome extension is missing for ONE-CLICK tools only.
 * By-extension tools must NEVER reach this screen — use Installation Guide instead.
 */
export const CookieSessionApplyScreen: React.FC<CookieSessionApplyScreenProps> = ({
  tool,
  onClose,
  onShowInstallGuide,
}) => {
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [dest, setDest] = useState(String(tool.toolUrl || '').trim());
  const [unlockReferrer, setUnlockReferrer] = useState(String(tool.panelReferrer || '').trim());
  const [toolName, setToolName] = useState(tool.name);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');

  const panelMode = useMemo(
    () => isToolAccessUrl(dest) || Boolean(unlockReferrer),
    [dest, unlockReferrer],
  );

  // Hard guard: by_extension / extension must not use Session Apply.
  useEffect(() => {
    if (isExtensionAccess(tool.accessMethod) || !isOneClick(tool.accessMethod)) {
      onShowInstallGuide?.();
      onClose();
    }
  }, [tool, onClose, onShowInstallGuide]);

  useEffect(() => {
    if (isExtensionAccess(tool.accessMethod)) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const key = String(tool.id || tool.name || '').trim();
        // Meta only — never download cookie values into the Session Apply UI.
        const payload = await fetchLaunchPayload(key, { omitCookies: true });
        if (cancelled) return;
        // If API says extension, bounce to install guide — never Apply & Open.
        if (isExtensionAccess(payload.accessMethod)) {
          onShowInstallGuide?.();
          onClose();
          return;
        }
        setToolName(payload.name || tool.name);
        setDest(String(payload.url || tool.toolUrl || '').trim());
        setUnlockReferrer(
          String(payload.unlockReferrer || payload.panelReferrer || tool.panelReferrer || '').trim(),
        );
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Could not load tool session details.');
        // Keep local dest / referrer fallbacks only (no cookiesJson).
        if (tool.toolUrl?.trim()) setDest(tool.toolUrl.trim());
        if (tool.panelReferrer?.trim()) setUnlockReferrer(tool.panelReferrer.trim());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tool, onClose, onShowInstallGuide]);

  const applyAndOpen = async () => {
    if (isExtensionAccess(tool.accessMethod)) {
      onShowInstallGuide?.();
      onClose();
      return;
    }
    setApplying(true);
    setError('');
    setHint('');
    try {
      const toolId = String(tool.id || tool.name || '').trim();
      const result = await applyAndOpenTool({
        toolId,
        dest,
        unlockReferrer,
        forceProxy: true,
      });

      if (result.opened === 'proxy') {
        setHint('Opened unlocked panel in a new tab (server proxy). You can close this screen.');
      } else {
        setHint(
          panelMode
            ? 'Opened destination. If you still see 403, ask admin to refresh cookies / panel referrer.'
            : 'Opened tool in a new tab (one click). For auto cookie-login, install the Access extension.',
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Could not open the tool.');
    } finally {
      setApplying(false);
    }
  };

  if (isExtensionAccess(tool.accessMethod)) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#0a0808]/90 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col px-4 py-8 sm:py-12">
        <div
          className="relative overflow-hidden rounded-3xl border border-red-500/30 bg-[#130d0d] shadow-2xl"
          style={{ boxShadow: '0 0 80px rgba(204,26,26,0.12)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="atm-cookie-apply-title"
        >
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-3 border-b border-[#2a1e1c] p-5 sm:p-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/35 bg-red-600/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-red-300">
                <Cookie className="h-3 w-3" /> Session apply
              </span>
              <h2 id="atm-cookie-apply-title" className="mt-3 text-2xl font-black text-white">
                {toolName || 'Tool'}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Continue without the browser extension. Open your tool with a secure server session.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-[#2a1e1c] bg-[#0d0908] p-2 text-slate-400 transition hover:border-red-500/40 hover:text-white cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative space-y-4 p-5 sm:p-6">
            <div className="rounded-xl border border-[#2a1e1c] bg-[#0d0908] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-red-500">Destination</div>
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />}
              </div>
              <p className="mt-1 break-all text-xs font-semibold text-slate-200">{dest || '—'}</p>
              {panelMode && (
                <p className="mt-2 text-[10px] leading-4 text-amber-200/90">
                  toolaccess / panel unlock: <strong className="text-amber-100">Apply &amp; Open</strong> uses
                  a server proxy with admin cookies + Referer so you avoid 403 without the extension.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-[#2a1e1c] bg-[#0d0908] p-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Quick steps</div>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                {MANUAL_STEPS.map(step => (
                  <li key={step} className="text-[10px] leading-4 text-slate-400">
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-600/10 px-3 py-2 text-[11px] text-red-200">
                {error}
              </p>
            )}
            {hint && !error && (
              <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">
                {hint}
              </p>
            )}

            <button
              type="button"
              onClick={() => void applyAndOpen()}
              disabled={loading || applying || !dest}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-red-900/40 transition hover:bg-red-700 disabled:opacity-60 cursor-pointer"
            >
              {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
              {applying ? 'Opening…' : 'Apply & Open tool'}
            </button>

            {onShowInstallGuide && (
              <button
                type="button"
                onClick={onShowInstallGuide}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-600/10 px-4 py-2.5 text-[11px] font-bold text-red-200 transition hover:bg-red-600/20 cursor-pointer"
              >
                <Puzzle className="h-3.5 w-3.5" />
                Prefer auto-login? Install {EXTENSION_DISPLAY_NAME}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
