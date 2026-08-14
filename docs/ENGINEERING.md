# Engineering Notes

The build log for Neon Fist, phase by phase — the design decisions, the tradeoffs,
and the bugs found along the way. The [README](../README.md) covers how to run and
play it; this covers how it was built and why.


```
neonfist/
├── db/schema.sql                 Supabase schema, RLS, Elo RPC
├── src/db/supabaseClient.js      anon + service-role clients
├── src/db/players.js             recordWin(), Elo math
├── src/shared/configLoader.js    config validation + weighted preloader
├── src/shared/integrity.js       state hashing, desync, tamper audit
├── src/server/signaling.js       WebSocket signaling + matchmaking
├── src/server/index.js           entrypoint (serves the client too)
├── public/                       the game + PWA (sw.js, manifest, icons)
│   └── data/*.json               ALL balance data lives here
└── tests/run.js                  115 tests, no live services needed
```

## Quick start

```bash
npm install
cp .env.example .env          # add your Supabase keys (optional)
psql < db/schema.sql          # or paste into the Supabase SQL editor
npm start                     # http://localhost:8787
npm test                      # 115 assertions
```

The game runs **without** Supabase — it just plays unranked and logs a skipped
DB write. Nothing hard-fails on missing keys.

---

## Phase 11 — data-driven design

Every frame value, hitbox, damage number, motion input and physics constant was
ripped out of the engine and now lives in `public/data/`:

| file | contents |
|---|---|
| `fighter.neon.json` | 7 moves × frame data, hitboxes, hurtboxes, motions, scaling, physics |
| `stage.synthwave.json` | world bounds, floor, camera tuning, palette |
| `rules.json` | round time, hitstop table, buffer/rollback windows |
| `manifest.json` | asset list with load weights |

The engine holds **zero** balance data; `applyConfig()` binds the JSON at boot.
Rebalancing a move is a JSON edit and a refresh — no code, no rebuild.

Configs are validated on load, because a typo'd `startup` silently becomes `NaN`,
every frame-data comparison goes false, and the move's hitbox just never turns on.
The validator rejects non-numeric frames, zero startup, missing hitboxes on
damaging moves, cancels into unknown moves, bad numpad directions, and — notably —
**damage scaling that increases** or **gravity scaling that decreases**, since either
one would re-introduce the infinite combos Phase 7 was built to prevent.

The preloader weights work rather than counting files (building the atlas costs
more than downloading the JSON on a mid-range phone), and progress is verified
monotonic and finishing at exactly 100%.

## Phase 12 — security & anti-cheat

**Stated plainly: a P2P browser game has no trusted client.** Anyone can open
devtools and set `hp = 999`. Nothing here makes the client trustworthy — it makes
cheating *detectable and unprofitable*:

1. Both peers hash their sim state (`hashGameState`) on an interval. The sim is
   deterministic — Phase 10 proved it bit-identical under rollback — so honest
   peers always agree.
2. Positions are quantized to 1/64px so float noise never triggers a false desync,
   while a 1-HP edit or sub-pixel teleport still changes the hash.
3. A mismatch *inside* the rollback horizon is ignored (a peer may legitimately
   correct that frame later). Only frames too old to change count, and it takes
   two confirmed mismatches to void — avoiding false positives on jitter.
4. `win_count`/`elo` are written **only** by the server, **only** via a
   `SECURITY DEFINER` RPC, and **only** when both peers' hashes agree. RLS blocks
   the browser key from touching scoring columns at all.
5. Tampered balance data is caught before it reaches the sim by `auditFighterConfig`
   (damage caps, hitbox size caps, min startup) plus a config fingerprint both
   peers compare — mismatched data makes the match unranked.

The worst outcome a cheater can force is a **no-contest**, which awards nothing.
A cheater controlling both peers can still lie; the real fix is a server-authoritative
simulation, which is a deliberate, documented tradeoff rather than an oversight.

## Phase 13 — signaling, matchmaking, database

`src/server/signaling.js` brokers the WebRTC handshake (SDP/ICE relay — the server
never inspects payloads), then gets out of the way; gameplay traffic is pure P2P.
It also arbitrates results, because neither peer can be trusted to report its own win.

Matchmaking uses an Elo band that starts at ±100 and widens 100 every 4s, so a
1600-point gap doesn't match instantly but nobody waits forever. Host role is
assigned deterministically (lower Elo hosts). Includes heartbeats for half-open
sockets, a 60-msg/10s rate limit, and message size caps.

**Database.** `record_match_result` moves `win_count`, `loss_count`, `elo`, `peak_elo`
and the audit row in one transaction with `SELECT … FOR UPDATE` in a stable lock
order. A read-then-write from the client would be both racy (concurrent wins clobber
each other) and forgeable.

Elo uses a provisional K-factor (40 for <15 matches, 24 normal, 16 at 2100+). The JS
mirror in `players.js` lets the client preview "+18/−14" before the server confirms.
I verified the JS and SQL agree across **26,244 rating combinations** — `Math.round`
rounds half toward +∞ while Postgres `round()` rounds half away from zero, so
negative deltas were a real divergence risk. Zero mismatches.

