import { Router } from 'express';
import { createAnonSupabase, createPrivilegedSupabase } from './db';
import { planIsActive } from './accountStore';
import {
  registerOrHeartbeatDevice,
  readDeviceFromRequest,
  DEVICE_LIMIT_MESSAGE,
} from './deviceSessions';

const router = Router();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

function attemptKey(req: any, email: string) {
  return `${req.ip || req.socket?.remoteAddress || 'unknown'}:${email}`;
}

function blocked(key: string) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || record.resetAt <= now) {
    loginAttempts.set(key, { count: 0, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  return record.count >= MAX_LOGIN_ATTEMPTS;
}

function failed(key: string) {
  const record = loginAttempts.get(key) || { count: 0, resetAt: Date.now() + LOGIN_WINDOW_MS };
  record.count += 1;
  loginAttempts.set(key, record);
}

function client(token?: string) {
  return createAnonSupabase(token);
}

/** Prefer service role so launch can read tool_url / cookies_json regardless of RLS. */
function toolsDb() {
  return createPrivilegedSupabase();
}

function slugify(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toolMatchesKey(tool: any, key: string) {
  const want = String(key || '').trim().toLowerCase();
  if (!want) return false;
  const id = String(tool?.id || '').trim().toLowerCase();
  const name = String(tool?.name || '').trim().toLowerCase();
  return id === want || name === want || slugify(name) === want || slugify(id) === want;
}

function parseExtraBag(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  return {};
}

/** Tolerant Copy-Cookies JSON parser (array / wrapped / double-encoded). */
function parseCookiesPayload(raw?: string | null): any[] {
  let text = String(raw || '').trim();
  if (!text) return [];
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(text.slice(start, end + 1));
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) return parsed.filter(c => c && typeof c === 'object');
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.cookies)) return parsed.cookies.filter((c: any) => c && typeof c === 'object');
    if (Array.isArray(parsed.data)) return parsed.data.filter((c: any) => c && typeof c === 'object');
    if (parsed.name) return [parsed];
  }
  return [];
}

async function selectToolsRows(sb: ReturnType<typeof toolsDb>, idEq?: string) {
  const attempts = [
    '*',
    'id,name,access_method,tool_url,cookies_json,panel_referrer,extra',
    'id,name,access_method,tool_url,cookies_json,extra',
    'id,name,extra',
    'id,name',
  ];
  for (const cols of attempts) {
    const q = idEq
      ? sb.from('tools').select(cols).eq('id', idEq).maybeSingle()
      : sb.from('tools').select(cols);
    const result = await q;
    if (!result.error) {
      return idEq ? (result.data ? [result.data] : []) : result.data || [];
    }
  }
  return [];
}

async function findToolByKey(key: string) {
  const sb = toolsDb();
  const raw = decodeURIComponent(String(key || '')).trim();
  if (!raw) return null;

  const byIdRows = await selectToolsRows(sb, raw);
  if (byIdRows[0]) return byIdRows[0];

  const rows = (await selectToolsRows(sb)) as any[];
  return rows.find((row: any) => toolMatchesKey(row, raw)) || null;
}

async function profileForToken(token: string) {
  const supabase = client(token);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return null;

  // Prefer service-role read so launch isn't blocked by customer RLS edge cases
  const db = toolsDb();
  const { data: profile, error } = await db
    .from('customers')
    .select('id,customer_code,name,email,role,status,plan,expiry,tools')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();
  if (!error && profile) return profile;

  const fallback = await supabase
    .from('customers')
    .select('id,customer_code,name,email,role,status,plan,expiry,tools')
    .eq('auth_user_id', authData.user.id)
    .single();
  if (fallback.error || !fallback.data) return null;
  return fallback.data;
}

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const key = attemptKey(req, email);
    if (blocked(key)) {
      return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
    }
    const supabase = client();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      failed(key);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const profile = await profileForToken(data.session.access_token);
    if (!profile || profile.status === 'blocked') {
      failed(key);
      return res.status(403).json({ error: 'This account is unavailable. Contact the administrator.' });
    }

    const fp = readDeviceFromRequest(req);
    if (fp.deviceId) {
      const deviceCheck = await registerOrHeartbeatDevice({
        accountId: profile.id,
        deviceId: fp.deviceId,
        deviceLabel: fp.deviceLabel,
        userAgent: fp.userAgent,
      });
      if (deviceCheck.ok === false) {
        return res.status(deviceCheck.status).json({ error: deviceCheck.error || DEVICE_LIMIT_MESSAGE });
      }
    }

    loginAttempts.delete(key);
    return res.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      profile,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Extension login failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = String(req.body?.refreshToken || '');
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    const supabase = client();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    return res.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Could not refresh session' });
  }
});

