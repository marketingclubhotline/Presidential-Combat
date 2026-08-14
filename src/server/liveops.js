/**
 * Phases 17-20 — content cadence, moderation, tournaments, economy, sunset.
 */

/* ==================================================================== */
/* PHASE 17 — content cadence                                           */
/* ==================================================================== */

/**
 * A scheduler that publishes content at its appointed time. Deliberately
 * idempotent and clock-driven rather than "run once at deploy": a release
 * pipeline that only fires on deploy silently misses its window whenever the
 * team doesn't ship that day.
 */
export class ContentScheduler {
  constructor({ store, now = () => new Date() } = {}) {
    this.store = store;               // {list(), publish(id), unpublish(id)}
    this.now = now;
  }
  /** @returns {{published:string[], unpublished:string[]}} */
  async tick() {
    const t = this.now();
    const all = await this.store.list();
    const published = [], unpublished = [];
    for (const r of all) {
      const pub = new Date(r.publish_at);
      const unpub = r.unpublish_at ? new Date(r.unpublish_at) : null;
      if (!r.published && pub <= t && (!unpub || unpub > t)) {
        await this.store.publish(r.id); published.push(r.id);
      } else if (r.published && unpub && unpub <= t) {
        await this.store.unpublish(r.id); unpublished.push(r.id);
      }
    }
    return { published, unpublished };
  }
  /** What a lapsed player would see returning today — the win-back hook. */
  async liveContent() {
    const t = this.now();
    const all = await this.store.list();
    return all.filter(r => r.published && new Date(r.publish_at) <= t &&
      (!r.unpublish_at || new Date(r.unpublish_at) > t));
  }
  /** Build a season roadmap: evenly spaced drops from a template. */
  static planSeason({ startDate, weeks = 12, cadence, seasonId = 'S1' }) {
    const out = [];
    const start = new Date(startDate + 'T00:00:00Z').getTime();
    for (let w = 0; w < weeks; w++) {
      const kind = cadence[w % cadence.length];
      if (!kind) continue;
      out.push({
        id: `${seasonId}-w${w + 1}-${kind}`,
        kind,
        title: `${seasonId} Week ${w + 1}: ${kind}`,
        publish_at: new Date(start + w * 7 * 86400000).toISOString(),
        published: false,
      });
    }
    return out;
  }
}

/* ==================================================================== */
/* PHASE 18 — moderation                                                */
/* ==================================================================== */

export const ENFORCEMENT = {
  WARN: 'warn', SHADOW: 'shadow_queue', SUSPEND: 'suspend', BAN: 'ban',
};

/**
 * Automated abuse detection.
 *
 * The hard part of P2P moderation is that the *victim's* client is the only
 * witness. A lag-switcher stalls their own inputs while winning, which looks
 * from the outside like ordinary packet loss. So no single match convicts:
 * we require a pattern across matches against DIFFERENT opponents, which is
 * very hard to fake and very unlikely to happen by accident.
 */
export class AbuseDetector {
  constructor(opts = {}) {
    this.minMatches = opts.minMatches ?? 5;
    this.minOpponents = opts.minOpponents ?? 3;
    this.stallRate = opts.stallRate ?? 0.4;       // fraction of matches with stalls
    this.dcWhileLosingRate = opts.dcWhileLosingRate ?? 0.5;
    this.desyncRate = opts.desyncRate ?? 0.35;
    this.reportThreshold = opts.reportThreshold ?? 5;
    this.reportUniqueThreshold = opts.reportUniqueThreshold ?? 3;
  }