## Phase 14 — PWA & deployment

`manifest.webmanifest` + `sw.js` give fullscreen home-screen install (no URL bar).
Cache strategy is split on purpose: the app shell is cache-first so it boots offline
instantly, but `data/*.json` is **network-first** so a balance patch actually reaches
players instead of being pinned forever by an immutable cache. `/ws` and `/health`
are never cached.

`Dockerfile`, `deploy/fly.toml`, `deploy/render.yaml` included. Note `auto_stop_machines
= false`: a stopped machine drops live WebSockets mid-match. The in-memory queue means
**one region only** until it's moved to Redis.

---

## Verification

```
115/115 backend assertions pass
```

Beyond unit tests, I verified the real thing in headless Chrome:

- the client boots from JSON config, preloader reaches 100%, **60 FPS** sustained,
  combat and particles running, no page errors
- state hashing is stable across calls and detects an `hp = 999` edit live in-page
- **two real browsers** matched through the server, exchanged SDP/ICE, opened a
  genuine WebRTC data channel, sent peer-to-peer data, and the verified result
  reached the DB layer with `verified: true`

### Bugs found and fixed during this phase

1. **`configFingerprint` was blind to the tampering it existed to detect.**
   `JSON.stringify(cfg, Object.keys(cfg).sort())` applies a replacer *array* at
   every nesting depth, silently dropping nested keys — so edited `damage` and
   hitbox values produced an identical fingerprint. Replaced with a proper
   recursive `canonicalJSON`, plus a regression test for a single nested edit.
2. **Module scope broke debug access.** Converting to `<script type="module">`
   correctly removed the engine from `window`, which also removed console
   inspection. Added an explicit `window.NEON` namespace — inspection-only, and
   still covered by the state hash, so poking it voids the match rather than
   granting an advantage.

### Known limitations

- The queue is in-memory: single instance only until it moves to Redis.
- No auth UI yet; `players.id` references `auth.users(id)`, so wire up Supabase
  Auth before going live.
- `db/schema.sql` was verified by JS/SQL parity analysis and a behavioural mock,
  **not** executed against a live Postgres (none available in this sandbox). Run it
  against a real project before trusting it in production.

---

# Phases 15–20 — Live Ops

```
db/schema_liveops.sql          telemetry, OTA, moderation, economy, sunset
src/shared/telemetry.js        batched client SDK + rollups + retention/funnel
src/shared/liveconfig.js       OTA patching, A/B bucketing, kill switch
src/server/liveops.js          content, abuse detection, brackets, costs, sunset
src/server/liveopsStore.js     in-memory store (swap for Supabase in prod)
src/server/liveopsRoutes.js    /api/* surface
```

## Phase 15 — telemetry & combat analytics

Two constraints shaped this: it must not cost **frames**, and it must not cost **rent**.

- Events go into a pre-allocated 256-slot ring buffer — recording a hit allocates
  nothing and does no I/O. Overflow is counted, never allowed to grow unbounded.
- A whole match compresses to **one** `match_summary` row with per-move counters,
  instead of one row per punch. Raw events are sampled (10% default); funnel,
  summary and error events bypass sampling because losing those loses the signal.
- `balanceReport()` emits the flags a designer acts on: spam candidates, moves
  that are too safe, dead moves, and over/under-tuned characters.
- `computeRetention()` gives D1/D7/D30; `funnelDropoff()` shows step conversion
  and exactly where players die (in the test fixture: the matchmaking screen).

**Bug found:** usage share was computed globally across all characters, so a move
looked "dead" purely because a *different* character was played more that week.
Share is now per-character — of everything this character throws, how much is this
move? The dead-move rule was also unfireable (it required ≥50 uses *and* ≤1.5%
share, needing 3,333+ attacks to trigger); it now gates on sample size instead.

## Phase 16 — OTA balance patches, A/B, kill switch

The netcode dictates the design. This is deterministic lockstep with rollback, so
**two peers on different frame data desync instantly**. Therefore:

- config is fetched once at boot and **pinned for the session**;
- a patch arriving mid-session is staged and applied only at a safe point
  (menu/post-match) — `applyPending('in_match')` is refused, and that's tested;
- patches are **sparse** (`{moves:{punch:{startup:5}}}`), so a hotfix is a few
  hundred bytes and every rollout has a precomputed inverse via `invertPatch()`.

An OTA patch is remote code for the simulation, so it runs the full validator and
the Phase 12 tamper audit before adoption. A patch with `damage: 9999` or
`startup: 0` is **rejected and the engine keeps the safe values** — verified.

Bucketing is deterministic from `fnv1a(playerId + experimentId)`, so a player gets
a stable variant across devices with no server-side state on the hot path
(measured: 50/50 splits land within ±5%, 10% rollouts within ±3.5%).

