/**
 * Supabase client initialization.
 *
 * Two distinct clients, deliberately:
 *
 *   getClient()      anon key. Safe to ship to the browser. Governed by RLS,
 *                    so it can READ the ladder but cannot write win_count/elo.
 *
 *   getAdminClient() service-role key. SERVER ONLY. Bypasses RLS, so it is the
 *                    only thing allowed to award a victory. Never import this
 *                    from anything that gets bundled for the client.
 *
 * Phase 12 rationale: if the browser could write win_count directly, a player
 * could open the console and grant themselves a thousand wins. The client key
 * is therefore read-only by policy, and every mutation goes through a
 * SECURITY DEFINER RPC executed by the server.
 */
import { createClient } from '@supabase/supabase-js';

let _client = null;
let _admin = null;

function env(key, fallback = undefined) {
  // works under Node, Vite and plain browser globals
  if (typeof process !== 'undefined' && process.env && process.env[key] != null) {
    return process.env[key];
  }
  if (typeof globalThis !== 'undefined' && globalThis.__ENV__ && globalThis.__ENV__[key] != null) {
    return globalThis.__ENV__[key];
  }
  return fallback;
}

export const SUPABASE_URL = env('SUPABASE_URL', '');
export const SUPABASE_ANON_KEY = env('SUPABASE_ANON_KEY', '');

/** Browser-safe client (anon key, RLS enforced). */
export function getClient(url = SUPABASE_URL, key = SUPABASE_ANON_KEY, opts = {}) {
  if (_client) return _client;
  if (!url || !key) {
    throw new Error(
      'Supabase not configured: set SUPABASE_URL and SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill it in.'
    );
  }
  _client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 5 } },
    ...opts,
  });
  return _client;
}

/** Server-only client (service role, bypasses RLS). */
export function getAdminClient(
  url = env('SUPABASE_URL', ''),
  key = env('SUPABASE_SERVICE_ROLE_KEY', '')
) {
  if (_admin) return _admin;
  if (typeof window !== 'undefined') {
    throw new Error('getAdminClient() must never run in a browser.');
  }
  if (!url || !key) {
    throw new Error('Supabase admin not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

/** Test seam — lets the suite inject a fake client. */
export function __setClients({ client, admin } = {}) {
  if (client !== undefined) _client = client;
  if (admin !== undefined) _admin = admin;
}
export function __reset() { _client = null; _admin = null; }
