/**
 * players table — data access layer.
 *
 * The headline function is recordWin(): "update win_count upon a match
 * victory". It delegates to the record_match_result RPC so that win_count,
 * loss_count, elo and the matches audit row all move inside ONE transaction.
 * A plain `select win_count` then `update win_count + 1` from the client is
 * both racy (two concurrent wins can clobber each other) and forgeable.
 */
import { getClient, getAdminClient } from './supabaseClient.js';

export const PROVISIONAL_MATCHES = 15;
export const DEFAULT_ELO = 1200;

/* ------------------------------------------------------------------ */
/* Reads (safe with the anon key)                                      */
/* ------------------------------------------------------------------ */

export async function getPlayer(id, client = getClient()) {
  const { data, error } = await client
    .from('players')
    .select('id, handle, win_count, loss_count, elo, peak_elo, matches')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getPlayer failed: ${error.message}`);
  return data;
}

export async function getLeaderboard({ limit = 50, offset = 0 } = {}, client = getClient()) {
  const { data, error } = await client
    .from('leaderboard')
    .select('*')
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`getLeaderboard failed: ${error.message}`);
  return data ?? [];
}

export async function createPlayer({ id, handle }, client = getClient()) {
  const { data, error } = await client
    .from('players')
    .insert({ id, handle, elo: DEFAULT_ELO })
    .select()
    .single();
  if (error) throw new Error(`createPlayer failed: ${error.message}`);
  return data;
}

/* ------------------------------------------------------------------ */
/* Writes (service role only)                                          */
/* ------------------------------------------------------------------ */

/**
 * Record a match victory: bumps the winner's win_count, the loser's
 * loss_count, and moves both Elo ratings — atomically.
 *
 * @param {object}  r
 * @param {string}  r.winnerId
 * @param {string}  r.loserId
 * @param {number} [r.roundsWon=2]
 * @param {number} [r.roundsLost=0]
 * @param {number} [r.durationMs]
 * @param {string} [r.stateHash]  agreed final state hash from both peers
 * @param {boolean}[r.verified]   false => recorded but scores nothing (Phase 12)
 */
export async function recordWin(
  { winnerId, loserId, roundsWon = 2, roundsLost = 0, durationMs = null, stateHash = null, verified = false },
  admin = getAdminClient()
) {
  if (!winnerId || !loserId) throw new Error('recordWin: winnerId and loserId are required');
  if (winnerId === loserId) throw new Error('recordWin: winner and loser must differ');

  const { data, error } = await admin.rpc('record_match_result', {
    p_winner: winnerId,
    p_loser: loserId,
    p_rounds_won: roundsWon,
    p_rounds_lost: roundsLost,
    p_duration_ms: durationMs,
    p_state_hash: stateHash,
    p_verified: verified,
  });
  if (error) throw new Error(`recordWin failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    winnerId: row.winner_id,
    winCount: row.winner_win_count,
    winnerElo: row.winner_elo,
    winnerDelta: row.winner_delta,
    loserId: row.loser_id,
    loserElo: row.loser_elo,
    loserDelta: row.loser_delta,
    matchId: row.match_id,
    scored: verified,
  };
}

/** Casual/unranked victory: bump win_count only, leave Elo alone. */
export async function incrementWinCount(playerId, admin = getAdminClient()) {
  const { data, error } = await admin.rpc('increment_win', { p_player: playerId });
  if (error) throw new Error(`incrementWinCount failed: ${error.message}`);
  return data; // new win_count
}

/* ------------------------------------------------------------------ */
/* Elo — pure functions, mirrored from the SQL so the client can        */
/* preview "+18 / -14" before the server confirms it.                   */
/* ------------------------------------------------------------------ */

export function kFactor(elo, matches) {
  if (matches < PROVISIONAL_MATCHES) return 40;
  if (elo >= 2100) return 16;
  return 24;
}

export function expectedScore(a, b) {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

/** @returns {{winner:number, loser:number, winnerDelta:number, loserDelta:number}} */
export function computeElo(winner, loser) {
  const kw = kFactor(winner.elo, winner.matches);
  const kl = kFactor(loser.elo, loser.matches);
  const ew = expectedScore(winner.elo, loser.elo);
  const el = expectedScore(loser.elo, winner.elo);
  const nw = Math.max(0, winner.elo + Math.round(kw * (1 - ew)));
  const nl = Math.max(0, loser.elo + Math.round(kl * (0 - el)));
  return { winner: nw, loser: nl, winnerDelta: nw - winner.elo, loserDelta: nl - loser.elo };
}
