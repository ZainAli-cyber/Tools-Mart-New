import { Router } from 'express';
import { createAuthAndAdminClients } from './db';

const router = Router();

function clients() {
  return createAuthAndAdminClients();
}

async function actor(req: any) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { auth, admin } = clients();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await admin
    .from('customers')
    .select('id,role,status,owner_id')
    .eq('auth_user_id', data.user.id)
    .single();
  if (!profile || profile.status === 'blocked') return null;
  return profile;
}

type PatchMode = 'admin' | 'self-seller' | 'self-user' | 'seller-member';

function modeFor(actorRow: { id: string; role: string }, target: { id: string; owner_id: string | null; role: string }): PatchMode | null {
  if (actorRow.role === 'admin') return 'admin';
  if (actorRow.id === target.id && actorRow.role === 'reseller') return 'self-seller';
  if (actorRow.id === target.id && actorRow.role === 'user') return 'self-user';
  if (actorRow.role === 'reseller' && target.owner_id === actorRow.id && target.role === 'user') return 'seller-member';
  return null;
}

async function saveProfile(req: any, res: any, targetId: string) {
  const current = await actor(req);
  if (!current) return res.status(401).json({ error: 'Not authorized' });

  const { admin } = clients();
  const { data: target, error: targetError } = await admin
    .from('customers')
    .select('id,auth_user_id,role,owner_id,email,name,phone,customer_code')
    .eq('id', targetId)
    .single();
  if (targetError || !target) return res.status(404).json({ error: 'Account not found' });

  const mode = modeFor(current, target);
  if (!mode) return res.status(403).json({ error: 'Not authorized' });

  const body = req.body || {};
  const profile: Record<string, any> = {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;
  const avatar = typeof body.avatar === 'string' ? body.avatar : undefined;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (name) profile.name = name;
  if (phone !== undefined) profile.phone = phone;
  if (avatar !== undefined) {
    if (avatar && avatar.length > 350000) {
      return res.status(400).json({ error: 'Profile image is too large. Use a smaller photo.' });
    }
    profile.avatar = avatar || null;
  }

  const canChangeEmail = mode === 'admin' || mode === 'self-seller';
  if (email) {
    if (!canChangeEmail) return res.status(403).json({ error: 'Email cannot be changed on this account' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    profile.email = email;
  }
  if (password) {
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if (mode === 'admin') {
    if (body.role && ['admin', 'reseller', 'user'].includes(body.role)) profile.role = body.role;
    if (Object.prototype.hasOwnProperty.call(body, 'ownerId') || Object.prototype.hasOwnProperty.call(body, 'owner_id')) {
      const ownerId = body.ownerId === undefined ? body.owner_id : body.ownerId;
      profile.owner_id = ownerId || null;
      if (profile.owner_id) {
        const { data: seller } = await admin.from('customers').select('id,role').eq('id', profile.owner_id).single();
        if (!seller || seller.role !== 'reseller') {
          return res.status(400).json({ error: 'Seller assignment must be an existing seller account' });
        }
        if (seller.id === target.id) return res.status(400).json({ error: 'An account cannot belong to itself' });
      }
    }
    if ((profile.role || target.role) === 'reseller' || (profile.role || target.role) === 'admin') {
      profile.owner_id = null;
    }
  }

  // Unique customer ID is immutable for every role.
  delete profile.customer_code;
  delete profile.id;
  delete profile.auth_user_id;

  const authPatch: Record<string, any> = {};
  if (profile.email && profile.email !== target.email) authPatch.email = profile.email;
  if (password) authPatch.password = password;
  if (profile.name) authPatch.user_metadata = { name: profile.name, phone: profile.phone ?? target.phone };

  if (Object.keys(authPatch).length && target.auth_user_id) {
    const { error: authError } = await admin.auth.admin.updateUserById(target.auth_user_id, authPatch);
    if (authError) return res.status(400).json({ error: authError.message });
  }

  if (Object.keys(profile).length) {
    const apply = async (fields: Record<string, any>) =>
      admin.from('customers').update(fields).eq('id', target.id).select().single();

    let { data: row, error: profileError } = await apply(profile);
    if (profileError && profile.avatar !== undefined && /avatar/i.test(profileError.message || '')) {
      const { avatar: _ignored, ...rest } = profile;
      const retry = await apply(rest);
      row = retry.data;
      profileError = retry.error;
    }
    if (profileError) return res.status(400).json({ error: profileError.message });
    return res.json({ account: row });
  }

  const { data: row } = await admin.from('customers').select('*').eq('id', target.id).single();
  return res.json({ account: row });
}

router.post('/', async (req, res) => {
  try {
    const current = await actor(req);
    if (!current || !['admin', 'reseller'].includes(current.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { name, email, phone = '', password, role = 'user', plan = '', fee = 0,
      planDays = 0, expiry = '', tools = [] } = req.body || {};
    if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || String(password || '').length < 8) {
      return res.status(400).json({ error: 'Valid name, email and 8-character password are required' });
    }

    const assignedRole = current.role === 'admin' && ['admin', 'reseller', 'user'].includes(role)
      ? role
      : 'user';
    const ownerId = current.role === 'reseller' ? current.id : null;
    const { admin } = clients();
    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim(), phone: phone.trim() },
    });
    if (authError || !created.user) {
      return res.status(400).json({ error: authError?.message || 'Could not create login' });
    }

    const profile = {
      auth_user_id: created.user.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role: assignedRole,
      status: 'active',
      plan,
      fee: Number(fee) || 0,
      plan_days: Number(planDays) || 0,
      expiry: expiry || null,
      owner_id: ownerId,
      tools: Array.isArray(tools) ? tools : [],
      total_orders: 0,
      total_spend: Number(fee) || 0,
      notes: ownerId ? 'Created by reseller' : 'Created by administrator',
    };

    // The auth trigger creates the base row. Update it with the fields that
    // only an administrator/reseller is allowed to assign.
    const { data: row, error: profileError } = await admin
      .from('customers')
      .update(profile)
      .eq('auth_user_id', created.user.id)
      .select()
      .single();
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return res.status(400).json({ error: profileError.message });
    }

    if (ownerId && Number(fee) > 0) {
      await admin.from('reseller_payments').insert({
        owner_id: ownerId,
        member_id: row.id,
        member_name: row.name,
        amount: Number(fee),
        method: 'Manual',
        status: 'paid',
        payment_date: new Date().toISOString().slice(0, 10),
      });
    }
    return res.status(201).json({ account: row });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Account creation failed' });
  }
});

router.patch('/me', async (req, res) => {
  try {
    const current = await actor(req);
    if (!current) return res.status(401).json({ error: 'Not authorized' });
    return saveProfile(req, res, current.id);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Profile update failed' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    return saveProfile(req, res, req.params.id);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Profile update failed' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const current = await actor(req);
    if (!current || !['admin', 'reseller'].includes(current.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { admin } = clients();
    let query = admin.from('customers').select('id,auth_user_id,owner_id').eq('id', req.params.id);
    if (current.role === 'reseller') query = query.eq('owner_id', current.id);
    const { data: target } = await query.single();
    if (!target) return res.status(404).json({ error: 'Account not found' });

    await admin.from('customers').delete().eq('id', target.id);
    if (target.auth_user_id) await admin.auth.admin.deleteUser(target.auth_user_id);
    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Account deletion failed' });
  }
});

export default router;
