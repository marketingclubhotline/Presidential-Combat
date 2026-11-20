# Presidential Combat — approved multi-frame kick reference
Status: APPROVED FOR BUILD; do not mark artwork complete until visually tested.

Reference: user's three Bruce Lee: Iron Fist (Java/J2ME) screenshots, 2026-11-19. Use as motion inspiration only; do not copy copyrighted sprites or art.

## Required moves
1. Spinning roundhouse: planted foot pivots, bent knee chambers, hips/torso turn, leg extends across strike, then retracts and completes 360-degree recovery. Distinct hand-drawn or rigged keyframes, never a single flattened sprite.
2. High crescent kick: leg sweeps from low to high along a visible arc, upper-body counterbalance, then returns to stance.
3. Low sweep: deep crouch with one leg extended near ground and a low horizontal foot streak.
4. Descending aerial kick: raised knee and extended striking leg descend, land, and recover. Distinct from rising uppercut.
5. Each move needs anticipation, contact, follow-through, recovery, and a recognizable silhouette.

## Energy trails and visual feedback
- Attach a short fading curved streak to the actual foot/fist trajectory during active frames, not to the center of the sprite.
- Trump: red and gold; Kim: fiery orange; Obama: blue and white. Give other fighters distinct restrained palettes as introduced.
- Strong impacts use existing hitstop and camera shake; no new shadows.
- Effects must not obscure fighters, hitboxes, health bars, or mobile controls.

## Gameplay and balance
- Separate startup, active, and recovery timing; different range and speed for each kick.
- Collision must correspond to the visible limb; don't make cosmetic art change gameplay silently.
- Preserve projectile counterplay, high jump clearance, guard reactions, airborne tumble, ground bounce/roll, and character-specific signature recovery.
- Trump hat only appears during hat throw on top of head, never as permanent face bandana.

## Acceptance
- Test walking both directions with alternating legs; verify actual kick keyframes, impact streak tracking, and recovery at 60fps on iPhone.
- Test both facing directions and all character sizes; ensure no cardboard flash or pose popping.
- Save a checkpoint and run tests before merging; do not deploy to production without visual approval.
