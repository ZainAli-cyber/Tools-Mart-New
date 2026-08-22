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

export async function authenticateAdmin(email: string, password: string) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) return null;
  const { data: profile } = await supabase
    .from('customers')
    .select('id,role,status')
    .eq('auth_user_id', data.user.id)
    .single();
  if (profile?.role !== 'admin' || profile.status === 'blocked') return null;
  return data.session.access_token;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized — no token' });
    }
    const token = header.slice(7);
    const supabase = client(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
    const { data: profile } = await supabase
      .from('customers')
      .select('id,email,role,status')
      .eq('auth_user_id', data.user.id)
      .single();
    if (profile?.role !== 'admin' || profile.status === 'blocked') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    (req as any).admin = profile;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
  }
}
