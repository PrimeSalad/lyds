import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifySupabase } from './verify-supabase';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const backendDirectory = resolve(scriptDirectory, '..');
const projectDirectory = resolve(backendDirectory, '..');
const supabaseCli = join(backendDirectory, 'node_modules', 'supabase', 'dist', 'supabase.js');
const databasePassword = process.env.SUPABASE_DB_PASSWORD;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF
  || process.env.SUPABASE_URL?.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1];
const baselineExisting = process.argv.includes('--baseline-existing');
const dryRun = process.argv.includes('--dry-run');

const requireConfiguration = () => {
  const missing = [
    !accessToken && 'SUPABASE_ACCESS_TOKEN',
    !databasePassword && 'SUPABASE_DB_PASSWORD',
    !projectRef && 'SUPABASE_PROJECT_REF (or a valid SUPABASE_URL)',
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`Missing migration credentials: ${missing.join(', ')}. Add them to backend/.env or CI secrets.`);
  }
};

const runCli = (args: string[]) => {
  const result = spawnSync(process.execPath, [supabaseCli, '--workdir', projectDirectory, '--yes', ...args], {
    cwd: projectDirectory,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Supabase CLI failed with exit code ${result.status}.`);
};

const migrationVersions = () => readdirSync(join(projectDirectory, 'supabase', 'migrations'))
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .map((file) => file.split('_', 1)[0])
  .sort();

const syncSupabase = async () => {
  requireConfiguration();
  await verifySupabase();

  runCli(['link', '--project-ref', projectRef!, '--password', databasePassword!]);

  if (baselineExisting) {
    const versions = migrationVersions();
    const baselineVersions = versions.filter((version) => Number(version) <= 11);
    const pendingVersions = versions.filter((version) => Number(version) > 11);
    if (baselineVersions.length === 0) throw new Error('No baseline migrations were found.');
    runCli(['migration', 'repair', '--linked', '--status', 'applied', '--password', databasePassword!, ...baselineVersions]);
    console.log(`Baselined ${baselineVersions.length} legacy migration(s); pending: ${pendingVersions.join(', ') || 'none'}.`);
  }

  const pushArgs = ['db', 'push', '--linked', '--password', databasePassword!];
  if (dryRun) pushArgs.push('--dry-run');
  runCli(pushArgs);

  if (!dryRun) await verifySupabase();
};

syncSupabase().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
