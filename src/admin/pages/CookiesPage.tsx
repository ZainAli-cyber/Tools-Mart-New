import React, { useEffect, useMemo, useState } from 'react';
import { Cookie, Plus, Save, Search, X } from 'lucide-react';
import type { Tool } from '../data/adminStore';
import { db } from '../data/adminStore';
import { authStore } from '../store/authStore';
import { resellerAuth } from '../../reseller/store/resellerAuth';
import { AdminTable, Badge, SearchInput, SectionHeader, Td, Th, Tr } from '../components/AdminUI';
import {
  cookiesAreSet,
  DEFAULT_PANEL_REFERRER,
  APEX_PANEL_REFERRER,
  isLoginLikePanelReferrer,
  isToolAccessUrl,
  loadCatalogTools,
  saveToolCookieSettings,
  TOOLACCESS_ADMIN_WARNING,
  type ToolAccessMethod,
  type ToolCookieFields,
} from '../../lib/toolCookies';

function isRealToolHost(url?: string | null): boolean {
  try {
    const host = new URL(String(url || '').trim()).hostname.toLowerCase();
    if (!host || host === 'toolaccess.click' || host.endsWith('.toolaccess.click')) return false;
    return (
      host === 'chatgpt.com' ||
      host.endsWith('.chatgpt.com') ||
      host === 'chat.openai.com' ||
      host.endsWith('.openai.com')
    );
  } catch {
    return /chatgpt\.com|chat\.openai\.com/i.test(String(url || ''));
  }
}

const inpCls =
  'w-full bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition';
const lblCls = 'text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5';

const SAMPLE = `[
  {
    "domain": ".example.com",
    "name": "session",
    "value": "",
    "path": "/",
    "secure": true,
    "httpOnly": true,
    "expirationDate": 1893456000
  }
]`;