router.get('/entitlements', async (req, res) => {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const profile = await profileForToken(token);
    if (!profile) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    if (profile.status === 'blocked') return res.status(403).json({ error: 'Account suspended' });

    const planActive = planIsActive(profile.plan, profile.expiry);
    const assigned = planActive && Array.isArray(profile.tools) ? profile.tools : [];

    const sb = toolsDb();
    const catalog = await sb.from('tools').select('*');
    let catalogRows: any[] = catalog.data || [];
    if (catalog.error) {
      catalogRows = (await sb.from('tools').select('id,name')).data || [];
    }
    const tools = assigned.map((entry: any) => {
      const label = String(entry || '');
      const match =
        catalogRows.find((row: any) => toolMatchesKey(row, label)) ||
        catalogRows.find((row: any) => String(row.name || '').toLowerCase() === label.toLowerCase());
      const fields = cookieFields(match);
      return {
        id: match?.id || '',
        name: match?.name || label,
        accessMethod: fields.accessMethod,
        toolUrl: fields.url,
      };
    });

    return res.json({
      customerId: profile.customer_code || profile.id,
      name: profile.name,
      role: profile.role,
      plan: profile.plan || '',
      expiry: profile.expiry,
      planActive,
      tools,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Could not load tool access' });
  }
});

function toolAssigned(profile: { tools?: any }, tool: { id?: string; name?: string }) {
  const assigned = Array.isArray(profile.tools) ? profile.tools : [];
  return assigned.some((entry: any) => {
    const value = String(entry || '').trim();
    if (!value) return false;
    return toolMatchesKey(tool, value) || value.toLowerCase() === String(tool.name || '').trim().toLowerCase();
  });
}

function resolveToolAccessMethod(tool: any, extra: Record<string, any>): 'one_click' | 'extension' {
  const candidates = [
    extra?.accessMethod,
    extra?.access_method,
    tool?.access_method,
    tool?.accessMethod,
  ]
    .map(v => String(v || '').trim().toLowerCase())
    .filter(Boolean);
  if (candidates.some(v => v === 'one_click' || v === 'one-click')) return 'one_click';
  return 'extension';
}

function cookieFields(tool: any) {
  const extra = parseExtraBag(tool?.extra);
  const url =
    'toolUrl' in extra || 'tool_url' in extra
      ? String(extra.toolUrl || extra.tool_url || '')
      : String(tool?.tool_url || '');
  const cookiesRaw =
    'cookiesJson' in extra || 'cookies_json' in extra
      ? String(extra.cookiesJson ?? extra.cookies_json ?? '')
      : String(tool?.cookies_json ?? '');
  const panelReferrer =
    'panelReferrer' in extra || 'unlockReferrer' in extra || 'panel_referrer' in extra
      ? String(extra.panelReferrer || extra.unlockReferrer || extra.panel_referrer || '')
      : String(tool?.panel_referrer || '');
  return {
    accessMethod: resolveToolAccessMethod(tool, extra),
    url: String(url || '').trim(),
    cookiesRaw: String(cookiesRaw || ''),
    panelReferrer: String(panelReferrer || '').trim(),
  };
}

router.get('/launch/:toolId', async (req, res) => {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const profile = await profileForToken(token);
    if (!profile) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    if (profile.status === 'blocked') return res.status(403).json({ error: 'Account suspended' });

    const fp = readDeviceFromRequest(req);
    if (!fp.deviceId) {
      return res.status(400).json({
        error: 'Device id required. Refresh the portal or reinstall the extension, then try again.',
      });
    }
    const deviceCheck = await registerOrHeartbeatDevice({
      accountId: profile.id,
      deviceId: fp.deviceId,
      deviceLabel: fp.deviceLabel,
      userAgent: fp.userAgent,
    });
    if (deviceCheck.ok === false) {
      return res.status(deviceCheck.status).json({ error: deviceCheck.error || DEVICE_LIMIT_MESSAGE });
    }

    const planActive = planIsActive(profile.plan, profile.expiry);
    if (!planActive) return res.status(403).json({ error: 'Activate or renew a plan to access tools.' });

    const tool = await findToolByKey(req.params.toolId);
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    if (!toolAssigned(profile, tool)) {
      return res.status(403).json({ error: 'This tool is not assigned to your account.' });
    }

    const fields = cookieFields(tool);
    const omitCookies =
      String(req.query.omitCookies || req.query.meta || '').trim() === '1' ||
      String(req.headers['x-omit-cookies'] || '').trim() === '1';
    const cookies = omitCookies ? [] : parseCookiesPayload(fields.cookiesRaw);

    return res.json({
      name: tool.name,
      accessMethod: fields.accessMethod,
      url: fields.url,
      toolUrl: fields.url,
      cookies,
      panelReferrer: fields.panelReferrer || undefined,
      unlockReferrer: fields.panelReferrer || undefined,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Could not launch tool' });
  }
});

export default router;
