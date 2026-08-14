import express from 'express';
import http from 'node:http';
import { liveopsRoutes } from '../src/server/liveopsRoutes.js';
import { createLiveopsStore } from '../src/server/liveopsStore.js';
import { FUNNEL } from '../src/shared/telemetry.js';
import { readFileSync } from 'node:fs';

const base = JSON.parse(readFileSync(new URL('../public/data/fighter.neon.json', import.meta.url), 'utf8'));

export async function run(t) {
  const store = createLiveopsStore({ baseConfig: base });
  const app = express();
  app.use('/api', liveopsRoutes({ store, logger: { log(){}, error(){}, warn(){} } }));
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const url = p => `http://127.0.0.1:${port}${p}`;
  const get = async p => (await fetch(url(p))).json();
  const post = async (p, body) => {
    const r = await fetch(url(p), { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}) });
    return { status: r.status, body: await r.json().catch(() => null) };
  };

  /* ---- Phase 16 over HTTP ---- */
  let cfg = await get('/api/config?player=u1');
  t.eq(cfg.version, 'base', 'default config served');
  t.eq(cfg.killed, false, 'not killed by default');

  store.publishConfig({ version: 'v2', channel: 'experiment',
    payload: { moves: { punch: { startup: 5 } } }, parent: 'base', rollout_pct: 100 });
  cfg = await get('/api/config?player=u1');
  t.eq(cfg.version, 'v2', '100% rollout reaches the player');
  t.eq(cfg.patch.moves.punch.startup, 5, 'sparse patch delivered over the wire');

  /* Regression: the server must fingerprint the MERGED config, not the sparse
     patch. Fingerprinting the patch made every client's integrity check fail
     and silently fall back to cache — the patch appeared to do nothing. */
  const { applyPatch } = await import('../src/shared/liveconfig.js');
  const { configFingerprint } = await import('../src/shared/integrity.js');
  t.eq(cfg.fingerprint, configFingerprint(applyPatch(base, cfg.patch)),
    'server fingerprint matches what the client computes after merging');

  // chained patches must also resolve correctly
  store.publishConfig({ version: 'v3', channel: 'beta',
    payload: { moves: { kick: { damage: 15 } } }, parent: 'v2', rollout_pct: 100 });
  const chained = store._resolveFull(store._state.versions.find(v => v.version === 'v3'));
  t.eq(chained.moves.punch.startup, 5, 'chained patch inherits its parent');
  t.eq(chained.moves.kick.damage, 15, 'chained patch applies its own change');

  await post('/api/admin/config/kill', { channel: 'experiment', killed: true });
  cfg = await get('/api/config?player=u1');
  t.eq(cfg.killed, true, 'kill switch propagates over HTTP instantly');
  await post('/api/admin/config/kill', { channel: 'experiment', killed: false });
  await post('/api/admin/config/rollout', { channel: 'experiment', pct: 0 });
  await post('/api/admin/config/rollout', { channel: 'beta', pct: 0 });
  cfg = await get('/api/config?player=u1');
  t.eq(cfg.version, 'base', 'rollback to 0% returns every player to stable');

  /* ---- Phase 15 over HTTP ---- */
  const batch = {
    sessionId: 's1', playerId: 'u1', events: [
      { event: 'funnel', funnel_step: FUNNEL.QUEUE_ENTER, payload: {}, t: Date.now() },
      { event: 'match_summary', funnel_step: FUNNEL.MATCH_COMPLETE, t: Date.now(), payload: {
          localCharacter: 'neon', remoteCharacter: 'neon', result: 'win', durationMs: 55000,
          rounds: 2, roundsWon: 2, configVersion: 'base',
          moves: { punch: { uses: 120, hits: 90, damage: 630 }, kick: { uses: 4, hits: 1, damage: 13 } } } },
    ],
  };
  let r = await post('/api/telemetry', batch);
  t.eq(r.status, 200, 'telemetry batch accepted');
  t.eq(r.body.accepted, 2, 'both events ingested');

  r = await post('/api/telemetry', { events: Array.from({ length: 600 }, () => ({ event: 'x' })) });
  t.eq(r.status, 413, 'oversized batch rejected (cost control)');

  const bal = await get('/api/analytics/balance');
  t.ok(bal.characters.length > 0, 'balance report served');
  t.ok(bal.flags.some(f => /spam candidate/.test(f)), 'spam flag surfaces in the API');

  const fun = await get('/api/analytics/funnel');
  t.ok(Array.isArray(fun) && fun.length > 0, 'funnel report served');

  /* ---- Phase 18 over HTTP ---- */
  for (let i = 0; i < 6; i++) {
    store.addConnStat('bad1', { opponent_id: 'o' + i, stall_events: 4, disconnect_at_losing: true });
  }
  r = await post('/api/report', { reporterId: 'r1', targetId: 'bad1', reason: 'lag_switch' });
  t.eq(r.status, 200, 'report accepted');
  t.eq(r.body.reviewed, true, 'report triggered automatic evaluation');
  const queue = await get('/api/admin/moderation/queue');
  t.ok(queue.length > 0, 'severe cases land in the human review queue, not auto-banned');

  /* ---- tournaments over HTTP ---- */
  await post('/api/tournaments', { id: 'evo', name: 'EVO', entrants:
    Array.from({ length: 4 }, (_, i) => ({ player_id: 'tp' + i, elo: 1000 + i })) });
  r = await post('/api/tournaments/evo/start');
  t.eq(r.body.rounds, 2, '4-player bracket has 2 rounds');
  const br = await get('/api/tournaments/evo/bracket');
  t.eq(br.matches.length, 3, 'bracket exposes all matches for the community');
  const live = br.matches.find(m => m.spectator_key);
  const spec = await get(`/api/tournaments/evo/spectate/${live.spectator_key}`);
  t.ok(spec.player_a && spec.player_b, 'spectator endpoint exposes a live pairing');

  /* ---- Phase 19 over HTTP ---- */
  store.addItem({ sku: 'skin_gold', kind: 'skin', title: 'Gold', price_cents: 499,
                  payload: { palette: { gi: '#ffd23f' } } });
  const cat = await get('/api/store');
  t.eq(cat.length, 1, 'store catalogue served');
  r = await post('/api/store/purchase', { playerId: 'u1', sku: 'skin_gold', providerRef: 'stripe_1' });
  t.eq(r.body.state, 'fulfilled', 'purchase fulfilled');
  r = await post('/api/store/purchase', { playerId: 'u1', sku: 'skin_gold', providerRef: 'stripe_1' });
  t.eq(r.body.state, 'duplicate', 'webhook replay is idempotent — never double-charged');
  t.eq(store.entitlements('u1').length, 1, 'exactly one entitlement granted');

  const costs = await get('/api/admin/costs?dau=25000');
  t.ok(costs.projection.monthlyCost > 0, 'cost projection served');
  t.ok(costs.breakEvenDAU > 0, 'break-even DAU served');

  /* ---- Phase 20: capability gating is enforced server-side ---- */
  await post('/api/admin/sunset', { mode: 'degraded' });
  let res = await fetch(url('/api/store'));
  t.eq(res.status, 503, 'store is CLOSED at the API level in degraded mode');
  const body = await res.json();
  t.ok(/closed/i.test(body.message), 'players get an explanatory message, not a raw error');
  res = await fetch(url('/api/telemetry'), { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{"events":[]}' });
  t.eq(res.status, 503, 'telemetry stops writing in degraded mode (cost control)');

  // buying is impossible even if the client hides the button
  r = await post('/api/store/purchase', { playerId: 'u2', sku: 'skin_gold' });
  t.eq(r.status, 503, 'purchase endpoint refuses once the store closes');

  await post('/api/admin/sunset', { mode: 'p2p_only' });
  const st = await get('/api/status');
  t.eq(st.mode, 'p2p_only', 'sunset mode reported to clients');
  t.ok(/connection code/.test(st.stage.playerMessage), 'clients told how to keep playing');

  // data export must survive shutdown
  const exp = await get('/api/export/u1');
  t.eq(exp.entitlements.length, 1, 'players can export their purchases after shutdown');
  t.ok(/remains yours/.test(exp.note), 'export states the data ownership promise');

  const rec = await get('/api/admin/sunset/recommend?dau=30&queue=400&cost=300&revenue=10&months=9');
  t.eq(rec.recommend, 'p2p_only', 'sunset recommendation served over HTTP');

  await new Promise(r => server.close(r));
}