  /**
   * @param {object} p
   * @param {Array} p.connStats   rows from connection_stats
   * @param {Array} p.reports     rows from player_reports
   * @param {Array} p.priors      previous non-revoked enforcement rows
   */
  evaluate({ playerId, connStats = [], reports = [], priors = [] }) {
    const signals = [];
    const n = connStats.length;
    const opponents = new Set(connStats.map(c => c.opponent_id).filter(Boolean));

    if (n >= this.minMatches && opponents.size >= this.minOpponents) {
      const stalls = connStats.filter(c => (c.stall_events || 0) > 0).length;
      const stallFrac = stalls / n;
      if (stallFrac >= this.stallRate) {
        signals.push({
          code: 'lag_switch',
          detail: `input stalls in ${stalls}/${n} matches vs ${opponents.size} opponents (${(stallFrac * 100).toFixed(0)}%)`,
          weight: 3,
        });
      }
      const dcs = connStats.filter(c => c.disconnect_at_losing).length;
      const dcFrac = dcs / n;
      if (dcFrac >= this.dcWhileLosingRate) {
        signals.push({
          code: 'rage_quit_abuse',
          detail: `disconnected while losing in ${dcs}/${n} matches (${(dcFrac * 100).toFixed(0)}%)`,
          weight: 2,
        });
      }
      const desyncs = connStats.filter(c => (c.desync_count || 0) > 0).length;
      const desyncFrac = desyncs / n;
      if (desyncFrac >= this.desyncRate) {
        signals.push({
          code: 'state_manipulation',
          detail: `desyncs in ${desyncs}/${n} matches — possible memory editing`,
          weight: 4,
        });
      }
    }

    // Reports only count from distinct reporters; brigading shouldn't convict.
    const uniqueReporters = new Set(reports.map(r => r.reporter_id).filter(Boolean));
    if (reports.length >= this.reportThreshold &&
        uniqueReporters.size >= this.reportUniqueThreshold) {
      const harassment = reports.filter(r => r.reason === 'harassment').length;
      signals.push({
        code: 'community_reports',
        detail: `${reports.length} reports from ${uniqueReporters.size} distinct players` +
                (harassment ? ` (${harassment} harassment)` : ''),
        weight: harassment >= 3 ? 3 : 1,
      });
    }

    /* Recidivism matters more than any single signal. Someone caught, warned,
       suspended and caught again is a different case from a first offence with
       the same score — without this, a repeat offender could cycle suspensions
       forever and never escalate. */
    const priorStrikes = priors.filter(p => !p.revoked &&
      (p.action === ENFORCEMENT.SUSPEND || p.action === ENFORCEMENT.BAN)).length;

    const score = signals.reduce((s, x) => s + x.weight, 0) + priorStrikes * 2;
    let action = null;
    if (score >= 7) action = ENFORCEMENT.BAN;
    else if (score >= 4) action = ENFORCEMENT.SUSPEND;
    else if (score >= 2) action = ENFORCEMENT.SHADOW;
    else if (score >= 1) action = ENFORCEMENT.WARN;

    return {
      playerId, score, signals, action,
      // Anything that removes a player from the game gets a human in the loop.
      autoApply: action === ENFORCEMENT.WARN || action === ENFORCEMENT.SHADOW,
      expiresInDays: action === ENFORCEMENT.SUSPEND ? 3 : null,
      evidence: { matches: n, opponents: opponents.size, reports: reports.length },
    };
  }
}

/* --------------------------- tournaments ---------------------------- */

/** Single-elimination bracket with byes for non-power-of-two fields. */
export function buildBracket(entrants, { seed = true } = {}) {
  const players = seed
    ? [...entrants].sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0))
    : [...entrants];
  const n = players.length;
  if (n < 2) throw new Error('a bracket needs at least 2 entrants');
  const size = 2 ** Math.ceil(Math.log2(n));
  const byes = size - n;

  // standard seeding order so 1 meets 2 only in the final
  const order = [0];
  for (let round = 1; round < Math.log2(size) + 1; round++) {
    const span = 2 ** round;
    const next = [];
    for (const s of order) { next.push(s, span - 1 - s); }
    order.length = 0; order.push(...next);
  }
  const slots = order.map(i => players[i] ?? null);

  const matches = [];
  for (let i = 0; i < size; i += 2) {
    const a = slots[i], b = slots[i + 1];
    matches.push({
      round: 1, slot: i / 2,
      player_a: a?.player_id ?? null,
      player_b: b?.player_id ?? null,
      state: (!a || !b) ? 'bye' : 'pending',
      winner_id: (!a || !b) ? (a?.player_id ?? b?.player_id ?? null) : null,
    });
  }
  const rounds = Math.log2(size);
  for (let r = 2; r <= rounds; r++) {
    for (let s = 0; s < size / 2 ** r; s++) {
      matches.push({ round: r, slot: s, player_a: null, player_b: null,
                     state: 'pending', winner_id: null });
    }
  }
  return { size, byes, rounds, matches };
}

