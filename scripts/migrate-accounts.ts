import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const resellerPassword = process.env.SEED_RESELLER_PASSWORD;
const customerPassword = process.env.SEED_CUSTOMER_PASSWORD;
if (!adminPassword || !resellerPassword || !customerPassword) {
  throw new Error(
    'Set SEED_ADMIN_PASSWORD, SEED_RESELLER_PASSWORD and SEED_CUSTOMER_PASSWORD in .env',
  );
}

const accounts = [
  {
    email: 'admin@toolsportal.com',
    password: adminPassword,
    name: 'Administrator',
    role: 'admin',
  },
  {
    email: 'arhamresellar@gmail.com',
    password: resellerPassword,
    name: 'Arham Reseller',
    role: 'reseller',
  },
  {
    email: 'arhamsheikhx5555@gmail.com',
    password: customerPassword,
    name: 'Arham Sheikh',
    role: 'user',
  },
] as const;

async function existingUser(email: string) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = data.users.find((user: any) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 100) return null;
    page += 1;
  }
}

for (const account of accounts) {
  let user = await existingUser(account.email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { name: account.name },
    });
    if (error || !data.user) throw error || new Error(`Could not create ${account.email}`);
    user = data.user;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: account.password,
      email_confirm: true,
    });
    if (error) throw error;
  }

  const { data: profiles, error: profileError } = await supabase
    .from('customers')
    .update({
      auth_user_id: user.id,
      email: account.email,
      name: account.name,
      role: account.role,
      status: 'active',
    })
    .ilike('email', account.email)
    .select('id');
  if (profileError) throw profileError;
  if (!profiles?.length) {
    const { error } = await supabase.from('customers').insert({
      id: `C${user.id.replace(/-/g, '')}`,
      auth_user_id: user.id,
      email: account.email,
      name: account.name,
      role: account.role,
      status: 'active',
      tools: [],
      plan: '',
      fee: 0,
      plan_days: 0,
    });
    if (error) throw error;
  }
  console.log(`Migrated ${account.role}: ${account.email}`);
}

console.log('Account migration complete.');
