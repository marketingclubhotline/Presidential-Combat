# Roundhouse — back + kick / double-tap kick, power-gathering windup

User wants simultaneous facing-relative BACK + KICK to activate roundhouse, with slower anticipation, visible torso/hip rotation, power gathering, and full-body follow-through. Double-tap KICK is also supported as an alternate shortcut. DOWN + KICK remains the low sweep.

Verified `public/index.html` already uses `backHeld=dir!==0 && dir===-this.face` and `MOVES.roundhouse && (backHeld || this.buf.doubleTapped('kick'))`, so no new control binding was needed. Existing eight-frame Trump/Kim roundhouse PNGs are in `public/art/sprites`.

Changed `public/data/fighter.neon.json`: roundhouse startup 16->22 frames, active 11->12 frames; charge cue extended to frame 16. Existing 25-frame recovery unchanged. Updated `pcRoundhouseArt` to explicitly show frames 1-4 through startup (coil/pivot/chamber), 5-6 during active kick contact, 7-8 through follow-through and recovery. This aligns visible kick extension with hitbox timing and makes windup more deliberate; no invented physics changes.

QA: 353 tests passed, 0 failed. Existing eight PNG frames are used; their anatomical distinctness and quality are NOT yet verified visually. Next iPhone test: check BACK + KICK for both fighters when switching sides, double-tap KICK, power-gathering pivot, visible kick extension at contact, recovery, and thumb controls. Verify startup is not too slow. No push to unverified GitHub remote.

Resume prompt: Read this checkpoint and `design/roundhouse-animation-acceptance.md`, inspect the current game branch and source, visually test both fighters and side switching. If roundhouse still looks like a cardboard turn, create/replace true articulated or individually illustrated rotational poses; do not claim an animation is complete solely because timing tests pass. Commit all changes and checkpoint locally, push only to a verified writable game GitHub repository.