/** Advance a winner into the next round's slot. */
export function advanceBracket(matches, { round, slot, winnerId }) {
  const m = matches.find(x => x.round === round && x.slot === slot);
  if (!m) throw new Error(`no match at round ${round} slot ${slot}`);
  if (winnerId !== m.player_a && winnerId !== m.player_b) {
    throw new Error('winner is not a participant in that match');
  }
  m.winner_id = winnerId; m.state = 'complete';
  const next = matches.find(x => x.round === round + 1 && x.slot === Math.floor(slot / 2));
  if (!next) return { champion: winnerId };
  if (slot % 2 === 0) next.player_a = winnerId; else next.player_b = winnerId;
  if (next.player_a && next.player_b) next.state = 'pending';
  return { advancedTo: { round: next.round, slot: next.slot } };
}

/* ==================================================================== */
/* PHASE 19 — economy                                                   */
/* ==================================================================== */

/** Gameplay-affecting keys a cosmetic may never contain. Mirrors the SQL check. */
export const FORBIDDEN_COSMETIC_KEYS = [
  'damage', 'startup', 'active', 'recovery', 'hitstun', 'blockstun',
  'box', 'physics', 'hp', 'meter', 'scaling', 'pushHit', 'pushBlock', 'invuln',
];

/**
 * Enforce "cosmetics only". This is the technical guarantee behind the
 * promise of no pay-to-win, checked in code AND in the DB constraint so a
 * future migration can't quietly walk it back.
 */
export function assertCosmeticOnly(item) {
  const bad = [];
  const walk = (obj, path = '') => {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      if (FORBIDDEN_COSMETIC_KEYS.includes(k)) bad.push(path ? `${path}.${k}` : k);
      walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(item.payload || {});
  if (bad.length) {
    throw new Error(`store item "${item.sku}" would affect gameplay: ${bad.join(', ')}`);
  }
  return true;
}

/**
 * Cost model (Phase 19). The point is to know the break-even before the bill
 * arrives, and to know which lever actually moves it.
 */
export function projectCosts({
  dau, matchesPerUserPerDay = 4, telemetryEventsPerMatch = 12,
  rowBytes = 220, retentionDays = 30,
  freeRowsPerMonth = 2_000_000, freeStorageGB = 0.5,
  costPerMillionRows = 1.30, costPerGBMonth = 0.125,
  payerRate = 0.02, arppu = 4.50,
} = {}) {
  const matchesPerDay = dau * matchesPerUserPerDay;
  const rawEventsPerDay = matchesPerDay * telemetryEventsPerMatch;
  // 1 match row + 2 player updates + 1 aggregated summary per match
  const dbWritesPerDay = matchesPerDay * 4 + rawEventsPerDay;
  const writesPerMonth = dbWritesPerDay * 30;
  const storedRows = rawEventsPerDay * retentionDays;
  const storageGB = (storedRows * rowBytes) / 1e9;

  const billableRows = Math.max(0, writesPerMonth - freeRowsPerMonth);
  const billableGB = Math.max(0, storageGB - freeStorageGB);
  const monthlyCost = (billableRows / 1e6) * costPerMillionRows + billableGB * costPerGBMonth;
  const monthlyRevenue = dau * payerRate * arppu;

  return {
    dau, matchesPerDay,
    writesPerMonth: Math.round(writesPerMonth),
    storageGB: +storageGB.toFixed(3),
    monthlyCost: +monthlyCost.toFixed(2),
    monthlyRevenue: +monthlyRevenue.toFixed(2),
    net: +(monthlyRevenue - monthlyCost).toFixed(2),
    sustainable: monthlyRevenue >= monthlyCost,
    // the actionable part: what to change when it isn't sustainable
    levers: {
      telemetrySamplingWouldSave: +(((rawEventsPerDay * 0.9 * 30) / 1e6) * costPerMillionRows).toFixed(2),
      shorterRetentionWouldSave: +((storageGB * (2 / 3)) * costPerGBMonth).toFixed(2),
    },
  };
}

/** Break-even DAU for a given monetization assumption. */
export function breakEvenDAU(opts = {}) {
  let lo = 0, hi = 5_000_000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (projectCosts({ ...opts, dau: mid }).sustainable) hi = mid; else lo = mid;
  }
  return Math.ceil(hi);
}

