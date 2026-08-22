import React, { useCallback, useEffect, useState } from 'react';
import { MonitorSmartphone } from 'lucide-react';

type Props = {
  /** Extra classes on the outer shell */
  className?: string;
  compact?: boolean;
};

/**
 * Admin master switch for max-devices enforcement.
 * Soft-defaults OFF when app_settings is missing; shows SQL hint instead of "Request failed".
 */
export const DeviceLimitsToggle: React.FC<Props> = ({ className = '', compact }) => {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  const load = useCallback(async () => {
    try {
      const { getDeviceLimitsEnabled } = await import('../../lib/deviceApi');
      const data = await getDeviceLimitsEnabled();
      setOn(Boolean(data.enabled));
      setError('');
      setHint(data.setupRequired ? (data.hint || 'Run supabase_device_limits_toggle.sql in the Supabase SQL Editor.') : '');
    } catch (err: any) {
      setOn(false);
      const msg = String(err?.message || 'Could not load device limits setting');
      if (/supabase_device_limits_toggle|app_settings|does not exist|schema cache/i.test(msg)) {
        setError('');
        setHint(msg);
      } else {
        setHint('');
        setError(msg);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async () => {
    setBusy(true);
    setError('');
    try {
      const { setDeviceLimitsEnabled } = await import('../../lib/deviceApi');
      const data = await setDeviceLimitsEnabled(!on);
      setOn(Boolean(data.enabled));
      setError('');
      setHint(
        data.setupRequired
          ? data.hint || 'Run supabase_device_limits_toggle.sql in the Supabase SQL Editor.'
          : '',
      );
    } catch (err: any) {
      const msg = String(err?.message || 'Could not update device limits');
      if (/supabase_device_limits_toggle|app_settings|does not exist|schema cache|503/i.test(msg)) {
        setHint(msg.replace(/^Request failed \(\d+\):\s*/i, '') || msg);
        setError('');
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-start gap-3">
        {!compact && (
          <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">
            <MonitorSmartphone className="w-4 h-4 text-red-400" />
          </div>
        )}
        <div>
          <h3 className="text-sm font-extrabold text-white">Device limits</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Master switch for max-devices enforcement. Admins are always exempt.
            {on
              ? ' Currently ON — customers/resellers are limited.'
              : ' Currently OFF — no one is blocked by device limits.'}
          </p>
          {hint && <p className="text-[11px] text-amber-400/90 mt-1">{hint}</p>}
          {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        className="cursor-pointer text-xs font-bold px-4 py-2 rounded-xl border transition shrink-0 disabled:opacity-50"
        style={
          on
            ? { background: '#dc262622', color: '#f87171', borderColor: '#dc262644' }
            : { background: '#1a1210', color: '#666', borderColor: '#2a1e1c' }
        }
      >
        {busy ? '…' : on ? 'ON' : 'OFF'}
      </button>
    </div>
  );
};
