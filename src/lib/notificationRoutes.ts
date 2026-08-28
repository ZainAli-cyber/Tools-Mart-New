import { Router } from 'express';
import { createAuthAndAdminClients } from './db';
import { noteVisible, type InboxNote } from './notifications';

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
    .select('id,role,status')
    .eq('auth_user_id', data.user.id)
    .single();
  if (!profile || profile.status === 'blocked') return null;
  return profile as { id: string; role: string };
}

/** Read/delete only this account’s copies (broadcast fan-out rows stay for other users). */
router.post('/actions', async (req, res) => {
  try {
    const current = await actor(req);
    if (!current) return res.status(401).json({ error: 'Not authorized' });
    const action = req.body?.action === 'read' ? 'read' : req.body?.action === 'delete' ? 'delete' : '';
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((id: unknown) => String(id)).filter(Boolean) : [];
    if (!action || !ids.length) return res.status(400).json({ error: 'action and ids are required' });

    const { admin } = clients();
    const { data, error } = await admin.from('notifications').select('*').in('id', ids);
    if (error) return res.status(500).json({ error: error.message });

    const allowed = (data || []).filter((row: InboxNote) => noteVisible(row, current)).map((row: InboxNote) => row.id);
    if (!allowed.length) return res.json({ ok: true, ids: [] });

    if (action === 'read') {
      const { error: updateError } = await admin.from('notifications').update({ read: true }).in('id', allowed);
      if (updateError) return res.status(500).json({ error: updateError.message });
    } else {
      const { error: deleteError } = await admin.from('notifications').delete().in('id', allowed);
      if (deleteError) return res.status(500).json({ error: deleteError.message });
    }
    return res.json({ ok: true, ids: allowed });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Notification update failed' });
  }
});

export default router;
