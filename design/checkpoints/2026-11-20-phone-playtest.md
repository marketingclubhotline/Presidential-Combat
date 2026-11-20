# Presidential Combat — November 20 phone playtest checkpoint

## User-confirmed observations
- Trump walking improved, but backward walk resembles moonwalking.
- Kim P2 faces away from opponent in combat and character selection.
- Trump kick improved and several new moves are visible.
- Directional flips still look like rotating cardboard; previously planned multi-frame flip art not visible.
- Roundhouse and super uppercut artwork not sufficiently distinct; basic uppercut is unacceptable.
- Airborne knockback, falling, ground impact, bounce, get-up and flip-up recovery do not read clearly.
- KO loser appears to fall off screen instead of lying on the stage.

## Changes committed this session
- dc7f299: remove double reversal of P2 visual facing; anchor KO fall rotation nearer body center; constrain KO position.
- Previous commits: fbfd92a (subtle head enlargement), 1fbf70b (airborne phases/recovery).
- 345 automated tests passed after dc7f299; no visual browser approval.

## Confirmed blockers and remaining work
- 16-frame directional flip loader exists, but there are ZERO *flip* files in public/art/sprites. Supply/create real forward/back sprite sheets and verify all 16 poses for each fighter.
- Roundhouse art files exist (16 across Trump/Kim), but must verify actual phase transitions visually.
- Aerial kick assets exist; verify flip-to-kick transitions and landing.
- Inspect selection screen facing separately from match renderer.
- Improve uppercut frame artwork, launch arc and defender airborne physics/reactions.
- Improve backwards gait and KO/ground recovery with grounded whole-body authored sprites.
- Test in phone viewport and ensure no clipping or falling outside stage.
- Check existing branches before cherry-picking; dev/aerial-kicks-20261120 already includes dev/playable-baseline-20261114 and main ancestry.
- Keep main/production unchanged until user visual approval; do not claim release-ready.

## Resume
Branch: dev/aerial-kicks-20261120
Latest commit: dc7f299
Repo: ~/PresidentialCombat/presidential-combat-dev
Test: npm test
Server previously returned HTTP 200 at http://127.0.0.1:8787/
