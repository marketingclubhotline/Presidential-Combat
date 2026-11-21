# Nov 21 — articulated flip/uppercut repair

## Diagnosis
- All 40 existing SVG files (32 forward/back flip frames for Trump and Kim; 8 Trump uppercut poses) are present and valid XML.
- All five Higgsfield contact sheets are present in `public/art/higgsfield-concepts`, but are reference images, not transparent frame-by-frame combat sprites; there is no evidence that re-downloading alone solves integration.
- `pcFlipArt` deliberately returned `null` for p1, forcing the rigid cutout rotation; `pcUppercutArt` similarly returned null for p1, forcing fallback PNG transforms. Those guards were the confirmed code blockers.

## Repair
- Removed both p1 guard clauses. Existing SVG pose sequences now load for both fighters' directional flips and for Trump's rising uppercut, with graceful fallback during load.
- Presentation only; preserved combat timing, hitboxes and replay logic.
- The SVGs are interim stylized prototype art, not approved Higgsfield-quality final art; visual review and frame cleanup remain required.

## Verification
- 40 SVGs XML-parse successfully.
- One inline JS bundle extracted from `public/index.html`: node --check succeeds.
- npm test: 353 passed, 0 failed.
- Safari visual review not yet completed; do not report as approved.
- GitHub push currently blocked (origin developerrutu/neon-fist; authenticated account marketingclubhotline -> 403). Local commits preserved.

## Next
1. Verify the running browser actually displays all eight frames of each move, confirm footprint scale, pivot and no wobble; rework artwork as needed.
2. Convert approved Higgsfield frames into consistent transparent silhouettes and substitute for prototypes.
3. Integrate user-uploaded ElevenLabs sitcom laughter after transferring audio file to game's public/audio/crowd directory.
4. Complete and test four-fighter build, publish test deployment after confirming credentials/permissions.
