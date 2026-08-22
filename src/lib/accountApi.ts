import { supabase } from './db';
import type { AccountRole } from './accountStore';

async function authorizedFetch(path: string, init: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Your session expired. Please log in again.');
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

export function createAccount(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: AccountRole;
  plan?: string;
  fee?: number;
  planDays?: number;
  expiry?: string;
  tools?: string[];
}) {
  return authorizedFetch('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteAccount(id: string) {
  return authorizedFetch(`/api/accounts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function updateAccount(id: string, input: {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  avatar?: string;
  role?: AccountRole;
  ownerId?: string | null;
}) {
  return authorizedFetch(`/api/accounts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function updateMyProfile(input: {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  avatar?: string;
}) {
  return authorizedFetch('/api/accounts/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