/* ==================================================================== */
/* PHASE 20 — sunset                                                    */
/* ==================================================================== */

export const SUNSET_MODES = ['live', 'degraded', 'p2p_only', 'readonly', 'sunset'];

/**
 * Staged shutdown. The ordering matters: you take away the things that cost
 * money and require trust FIRST (ranked, store, telemetry), and the thing
 * players actually care about — being able to play at all — LAST, and even
 * then you replace it rather than remove it (a P2P-only build with manual
 * codes, which needs no server and can outlive the company).
 */
export const SUNSET_PLAN = [
  { mode: 'live',      matchmaking: true,  ranked: true,  store: true,  telemetry: true,
    note: 'normal operation' },
  { mode: 'degraded',  matchmaking: true,  ranked: true,  store: false, telemetry: false,
    note: 'store closed, telemetry off — cut spend, keep the game whole',
    playerMessage: 'The store is now closed. All purchased cosmetics remain yours and playable.' },
  { mode: 'readonly',  matchmaking: true,  ranked: false, store: false, telemetry: false,
    note: 'ranked frozen; ladder preserved as a historical record',
    playerMessage: 'Ranked play has ended. Final ratings are frozen and the leaderboard stays online.' },
  { mode: 'p2p_only',  matchmaking: false, ranked: false, store: false, telemetry: false,
    note: 'matchmaking servers off; direct-code P2P still works',
    playerMessage: 'Matchmaking has shut down. You can still play by sharing a connection code directly.' },
  { mode: 'sunset',    matchmaking: false, ranked: false, store: false, telemetry: false,
    note: 'database closed; final offline build published',
    playerMessage: 'Online services have ended. The final offline build is free to download and play forever.' },
];

export function sunsetStage(mode) {
  const s = SUNSET_PLAN.find(x => x.mode === mode);
  if (!s) throw new Error(`unknown sunset mode "${mode}"`);
  return s;
}

/** Is a given capability available in the current mode? */
export function capability(mode, cap) {
  return !!sunsetStage(mode)[cap];
}

/**
 * Decide whether it is time to move to the next stage. Encodes the brief's
 * own criteria: matchmaking too slow, and costs exceeding revenue.
 */
export function sunsetRecommendation({ dau, medianQueueSec, monthlyCost, monthlyRevenue,
                                       monthsUnprofitable = 0 }) {
  const reasons = [];
  if (medianQueueSec > 180) reasons.push(`median queue ${medianQueueSec}s — population too thin to matchmake`);
  if (monthlyCost > monthlyRevenue) reasons.push(`costs $${monthlyCost} exceed revenue $${monthlyRevenue}`);
  if (dau < 50) reasons.push(`DAU ${dau} below the floor for a fighting game ladder`);

  let recommend = 'live';
  if (monthsUnprofitable >= 6 && medianQueueSec > 180) recommend = 'p2p_only';
  else if (monthsUnprofitable >= 3 && monthlyCost > monthlyRevenue) recommend = 'readonly';
  else if (monthlyCost > monthlyRevenue) recommend = 'degraded';

  return {
    recommend, reasons,
    stage: sunsetStage(recommend),
    // Never surprise players. Announce, then act.
    noticeDays: recommend === 'sunset' ? 90 : recommend === 'p2p_only' ? 60 : 30,
  };
}
