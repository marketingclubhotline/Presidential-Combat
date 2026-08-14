<div align="center">

# ⚡ NEON FIST

**A 60 FPS 2D fighting game that runs in your browser.**
Rollback netcode · deterministic physics · no game engine · no build step · no external assets.

[![MIT License](https://img.shields.io/badge/license-MIT-8b7bff.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-277%20passing-37d67a.svg)](#running-the-tests)
[![No dependencies](https://img.shields.io/badge/client%20deps-0-38f0d0.svg)](#how-it-works)

</div>

---

## What is this?

Neon Fist is a complete, playable fighting game — and the entire live-service
stack behind it. It's a Street Fighter-style 1v1 with special-move motion inputs,
combo cancels, frame data, and peer-to-peer online play with rollback netcode.

The unusual part: **the client has zero dependencies and loads zero external
assets.** The character sprite sheet is drawn programmatically into a canvas at
boot, the music and sound effects are synthesized with the Web Audio API, and the
whole game is one HTML file. Nothing is downloaded from a CDN. It runs offline.

<div align="center">

*Two fighters, a synthwave rooftop, and a fireball crossing the screen.*

</div>

### Features

**The game**
- 7 moves with real frame data — startup / active / recovery, per-frame hitboxes
- 3 special moves with motion inputs: **↓↘→+P** fireball, **→↓↘+P** invincible
  uppercut (dragon punch), **↓↙←+K** spin kick
- Combo cancels: land a normal, cancel its recovery into a special
- Damage scaling + rising gravity during combos, so infinites can't exist
- High / low / overhead guard rules — crouch-blocking loses to jump-ins
- 10-frame input buffer so a move queued during recovery still comes out
- Hit stop, screen shake, a camera that zooms with fighter separation, particles
- CPU opponent that spaces, blocks reactively, anti-airs, and punishes whiffs
- Touch controls: multi-touch virtual D-pad, installable to a phone home screen

**Online**
- Peer-to-peer WebRTC with **rollback netcode** (verified bit-identical re-simulation)
- Elo matchmaking through a Node signaling server
- State-hash verification — desynced or tampered matches are voided, not ranked

**Live ops**
- All balance data lives in JSON — tune the game without touching engine code
- Over-the-air balance patches with A/B rollouts and a kill switch
- Telemetry, combat analytics, retention funnels
- Automated moderation, tournament brackets, cosmetic-only store, staged sunset plan

---

## 🎮 Play it right now

The fastest path — no install, no Node, no database:

```bash
git clone https://github.com/developerrutu/neon-fist.git
cd neon-fist
python3 -m http.server 8080 --directory public
```

Open **http://localhost:8080** and hit **ENTER THE RING**.

> **Why a server instead of opening the file?** The game loads its balance data
> with `fetch()`, which browsers block on `file://` URLs. Any static server works.

### Controls

| Action | Player 1 | Player 2 |
|---|---|---|
| Move | `A` / `D` | `←` / `→` |
| Jump | `W` | `↑` |
| Crouch | `S` | `↓` |
| Punch | `J` | `1` |
| Kick | `K` | `2` |
| Block | `L` | `3` |

**Special moves** (directions are relative to the way you're facing):

| Move | Input | Notes |
|---|---|---|
| 🔥 Fireball | `↓` `↘` `→` + Punch | Projectile, safe at range |
| 👊 Uppercut | `→` `↓` `↘` + Punch | Invincible on startup — beats jump-ins |
| 🌀 Spin Kick | `↓` `↙` `←` + Kick | Multi-hit, moves you forward |

**Combo tip:** land a punch, then immediately input a fireball motion — the punch's
recovery cancels straight into the special. That's the core of the combo system.

**On-screen buttons:**

| Button | What it does |
|---|---|
| `HITBOX` | Debug view — red hitboxes, blue hurtboxes, live frame counter (`STARTUP/ACTIVE/RECOVERY`) |
| `DIAG` | FPS, particle pool usage, atlas VRAM, netcode stats |
| `PAD` | Force the touch D-pad on (auto-enables on mobile) |
| `CPU` | Toggle the AI off for local 2-player |
| `SOUND` | Mute |
| `NETPLAY` | Online play (see below) |

Keyboard shortcuts: `H` hitboxes · `G` diagnostics · `P` pause · `Enter` rematch.

> **Mobile:** open the URL on your phone (same Wi-Fi, use your machine's LAN IP)
> and use *Add to Home Screen*. It installs as a fullscreen app with no URL bar.

---

## 🌐 Playing online

**Option A — no server needed.** Click `NETPLAY` → **HOST**, send the generated
code to a friend, they paste it and send their answer code back. That's a direct
WebRTC connection between the two browsers.

**Option B — matchmaking.** Run the full server (below) and players are paired
automatically by Elo rating.

To test rollback without a second device, click `NETPLAY` → **LOCAL LOOPBACK TEST**.
It opens two real peer connections in one tab at a simulated 90 ms ping.

---

## 🛠 Full setup (server + matchmaking)

Needs **Node.js 18+**.

```bash
git clone https://github.com/developerrutu/neon-fist.git
cd neon-fist
npm install
npm start
```

Open **http://localhost:8787**. This serves the game *and* runs matchmaking,
telemetry, and the live-ops API.

The database is **optional** — with no Supabase keys the game runs fine, it just
plays unranked and logs that it skipped the DB write.

```bash
npm test     # 277 assertions, no live services required
```

---

## 🗄 Setting up your own Supabase (optional)

Only needed if you want persistent accounts, win/loss records and ranked Elo.

**1. Create a project** at [supabase.com](https://supabase.com) (the free tier is
plenty to start).

**2. Run the schema.** Open the **SQL Editor** in your Supabase dashboard and run
these two files, in order:

```
db/schema.sql            -- players, matches, Elo, row-level security
db/schema_liveops.sql    -- telemetry, OTA config, moderation, store, sunset
```

**3. Get your keys.** In the dashboard: **Project Settings → API**. You need three
values.

**4. Create your `.env`:**

```bash
cp .env.example .env
```

```ini
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...          # safe in the browser — RLS protects it
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...  # SERVER ONLY — never ship to a client
PORT=8787
```

> ⚠️ **The service-role key bypasses all security.** Never put it in client code,
> never commit it. `.gitignore` already excludes `.env`.

**5. Restart:** `npm start` — you should now see `(db connected)`.

### How the security model works

The browser key is **read-only for anything that matters**. Row-level security
means a player can read the leaderboard but *cannot* write their own `win_count`
or `elo`, even by calling Supabase directly from the devtools console. Every score
change goes through a `SECURITY DEFINER` function that the server invokes, and
which updates the winner, the loser, and the audit row in a single transaction.

In online matches both players submit a hash of their final game state. If the
hashes disagree — desync or tampering — **the match is recorded but scores
nothing**. The worst a cheater can force is a no-contest.

---

## ⚖️ Rebalancing the game (no code required)

Every frame value lives in [`public/data/fighter.neon.json`](public/data/fighter.neon.json).
Want a slower punch?

```json
"punch": {
  "startup": 4,      ←  change to 6
  "active": 3,
  "recovery": 9,
  "damage": 7
}
```

Refresh. That's it. The engine holds **zero** hardcoded balance data.

Configs are validated on load, so a typo fails loudly with a readable error
instead of silently producing a move whose hitbox never activates. The validator
also rejects changes that would break the game's math — such as damage scaling
that *increases* over a combo, which would reintroduce infinite combos.

| File | Contains |
|---|---|
| `data/fighter.neon.json` | Frame data, hitboxes, hurtboxes, motions, physics, scaling |
| `data/stage.synthwave.json` | World bounds, floor height, camera tuning, colours |
| `data/rules.json` | Round time, hit-stop table, input buffer, rollback window |

---

## 🚀 Deploying

Included: `Dockerfile`, `deploy/fly.toml`, `deploy/render.yaml`.

```bash
docker build -t neon-fist . && docker run -p 8787:8787 --env-file .env neon-fist
```

Two deployment gotchas worth knowing:

- **Don't scale to multiple instances yet.** The matchmaking queue is in-memory, so
  two instances means two separate queues. Move it to Redis first.
- **Don't let the host sleep idle machines** (`auto_stop_machines = false` in
  `fly.toml`) — a stopped machine drops live WebSocket connections mid-match.

You can also host just the `public/` folder on any static host (GitHub Pages,
Netlify, Cloudflare Pages). You lose matchmaking and ranked, but the game, the CPU
opponent, local 2-player and manual-code netplay all still work.

---

## How it works

A few design decisions that shaped everything else:

**The simulation is deterministic.** Fixed 60 Hz accumulator loop, seeded RNG, no
floating-point drift in the game state. `Math.random()` is banned in simulation
code and reserved for visual effects only. This is what makes rollback netcode
possible: both machines running the same inputs produce byte-identical results.

**Rollback, not delay.** When a remote input arrives late, the game restores a
snapshot, replays the intervening frames with corrected inputs, and catches up —
all within one frame, with audio muted during re-simulation so you never hear it.
The test suite verifies re-simulation is bit-identical to a clean run.

**Animation is driven by frame data, not the other way around.** The drawn fist and
the active hitbox change on the same frame by construction, because both read the
same counter.

**Nothing is loaded over the network.** The sprite atlas is generated at boot and
packed into a single trimmed texture (74 frames, 88.5% fill — 4.2 MB instead of
14.9 MB for a naive grid). Audio is synthesized. This is why it works offline and
why the in-app preview renders correctly with no assets.

**Nothing allocates during gameplay.** Particles come from a fixed 420-object pool,
audio nodes are pooled, and telemetry writes into a pre-allocated ring buffer.
A 60-second match moves the JS heap by ~130 KB, so the garbage collector never
stutters mid-combo.

```
neon-fist/
├── public/
│   ├── index.html              the entire game (~90 KB, no deps)
│   ├── data/*.json             all balance data
│   ├── shared/*.js             modules shared with the server
│   └── sw.js                   service worker (offline + PWA)
├── src/
│   ├── db/                     Supabase client, Elo, win recording
│   ├── server/                 signaling, matchmaking, live-ops API
│   └── shared/                 config validation, integrity, telemetry
├── db/*.sql                    Postgres schema + row-level security
└── tests/                      277 assertions, zero live services needed
```

---

## 📖 Deeper reading

[**docs/ENGINEERING.md**](docs/ENGINEERING.md) is the full build log — every phase,
the design tradeoffs, and the bugs found while building it (including three that
only showed up when tested in a real browser).

## Running the tests

```bash
npm test
```

Covers Elo math, RLS enforcement, config validation, state hashing, desync
detection, matchmaking, telemetry rollups, OTA patching, moderation, brackets,
and the sunset state machine — with no database or network required.

The engine's two core guarantees are verified separately by re-simulating
900-frame matches: **determinism** (identical inputs → identical state) and
**rollback equivalence** (bit-identical after 300+ forced rollbacks).

---

## Known limitations

Being straight about what isn't finished:

- **`/api/admin/*` has no authentication.** Anyone who can reach those routes can
  ship a balance patch or sunset the game. Put it behind auth before exposing it.
- **The live-ops store is in-memory.** Restarting the server clears telemetry,
  tournaments and config versions. The interface is defined and the in-memory
  version is the reference implementation, but the Supabase adapter isn't written.
- **The SQL schemas have never been executed against a real Postgres.** They were
  developed against a behavioural mock and verified by JS↔SQL parity analysis
  (26,244 Elo combinations, zero divergence). Run them on a real project before
  trusting them in production.
- **Matchmaking is single-region** until the queue moves to Redis.
- **One character.** `neon` fights `neon` in different colours. The data format
  supports more; nobody has drawn them.
- There's no auth UI — `players.id` references `auth.users(id)`, so wire up
  Supabase Auth before going live.

---

## License

**MIT** — see [LICENSE](LICENSE).

Clone it, fork it, change whatever you want, ship your own version, sell it.
No permission needed, no attribution required beyond keeping the licence file.
Pull requests welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
