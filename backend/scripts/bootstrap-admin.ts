/**
 * Bootstrap the first admin account.
 * Usage: npx tsx scripts/bootstrap-admin.ts <email> <password> <full_name>
 *
 * Example: npx tsx scripts/bootstrap-admin.ts admin@sk.gov.ph password123 "Juan Dela Cruz"
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

// Load .env file manually
const envPath = resolve(import.meta.dirname ?? __dirname, '../.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {
  // .env file not found, rely on environment variables
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ipccmcmufiocfxfyfuos.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_SECRET_KEY) {
  console.error('Error: SUPABASE_SECRET_KEY environment variable is required.');
  console.error('Set it in backend/.env or export it before running.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question: string): Promise<string> =>
  new Promise((resolve) => rl.question(question, resolve));

const main = async () => {
  const email = process.argv[2] || await ask('Admin email: ');
  const password = process.argv[3] || await ask('Admin password: ');
  const fullName = process.argv[4] || await ask('Full name: ');

  console.log(`\nCreating admin account: ${email}`);

  // 1. Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error('Auth error:', authError.message);
    process.exit(1);
  }

  console.log(`Auth user created: ${authData.user.id}`);

  // 2. Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      full_name: fullName,
      role: 'ADMIN',
      account_status: 'ACTIVE',
    });

  if (profileError) {
    console.error('Profile error:', profileError.message);
    process.exit(1);
  }

  console.log('Profile created with role: ADMIN');

  rl.close();
  console.log('\nDone! You can now log in with:');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
};

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
