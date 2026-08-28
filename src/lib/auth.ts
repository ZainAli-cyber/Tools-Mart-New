import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';

function client(token?: string) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase authentication is not configured');
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}

function supabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, anon, serviceKey };
}

export async function authenticateAdmin(email: string, password: string) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) return null;
  const { url, serviceKey } = supabaseEnv();
  const db = serviceKey && url ? createClient(url, serviceKey, { auth: { persistSession: false } }) : supabase;
  const { data: profile } = await db
    .from('customers')
    .select('id,role,status')
    .eq('auth_user_id', data.user.id)
    .single();
  if (String(profile?.role || '').toLowerCase() !== 'admin' || profile?.status === 'blocked') return null;
  return data.session.access_token;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized — no token' });
    }
    const token = header.slice(7).trim();
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized — no token' });
    }

    const { url, anon, serviceKey } = supabaseEnv();
    if (!url || !anon) {
      return res.status(500).json({ error: 'Supabase authentication is not configured' });
    }

    const authClient = createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
    }

    const db = serviceKey
      ? createClient(url, serviceKey, { auth: { persistSession: false } })
      : client(token);
    const { data: profile, error: profileError } = await db
      .from('customers')
      .select('id,email,role,status')
      .eq('auth_user_id', data.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'Forbidden — administrator profile not found' });
    }
    if (String(profile.role || '').toLowerCase() !== 'admin' || profile.status === 'blocked') {
      return res.status(403).json({ error: 'Forbidden — administrator access required' });
    }
    (req as any).admin = profile;
    next();
  } catch (e: any) {
    return res.status(401).json({ error: e?.message || 'Unauthorized — invalid or expired token' });
  }
}
