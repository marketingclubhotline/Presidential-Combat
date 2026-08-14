import { makeMockSupabase } from './mockSupabase.js';
import { recordWin, incrementWinCount, computeElo, kFactor, createPlayer, getPlayer, getLeaderboard } from '../src/db/players.js';

export async function run(t) {
  const admin = makeMockSupabase({ role: 'service_role' });
  const anon  = makeMockSupabase({ role: 'anon' });
  // share one db between the two role views
  anon._db.players = admin._db.players;
  anon._db.matches = admin._db.matches;

  await createPlayer({ id: 'u1', handle: 'ryu' }, admin);
  await createPlayer({ id: 'u2', handle: 'ken' }, admin);

  // --- the headline requirement: win_count increments on victory ---
  let r = await recordWin({ winnerId: 'u1', loserId: 'u2', verified: true }, admin);
  t.eq(r.winCount, 1, 'win_count incremented to 1');
  t.ok(r.winnerDelta > 0, `winner gained Elo (+${r.winnerDelta})`);
  t.ok(r.loserDelta < 0, `loser lost Elo (${r.loserDelta})`);
  t.eq((await getPlayer('u2', admin)).loss_count, 1, 'loser loss_count incremented');

  r = await recordWin({ winnerId: 'u1', loserId: 'u2', verified: true }, admin);
  t.eq(r.winCount, 2, 'win_count increments again');

  // --- zero-sum-ish Elo & conservation of matches ---
  const p1 = await getPlayer('u1', admin), p2 = await getPlayer('u2', admin);
  t.eq(p1.matches, 2, 'winner match count tracked');
  t.eq(p2.matches, 2, 'loser match count tracked');
  t.eq(p1.peak_elo, p1.elo, 'peak elo tracks current on the way up');

  // --- Phase 12: unverified match must NOT score ---
  const beforeElo = p1.elo, beforeWins = p1.win_count;
  r = await recordWin({ winnerId: 'u1', loserId: 'u2', verified: false }, admin);
  const after = await getPlayer('u1', admin);
  t.eq(after.elo, beforeElo, 'unverified match awards no Elo');
  t.eq(after.win_count, beforeWins, 'unverified match awards no win');
  t.eq(r.scored, false, 'result flagged unscored');
  t.eq(admin._db.matches.at(-1).void_reason, 'state hash unverified', 'audit row records void reason');

  // --- guard rails ---
  await t.throws(() => recordWin({ winnerId: 'u1', loserId: 'u1', verified: true }, admin),
    'self-match rejected');
  await t.throws(() => recordWin({ winnerId: 'u1', loserId: 'ghost', verified: true }, admin),
    'unknown player rejected');
  await t.throws(() => recordWin({ winnerId: 'u1', verified: true }, admin),
    'missing loserId rejected');

  // --- RLS: the browser key cannot mutate scores ---
  const res = await anon.from('players').update({ win_count: 9999 }).eq('id', 'u1');
  t.ok(res.error && /row-level security/.test(res.error.message),
    'anon client blocked from writing win_count');
  const res2 = await anon.rpc('record_match_result', { p_winner: 'u1', p_loser: 'u2', p_verified: true });
  t.ok(res2.error && /permission denied/.test(res2.error.message),
    'anon client blocked from calling the scoring RPC');

  // --- casual win path ---
  const n = await incrementWinCount('u2', admin);
  t.eq(n, 1, 'increment_win bumps casual win_count');

  // --- leaderboard ---
  const lb = await getLeaderboard({ limit: 10 }, admin);
  t.eq(lb[0].id, 'u1', 'leaderboard ranks by elo');
  t.eq(lb[0].rank, 1, 'rank assigned');

  // --- Elo math mirrors SQL ---
  const e = computeElo({ elo: 1200, matches: 0 }, { elo: 1200, matches: 0 });
  t.eq(e.winnerDelta, 20, 'even match, provisional K=40 => +20');
  t.eq(e.loserDelta, -20, 'even match => -20');
  const up = computeElo({ elo: 1000, matches: 50 }, { elo: 1800, matches: 50 });
  t.ok(up.winnerDelta > 20, `upset win pays more (+${up.winnerDelta})`);
  const fav = computeElo({ elo: 1800, matches: 50 }, { elo: 1000, matches: 50 });
  t.ok(fav.winnerDelta < 5, `beating a much weaker player pays little (+${fav.winnerDelta})`);
  t.eq(kFactor(2200, 100), 16, 'master K-factor');
  t.eq(kFactor(1500, 3), 40, 'provisional K-factor');
}
