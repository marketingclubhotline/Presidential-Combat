# Presidential Combat — four-fighter core production checkpoint (2026-11-21)

## Approved priority and deadline
- Deliver a playable four-fighter build within 24 hours of this session; prioritize working game over speculative feature expansion.
- Finish and verify the shared core animation/movement system across fighters first; then implement each fighter's previously specified ten unique/super moves, poses, and kicks one fighter at a time, using the existing design notes as source of truth.
- Correct Trump's uppercut: sharp full-body twist into a rising strike, distinct multi-frame body poses and timed impact effects; a jump plus forward punch is NOT acceptable.
- Correct forward/backward flips with actual articulated multi-frame poses, not rotating a rigid cardboard cutout. Preserve already-approved kick and flip improvements.
- Integrate existing Higgsfield concept sheets through frame cleanup, transparency, sprite timing, state transitions, hitbox verification, and Safari playtesting; do not regenerate approved art unnecessarily.
- Sync impact pause, slow motion, finishing comedy poses, and sound. User is separately sourcing layered 1990s sitcom-style laughter; do not claim installed until file exists and is tested.
- Burn approved requirements and implementation checkpoints into repository commits as work progresses. Verify push/deployment rather than assuming either.

## Verified at session resumption
- Working repo: /Users/jpsstudio/PresidentialCombat/presidential-combat-dev
- Branch: dev/aerial-kicks-20261120; base commit before this note: 6a9ad71.
- npm test: 353 passed, 0 failed (2026-11-21 session).
- Trump and Kim playable according to previous handoff; four-fighter gameplay not yet verified.
- Five Higgsfield concept sheets imported for review; combat-sprite integration still pending.
- Preserve untracked design/higgsfield and design notes; do not discard or overwrite.

## Next execution gate
1. Inspect existing shared fighter states and sprite pipeline; implement reusable frame-based uppercut/flip animation without breaking controls.
2. Wire and test existing Higgsfield sheets; inspect visual output in Safari and validate hitboxes.
3. Add fighters three and four on the same core, then integrate the ten unique features for each in recorded design order.
4. Run automated tests, record visual playtest findings, commit each coherent change, verify remote push and playable deployment.
