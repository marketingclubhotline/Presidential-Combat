import { ContentScheduler, AbuseDetector, ENFORCEMENT, buildBracket, advanceBracket,
         assertCosmeticOnly, projectCosts, breakEvenDAU, sunsetStage, capability,
         sunsetRecommendation, SUNSET_PLAN } from '../src/server/liveops.js';

export async function run(t) {
  /* ================= PHASE 17: content cadence ================= */
  const rows = [
    { id: 'a', publish_at: '2026-08-01T00:00:00Z', published: false },
    { id: 'b', publish_at: '2026-09-01T00:00:00Z', published: false },
    { id: 'c', publish_at: '2026-07-01T00:00:00Z', unpublish_at: '2026-08-10T00:00:00Z', published: true },
  ];
  const store = {
    list: async () => rows,
    publish: async id => { rows.find(r => r.id === id).published = true; },
    unpublish: async id => { rows.find(r => r.id === id).published = false; },
  };
  const sched = new ContentScheduler({ store, now: () => new Date('2026-08-14T00:00:00Z') });
  const out = await sched.tick();
  t.ok(out.published.includes('a'), 'due content is published automatically');
  t.ok(!out.published.includes('b'), 'future content is not published early');
  t.ok(out.unpublished.includes('c'), 'expired seasonal event is retired');
  const again = await sched.tick();
  t.eq(again.published.length, 0, 'scheduler is idempotent (safe to run on a cron)');

  const season = ContentScheduler.planSeason({
    startDate: '2026-09-01', weeks: 6, seasonId: 'S1',
    cadence: ['fighter', null, 'stage', null, 'event', null],
  });
  t.eq(season.length, 3, 'season plan drops content on the configured cadence');
  t.eq(season[0].kind, 'fighter', 'first drop is a fighter');
  t.ok(new Date(season[1].publish_at) > new Date(season[0].publish_at), 'drops are ordered in time');

  /* ================= PHASE 18: moderation ================= */
  const det = new AbuseDetector();

  // clean player
  let v = det.evaluate({ playerId: 'clean',
    connStats: Array.from({ length: 10 }, (_, i) => ({ opponent_id: 'o' + i, stall_events: 0 })),
    reports: [] });
  t.eq(v.action, null, 'a clean player is not punished');

  // lag switcher: stalls across many different opponents
  v = det.evaluate({ playerId: 'lagger',
    connStats: Array.from({ length: 10 }, (_, i) => ({
      opponent_id: 'o' + i, stall_events: i < 7 ? 3 : 0, disconnect_at_losing: i < 6 })),
    reports: [] });
  t.ok(v.signals.some(s => s.code === 'lag_switch'), 'lag-switch pattern detected');
  t.ok(v.signals.some(s => s.code === 'rage_quit_abuse'), 'disconnect-while-losing detected');
  t.eq(v.action, ENFORCEMENT.SUSPEND, 'first offence with strong evidence => suspension');
  t.eq(v.autoApply, false, 'a suspension requires human review, never auto-applied');

  // same evidence, but the player has already been suspended twice before
  const repeat = det.evaluate({ playerId: 'lagger',
    connStats: Array.from({ length: 10 }, (_, i) => ({
      opponent_id: 'o' + i, stall_events: i < 7 ? 3 : 0, disconnect_at_losing: i < 6 })),
    reports: [],
    priors: [{ action: ENFORCEMENT.SUSPEND }, { action: ENFORCEMENT.SUSPEND }] });
  t.eq(repeat.action, ENFORCEMENT.BAN, 'repeat offender escalates to a ban');
  t.eq(repeat.autoApply, false, 'a ban still requires human review');

  // revoked (overturned) strikes must not count against a player
  const cleared = det.evaluate({ playerId: 'lagger',
    connStats: Array.from({ length: 10 }, (_, i) => ({
      opponent_id: 'o' + i, stall_events: i < 7 ? 3 : 0, disconnect_at_losing: i < 6 })),
    reports: [],
    priors: [{ action: ENFORCEMENT.SUSPEND, revoked: true }, { action: ENFORCEMENT.SUSPEND, revoked: true }] });
  t.eq(cleared.action, ENFORCEMENT.SUSPEND, 'overturned strikes do not escalate');

  // one bad night against ONE opponent must not convict
  v = det.evaluate({ playerId: 'unlucky',
    connStats: Array.from({ length: 8 }, () => ({ opponent_id: 'same', stall_events: 5 })),
    reports: [] });
  t.eq(v.signals.length, 0, 'bad connection vs a single opponent is not evidence');
  t.eq(v.action, null, 'no action for one flaky opponent pairing');

  // brigading: many reports from few people
  v = det.evaluate({ playerId: 'brigaded', connStats: [],
    reports: Array.from({ length: 8 }, () => ({ reporter_id: 'r1', reason: 'harassment' })) });
  t.eq(v.action, null, 'mass reports from one account do not convict');

  v = det.evaluate({ playerId: 'toxic', connStats: [],
    reports: Array.from({ length: 6 }, (_, i) => ({ reporter_id: 'r' + i, reason: 'harassment' })) });
  t.ok(v.signals.some(s => s.code === 'community_reports'), 'distinct reporters do count');
  t.ok(v.action, 'action taken on genuine community consensus');

  // desync/memory editing
  v = det.evaluate({ playerId: 'hacker',
    connStats: Array.from({ length: 10 }, (_, i) => ({ opponent_id: 'o' + i, desync_count: i < 5 ? 2 : 0 })),
    reports: [] });
  t.ok(v.signals.some(s => s.code === 'state_manipulation'), 'repeated desyncs flagged as tampering');

  /* ---- tournaments ---- */
  const entrants = Array.from({ length: 8 }, (_, i) => ({ player_id: 'p' + i, elo: 1000 + i * 50 }));
  let b = buildBracket(entrants);
  t.eq(b.size, 8, '8 entrants => 8-slot bracket');
  t.eq(b.byes, 0, 'no byes for a power of two');
  t.eq(b.rounds, 3, '3 rounds');
  t.eq(b.matches.filter(m => m.round === 1).length, 4, '4 first-round matches');
  const r1 = b.matches.filter(m => m.round === 1);
  t.ok(r1[0].player_a === 'p7' && r1[0].player_b === 'p0',
    'top seed faces the bottom seed in slot 0');
  t.ok(r1[1].player_a === 'p4' && r1[1].player_b === 'p3',
    'slot 1 is the 4v5 pairing (standard seeding)');
  t.ok(r1[2].player_a === 'p6' && r1[2].player_b === 'p1',
    'the 2 seed is in the opposite half — top seeds can only meet in the final');

  // non power of two gets byes
  const b2 = buildBracket(Array.from({ length: 5 }, (_, i) => ({ player_id: 'q' + i, elo: 1000 })));
  t.eq(b2.size, 8, '5 entrants => 8-slot bracket');
  t.eq(b2.byes, 3, '3 byes awarded');
  t.eq(b2.matches.filter(m => m.state === 'bye').length, 3, 'byes auto-advance');

  // play it out
  advanceBracket(b.matches, { round: 1, slot: 0, winnerId: 'p7' });
  advanceBracket(b.matches, { round: 1, slot: 1, winnerId: 'p4' });
  const semi = b.matches.find(m => m.round === 2 && m.slot === 0);
  t.eq(semi.player_a, 'p7', 'winner advances into the next round');
  t.eq(semi.player_b, 'p4', 'both slots fill');
  t.eq(semi.state, 'pending', 'match becomes playable once both slots are filled');
  try { advanceBracket(b.matches, { round: 2, slot: 0, winnerId: 'p0' }); t.ok(false, 'rejects a non-participant'); }
  catch { t.ok(true, 'rejects reporting a winner who was not in the match'); }

  /* ================= PHASE 19: economy ================= */
  t.ok(assertCosmeticOnly({ sku: 'skin1', payload: { palette: { gi: '#fff' }, hitspark: 'gold' } }),
    'a pure cosmetic passes');
  try {
    assertCosmeticOnly({ sku: 'p2w', payload: { moves: { punch: { damage: 20 } } } });
    t.ok(false, 'pay-to-win item rejected');
  } catch (e) { t.ok(/affect gameplay/.test(e.message), 'pay-to-win item rejected: ' + e.message); }
  try {
    assertCosmeticOnly({ sku: 'sneaky', payload: { visual: { deep: { nested: { hp: 200 } } } } });
    t.ok(false, 'deeply nested stat rejected');
  } catch { t.ok(true, 'deeply nested gameplay value also rejected'); }

  const small = projectCosts({ dau: 200 });
  t.ok(small.monthlyCost >= 0, 'cost model runs');
  const big = projectCosts({ dau: 50000 });
  t.ok(big.monthlyCost > small.monthlyCost, 'costs scale with DAU');
  t.ok(big.writesPerMonth > 1e6, 'high DAU exceeds the free tier');
  t.ok(big.levers.telemetrySamplingWouldSave > 0, 'model quantifies the sampling lever');
  const be = breakEvenDAU();
  t.ok(be > 0 && Number.isFinite(be), `break-even DAU computed: ${be}`);

  /* ================= PHASE 20: sunset ================= */
  t.eq(SUNSET_PLAN[0].mode, 'live', 'plan starts live');
  t.eq(SUNSET_PLAN.at(-1).mode, 'sunset', 'plan ends at sunset');
  t.eq(capability('live', 'store'), true, 'store open while live');
  t.eq(capability('degraded', 'store'), false, 'store closes first (cuts cost)');
  t.eq(capability('degraded', 'matchmaking'), true, 'matchmaking survives the first cut');
  t.eq(capability('readonly', 'ranked'), false, 'ranked freezes before matchmaking dies');
  t.eq(capability('p2p_only', 'matchmaking'), false, 'matchmaking off in p2p_only');
  t.ok(sunsetStage('p2p_only').playerMessage.includes('connection code'),
    'players are told how to keep playing after matchmaking dies');
  t.ok(sunsetStage('sunset').playerMessage.includes('free to download'),
    'final build is promised to players');

  // ordering guarantee: nothing is restored once removed
  const caps = ['store', 'ranked', 'matchmaking'];
  for (const c of caps) {
    let seenOff = false, violated = false;
    for (const s of SUNSET_PLAN) {
      if (!s[c]) seenOff = true;
      else if (seenOff) violated = true;
    }
    t.eq(violated, false, `${c} is never re-enabled after being disabled (monotonic shutdown)`);
  }

  let rec = sunsetRecommendation({ dau: 5000, medianQueueSec: 20, monthlyCost: 100, monthlyRevenue: 400 });
  t.eq(rec.recommend, 'live', 'healthy game stays live');
  rec = sunsetRecommendation({ dau: 800, medianQueueSec: 40, monthlyCost: 300, monthlyRevenue: 100 });
  t.eq(rec.recommend, 'degraded', 'unprofitable but populated => cut costs first');
  rec = sunsetRecommendation({ dau: 40, medianQueueSec: 400, monthlyCost: 300,
                               monthlyRevenue: 20, monthsUnprofitable: 8 });
  t.eq(rec.recommend, 'p2p_only', 'dead population + sustained losses => release the P2P build');
  t.ok(rec.reasons.length >= 2, 'recommendation explains itself');
  t.ok(rec.noticeDays >= 60, 'players get long notice before matchmaking dies');
}
