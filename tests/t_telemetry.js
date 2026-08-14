import { Telemetry, FUNNEL, aggregateSummaries, balanceReport,
         computeRetention, funnelDropoff } from '../src/shared/telemetry.js';

export async function run(t) {
  /* ---- hot path must not allocate or block ---- */
  const sent = [];
  const tel = new Telemetry({ transport: async b => { sent.push(b); }, flushMs: 0, sampleRate: 1 });
  tel.identify('p1', { configVersion: 'v2' });

  tel.beginMatch({ matchId: 'm1', localCharacter: 'neon', remoteCharacter: 'neon' });
  for (let i = 0; i < 40; i++) tel.recordMove('punch', 'use');
  for (let i = 0; i < 25; i++) tel.recordMove('punch', 'hit', 7);
  for (let i = 0; i < 5; i++) tel.recordMove('kick', 'use');
  tel.recordMove('kick', 'hit', 13);
  tel.recordCombo(4);
  tel.recordRound('local', 30000);
  const sum = tel.endMatch('win');
  t.eq(sum.moves.punch.uses, 40, 'per-move usage aggregated client-side');
  t.eq(sum.moves.punch.hits, 25, 'hits aggregated');
  t.eq(sum.damageDealt, 25 * 7 + 13, 'damage aggregated');
  t.eq(sum.maxCombo, 4, 'max combo captured');
  t.ok(sum.durationMs >= 0, 'match duration measured');

  await tel.flush();
  t.eq(sent.length, 1, 'one batch sent, not one request per event');
  const evs = sent[0].events;
  t.eq(evs.filter(e => e.event === 'match_summary').length, 1,
    'a whole match compresses to ONE summary row');

  /* ---- sampling protects the bill, but never drops critical events ---- */
  const sent2 = [];
  const tel2 = new Telemetry({ transport: async b => sent2.push(b), flushMs: 0, sampleRate: 0 });
  tel2._rng = () => 0.99;                 // force "reject" on every sample roll
  for (let i = 0; i < 50; i++) tel2.track('hitbox_debug', { i });
  tel2.step(FUNNEL.MATCH_START);
  tel2.track('error', { msg: 'boom' });
  await tel2.flush();
  const kinds = sent2[0].events.map(e => e.event);
  t.ok(!kinds.includes('hitbox_debug'), 'high-frequency events are sampled out at rate 0');
  t.ok(kinds.includes('funnel'), 'funnel events always survive sampling');
  t.ok(kinds.includes('error'), 'error events always survive sampling');

  /* ---- ring buffer is bounded (a stuck flush cannot OOM a phone) ---- */
  const tel3 = new Telemetry({ transport: async () => {}, flushMs: 0, sampleRate: 1 });
  for (let i = 0; i < 5000; i++) tel3.track('spam', null);
  t.ok(tel3._count <= 256, `ring buffer capped at 256 (held ${tel3._count})`);
  t.ok(tel3._dropped > 0, 'overflow is counted, not silently ignored');

  /* ---- server-side rollups ---- */
  const summaries = [
    { localCharacter: 'neon', remoteCharacter: 'ryu', result: 'win', durationMs: 60000,
      rounds: 2, roundsWon: 2, configVersion: 'v1',
      moves: { punch: { uses: 100, hits: 80, damage: 560 }, kick: { uses: 10, hits: 4, damage: 52 } } },
    { localCharacter: 'neon', remoteCharacter: 'ryu', result: 'win', durationMs: 40000,
      rounds: 2, roundsWon: 2, configVersion: 'v1',
      moves: { punch: { uses: 100, hits: 75, damage: 525 } } },
    { localCharacter: 'ryu', remoteCharacter: 'neon', result: 'loss', durationMs: 50000,
      rounds: 2, roundsWon: 0, configVersion: 'v1',
      moves: { lowKick: { uses: 60, hits: 20, damage: 180 } } },
  ];
  const roll = aggregateSummaries(summaries, '2026-08-14');
  const neon = roll.charStats.find(c => c.character_id === 'neon');
  t.eq(neon.wins, 2, 'character wins rolled up');
  t.eq(neon.match_count, 2, 'match count rolled up');
  const punch = roll.moveStats.find(m => m.move_key === 'punch');
  t.eq(punch.uses, 200, 'move uses summed across matches');

  const rep = balanceReport(roll);
  t.eq(rep.characters[0].character, 'neon', 'report sorts by win rate');
  t.eq(rep.characters[0].winRate, 100, 'win rate computed');
  t.ok(rep.moves[0].move === 'punch', 'most-used move surfaces first');
  t.ok(rep.flags.some(f => /spam candidate/.test(f)),
    `spam detected: "${rep.flags.find(f => /spam/.test(f))}"`);
  t.ok(rep.flags.some(f => /too safe/.test(f)), 'over-performing move flagged');
  t.ok(rep.flags.some(f => /nearly unused|dead move/.test(f)), 'dead move flagged');

  /* ---- retention ---- */
  const activity = [
    { player_id: 'a', day: '2026-08-01', first_seen: '2026-08-01' },
    { player_id: 'b', day: '2026-08-01', first_seen: '2026-08-01' },
    { player_id: 'c', day: '2026-08-01', first_seen: '2026-08-01' },
    { player_id: 'd', day: '2026-08-01', first_seen: '2026-08-01' },
    { player_id: 'a', day: '2026-08-02', first_seen: '2026-08-01' },
    { player_id: 'b', day: '2026-08-02', first_seen: '2026-08-01' },
    { player_id: 'a', day: '2026-08-08', first_seen: '2026-08-01' },
    { player_id: 'a', day: '2026-08-31', first_seen: '2026-08-01' },
  ];
  const ret = computeRetention(activity, '2026-08-01');
  t.eq(ret.size, 4, 'cohort size');
  t.eq(ret.retention.d1, 50, 'D1 retention = 2/4');
  t.eq(ret.retention.d7, 25, 'D7 retention = 1/4');
  t.eq(ret.retention.d30, 25, 'D30 retention = 1/4');

  /* ---- funnel drop-off ---- */
  const sessions = [
    { maxStep: FUNNEL.APP_OPEN }, { maxStep: FUNNEL.APP_OPEN },
    { maxStep: FUNNEL.QUEUE_ENTER }, { maxStep: FUNNEL.QUEUE_ENTER },
    { maxStep: FUNNEL.QUEUE_ENTER }, { maxStep: FUNNEL.QUEUE_ENTER },
    { maxStep: FUNNEL.MATCH_COMPLETE }, { maxStep: FUNNEL.MATCH_COMPLETE },
  ];
  const fun = funnelDropoff(sessions);
  const open = fun.find(f => f.name === 'APP_OPEN');
  const queue = fun.find(f => f.name === 'QUEUE_ENTER');
  const done = fun.find(f => f.name === 'MATCH_COMPLETE');
  t.eq(open.reached, 8, 'everyone reaches APP_OPEN');
  t.eq(queue.reached, 6, '6 reach the queue');
  t.eq(queue.droppedHere, 4, '4 players die at the matchmaking screen');
  t.eq(done.reached, 2, '2 complete a match');
  t.ok(queue.droppedHere > done.reached,
    'the funnel correctly identifies matchmaking as the biggest leak');

  /* ---- rage-quit signal ---- */
  const tel4 = new Telemetry({ transport: async () => {}, flushMs: 0, sampleRate: 1 });
  tel4.step(FUNNEL.MATCH_START);
  let captured = null;
  tel4.transport = async b => { captured = b; };
  await tel4.endSession('unload');
  const se = captured.events.find(e => e.event === 'session_end');
  t.eq(se.payload.ragequit, true, 'quitting mid-match is flagged as a rage quit');
  t.eq(se.payload.stepName, 'MATCH_START', 'drop-off step is named for the dashboard');
}
