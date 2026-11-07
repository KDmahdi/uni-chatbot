import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const env = {};
for (const rawLine of envFile.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq === -1) continue;
  const key = line.slice(0, eq).trim();
  const value = line.slice(eq + 1).trim();
  env[key] = value;
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const proxyUrl = env.PROXY_URL || '';

function decodeJwtRole(jwt) {
  if (!jwt) return 'missing';
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
    return payload.role || payload.roles || 'unknown';
  } catch (error) {
    return 'invalid-jwt';
  }
}

const log = (...args) => console.log(...args);

async function testWithFetch(label, useProxy) {
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/courses?select=count`;
  log(`\n=== ${label} ===`);
  log(`URL: ${supabaseUrl}`);
  log(`JWT role: ${decodeJwtRole(supabaseKey)}`);
  log(`Proxy: ${useProxy ? proxyUrl || 'not-set' : 'disabled'}`);

  const dispatcher = useProxy && proxyUrl ? new ProxyAgent({ uri: proxyUrl, connectTimeout: 20000, allowH2: false }) : undefined;

  try {
    const response = await (dispatcher ? undiciFetch(url, { method: 'GET', headers, dispatcher }) : fetch(url, { method: 'GET', headers }));
    const text = await response.text();
    log(`Status: ${response.status} ${response.statusText}`);
    log(`Body: ${text.slice(0, 500)}`);
  } catch (error) {
    log(`Error: ${error.name}: ${error.message}`);
    if (error.cause) {
      log(`Cause: ${error.cause}`);
    }
  }
}

async function testSupabaseClient(label) {
  log(`\n=== ${label} ===`);
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { fetch: (...args) => fetch(...args) },
  });

  try {
    const { data, error, count } = await client.from('courses').select('*', { count: 'exact', head: true });
    log(`Data length: ${Array.isArray(data) ? data.length : 'n/a'}`);
    log(`Count: ${count ?? 'n/a'}`);
    log(`Error: ${error ? JSON.stringify(error, null, 2) : 'none'}`);
  } catch (error) {
    log(`Client Error: ${error.name}: ${error.message}`);
  }
}

async function main() {
  log('Supabase diagnostic started');
  log(`Loaded env file: ${envFile ? 'yes' : 'no'} `);
  log(`Supabase URL: ${supabaseUrl || 'missing'}`);
  log(`Supabase key present: ${Boolean(supabaseKey)}`);
  log(`JWT role from key: ${decodeJwtRole(supabaseKey)}`);

  if (!supabaseUrl || !supabaseKey) {
    log('Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key. No remote test possible.');
    return;
  }

  await testWithFetch('Direct HTTP query without proxy', false);
  await testWithFetch('Direct HTTP query with proxy', true);
  await testSupabaseClient('Supabase JS client query');
}

await main();
