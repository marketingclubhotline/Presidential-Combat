/**
 * In-memory Supabase double that faithfully reproduces the parts we rely on:
 *  - .from().select().eq().maybeSingle() / .insert().select().single()
 *  - .rpc('record_match_result') implementing the SAME Elo + RLS rules as SQL
 *  - RLS simulation: an anon client cannot write win_count / elo
 * This lets the suite prove the data layer's behaviour without a live project.
 */
export function makeMockSupabase({ role = 'anon' } = {}) {
  const db = {
    players: new Map(),
    matches: [],
  };

  const kFactor = (elo, matches) => (matches < 15 ? 40 : elo >= 2100 ? 16 : 24);
  const expected = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400));

  function rpc(name, args) {
    if (name === 'record_match_result') {
      if (role !== 'service_role') {
        return { data: null, error: { message: 'permission denied for function record_match_result' } };
      }
      const { p_winner, p_loser, p_verified, p_state_hash, p_rounds_won, p_rounds_lost, p_duration_ms } = args;
      if (p_winner === p_loser) return { data: null, error: { message: 'winner and loser must differ' } };
      const w = db.players.get(p_winner);
      const l = db.players.get(p_loser);
      if (!w) return { data: null, error: { message: `unknown winner ${p_winner}` } };
      if (!l) return { data: null, error: { message: `unknown loser ${p_loser}` } };

      const kw = kFactor(w.elo, w.matches);
      const kl = kFactor(l.elo, l.matches);
      let newW = Math.max(0, w.elo + Math.round(kw * (1 - expected(w.elo, l.elo))));
      let newL = Math.max(0, l.elo + Math.round(kl * (0 - expected(l.elo, w.elo))));
      const beforeW = w.elo, beforeL = l.elo;
      if (!p_verified) { newW = w.elo; newL = l.elo; }

      const matchId = 'm' + (db.matches.length + 1);
      db.matches.push({
        id: matchId, winner_id: p_winner, loser_id: p_loser,
        winner_elo_before: beforeW, loser_elo_before: beforeL,
        winner_elo_after: newW, loser_elo_after: newL,
        rounds_won: p_rounds_won, rounds_lost: p_rounds_lost,
        duration_ms: p_duration_ms, state_hash: p_state_hash,
        verified: !!p_verified,
        void_reason: p_verified ? null : 'state hash unverified',
      });

      if (p_verified) {
        w.win_count += 1; w.matches += 1; w.elo = newW;
        w.peak_elo = Math.max(w.peak_elo, newW);
        l.loss_count += 1; l.matches += 1; l.elo = newL;
      }
      return {
        data: [{
          winner_id: p_winner, winner_win_count: w.win_count,
          winner_elo: newW, winner_delta: newW - beforeW,
          loser_id: p_loser, loser_elo: newL, loser_delta: newL - beforeL,
          match_id: matchId,
        }], error: null,
      };
    }
    if (name === 'increment_win') {
      if (role !== 'service_role') {
        return { data: null, error: { message: 'permission denied for function increment_win' } };
      }
      const p = db.players.get(args.p_player);
      if (!p) return { data: null, error: { message: 'unknown player' } };
      p.win_count += 1; p.matches += 1;
      return { data: p.win_count, error: null };
    }
    return { data: null, error: { message: `unknown rpc ${name}` } };
  }

  function from(table) {
    const q = { _table: table, _filters: [], _payload: null, _op: 'select' };
    const api = {
      select() { return api; },
      eq(col, val) { q._filters.push([col, val]); return api; },
      range(a, b) { q._range = [a, b]; return api; },
      insert(payload) {
        q._op = 'insert'; q._payload = payload; return api;
      },
      update(payload) { q._op = 'update'; q._payload = payload; return api; },
      async maybeSingle() { return exec(q, 'maybeSingle'); },
      async single() { return exec(q, 'single'); },
      then(resolve, reject) { return exec(q, 'many').then(resolve, reject); },
    };
    return api;
  }

  async function exec(q, mode) {
    if (q._table === 'players') {
      if (q._op === 'insert') {
        // RLS: anon may insert only its own row (id must be provided)
        const row = {
          id: q._payload.id, handle: q._payload.handle,
          win_count: 0, loss_count: 0, elo: q._payload.elo ?? 1200,
          peak_elo: q._payload.elo ?? 1200, matches: 0,
        };
        if ([...db.players.values()].some(p => p.handle === row.handle)) {
          return { data: null, error: { message: 'duplicate key value violates unique constraint "players_handle_key"' } };
        }
        db.players.set(row.id, row);
        return { data: row, error: null };
      }
      if (q._op === 'update') {
        // RLS: the anon policy forbids changing scoring columns
        const scoring = ['win_count', 'loss_count', 'elo'];
        if (role !== 'service_role' && scoring.some(c => c in q._payload)) {
          return { data: null, error: { message: 'new row violates row-level security policy for table "players"' } };
        }
        const id = q._filters.find(f => f[0] === 'id')?.[1];
        const p = db.players.get(id);
        if (p) Object.assign(p, q._payload);
        return { data: p ?? null, error: null };
      }
      let rows = [...db.players.values()];
      for (const [col, val] of q._filters) rows = rows.filter(r => r[col] === val);
      if (mode === 'maybeSingle') return { data: rows[0] ?? null, error: null };
      if (mode === 'single') {
        if (rows.length !== 1) return { data: null, error: { message: 'expected exactly one row' } };
        return { data: rows[0], error: null };
      }
      return { data: rows, error: null };
    }
    if (q._table === 'leaderboard') {
      const rows = [...db.players.values()]
        .filter(p => p.matches > 0)
        .sort((a, b) => b.elo - a.elo || b.win_count - a.win_count)
        .map((p, i) => ({
          ...p, rank: i + 1,
          win_rate: p.matches ? Math.round((p.win_count * 1000) / p.matches) / 10 : 0,
        }));
      const [a, b] = q._range ?? [0, rows.length];
      return { data: rows.slice(a, b + 1), error: null };
    }
    if (q._table === 'matches') {
      return { data: db.matches, error: null };
    }
    return { data: null, error: { message: `unknown table ${q._table}` } };
  }

  return { from, rpc: async (n, a) => rpc(n, a), _db: db, _role: role };
}
