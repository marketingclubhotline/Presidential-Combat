import { validateFighter, validateRules, AssetLoader, ConfigError } from '../src/shared/configLoader.js';
import { readFileSync } from 'node:fs';

const load = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));

export async function run(t) {
  const fighter = load('../public/data/fighter.neon.json');
  const rules   = load('../public/data/rules.json');

  // --- the shipped configs must be valid ---
  t.ok(validateFighter(fighter), 'shipped fighter.neon.json validates');
  t.ok(validateRules(rules), 'shipped rules.json validates');
  for (const move of ['punch', 'kick', 'lowKick', 'jumpKick', 'fireball', 'uppercut',
    'spinKick', 'roundhouse', 'barrelPunch']) {
    t.ok(fighter.moves[move], `${move} is externalized`);
  }
  t.eq(fighter.moves.punch.startup, 4, 'punch startup came from JSON, not code');
  t.eq(fighter.moves.kick.damage, 13, 'kick damage came from JSON');
  t.ok(fighter.physics.gravity > 0, 'physics externalized');
  t.ok(Array.isArray(fighter.scaling.damage), 'scaling tables externalized');
  t.eq(fighter.motions.length, 4, 'motion inputs externalized, including microphone super');

  // --- validation must reject the mistakes a balance-tweaker actually makes ---
  const clone = () => JSON.parse(JSON.stringify(fighter));
  const bad = (mutate, label) => {
    const c = clone(); mutate(c);
    try { validateFighter(c); t.ok(false, label + ' (should have thrown)'); }
    catch (e) { t.ok(e instanceof ConfigError, label); }
  };
  bad(c => { c.moves.punch.startup = 'four'; }, 'rejects non-numeric startup');
  bad(c => { c.moves.punch.startup = 0; }, 'rejects zero startup');
  bad(c => { delete c.moves.kick.damage; }, 'rejects missing damage');
  bad(c => { c.moves.kick.height = 'sideways'; }, 'rejects invalid hit height');
  bad(c => { c.moves.punch.cancelInto = ['dragonPunch']; }, 'rejects cancel into unknown move');
  bad(c => { delete c.moves.kick.box; }, 'rejects damaging move with no hitbox');
  bad(c => { c.hurtboxes.stand = []; }, 'rejects empty hurtbox list');
  bad(c => { c.hurtboxes.crouch[0].w = -5; }, 'rejects negative box width');
  bad(c => { c.physics.gravity = -1; }, 'rejects negative gravity');
  bad(c => { c.physics.jumpVel = 10; }, 'rejects positive jump velocity');
  bad(c => { c.physics.friction = 2; }, 'rejects friction > 1');
  bad(c => { c.motions[0].seq = [2, 3, 99]; }, 'rejects invalid numpad direction');
  bad(c => { c.motions[0].move = 'nope'; }, 'rejects motion for unknown move');
  bad(c => { c.scaling.damage = [0.5, 0.9]; }, 'rejects increasing damage scaling');
  bad(c => { c.scaling.gravity = [2.0, 1.0]; }, 'rejects decreasing gravity scaling');

  // rules validation
  try { validateRules({ ...rules, winsNeeded: 9 }); t.ok(false, 'rejects winsNeeded > maxRounds'); }
  catch { t.ok(true, 'rejects winsNeeded > maxRounds'); }
  try { validateRules({ ...rules, inputDelayFrames: 99 }); t.ok(false, 'rejects delay > rollback window'); }
  catch { t.ok(true, 'rejects delay > rollback window'); }

  // --- preloader: weighted progress, monotonic, ends at exactly 1.0 ---
  const files = {
    'data/manifest.json': load('../public/data/manifest.json'),
    'data/rules.json': rules,
    'data/stage.synthwave.json': load('../public/data/stage.synthwave.json'),
    'data/fighter.neon.json': fighter,
  };
  const fakeFetch = async (url) => {
    const key = url.replace(/^\//, '');
    if (!(key in files)) return { ok: false, status: 404 };
    return { ok: true, status: 200, json: async () => files[key] };
  };
  const seen = [];
  const loader = new AssetLoader({ fetchImpl: fakeFetch }).onProgress(p => seen.push(p));
  await loader.loadManifest();
  await loader.loadData();
  t.ok(loader.assets.fighter && loader.assets.rules, 'preloader fetched and parsed all data');
  t.ok(seen.every((v, i) => i === 0 || v >= seen[i - 1]), 'progress is monotonic');
  t.ok(seen.at(-1) < 1, 'progress < 100% before generated steps run');
  for (const id of ['atlas.p1', 'atlas.p2', 'stage.bg', 'audio.sfx', 'audio.bgm']) {
    await loader.runStep(id, async () => true);
  }
  t.eq(Math.round(seen.at(-1) * 1000) / 1000, 1, 'progress reaches exactly 100% after generated steps');

  // a missing asset must fail loudly, not silently boot a broken match
  const badLoader = new AssetLoader({ fetchImpl: async () => ({ ok: false, status: 404 }) });
  await t.throws(() => badLoader.loadManifest(), 'missing manifest throws');
}