export const CookiesPage: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Tool | null>(null);
  const [form, setForm] = useState<ToolCookieFields>({
    accessMethod: 'extension',
    toolUrl: '',
    cookiesJson: '',
    panelReferrer: '',
  });
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [labelsBusy, setLabelsBusy] = useState(false);

  const load = async () => {
    const list = await loadCatalogTools({ includeCookies: true });
    setTools(list);
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    void (async () => {
      try {
        const { getToolAccessLabelsSetting } = await import('../../lib/settingsApi');
        const data = await getToolAccessLabelsSetting();
        setShowLabels(Boolean(data.enabled));
      } catch {
        setShowLabels(false);
      }
    })();
  }, []);

  const toggleLabels = async () => {
    setLabelsBusy(true);
    try {
      const { setToolAccessLabelsSetting } = await import('../../lib/settingsApi');
      const data = await setToolAccessLabelsSetting(!showLabels);
      setShowLabels(Boolean(data.enabled));
      showToast(data.enabled ? 'Tool access labels are now visible on member dashboards' : 'Tool access labels are now hidden');
    } catch (err: any) {
      showToast(err?.message || 'Could not update label setting');
    } finally {
      setLabelsBusy(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3200);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  }, [tools, query]);

  const openEditor = (tool: Tool) => {
    setEditing(tool);
    setError('');
    setForm({
      accessMethod: tool.accessMethod === 'one_click' ? 'one_click' : 'extension',
      toolUrl: tool.toolUrl || '',
      cookiesJson: tool.cookiesJson || '',
      panelReferrer: tool.panelReferrer || '',
    });
  };

  const setMethod = (method: ToolAccessMethod) => setForm(f => ({ ...f, accessMethod: method }));

  const sessionExpired = /Admin session expired|not authorized as admin/i.test(error);
  const toolaccessUrl = isToolAccessUrl(form.toolUrl);
  const oneClickToolaccess = form.accessMethod === 'one_click' && toolaccessUrl;
  const loginLikeReferrer = isLoginLikePanelReferrer(form.panelReferrer);
  const showClearReferrerTip =
    Boolean(form.panelReferrer?.trim()) &&
    isRealToolHost(form.toolUrl) &&
    !isToolAccessUrl(form.toolUrl);

  const reLogin = async () => {
    setError('');
    await authStore.logout();
    await resellerAuth.logout();
    window.location.assign('/admin');
  };

  const save = async () => {
    if (!editing) return;
    const raw = form.cookiesJson.trim();
    if (raw) {
      try {
        JSON.parse(raw);
      } catch {
        setError('Cookies must be valid JSON (an array of cookie objects).');
        return;
      }
    }
    if (form.accessMethod === 'one_click' && !form.toolUrl.trim()) {
      setError('Destination URL is required for On one click access.');
      return;
    }
    setSaving(true);
    setError('');
    const result = await saveToolCookieSettings(editing, {
      accessMethod: form.accessMethod,
      toolUrl: form.toolUrl.trim(),
      cookiesJson: raw,
      panelReferrer: form.panelReferrer?.trim() || '',
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    db.log('Cookies Saved', `${editing.name} access ${form.accessMethod}`);
    const name = editing.name;
    setEditing(null);
    await load();
    showToast(
      result.usedFallback
        ? `Saved “${name}” (including new tools) to the database.`
        : `Saved cookie settings for “${name}”`,
    );
  };

  const oneClick = tools.filter(t => t.accessMethod === 'one_click').length;
  const withCookies = tools.filter(t => cookiesAreSet(t.cookiesJson)).length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-5 right-5 z-[100] bg-[#1a1210] border border-red-500/40 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl">
          {toast}
        </div>
      )}

      <SectionHeader
        title="Cookies"
        sub={`${tools.length} tools · control access method and session cookies`}
        action={<SearchInput value={query} onChange={setQuery} placeholder="Search tools by name…" />}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Total tools', tools.length],
          ['By extension', tools.length - oneClick],
          ['On one click', oneClick],
          ['Cookies set', withCookies],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-3 text-center">
            <div className="text-xl font-black text-white">{value}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-white">Show access labels on tools</h3>
          <p className="text-xs text-slate-400 mt-1">
            When ON, members see <strong className="text-slate-300">EXTENSION</strong> / <strong className="text-slate-300">ONE CLICK</strong> badges on each tool.
            Turn OFF to hide those labels on the dashboard.
          </p>
        </div>
        <button
          type="button"
          disabled={labelsBusy}
          onClick={() => void toggleLabels()}
          className="cursor-pointer text-xs font-bold px-4 py-2 rounded-xl border transition shrink-0 disabled:opacity-50"
          style={
            showLabels
              ? { background: '#dc262622', color: '#f87171', borderColor: '#dc262644' }
              : { background: '#1a1210', color: '#666', borderColor: '#2a1e1c' }
          }
        >
          {labelsBusy ? '…' : showLabels ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">
          <Cookie className="w-5 h-5 text-red-400" />
        </div>
        <div className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-white">By extension</strong> — members use the Chrome extension to verify access.
          <span className="mx-2 text-slate-600">·</span>
          <strong className="text-white">On one click</strong> — entitled members open the destination URL from the dashboard.
          Real domains (ChatGPT) open without the extension. <code className="text-slate-300">*.toolaccess.click</code> one-click still uses the Access extension to unlock the panel.
          <span className="block mt-2 text-slate-500">
            Values below come from the production database (not browser localStorage). After running{' '}
            <code className="text-slate-300">supabase_tool_cookies.sql</code>, open each tool and click Save again so members get the destination URL.
          </span>
          <span className="block mt-2 font-medium" style={{ color: 'var(--tip-amber)' }}>
            Prefer real tool destinations (example: <code className="font-semibold" style={{ color: 'inherit' }}>https://chatgpt.com/</code>) + Copy Cookies from that site.
            For <code className="font-semibold" style={{ color: 'inherit' }}>*.toolaccess.click</code> / <code className="font-semibold" style={{ color: 'inherit' }}>*.xemrush.site</code>, set <strong>Panel unlock referrer</strong> to{' '}
            <code className="font-semibold" style={{ color: 'inherit' }}>https://app.pakseotools.com/</code> (Pak dashboard — not /login) and paste cookies from an already unlocked panel session — Referer alone is not enough.
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Tool Operations</h3>
          <div className="relative sm:hidden flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…"
              className="w-full bg-[#1a1210] border border-[#2a1e1c] rounded-xl pl-9 pr-3 py-2 text-xs text-white" />
          </div>
        </div>

        <AdminTable>
          <thead>
            <tr>
              <Th>Tool</Th>
              <Th>Access</Th>
              <Th>Cookies</Th>
              <Th>Destination URL</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(tool => (
              <Tr key={tool.id}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    {tool.favicon
                      ? <img src={tool.favicon} alt="" className="w-8 h-8 rounded-lg bg-white p-0.5 object-contain"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      : <div className="w-8 h-8 rounded-lg bg-[#1a1210] border border-[#2a1e1c]" />}
                    <div>
                      <div className="text-sm font-bold text-white">{tool.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{tool.id}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  {tool.accessMethod === 'one_click'
                    ? <Badge variant="green">On one click</Badge>
                    : <Badge variant="amber">By extension</Badge>}
                </Td>
                <Td>
                  {cookiesAreSet(tool.cookiesJson)
                    ? <Badge variant="green">Set</Badge>
                    : <Badge variant="gray">Empty</Badge>}
                </Td>
                <Td>
                  <span className="text-[11px] text-slate-400 break-all">{tool.toolUrl || '—'}</span>
                </Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => openEditor(tool)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a1210] hover:bg-[#231a18] border border-[#3a2a26] text-slate-300 hover:text-white text-[11px] font-bold rounded-xl transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> {cookiesAreSet(tool.cookiesJson) ? 'Edit cookies' : 'Add Cookie'}
                  </button>
                </Td>
              </Tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">No tools match that search.</td>
              </tr>
            )}
          </tbody>
        </AdminTable>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="w-full max-w-2xl bg-[#130d0d] border border-[#3a2a26] rounded-3xl shadow-2xl my-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-[#2a1e1c]">
              <div>
                <h3 className="text-xl font-black text-white">Update Panel</h3>
                <p className="text-xs text-slate-400 mt-0.5">Cookie settings for {editing.name}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)}
                className="p-2 bg-red-600/10 hover:bg-red-600/20 rounded-xl text-red-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && (
                <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-3 py-2 text-xs text-red-300 space-y-2">
                  <div>{error}</div>
                  {sessionExpired && (
                    <button
                      type="button"
                      onClick={() => void reLogin()}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                    >
                      Sign in again
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className={lblCls}>Tool Name</label>
                <input value={editing.name} readOnly className={`${inpCls} opacity-80`} />
              </div>

              <div>
                <label className={lblCls}>Access method</label>
                <div className="flex gap-2">
                  {([
                    ['extension', 'By extension'],
                    ['one_click', 'On one click'],
                  ] as const).map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setMethod(id)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                        form.accessMethod === id
                          ? 'bg-red-600 text-white border-red-500'
                          : 'bg-[#0d0908] text-slate-400 border-[#2a1e1c] hover:text-white'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  <strong className="text-slate-400">By extension</strong> — member must install Access; cookies auto-apply.
                  <br />
                  <strong className="text-slate-400">On one click</strong> — one click from the dashboard. With{' '}
                  <strong className="text-slate-300">Global Proxy Engine</strong> ON (Admin → Accounts / Settings), the
                  server applies cookies through your residential proxy — no extension. If the proxy is OFF and Cookies
                  JSON is saved, Access extension / Session Apply is used. URL-only = leave Cookies empty.
                </p>
                {form.accessMethod === 'one_click' && String(form.cookiesJson || '').trim().length > 2 && (
                  <div className="mt-2 bg-amber-900/25 border border-amber-500/35 rounded-xl px-3 py-2 text-[11px] tip-amber leading-relaxed">
                    Cookies JSON is set. Enable <strong>Global Proxy Engine</strong> for no-extension one-click, or use
                    the Access extension / Session Apply. Clear Cookies for true URL-only open (no auto-login).
                  </div>
                )}
              </div>

              <div>
                <label className={lblCls}>Tool URL</label>
                <input
                  value={form.toolUrl}
                  onChange={e => setForm(f => ({ ...f, toolUrl: e.target.value }))}
                  className={inpCls}
                  placeholder="https://app.example.com"
                />
                {isToolAccessUrl(form.toolUrl) && (
                  <div className="mt-2 bg-amber-900/25 border border-amber-500/35 rounded-xl px-3 py-2 text-[11px] tip-amber leading-relaxed">
                    {TOOLACCESS_ADMIN_WARNING}
                  </div>
                )}
                {oneClickToolaccess && (
                  <div className="mt-2 bg-amber-900/25 border border-amber-500/35 rounded-xl px-3 py-2 text-[11px] tip-amber leading-relaxed">
                    toolaccess panels need Access extension (or Session apply proxy) to unlock — even on one click.
                  </div>
                )}
              </div>

              <div>
                <label className={lblCls}>
                  Panel unlock referrer{' '}
                  <span className="normal-case tracking-normal text-slate-500 font-semibold">
                    (optional · panels only)
                  </span>
                </label>
                <input
                  value={form.panelReferrer || ''}
                  onChange={e => setForm(f => ({ ...f, panelReferrer: e.target.value }))}
                  className={inpCls}
                  placeholder={DEFAULT_PANEL_REFERRER}
                />
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Dashboard URL the panel expects as Referer (Pak opens tools from the app host). Suggestions:{' '}
                  <button
                    type="button"
                    className="text-red-400 hover:text-red-300 underline cursor-pointer bg-transparent border-0 p-0 text-[10px] font-bold"
                    onClick={() => setForm(f => ({ ...f, panelReferrer: DEFAULT_PANEL_REFERRER }))}
                  >
                    {DEFAULT_PANEL_REFERRER}
                  </button>
                  {' · '}
                  <button
                    type="button"
                    className="text-red-400 hover:text-red-300 underline cursor-pointer bg-transparent border-0 p-0 text-[10px] font-bold"
                    onClick={() => setForm(f => ({ ...f, panelReferrer: APEX_PANEL_REFERRER }))}
                  >
                    {APEX_PANEL_REFERRER}
                  </button>
                  . Leave empty for real domains like ChatGPT. Do not use <code className="text-slate-400">/login</code> — panels expect the dashboard root.
                  Sites with Cloudflare (Canva, many design tools) often <strong>cannot</strong> use one-click — keep those on <strong>By extension</strong>.
                </p>
                {loginLikeReferrer && toolaccessUrl && (
                  <div className="mt-2 bg-amber-900/25 border border-amber-500/35 rounded-xl px-3 py-2 text-[11px] tip-amber leading-relaxed flex flex-wrap items-center gap-2">
                    <span>
                      <code className="font-semibold">/login</code> is usually wrong for unlock. Use the Pak app dashboard instead (e.g. {DEFAULT_PANEL_REFERRER}). The extension will normalize /login → / automatically, but saving the correct value is better.
                    </span>
                    <button
                      type="button"
                      className="px-2 py-1 bg-amber-600/30 hover:bg-amber-600/45 border border-amber-500/40 text-amber-100 text-[10px] font-bold rounded-lg cursor-pointer"
                      onClick={() => setForm(f => ({ ...f, panelReferrer: DEFAULT_PANEL_REFERRER }))}
                    >
                      Use {DEFAULT_PANEL_REFERRER}
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 bg-amber-600/30 hover:bg-amber-600/45 border border-amber-500/40 text-amber-100 text-[10px] font-bold rounded-lg cursor-pointer"
                      onClick={() => setForm(f => ({ ...f, panelReferrer: APEX_PANEL_REFERRER }))}
                    >
                      Use {APEX_PANEL_REFERRER}
                    </button>
                  </div>
                )}
                {showClearReferrerTip && (
                  <div className="mt-2 bg-amber-900/25 border border-amber-500/35 rounded-xl px-3 py-2 text-[11px] tip-amber leading-relaxed flex flex-wrap items-center gap-2">
                    <span>
                      ChatGPT / real tool URLs work best with an empty unlock referrer. A set value can force the extension path on one-click launch.
                    </span>
                    <button
                      type="button"
                      className="px-2 py-1 bg-amber-600/30 hover:bg-amber-600/45 border border-amber-500/40 text-amber-100 text-[10px] font-bold rounded-lg cursor-pointer"
                      onClick={() => setForm(f => ({ ...f, panelReferrer: '' }))}
                    >
                      Clear referrer
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className={lblCls}>Cookies (JSON)</label>
                <textarea
                  value={form.cookiesJson}
                  onChange={e => setForm(f => ({ ...f, cookiesJson: e.target.value }))}
                  rows={12}
                  spellCheck={false}
                  placeholder={SAMPLE}
                  className={`${inpCls} font-mono text-[11px] leading-relaxed resize-y min-h-[220px]`}
                />
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Paste an array of cookie objects (domain, name, value, path, secure, httpOnly, expirationDate). Stored in the database only.
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-[#2a1e1c] flex gap-2 justify-end">
              <button type="button" onClick={() => setEditing(null)}
                className="px-5 py-2.5 bg-[#1a1210] hover:bg-[#231a18] border border-[#3a2a26] text-slate-300 text-sm font-bold rounded-xl cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={() => void save()} disabled={saving}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-black rounded-xl cursor-pointer flex items-center gap-2">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
