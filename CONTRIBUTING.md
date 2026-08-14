# Contributing

This project is MIT licensed — clone it, fork it, ship your own version, sell it.
No permission needed.

## Before you open a PR

```bash
npm test          # 277 assertions, no live services required
```

Two invariants matter more than anything else. If a change breaks either, the
game is broken even if it looks fine on screen:

1. **Determinism.** The simulation must produce identical state from identical
   inputs. `Math.random()` is banned in simulation code — use the seeded `Rng`.
   Anything else desyncs netplay.
2. **Rollback equivalence.** Re-simulating after a rollback must produce
   bit-identical state to a clean run.

Balance changes usually need no code at all — edit `public/data/fighter.neon.json`.

## Good first issues

- A Supabase-backed `liveopsStore.js` (interface already defined, in-memory
  version is the reference implementation)
- Auth on `/api/admin/*` — currently unprotected
- A second fighter with a different moveset
- Move the matchmaking queue to Redis for multi-region
