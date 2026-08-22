import React, { useCallback, useRef, useState } from 'react';
import {
  CheckCircle2, Chrome, Download, FolderOpen, Loader2, Puzzle,
  PackageCheck, Smartphone, X, Zap, Cookie,
} from 'lucide-react';
import type { Tool } from '../../admin/data/adminStore';
import {
  EXTENSION_DOWNLOAD_URL,
  EXTENSION_DISPLAY_NAME,
  closeReservedTab,
  isAccessExtensionInstalled,
  isOneClick,
  launchAssignedTool,
  NeedExtensionError,
  PopupBlockedError,
  reserveToolTab,
  type LaunchProgressStep,
} from '../../lib/toolCookies';
import { CookieSessionApplyScreen } from './CookieSessionApplyScreen';

/** By extension tools never get Session Apply / Continue without extension. */
function allowsSessionApply(tool: Tool, err?: NeedExtensionError | null): boolean {
  const raw = String(tool.accessMethod || '').trim().toLowerCase();
  if (raw === 'extension' || raw === 'by_extension') return false;
  if (err) return err.allowSessionApply;
  return isOneClick(tool.accessMethod);
}

const CONNECT_STEPS: { id: LaunchProgressStep; label: string }[] = [
  { id: 'authenticating', label: 'Authenticating account' },
  { id: 'session', label: 'Applying session' },
  { id: 'unlocking', label: 'Unlocking panel' },
  { id: 'launching', label: 'Launching tool' },
];

const INSTALL_STEPS = [
  {
    icon: Download,
    title: 'Download the extension',
    text: `Download the official ${EXTENSION_DISPLAY_NAME} ZIP from this screen.`,
  },
  {
    icon: FolderOpen,
    title: 'Extract the ZIP',
    text: 'Right-click the file, choose Extract All, and keep the extracted folder.',
  },
  {
    icon: Chrome,
    title: 'Open Chrome Extensions',
    text: 'Visit chrome://extensions (or edge://extensions in Microsoft Edge).',
  },
  {
    icon: Puzzle,
    title: 'Load unpacked',
    text: 'Enable Developer mode, click Load unpacked, and select the extracted folder.',
  },
  {
    icon: PackageCheck,
    title: 'Confirm it is active',
    text: `You should see “${EXTENSION_DISPLAY_NAME}” in your extensions list.`,
  },
];

function stepIndex(step: LaunchProgressStep): number {
  if (step === 'check' || step === 'authenticating') return 0;
  if (step === 'session') return 1;
  if (step === 'unlocking') return 2;
  if (step === 'launching' || step === 'done') return 3;
  return 0;
}

