import { supabase } from './db';

const BASE = '/api';

/** Prefer live Supabase session; legacy admin_jwt is only a fallback. */
async function getToken(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = String(data.session?.access_token || '').trim();
    if (token) {
      try {
        localStorage.setItem('admin_jwt', token);
      } catch {
        /* ignore */
      }
      return token;
    }
  } catch {
    /* fall through */
  }
  return localStorage.getItem('admin_jwt') || '';
}

async function request<T>(method: string, path: string, body?: any, auth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e: any) {
    throw new Error(`Network error: ${e.message}`);
  }

  // Read body as text first — then try JSON
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // Server returned non-JSON (HTML error page, empty body, etc.)
    if (!res.ok) throw new Error(`Server error ${res.status}: ${text.slice(0, 100)}`);
    return {} as T;
  }

  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data as T;
}

const get   = <T>(path: string, auth = false) => request<T>('GET', path, undefined, auth);
const post  = <T>(path: string, body: any, auth = false) => request<T>('POST', path, body, auth);
const patch = <T>(path: string, body: any, auth = false) => request<T>('PATCH', path, body, auth);
const put   = <T>(path: string, body: any, auth = false) => request<T>('PUT', path, body, auth);
const del   = <T>(path: string, auth = false) => request<T>('DELETE', path, undefined, auth);

export const api = {
  auth: {
    login:  (email: string, password: string) => post<{ ok: boolean; token: string; email: string }>('/admin/login', { email, password }),
    logout: () => post('/admin/logout', {}, true),
  },
  dashboard: { get: () => get<any>('/admin/dashboard', true) },
  analytics:  { get: () => get<any>('/admin/analytics', true) },
  orders: {
    list:   (params?: { status?: string; search?: string }) => { const q = new URLSearchParams(params as any).toString(); return get<any[]>(`/admin/orders${q ? '?'+q : ''}`, true); },
    get:    (id: string) => get<any>(`/admin/orders/${id}`, true),
    create: (data: any) => post<any>('/admin/orders', data, true),
    update: (id: string, data: any) => patch<any>(`/admin/orders/${id}`, data, true),
    delete: (id: string) => del(`/admin/orders/${id}`, true),
  },
  tools: {
    list:       () => get<any[]>('/admin/tools', true),
    save:       (tool: any) => post<any>('/admin/tools', tool, true),
    update:     (id: string, data: any) => patch<any>(`/admin/tools/${id}`, data, true),
    delete:     (id: string) => del(`/admin/tools/${id}`, true),
    publicList: () => get<any[]>('/admin/public/tools'),
  },
  customers: {
    list:   (search?: string) => get<any[]>(`/admin/customers${search ? '?search='+search : ''}`, true),
    create: (data: any) => post<any>('/admin/customers', data, true),
    update: (id: string, data: any) => patch<any>(`/admin/customers/${id}`, data, true),
    delete: (id: string) => del(`/admin/customers/${id}`, true),
  },
  coupons: {
    list:     () => get<any[]>('/admin/coupons', true),
    create:   (data: any) => post<any>('/admin/coupons', data, true),
    update:   (id: string, data: any) => patch<any>(`/admin/coupons/${id}`, data, true),
    delete:   (id: string) => del(`/admin/coupons/${id}`, true),
    validate: (code: string, amount: number) => post<any>('/admin/public/validate-coupon', { code, amount }),
  },
  tickets: {
    list:   () => get<any[]>('/admin/tickets', true),
    create: (data: any) => post<any>('/admin/tickets', data),
    update: (id: string, data: any) => patch<any>(`/admin/tickets/${id}`, data, true),
    reply:  (id: string, message: string) => post<any>(`/admin/tickets/${id}/reply`, { message }, true),
  },
  notifications: {
    list:    () => get<any[]>('/admin/notifications', true),
    readAll: () => patch('/admin/notifications/read-all', {}, true),
    read:    (id: string) => patch(`/admin/notifications/${id}/read`, {}, true),
  },
  settings: {
    get:  () => get<any>('/admin/settings', true),
    save: (data: any) => put('/admin/settings', data, true),
  },
  activity: { list: () => get<any[]>('/admin/activity', true) },
  public: {
    submitOrder:      (data: any) => post<any>('/admin/public/orders', data),
    uploadScreenshot: (orderId: string, screenshot: string) => post<any>(`/admin/public/orders/${orderId}/screenshot`, { screenshot }),
    validateCoupon:   (code: string, amount: number) => post<any>('/admin/public/validate-coupon', { code, amount }),
  },
};

export const tokenStore = {
  save:   (token: string) => localStorage.setItem('admin_jwt', token),
  clear:  () => localStorage.removeItem('admin_jwt'),
  get:    () => localStorage.getItem('admin_jwt') || '',
  exists: () => !!localStorage.getItem('admin_jwt'),
};
