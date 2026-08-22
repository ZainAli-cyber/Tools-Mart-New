import React from 'react';
import {
  Chrome, Download, FolderOpen, PackageCheck, Puzzle, RefreshCw,
  ShieldCheck, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { EXTENSION_DOWNLOAD_URL, EXTENSION_DISPLAY_NAME } from '../../lib/toolCookies';

const steps = [
  {
    icon: Download,
    title: 'Download the extension',
    text: `Download the official ${EXTENSION_DISPLAY_NAME} ZIP from this page.`,
  },
  {
    icon: FolderOpen,
    title: 'Extract the ZIP file',
    text: 'Right-click the downloaded file, choose Extract All, and keep the folder.',
  },
  {
    icon: Chrome,
    title: 'Open Chrome Extensions',
    text: 'Open chrome://extensions in Chrome or edge://extensions in Microsoft Edge.',
  },
  {
    icon: Puzzle,
    title: 'Enable Developer mode',
    text: 'Turn on Developer mode, then click Load unpacked and select the extracted folder.',
  },
  {
    icon: PackageCheck,
    title: 'Sign in securely',
    text: 'Open the extension, enter this portal URL and your Tools‑Mart login credentials.',
  },
  {
    icon: RefreshCw,
    title: 'Refresh your access',
    text: 'The extension checks your current plan, expiry, Customer ID, and assigned tools.',
  },
];

export const ExtensionsPage: React.FC<{ customerId: string }> = ({ customerId }) => (
  <div className="space-y-5">
    <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/80 to-[#130d0d] p-5 sm:p-6">
      <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-red-600/15 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
            <ShieldCheck className="h-3 w-3" /> Official Extension
          </span>
          <h2 className="mt-3 text-2xl font-black text-white">AI Toolz Mart Secure Access</h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">
            Sign in with your Tools‑Mart account and verify the tools assigned to your active package.
            Opening an entitled tool from the dashboard requires <strong className="text-slate-300">{EXTENSION_DISPLAY_NAME}</strong>.
            For <strong className="text-slate-300">On one click</strong> tools, the extension applies admin-supplied session cookies before the URL opens.
            For <strong className="text-slate-300">*.toolaccess.click</strong> panels it can also rewrite Referer
            (prefer <code className="text-slate-300">https://app.pakseotools.com/</code>) using the admin Panel unlock referrer.
            The extension never stores your password.
          </p>
          <div className="mt-3 inline-flex rounded-xl border border-red-500/25 bg-black/20 px-3 py-2 text-xs">
            <span className="text-slate-500">Your Customer ID:</span>
            <strong className="ml-2 tracking-wider text-red-400">{customerId}</strong>
          </div>
        </div>

        <a
          href={EXTENSION_DOWNLOAD_URL}
          download
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-900/30 transition hover:bg-red-700"
        >
          <Download className="h-4 w-4" /> Download Extension
        </a>
      </div>
    </div>

    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <section className="rounded-2xl border border-[#2a1e1c] bg-[#130d0d] p-5">
        <div className="mb-4">
          <h3 className="text-base font-black text-white">Installation instructions</h3>
          <p className="mt-1 text-xs text-slate-500">Chrome and Microsoft Edge on desktop</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((step, index) => {
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
      </section>

      <aside className="space-y-3">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> What it verifies
          </div>
          <ul className="mt-3 space-y-2 text-[11px] text-slate-400">
            <li>✓ Secure Supabase login</li>
            <li>✓ Unique Customer ID</li>
            <li>✓ Current plan and expiry</li>
            <li>✓ Assigned tool list</li>
            <li>✓ Suspended account status</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-xs font-black text-amber-400">
            <AlertTriangle className="h-4 w-4" /> Important
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-500">
            Standard Chrome on Android and iPhone does not support unpacked extensions.
            Use desktop Chrome or Edge. Only install files downloaded from this dashboard.
          </p>
        </div>
      </aside>
    </div>
  </div>
);