/** Dark connecting modal — auto-login progress while cookies/session apply. */
export const ConnectingToToolModal: React.FC<{
  toolName: string;
  activeStep: LaunchProgressStep;
}> = ({ toolName, activeStep }) => {
  const idx = stepIndex(activeStep);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/85 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-3xl border border-[#3a2a26] bg-[#130d0d] p-6 shadow-2xl"
        style={{ boxShadow: '0 0 60px rgba(204,26,26,0.18)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="atm-connecting-title"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-600/15">
          <Loader2 className="h-7 w-7 animate-spin text-red-400" />
        </div>
        <h3 id="atm-connecting-title" className="text-center text-lg font-black text-white">
          Connecting to Tool
        </h3>
        <p className="mt-1 text-center text-xs text-slate-400">
          Auto-login in progress, please wait…
        </p>
        {toolName && (
          <p className="mt-2 text-center text-[11px] font-bold text-red-300">{toolName}</p>
        )}

        <ul className="mt-6 space-y-3">
          {CONNECT_STEPS.map((s, i) => {
            const done = i < idx || activeStep === 'done';
            const current = i === idx && activeStep !== 'done';
            return (
              <li key={s.id} className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                    done
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                      : current
                        ? 'border-red-500/40 bg-red-600/20 text-red-300'
                        : 'border-[#2a1e1c] bg-[#0d0908] text-slate-600'
                  }`}
                >
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : current ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : i + 1}
                </span>
                <span className={`text-xs font-bold ${done || current ? 'text-white' : 'text-slate-600'}`}>
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

/** In-dashboard installation guide when the AI Toolz Mart extension is missing. */
export const ExtensionInstallGuide: React.FC<{
  toolName?: string;
  onClose: () => void;
  onInstalled: () => void;
  onOpenExtensionsPage?: () => void;
  /** Prefer Session Apply (server proxy) instead of installing. */
  onContinueWithoutExtension?: () => void;
}> = ({ toolName, onClose, onInstalled, onOpenExtensionsPage, onContinueWithoutExtension }) => {
  const [checking, setChecking] = useState(false);
  const [hint, setHint] = useState('');

  const recheck = async () => {
    setChecking(true);
    setHint('');
    try {
      const ok = await isAccessExtensionInstalled();
      if (ok) {
        onInstalled();
        return;
      }
      setHint('Extension still not detected. Finish Load unpacked in Chrome, then try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#0a0808]/90 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-8 sm:py-12">
        <div
          className="relative overflow-hidden rounded-3xl border border-red-500/30 bg-[#130d0d] shadow-2xl"
          style={{ boxShadow: '0 0 80px rgba(204,26,26,0.12)' }}
        >
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-3 border-b border-[#2a1e1c] p-5 sm:p-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/35 bg-red-600/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-red-300">
                <Puzzle className="h-3 w-3" /> Installation Guide
              </span>
              <h2 className="mt-3 text-2xl font-black text-white">AI Toolz Mart</h2>
              <p className="mt-1 text-xs text-slate-400">
                Install <strong className="text-slate-200">{EXTENSION_DISPLAY_NAME}</strong>
                {toolName ? (
                  <>
                    {' '}
                    so <strong className="text-red-300">{toolName}</strong> can open with auto-login
                    when saved cookies are configured.
                  </>
                ) : (
                  <> for auto-login with saved cookies and to open your entitled tools.</>
                )}
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

          <div className="relative space-y-5 p-5 sm:p-6">
            <a
              href={EXTENSION_DOWNLOAD_URL}
              download
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-red-900/40 transition hover:bg-red-700"
            >
              <Download className="h-4 w-4" /> Install our extension
            </a>

            {onContinueWithoutExtension && (
              <button
                type="button"
                onClick={onContinueWithoutExtension}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-600/10 px-5 py-3 text-xs font-black text-red-200 transition hover:bg-red-600/20 cursor-pointer"
              >
                <Cookie className="h-4 w-4" />
                Continue without extension — apply cookies &amp; open
              </button>
            )}

            <div>
              <h3 className="text-sm font-black text-white">PC — Chrome / Edge</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">Load the unpacked extension after downloading the ZIP.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {INSTALL_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="flex gap-3 rounded-xl border border-[#2a1e1c] bg-[#0d0908] p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-500/25 bg-red-600/10 text-red-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-red-500">Step {index + 1}</div>
                        <div className="mt-0.5 text-xs font-bold text-white">{step.title}</div>
                        <p className="mt-1 text-[10px] leading-4 text-slate-500">{step.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-[#2a1e1c] bg-[#0d0908] p-4">
              <div className="flex items-center gap-2 text-xs font-black text-slate-300">
                <Smartphone className="h-4 w-4 text-red-400" /> Mobile (optional)
              </div>
              <p className="mt-2 text-[10px] leading-4 text-slate-500">
                Standard Chrome on Android and iPhone does not support unpacked extensions.
                On Android you can try a Chromium browser that allows extensions (for example Mises),
                then load the same ZIP. Desktop Chrome or Edge is recommended.
              </p>
            </div>

            {hint && (
              <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
                {hint}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void recheck()}
                disabled={checking}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-xs font-black text-white transition hover:bg-red-700 disabled:opacity-60 cursor-pointer"
              >
                {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                {checking ? 'Checking…' : "I've installed it — Continue"}
              </button>
              {onOpenExtensionsPage && (
                <button
                  type="button"
                  onClick={onOpenExtensionsPage}
                  className="rounded-xl border border-[#2a1e1c] bg-[#1a1210] px-4 py-3 text-xs font-bold text-slate-300 transition hover:border-red-500/40 hover:text-white cursor-pointer"
                >
                  Full Extensions page
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook used by dashboard / shop Open buttons.
 * Branches on access_method FIRST:
 * - extension / by_extension → require Access extension; Installation Guide if missing; NEVER Session Apply
 * - one_click → Session Apply OK when extension missing (toolaccess proxy / cookie open)
 */
export function useToolLaunch(opts?: { onOpenExtensionsPage?: () => void }) {
  const [guideTool, setGuideTool] = useState<Tool | null>(null);
  const [sessionTool, setSessionTool] = useState<Tool | null>(null);
  const [connecting, setConnecting] = useState<{ name: string; step: LaunchProgressStep } | null>(null);
  const pendingRef = useRef<Tool | null>(null);
  const launchingRef = useRef(false);

  const showNeedExtensionUi = useCallback((tool: Tool, err?: NeedExtensionError | null) => {
    setConnecting(null);
    if (allowsSessionApply(tool, err)) {
      setGuideTool(null);
      setSessionTool(tool);
    } else {
      setSessionTool(null);
      setGuideTool(tool);
    }
  }, []);

  const runLaunch = useCallback(async (tool: Tool, reservedTab?: Window | null) => {
    if (launchingRef.current) return;
    launchingRef.current = true;
    pendingRef.current = tool;
    setGuideTool(null);
    setSessionTool(null);

    try {
      setConnecting({ name: tool.name, step: 'check' });
      await launchAssignedTool(tool, {
        reservedTab: reservedTab || undefined,
        onNeedExtension: () => {
          showNeedExtensionUi(tool);
        },
        onProgress: step => {
          setConnecting({ name: tool.name, step });
        },
      });
      setConnecting({ name: tool.name, step: 'done' });
      await new Promise(r => window.setTimeout(r, 400));
      setConnecting(null);
      pendingRef.current = null;
    } catch (err: any) {
      closeReservedTab(reservedTab);
      setConnecting(null);
      if (err instanceof NeedExtensionError) {
        showNeedExtensionUi(tool, err);
        return;
      }
      if (err instanceof PopupBlockedError) {
        window.alert(err.message);
        return;
      }
      window.alert(err?.message || 'Could not open this tool. Try signing in again.');
    } finally {
      launchingRef.current = false;
    }
  }, [showNeedExtensionUi]);

  const launch = useCallback((tool: Tool) => {
    // Must open the blank tab inside the click gesture — before any await.
    let reserved: Window | null = null;
    try {
      reserved = reserveToolTab();
    } catch (err: any) {
      window.alert(
        err?.message ||
          'Pop-up blocked. Allow pop-ups for this site, then open the tool again.',
      );
      return;
    }
    void runLaunch(tool, reserved);
  }, [runLaunch]);

  const onInstalledContinue = useCallback(() => {
    const tool = guideTool || sessionTool || pendingRef.current;
    if (!tool) return;
    let reserved: Window | null = null;
    try {
      reserved = reserveToolTab();
    } catch (err: any) {
      window.alert(
        err?.message ||
          'Pop-up blocked. Allow pop-ups for this site, then open the tool again.',
      );
      return;
    }
    void runLaunch(tool, reserved);
  }, [guideTool, sessionTool, runLaunch]);

  const ui = (
    <>
      {connecting && (
        <ConnectingToToolModal toolName={connecting.name} activeStep={connecting.step} />
      )}
      {sessionTool && !connecting && !guideTool && allowsSessionApply(sessionTool) && (
        <CookieSessionApplyScreen
          tool={sessionTool}
          onClose={() => setSessionTool(null)}
          onShowInstallGuide={() => {
            setGuideTool(sessionTool);
            setSessionTool(null);
          }}
        />
      )}
      {guideTool && !connecting && (
        <ExtensionInstallGuide
          toolName={guideTool.name}
          onClose={() => setGuideTool(null)}
          onInstalled={onInstalledContinue}
          onContinueWithoutExtension={
            // Never offer Session Apply for By extension tools.
            allowsSessionApply(guideTool)
              ? () => {
                  setSessionTool(guideTool);
                  setGuideTool(null);
                }
              : undefined
          }
          onOpenExtensionsPage={
            opts?.onOpenExtensionsPage
              ? () => {
                  setGuideTool(null);
                  opts.onOpenExtensionsPage?.();
                }
              : undefined
          }
        />
      )}
    </>
  );

  return { launch, ui, isBusy: Boolean(connecting || guideTool || sessionTool) };
}
