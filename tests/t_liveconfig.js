import { LiveConfig, applyPatch, invertPatch, assignVariant, bucketOf,
         inRollout, resolveConfigFor } from '../src/shared/liveconfig.js';
import { validateFighter } from '../src/shared/configLoader.js';
import { auditFighterConfig, configFingerprint } from '../src/shared/integrity.js';
import { readFileSync } from 'node:fs';
const base = JSON.parse(readFileSync(new URL('../public/data/fighter.neon.json', import.meta.url), 'utf8'));

export async function run(t) {
  /* ---- sparse patching ---- */
  const patched = applyPatch(base, { moves: { punch: { startup: 6 } } });
  t.eq(patched.moves.punch.startup, 6, 'OTA patch changes the targeted value');
  t.eq(patched.moves.punch.damage, base.moves.punch.damage, 'patch leaves siblings intact');
  t.eq(patched.moves.kick.startup, base.moves.kick.startup, 'patch leaves other moves intact');
  t.eq(base.moves.punch.startup, 4, 'patching does NOT mutate the base config');

  const undo = invertPatch(base, { moves: { punch: { startup: 6 } } });
  const rolled = applyPatch(patched, undo);
  t.eq(rolled.moves.punch.startup, 4, 'inverse patch restores the original value');

  /* ---- deterministic bucketing ---- */
  t.eq(bucketOf('player-42', 'exp1'), bucketOf('player-42', 'exp1'), 'bucketing is stable');
  t.ok(bucketOf('player-42', 'exp1') !== bucketOf('player-42', 'exp2'),
    'different experiments bucket independently');
  const variants = [{ id: 'control', pct: 50 }, { id: 'treat', pct: 50 }];
  const assigns = {};
  for (let i = 0; i < 4000; i++) {
    const v = assignVariant('p' + i, 'exp1', variants);
    assigns[v] = (assigns[v] || 0) + 1;
  }
  const ratio = assigns.control / 4000;
  t.ok(ratio > 0.45 && ratio < 0.55, `50/50 split is even (control=${(ratio*100).toFixed(1)}%)`);
  t.eq(assignVariant('p7', 'exp1', variants), assignVariant('p7', 'exp1', variants),
    'a player always gets the same variant');

  let inCount = 0;
  for (let i = 0; i < 2000; i++) if (inRollout('u' + i, 'beta', 10)) inCount++;
  t.ok(inCount > 130 && inCount < 270, `10% rollout hits ~10% of players (${inCount/20}%)`);
  t.eq(inRollout('anyone', 'beta', 0), false, '0% rollout excludes everyone');
  t.eq(inRollout('anyone', 'beta', 100), true, '100% rollout includes everyone');

  /* ---- LiveConfig bootstrap ---- */
  const mk = (res, opts = {}) => new LiveConfig({
    fetchJSON: async () => res, baseConfig: base,
    validate: validateFighter, audit: auditFighterConfig,
    fingerprint: configFingerprint, ...opts,
  });

  const good = { version: 'v2', channel: 'stable', patch: { moves: { punch: { startup: 5 } } } };
  good.fingerprint = configFingerprint(applyPatch(base, good.patch));
  let lc = mk(good);
  let r = await lc.bootstrap('p1');
  t.eq(r.ok, true, 'valid OTA config adopted');
  t.eq(lc.active.moves.punch.startup, 5, 'live config reflects the patch');
  t.eq(lc.version, 'v2', 'version recorded for peer matching');

  /* ---- a malicious/broken patch must be REFUSED, not shipped ---- */
  lc = mk({ version: 'evil', patch: { moves: { punch: { damage: 9999 } } } });
  r = await lc.bootstrap('p1');
  t.eq(r.ok, false, 'patch failing the tamper audit is rejected');
  t.eq(lc.active.moves.punch.damage, base.moves.punch.damage, 'engine keeps safe values');
  t.ok(/audit failed/.test(r.error), `rejection reason surfaced: ${r.error}`);

  lc = mk({ version: 'broken', patch: { moves: { punch: { startup: 0 } } } });
  r = await lc.bootstrap('p1');
  t.eq(r.ok, false, 'patch failing validation is rejected');

  lc = mk({ version: 'liar', patch: { moves: { punch: { startup: 5 } } }, fingerprint: 'deadbeef' });
  r = await lc.bootstrap('p1');
  t.eq(r.ok, false, 'fingerprint mismatch rejected (tampered in transit)');

  /* ---- server down => cache => bundled, never a hard failure ---- */
  const storage = (() => { let s = {}; return { getItem: k => s[k] ?? null, setItem: (k, v) => s[k] = v }; })();
  lc = mk(good, { storage });
  await lc.bootstrap('p1');                       // populates cache
  const offline = new LiveConfig({
    fetchJSON: async () => { throw new Error('network down'); },
    baseConfig: base, validate: validateFighter, audit: auditFighterConfig,
    fingerprint: configFingerprint, storage,
  });
  r = await offline.bootstrap('p1');
  t.eq(r.ok, true, 'offline boot succeeds from cache');
  t.eq(r.source, 'cache', 'served from cache');
  t.eq(offline.active.moves.punch.startup, 5, 'cached patch still applied');

  const noCache = new LiveConfig({
    fetchJSON: async () => { throw new Error('down'); }, baseConfig: base,
  });
  r = await noCache.bootstrap('p1');
  t.eq(r.source, 'bundled', 'with no cache it falls back to the bundled build');
  t.eq(noCache.active.moves.punch.startup, 4, 'bundled values intact — game still playable');

  /* ---- kill switch ---- */
  lc = mk({ killed: true });
  r = await lc.bootstrap('p1');
  t.eq(lc.version, 'base:killswitch', 'kill switch forces the bundled build');
  t.eq(lc.active.moves.punch.startup, 4, 'kill switch reverts balance instantly');

  /* ---- never apply a patch mid-match (would desync) ---- */
  lc = mk(good);
  await lc.bootstrap('p1');
  lc.stage({ version: 'v3', patch: { moves: { punch: { startup: 7 } } },
             fingerprint: configFingerprint(applyPatch(base, { moves: { punch: { startup: 7 } } })) });
  let res = lc.applyPending('in_match', 'p1');
  t.eq(res.applied, false, 'a patch is REFUSED mid-match (desync protection)');
  t.eq(lc.active.moves.punch.startup, 5, 'in-match balance unchanged');
  res = lc.applyPending('menu', 'p1');
  t.eq(res.applied, true, 'the same patch applies at a safe point');
  t.eq(lc.active.moves.punch.startup, 7, 'new balance live after the match');

  /* ---- server-side resolution ---- */
  const cfgState = {
    versions: [
      { version: 'v1', payload: base, fingerprint: configFingerprint(base), parent: null },
      { version: 'v2-exp', payload: { moves: { kick: { damage: 11 } } },
        fingerprint: 'x', parent: 'v1' },
    ],
    channels: [
      { channel: 'stable', version: 'v1', rollout_pct: 100, killed: false },
      { channel: 'experiment', version: 'v2-exp', rollout_pct: 20, killed: false },
    ],
    experiments: [{ id: 'combo_scaling', active: true,
                    variants: [{ id: 'control', pct: 50 }, { id: 'aggressive', pct: 50 }] }],
  };
  let expCount = 0;
  for (let i = 0; i < 1000; i++) {
    const out = resolveConfigFor('u' + i, cfgState);
    if (out.channel === 'experiment') expCount++;
  }
  t.ok(expCount > 130 && expCount < 270, `~20% land on the experiment channel (${expCount/10}%)`);
  const one = resolveConfigFor('u1', cfgState);
  t.ok(['control', 'aggressive'].includes(one.experiments.combo_scaling),
    'experiment variant assigned');

  // kill switch at the server level overrides everything
  const killedState = { ...cfgState, channels: [
    { channel: 'stable', version: 'v1', rollout_pct: 100, killed: false },
    { channel: 'experiment', version: 'v2-exp', rollout_pct: 100, killed: true },
  ] };
  const k = resolveConfigFor('u1', killedState);
  t.eq(k.killed, true, 'server kill switch reported to every client');
}
