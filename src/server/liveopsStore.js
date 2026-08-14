/**
 * In-memory implementation of the live-ops store.
 *
 * Kept behind an interface so the same routes work against Supabase in prod
 * and against this in tests / self-hosted play. Mirrors the semantics of
 * db/schema_liveops.sql (idempotent fulfilment, aggregation on write,
 * cosmetic-only enforcement) rather than being a loose stub.
 */
import { aggregateSummaries } from '../shared/telemetry.js';
import { assertCosmeticOnly, sunsetStage, SUNSET_MODES } from './liveops.js';
import { configFingerprint } from '../shared/integrity.js';
import { applyPatch } from '../shared/liveconfig.js';

export function createLiveopsStore({ baseConfig, now = () => new Date() } = {}) {
  const state = {
    status: { mode: 'live', message: null, updatedAt: now().toISOString() },
    versions: [{ version: 'base', channel: 'stable', payload: baseConfig,
                 fingerprint: configFingerprint(baseConfig), parent: null, published: true }],
    channels: [{ channel: 'stable', version: 'base', rollout_pct: 100, killed: false }],
    experiments: [],
    exposures: new Map(),
    events: [],
    summaries: [],
    sessions: new Map(),
    activityRows: [],
    reportsByTarget: new Map(),
    connByPlayer: new Map(),
    enforcements: [],
    review: [],
    content: [],
    tournaments: new Map(),
    items: new Map(),
    entitlements: new Map(),
    purchases: new Map(),
  };

  const api = {
    _state: state,

    /* ---------------- status / sunset ---------------- */
    status: () => ({ ...state.status }),
    setMode(mode, message) {
      if (!SUNSET_MODES.includes(mode)) throw new Error(`unknown mode "${mode}"`);
      const stage = sunsetStage(mode);
      state.status = { mode, message: message ?? stage.playerMessage ?? null,
                       updatedAt: now().toISOString() };
      return { ...state.status, stage };
    },

    /* Resolve a (possibly chained) patch version to its full config. */
    _resolveFull(v) {
      if (!v.parent) return v.payload;
      const p = state.versions.find(x => x.version === v.parent);
      if (!p) throw new Error(`unknown parent version "${v.parent}"`);
      return applyPatch(p.parent ? api._resolveFull(p) : p.payload, v.payload);
    },

    /* ---------------- config / OTA ------------------- */
    configState: () => ({
      channels: state.channels.map(c => ({ ...c })),
      versions: state.versions.map(v => ({ ...v })),
      experiments: state.experiments.map(e => ({ ...e })),
    }),
    publishConfig({ version, channel = 'experiment', payload, parent = null,
                    rollout_pct = 0, notes }) {
      if (!version) throw new Error('version required');
      if (state.versions.some(v => v.version === version)) {
        throw new Error(`version "${version}" already exists`);
      }
      /* The fingerprint must describe the config the CLIENT will end up
         running — i.e. the merged result — not the sparse patch. Fingerprinting
         the patch makes every patched client fail its integrity check and
         silently fall back to cache, which looks like "the patch did nothing". */
      let resolved = payload;
      if (parent) {
        const p = state.versions.find(v => v.version === parent);
        if (!p) throw new Error(`unknown parent version "${parent}"`);
        const parentFull = p.parent ? api._resolveFull(p) : p.payload;
        resolved = applyPatch(parentFull, payload);
      }
      const fp = configFingerprint(resolved);
      state.versions.push({ version, channel, payload, parent,
                            fingerprint: fp, resolved, notes, published: true });
      const existing = state.channels.find(c => c.channel === channel);
      if (existing) { existing.version = version; existing.rollout_pct = rollout_pct; existing.killed = false; }
      else state.channels.push({ channel, version, rollout_pct, killed: false });
      return { version, channel, rollout_pct, fingerprint: fp };
    },
    setRollout(channel, pct) {
      const c = state.channels.find(x => x.channel === channel);
      if (!c) throw new Error(`unknown channel "${channel}"`);
      if (!(pct >= 0 && pct <= 100)) throw new Error('pct must be 0..100');
      c.rollout_pct = pct;
      return { ...c };
    },
    setKill(channel, killed) {
      const c = state.channels.find(x => x.channel === channel);
      if (!c) throw new Error(`unknown channel "${channel}"`);
      c.killed = !!killed;
      return { ...c };
    },
    addExperiment(e) { state.experiments.push({ active: true, ...e }); return e; },
    recordExposure(playerId, assigned) {
      for (const [expId, variant] of Object.entries(assigned || {})) {
        state.exposures.set(`${expId}|${playerId}`, { expId, playerId, variant });
      }
    },
    exposures: () => [...state.exposures.values()],

    /* ---------------- telemetry ---------------------- */
    ingest(batch) {
      let n = 0;
      for (const ev of batch.events) {
        state.events.push({ ...ev, sessionId: batch.sessionId, playerId: batch.playerId });
        n++;
        if (ev.event === 'match_summary' && ev.payload) state.summaries.push(ev.payload);
        const s = state.sessions.get(batch.sessionId) || { sessionId: batch.sessionId, maxStep: 0 };
        if (ev.funnel_step && ev.funnel_step > s.maxStep) s.maxStep = ev.funnel_step;
        state.sessions.set(batch.sessionId, s);
        if (batch.playerId && ev.event === 'match_summary') {
          const day = new Date(ev.t || Date.now()).toISOString().slice(0, 10);
          state.activityRows.push({ player_id: batch.playerId, day });
        }
      }
      return n;
    },
    rollups: () => aggregateSummaries(state.summaries),
    sessions: () => [...state.sessions.values()],
    activity() {
      // derive first_seen for cohort maths
      const first = new Map();
      for (const a of state.activityRows) {
        const cur = first.get(a.player_id);
        if (!cur || a.day < cur) first.set(a.player_id, a.day);
      }
      return state.activityRows.map(a => ({ ...a, first_seen: first.get(a.player_id) }));
    },

    /* ---------------- moderation --------------------- */
    addReport(r) {
      const list = state.reportsByTarget.get(r.targetId) || [];
      list.push({ ...r, reporter_id: r.reporterId, created_at: now().toISOString() });
      state.reportsByTarget.set(r.targetId, list);
    },
    reports: (id) => state.reportsByTarget.get(id) || [],
    addConnStat(playerId, row) {
      const list = state.connByPlayer.get(playerId) || [];
      list.push(row);
      state.connByPlayer.set(playerId, list);
    },
    connStats: (id) => state.connByPlayer.get(id) || [],
    enforce(v) {
      state.enforcements.push({ ...v, issued_at: now().toISOString(), automated: true });
      return v;
    },
    queueForReview(v) { state.review.push({ ...v, queued_at: now().toISOString() }); return v; },
    reviewQueue: () => [...state.review],
    enforcements: () => [...state.enforcements],
    activeEnforcement(playerId) {
      return state.enforcements.filter(e => e.playerId === playerId && !e.revoked);
    },

    /* ---------------- content ------------------------ */
    contentStore: {
      list: async () => state.content.map(c => ({ ...c })),
      publish: async (id) => { const c = state.content.find(x => x.id === id); if (c) c.published = true; },
      unpublish: async (id) => { const c = state.content.find(x => x.id === id); if (c) c.published = false; },
    },
    addContent(rows) { state.content.push(...rows); return rows.length; },

    /* ---------------- tournaments -------------------- */
    createTournament({ id, name, maxPlayers = 32, entrants = [] }) {
      if (!id) throw new Error('id required');
      if (state.tournaments.has(id)) throw new Error('tournament exists');
      const t = { id, name: name || id, state: 'registration', maxPlayers, entrants, matches: [] };
      state.tournaments.set(id, t);
      return { id: t.id, state: t.state, entrants: t.entrants.length };
    },
    tournament: (id) => state.tournaments.get(id),
    startTournament(id, build) {
      const t = state.tournaments.get(id);
      if (!t) throw new Error('unknown tournament');
      if (t.state !== 'registration') throw new Error('already started');
      const b = build(t.entrants);
      t.matches = b.matches.map((m, i) => ({
        ...m, id: `${id}-r${m.round}s${m.slot}`,
        spectator_key: m.state === 'pending' ? `sp_${id}_${m.round}_${m.slot}` : null,
      }));
      t.state = 'running';
      return { id, rounds: b.rounds, byes: b.byes, matches: t.matches.length };
    },
    reportBracketResult(id, { round, slot, winnerId }, advance) {
      const t = state.tournaments.get(id);
      if (!t) throw new Error('unknown tournament');
      const out = advance(t.matches, { round, slot, winnerId });
      if (out.champion) { t.state = 'complete'; t.champion = out.champion; }
      return out;
    },
    spectate(id, key) {
      const t = state.tournaments.get(id);
      if (!t) return null;
      const m = t.matches.find(x => x.spectator_key === key);
      if (!m) return null;
      return { tournament: id, round: m.round, slot: m.slot,
               player_a: m.player_a, player_b: m.player_b, state: m.state };
    },

    /* ---------------- economy ------------------------ */
    addItem(item) {
      assertCosmeticOnly(item);            // cosmetics only — enforced in code
      state.items.set(item.sku, { active: true, ...item });
      return item;
    },
    catalogue: () => [...state.items.values()].filter(i => i.active),
    purchase({ playerId, sku, providerRef, amountCents }) {
      if (!playerId || !sku) throw new Error('playerId and sku required');
      const item = state.items.get(sku);
      if (!item || !item.active) throw new Error('unknown or inactive sku');
      if (providerRef && state.purchases.has(providerRef)) {
        return { state: 'duplicate', sku, playerId };   // idempotent webhook
      }
      const ref = providerRef || `local_${state.purchases.size + 1}`;
      state.purchases.set(ref, { playerId, sku, amountCents: amountCents ?? item.price_cents,
                                 state: 'paid', at: now().toISOString() });
      const owned = state.entitlements.get(playerId) || new Set();
      owned.add(sku);
      state.entitlements.set(playerId, owned);
      return { state: 'fulfilled', sku, playerId, providerRef: ref };
    },
    entitlements: (playerId) => [...(state.entitlements.get(playerId) || [])],

    /* ---------------- export ------------------------- */
    exportPlayer(playerId) {
      return {
        player: playerId,
        entitlements: api.entitlements(playerId),
        matches: state.summaries.filter(s => s.playerId === playerId),
        exported_at: now().toISOString(),
        note: 'Your data remains yours. This export works even after shutdown.',
      };
    },
  };
  return api;
}
