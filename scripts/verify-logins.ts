import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY in .env');

const accounts = [
  { label: 'Admin',    email: 'admin@toolsportal.com',      password: 'admin123', expectRole: 'admin' },
  { label: 'Reseller', email: 'arhamresellar@gmail.com',    password: '12345678', expectRole: 'reseller' },
  { label: 'Customer', email: 'arhamsheikhx5555@gmail.com', password: '12345678', expectRole: 'user' },
];

void (async () => {
  const probe = createClient(url, anon, { auth: { persistSession: false } });
  const { error: schemaError } = await probe.from('customers').select('auth_user_id').limit(1);
  if (schemaError) {
    console.error('Migration not applied yet: run supabase_account_auth_migration.sql in the Supabase SQL Editor.');
    console.error('Details:', schemaError.message);
    process.exitCode = 1;
    return;
  }

  let failures = 0;
  for (const account of accounts) {
    const supabase = createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });

    if (error || !data.user) {
      console.error(`${account.label}: LOGIN FAILED — ${error?.message}`);
      failures += 1;
      continue;
    }

    const { data: profile, error: profileError } = await supabase
      .from('customers')
      .select('customer_code,role,status')
      .eq('auth_user_id', data.user.id)
      .single();

    if (profileError || !profile) {
      console.error(`${account.label}: profile missing — ${profileError?.message}`);
      failures += 1;
    } else if (profile.role !== account.expectRole) {
      console.error(`${account.label}: expected role ${account.expectRole}, found ${profile.role}`);
      failures += 1;
    } else {
      console.log(`${account.label}: OK — ${profile.customer_code} (${profile.role}, ${profile.status})`);
    }
    await supabase.auth.signOut();
  }

  if (failures) {
    console.error(`\n${failures} account(s) failed.`);
    process.exitCode = 1;
    return;
  }
  console.log('\nAll three logins verified.');
})();
