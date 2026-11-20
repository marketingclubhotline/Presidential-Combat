# Neon Fist upstream reuse audit — 2026-11-19
Original source: origin/main (https://github.com/developerrutu/neon-fist), MIT license.
Verified from `git show origin/main:public/index.html` and upstream README:
- `spinKick` uses cells 33,34,35,36 with separate startup/active/recovery frame indices.
- `jumpKick` uses cell 17 only (not a full articulated flip).
- The template includes a programmatic sprite sheet, uppercut, fireball, and frame-based attack state machine.
- No dedicated forward-flip or backward-flip animations were found in upstream index.html.

Plan:
1. Reuse existing spinKick and jumpKick animation sequencing and hitbox timings as shared motion foundations.
2. Add shared authored forward/backward flip sequences (tuck, inversion, extension, landing) with variations in pacing per fighter. Current whole-sprite rotation is only a placeholder.
3. Use shared kick frames (roundhouse, crescent, sweep, descending) and varied timing/pose for individual fighters; preserve character-specific signature animations.
4. Ensure movement directions are relative to facing, jump+kick interrupts flip into aerial kick, and recovery/evade works on mobile multi-touch.
5. Avoid copying art from unrelated commercial fighting games. Validate licenses for any additional assets.
6. Test and approve visually before production deployment.

## Implementation checkpoint
- Wired roundhouse to upstream `spinKick` four-cell animation and its active frame cycling, with regression tests.
- This improves the original atlas fallback; the current Trump/Kim custom sprite path still needs separate articulated artwork and visual approval.
- Do not assume the original game has multiple fighter-specific style sets: it primarily supplies shared procedural animation cells.
- 326 automated tests passed after this change; no production deployment.
