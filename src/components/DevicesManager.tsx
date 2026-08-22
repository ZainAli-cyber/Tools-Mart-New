import React, { useEffect, useState } from 'react';
import { MonitorSmartphone, Trash2, RefreshCw } from 'lucide-react';
import {
  listAccountDevices,
  listMyDevices,
  revokeDevice,
  setMaxDevices,
  type DeviceSession,
} from '../lib/deviceApi';
import { getDeviceFingerprint } from '../lib/deviceFingerprint';

const inp =
  'w-full bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition';
const lbl = 'text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5';

function fmtWhen(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export const DevicesManager: React.FC<{
  /** When omitted, loads the signed-in user's devices. */
  accountId?: string;
  accountName?: string;
  /** Allow editing max devices (admin or reseller for members). */
  canEditMax?: boolean;
  /** Cap shown as hint for resellers (their own max_devices). */
  maxCapHint?: number;
  /** Compact embed inside profile (no outer chrome). */
  embedded?: boolean;
  onClose?: () => void;
}> = ({ accountId, accountName, canEditMax = false, maxCapHint, embedded = false, onClose }) => {
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [maxDevices, setMax] = useState(1);
  const [draftMax, setDraftMax] = useState(1);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      if (accountId) {
        const data = await listAccountDevices(accountId);
        setDevices(data.devices || []);
        setMax(data.maxDevices || 1);
        setDraftMax(data.maxDevices || 1);
        setCurrentId(null);
      } else {
        const data = await listMyDevices();
        setDevices(data.devices || []);
        setMax(data.maxDevices || 1);
        setDraftMax(data.maxDevices || 1);
        setCurrentId(data.currentDeviceId || getDeviceFingerprint().deviceId);
      }
    } catch (err: any) {
      setError(err.message || 'Could not load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [accountId]);

  const revoke = async (session: DeviceSession) => {
    if (!confirm(`Remove device "${session.device_label || session.device_id}"?`)) return;
    try {
      await revokeDevice(session.id);
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not revoke device');
    }
  };

  const saveMax = async () => {
    if (!accountId || !canEditMax) return;
    const next = Math.max(1, Math.min(50, Math.floor(Number(draftMax) || 1)));
    setSaving(true);
    setError('');
    try {
      await setMaxDevices(accountId, next);
      setMax(next);
      setDraftMax(next);
    } catch (err: any) {
      setError(err.message || 'Could not save max devices');
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-400">
          {devices.length} / {maxDevices} device{maxDevices === 1 ? '' : 's'} active
          {accountName ? ` · ${accountName}` : ''}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-white transition cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {canEditMax && accountId && (
        <div className="bg-[#0d0908] border border-[#2a1e1c] rounded-xl p-3 space-y-2">
          <label className={lbl}>Max devices</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={1}
              max={50}
              value={draftMax}
              onChange={e => setDraftMax(Number(e.target.value) || 1)}
              className={`${inp} max-w-[120px]`}
            />
            <button
              type="button"
              disabled={saving || draftMax === maxDevices}
              onClick={() => void saveMax()}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition cursor-pointer"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {typeof maxCapHint === 'number' && (
            <p className="text-[10px] text-slate-500">
              Cannot exceed your seller limit of {maxCapHint}.
            </p>
          )}
          <p className="text-[10px] text-slate-500">
            Set to 1 for one device at a time. Revoke old devices if the user is over the limit.
          </p>
        </div>
      )}

      {!canEditMax && (
        <p className="text-[11px] text-slate-500">
          Max devices: <span className="text-white font-semibold">{maxDevices}</span>
          {' '}(only admin/reseller can change this)
        </p>
      )}

      {loading ? (
        <p className="text-xs text-slate-500 py-6 text-center">Loading devices…</p>
      ) : devices.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">No registered devices yet.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {devices.map(d => {
            const isCurrent = currentId && d.device_id === currentId;
            return (
              <div
                key={d.id}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${
                  isCurrent
                    ? 'bg-red-600/10 border-red-500/40'
                    : 'bg-[#0d0908] border-[#2a1e1c]'
                }`}
              >
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-red-600/20 text-red-300 flex items-center justify-center shrink-0">
                  <MonitorSmartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white truncate">
                      {d.device_label || 'Device'}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-600 text-white">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                    {d.device_id}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Last seen {fmtWhen(d.last_seen)} · Added {fmtWhen(d.created_at)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void revoke(d)}
                  title="Revoke device"
                  className="p-2 rounded-lg text-slate-500 hover:text-red-300 hover:bg-red-600/10 transition cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!embedded && onClose && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#1a1210] hover:bg-[#231a18] border border-[#3a2a26] text-slate-300 hover:text-white text-sm font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );

  if (embedded) return body;

  return body;
};
