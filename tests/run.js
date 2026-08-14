/** Tiny zero-dependency test runner. */
let pass = 0, fail = 0;
const failures = [];

const t = {
  ok(cond, msg) {
    if (!msg) throw new Error('assertion without a description');
    if (cond) { pass++; console.log(`    ✓ ${msg}`); }
    else { fail++; failures.push(msg); console.log(`    ✗ ${msg}`); }
  },
  eq(a, b, msg) {
    const good = Object.is(a, b);
    if (good) { pass++; console.log(`    ✓ ${msg}`); }
    else { fail++; failures.push(`${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
      console.log(`    ✗ ${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }
  },
  async throws(fn, msg) {
    try { await fn(); fail++; failures.push(msg + ' (did not throw)'); console.log(`    ✗ ${msg} (did not throw)`); }
    catch { pass++; console.log(`    ✓ ${msg}`); }
  },
  section(name) { console.log(`\n  ${name}`); },
};

const suites = [
  ['database / players', './t_db.js'],
  ['config / data-driven', './t_config.js'],
  ['integrity / anti-cheat', './t_integrity.js'],
  ['signaling / matchmaking', './t_signaling.js'],
  ['telemetry / analytics (P15)', './t_telemetry.js'],
  ['OTA config / A-B / kill switch (P16)', './t_liveconfig.js'],
  ['content / moderation / economy / sunset (P17-20)', './t_liveops.js'],
  ['live-ops HTTP surface (P15-20)', './t_liveops_http.js'],
];

console.log('\n═══ NEON FIST — backend test suite ═══');
for (const [name, path] of suites) {
  console.log(`\n▸ ${name}`);
  try {
    const mod = await import(path);
    await mod.run(t);
  } catch (e) {
    fail++; failures.push(`${name} threw: ${e.message}`);
    console.log(`    ✗ suite crashed: ${e.stack?.split('\n').slice(0, 3).join('\n      ')}`);
  }
}
console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log('  · ' + f)); }
process.exit(fail ? 1 : 0);
