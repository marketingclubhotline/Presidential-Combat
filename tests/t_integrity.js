import { fnv1a, hashInts, hashGameState, DesyncDetector, DesyncState,
         auditFighterConfig, configFingerprint, auditRuntime } from '../src/shared/integrity.js';
import { readFileSync } from 'node:fs';
const load = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));

const mkFighter = (o = {}) => ({
  x: 300, y: 452, vx: 0, vy: 0, face: 1, hp: 100, meter: 0, stun: 0,
  moveFrame: 0, combo: 0, onGround: true, invuln: 0, state: 'idle', move: null, rounds: 0, ...o,
});
const mkGame = (o = {}) => ({ frame: 100, timer: 99, hitstop: 0, round: 1, phase: 'fight', ...o });

export async function run(t) {
  // --- hashing is stable and sensitive ---
  t.eq(fnv1a('neon'), fnv1a('neon'), 'fnv1a is deterministic');
  t.ok(fnv1a('neon') !== fnv1a('neom'), 'fnv1a differs on 1-char change');
  const a = mkFighter(), b = mkFighter();
  t.eq(hashGameState(mkGame(), a, b), hashGameState(mkGame(), a, b), 'identical states hash equal');
  t.ok(hashGameState(mkGame(), a, b) !== hashGameState(mkGame(), mkFighter({ hp: 99 }), b),
    'a single HP point changes the hash');
  t.ok(hashGameState(mkGame(), a, b) !== hashGameState(mkGame(), mkFighter({ x: 300.02 }), b),
    'sub-pixel teleport changes the hash');
  // float noise below the quantization floor must NOT desync honest peers
  t.eq(hashGameState(mkGame(), mkFighter({ x: 300 }), b),
       hashGameState(mkGame(), mkFighter({ x: 300 + 1e-9 }), b),
       'float noise below 1/64px does not false-positive');

  // --- desync detector ---
  const d = new DesyncDetector({ horizon: 8, tolerance: 2, checkInterval: 30 });
  t.ok(d.shouldCheck(30) && !d.shouldCheck(31), 'checks on the configured interval');
  // agreeing peers stay OK
  for (let f = 0; f <= 300; f += 30) { d.recordLocal(f, 1000 + f); d.recordRemote(f, 1000 + f); }
  d.recordLocal(400, 1); d.recordRemote(400, 1);
  t.eq(d.state, DesyncState.OK, 'agreeing peers stay OK');
  t.ok(d.agreed > 0, `confirmed ${d.agreed} agreeing frames`);

  // disagreement inside the rollback horizon is tolerated (not yet confirmed)
  const d2 = new DesyncDetector({ horizon: 8, tolerance: 2 });
  d2.recordLocal(100, 111); d2.recordRemote(100, 222);
  d2._compare(103); // only 3 frames later — still rollback-eligible
  t.eq(d2.state, DesyncState.OK, 'mismatch within rollback horizon is not a desync');
  d2._compare(200); // now confirmed
  t.eq(d2.state, DesyncState.SUSPECT, 'confirmed mismatch escalates to SUSPECT');
  d2.recordLocal(300, 5); d2.recordRemote(300, 6); d2._compare(400);
  t.eq(d2.state, DesyncState.DESYNCED, 'second confirmed mismatch => DESYNCED');
  t.eq(d2.report.firstBadFrame, 100, 'reports first bad frame for diagnostics');

  // --- config tamper audit ---
  const fighter = load('../public/data/fighter.neon.json');
  t.ok(auditFighterConfig(fighter).ok, 'shipped config passes the tamper audit');
  const hacked = JSON.parse(JSON.stringify(fighter));
  hacked.moves.punch.damage = 999;
  hacked.moves.kick.box.w = 900;
  hacked.moves.kick.startup = 0;
  const audit = auditFighterConfig(hacked);
  t.ok(!audit.ok, 'tampered config rejected');
  t.eq(audit.violations.length, 3, 'all three cheats reported');
  t.ok(audit.violations.some(v => /damage=999/.test(v)), 'infinite damage caught');
  t.ok(audit.violations.some(v => /box\.w=900/.test(v)), 'screen-wide hitbox caught');

  // fingerprints detect mismatched balance data between peers
  t.eq(configFingerprint(fighter), configFingerprint(JSON.parse(JSON.stringify(fighter))),
    'identical configs fingerprint the same');
  t.ok(configFingerprint(fighter) !== configFingerprint(hacked),
    'tampered config yields a different fingerprint');
  // deep-nesting regression: only a nested damage value differs
  const deepTamper = JSON.parse(JSON.stringify(fighter));
  deepTamper.moves.punch.damage = fighter.moves.punch.damage + 1;
  t.ok(configFingerprint(fighter) !== configFingerprint(deepTamper),
    'fingerprint catches a single nested damage edit');
  const reordered = { scaling: fighter.scaling, moves: fighter.moves, id: fighter.id,
                      physics: fighter.physics, hurtboxes: fighter.hurtboxes,
                      motions: fighter.motions, palettes: fighter.palettes,
                      displayName: fighter.displayName, version: fighter.version,
                      $schema: fighter.$schema };
  t.eq(configFingerprint(fighter), configFingerprint(reordered),
    'fingerprint is stable under key reordering');
  await runCanonical(t);

  // --- runtime audit catches console edits ---
  t.ok(auditRuntime(mkFighter()).ok, 'clean runtime state passes');
  t.ok(!auditRuntime(mkFighter({ hp: 9999 })).ok, 'hp=9999 caught');
  t.ok(!auditRuntime(mkFighter({ hp: -5 })).ok, 'negative hp caught');
  t.ok(!auditRuntime(mkFighter({ vx: 5000 })).ok, 'speed hack caught');
  t.ok(!auditRuntime(mkFighter({ x: NaN })).ok, 'NaN position caught');
}

// regression: canonical JSON must be order-independent but depth-sensitive
export async function runCanonical(t) {
  const { canonicalJSON, configFingerprint } = await import('../src/shared/integrity.js');
  const A = { b: 1, a: { y: 2, x: [1, { q: 3, p: 4 }] } };
  const B = { a: { x: [1, { p: 4, q: 3 }], y: 2 }, b: 1 };
  t.eq(canonicalJSON(A), canonicalJSON(B), 'canonical JSON ignores key order at all depths');
  const C = { b: 1, a: { y: 2, x: [1, { q: 3, p: 5 }] } };
  t.ok(canonicalJSON(A) !== canonicalJSON(C), 'canonical JSON detects a deeply nested change');
  t.ok(configFingerprint(A) !== configFingerprint(C), 'fingerprint detects deep nested change');
}