Failure is non-fatal by design: **server → cache → bundled**. A balance server
outage must never stop someone playing.

## Phase 17 — content cadence

`ContentScheduler` is clock-driven and idempotent (safe on a cron), not
deploy-triggered — a pipeline that only fires on deploy silently misses its window
whenever nobody ships that day. `planSeason()` generates a dated drop schedule.

## Phase 18 — moderation & tournaments

The hard part of P2P moderation: the **victim's client is the only witness**, and a
lag-switcher looks exactly like ordinary packet loss. So no single match convicts —
signals must repeat across matches against **different opponents**, which is hard
to fake and unlikely by accident. Verified: 8 bad matches against *one* opponent
produces **zero** signals.

Reports only count from **distinct reporters**, so brigading fails (8 reports from
one account → no action; 6 from 6 accounts → action). Anything that removes a
player (suspend/ban) is queued for **human review**, never auto-applied.

**Gap found:** the detector ignored prior offenses, so a repeat offender could
cycle suspensions forever and never escalate. Added recidivism weighting — and
*overturned* strikes correctly don't count.

Brackets support byes for non-power-of-two fields and standard seeding (1v8, 4v5,
2v7, 3v6 — top seeds can only meet in the final), with spectator keys per match.

## Phase 19 — economy

`assertCosmeticOnly()` walks the payload at **every depth** and rejects anything
touching damage/frames/hitboxes/physics — mirrored by a SQL `CHECK` constraint so a
future migration can't quietly introduce pay-to-win. Purchases are **idempotent** on
the provider reference, so a webhook replay never double-charges or double-grants.

Cost projection (this model, default assumptions):

| DAU | writes/mo | storage | cost/mo | rev/mo (2%×$4.50) |
|---|---|---|---|---|
| 1,000 | 1.9M | 0.3GB | $0 | $90 |
| 25,000 | 48M | 7.9GB | $61 | $2,250 |
| 100,000 | 192M | 31.7GB | $251 | $9,000 |

At 100k DAU, 10% sampling + 10-day retention cuts $251 → **$79**.

**Being honest about this model:** at pessimistic conversion (0.1% × $2) 100k DAU
goes **underwater** ($200 rev vs $251 cost). It also excludes egress, Stripe fees
(~2.9%+30¢) and human time — which dominate long before Postgres rows do. Database
cost is *not* the thing that kills this game; conversion rate is.

## Phase 20 — the sunset

Staged shutdown, ordered so the things that cost money and require trust go first
and the ability to *play* goes last — and even then it's replaced, not removed:

`live → degraded` (store+telemetry off) `→ readonly` (ranked frozen, ladder kept)
`→ p2p_only` (matchmaking off, direct codes still work) `→ sunset` (final offline build).

Capability gating is enforced **server-side**: in `degraded` mode `/api/store` returns
**503 with a player-readable message**, so hiding the button client-side isn't the
control. A test asserts capabilities are **monotonic** — nothing is ever re-enabled
after being disabled. Players keep a working data export at every stage.

## Verification

```
277 backend assertions pass
```

Plus, in real headless Chrome against the real server:

| scenario | result |
|---|---|
| baseline boot | `base`, punch startup 4, no errors |
| OTA patch @100% | `hotfix-1`, startup **9**, damage 3 |
| does the *sim* honour it? | hitbox inactive before frame 9 ✓ |
| kill switch | reverts to `base:killswitch`, startup 4 |
| config server unreachable | falls back to bundled, **still playable** |
| telemetry round-trip | 30 punch uses landed in `/api/analytics/balance` |

Engine guarantees re-verified after all of it: determinism **PASS**, rollback
**bit-identical** at depths 4 and 7.

### Bugs found and fixed in this phase

1. **OTA patches silently did nothing.** The server fingerprinted the *sparse
   patch* while the client fingerprints the *merged* config, so every patched
   client failed its integrity check and fell back to cache — looking like the
   patch never shipped. Only caught by testing in a real browser; the unit tests
   passed either way. Now fingerprints the resolved config, with chained-patch
   resolution and a regression test.
2. **The service worker made the kill switch inert.** `/api/config` fell through to
   the cache-first app-shell rule, permanently pinning the first balance config a
   player ever received. The one control that must always work was disabled by a
   caching rule. `/api/*` is now never cached.
3. Plus the analytics and recidivism issues noted above.

### Known limitations

- `liveopsStore.js` is in-memory: restarting the server clears telemetry,
  tournaments and config versions. It implements the same interface as the SQL, so
  a Supabase-backed store drops in — but that adapter isn't written yet.
- `db/schema_liveops.sql` has **not** been executed (no Postgres in this sandbox),
  same caveat as the Phase 13 schema.
- Admin routes have **no authentication**. Anyone who can reach `/api/admin/*` can
  ship a balance patch or sunset the game. Put these behind auth before deploying.
- Retention is computed from telemetry activity rows, not a real cohort job.
