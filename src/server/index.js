/**
 * Server entrypoint — signaling + matchmaking + authoritative result writing.
 * Phase 13/14. Serves the static client too, so one process can host the whole
 * game in a small deployment.
 */
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from './signaling.js';
import { liveopsRoutes } from './liveopsRoutes.js';
import { createLiveopsStore } from './liveopsStore.js';
import { readFileSync } from 'node:fs';
import { recordWin } from '../db/players.js';
import { getAdminClient } from '../db/supabaseClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const PUBLIC_DIR = path.resolve(__dirname, '../../public');

// Only wire the database if it is actually configured; the game must still
// run (unranked) when someone clones the repo without Supabase keys.
let dbReady = false;
try { getAdminClient(); dbReady = true; }
catch (e) { console.warn('[db] disabled:', e.message); }

const srv = createServer({
  port: PORT,
  recordResult: dbReady
    ? async (r) => recordWin(r)
    : async (r) => { console.log('[db] skipped (unconfigured):', r.winnerId, 'beat', r.loserId); return null; },
});

/* ---- Phases 15-20: live-ops surface ---------------------------------
   Mounted before the static handler so /api/* never falls through to the
   file server. The store is in-memory here; swap in a Supabase-backed
   implementation with the same interface for production. */
const baseFighter = JSON.parse(
  readFileSync(path.join(PUBLIC_DIR, 'data/fighter.neon.json'), 'utf8'));
const liveStore = createLiveopsStore({ baseConfig: baseFighter });
srv.app.use('/api', liveopsRoutes({ store: liveStore }));
srv.liveStore = liveStore;

// static client with cache headers tuned for a PWA
srv.app.use(express.static(PUBLIC_DIR, {
  etag: true,
  setHeaders(res, filePath) {
    if (filePath.endsWith('sw.js') || filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store, must-revalidate');
    else if (/\.(json)$/.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=300');
    else res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  },
}));
srv.app.get('/', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

await srv.listen();
console.log(`NEON FIST server on :${PORT}  (db ${dbReady ? 'connected' : 'disabled'})`);
console.log(`  client   http://localhost:${PORT}/`);
console.log(`  ws       ws://localhost:${PORT}/ws`);
console.log(`  health   http://localhost:${PORT}/health`);

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => { console.log('\nshutting down…'); await srv.close(); process.exit(0); });
}
