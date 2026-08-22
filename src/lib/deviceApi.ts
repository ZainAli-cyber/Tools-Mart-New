import { supabase } from './db';
import { deviceHeaders, getDeviceFingerprint } from './deviceFingerprint';

async function authorizedFetch(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Your session expired. Please log in again.');

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...deviceHeaders(),
        ...(init.headers || {}),
      },
    });
  } catch (e: any) {
    throw new Error(`Network error: ${e?.message || 'Could not reach server'}`);
  }

  const text = await response.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    if (!response.ok) {
      throw new Error(
        `Server error ${response.status}: ${text.slice(0, 120) || 'non-JSON response (is /api/devices mounted?)'}`,
      );
    }
    body = {};
  }

  if (!response.ok) {
    throw new Error(body.error || body.message || `Request failed (${response.status})`);
  }
  return body;
}

export type DeviceSession = {
  id: string;
  account_id: string;
  device_id: string;
  device_label: string | null;
  user_agent: string | null;
  last_seen: string;
  created_at: string;
};

export function registerMyDevice() {
  const fp = getDeviceFingerprint();
  return authorizedFetch('/api/devices/register', {
    method: 'POST',
    body: JSON.stringify({
      deviceId: fp.deviceId,
      deviceLabel: fp.deviceLabel,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    }),
  }) as Promise<{
    ok: true;
    session: DeviceSession;
    maxDevices: number;
    deviceCount: number;
  }>;
}

export function listMyDevices() {
  return authorizedFetch('/api/devices/me') as Promise<{
    accountId: string;
    maxDevices: number;
    currentDeviceId: string | null;
    devices: DeviceSession[];
  }>;
}

export function listAccountDevices(accountId: string) {
  return authorizedFetch(`/api/devices/account/${encodeURIComponent(accountId)}`) as Promise<{
    accountId: string;
    maxDevices: number;
    devices: DeviceSession[];
  }>;
}

export function revokeDevice(sessionId: string) {
  return authorizedFetch(`/api/devices/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  }) as Promise<{ ok: true }>;
}

export function setMaxDevices(accountId: string, maxDevices: number) {
  return authorizedFetch(`/api/devices/account/${encodeURIComponent(accountId)}/max`, {
    method: 'PATCH',
    body: JSON.stringify({ maxDevices }),
  }) as Promise<{ account: { id: string; max_devices: number } }>;
}

export type DeviceLimitsEnabledResponse = {
  enabled: boolean;
  setupRequired?: boolean;
  hint?: string;
};

export function getDeviceLimitsEnabled() {
  return authorizedFetch('/api/devices/limits-enabled') as Promise<DeviceLimitsEnabledResponse>;
}

export function setDeviceLimitsEnabled(enabled: boolean) {
  return authorizedFetch('/api/devices/limits-enabled', {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  }) as Promise<DeviceLimitsEnabledResponse>;
}
