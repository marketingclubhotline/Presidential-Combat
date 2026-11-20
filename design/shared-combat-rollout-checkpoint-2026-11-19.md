# Shared combat rollout checkpoint
User approved priorities 1–5 and full universal feature contract.

## Verified this session
- Shared library contract at `public/data/shared-combat-library.json` covers movement, strikes, defense, grappling, reactions, effects, rules, controls and presentation. Planned entries are not playable merely because they are listed.
- Neon Fist four-cell spinning kick reused by roundhouse animation path; custom presidential art still needs articulated frames.
- Right-side JUMP and directional aerial flip placeholder added in prior session; flip state now resets on landing and is serialized for rollback.
- Existing auto-facing logic handles cross-up side switching outside locked attack frames.
- 334 automated tests pass; JavaScript syntax and diff whitespace checks pass.

## Next implementation gates (not complete)
1. Real forward/back walk and flip artwork, attack-to-air-kick and landing transitions; inspect on iPhone.
2. Throw/grab/throw-break input, attack collision, animation, CPU behavior, rollback-safe state and balance.
3. Light/heavy attacks, corner escape and cross-up gameplay tests; adjust reach to match each silhouette.
4. Visual + gameplay acceptance on Trump versus Kim, including multi-touch, sprite alignment and projectile clearance.
5. Reusable sprite packs for remaining fighters; several roster entries are currently selection/design only, not playable.
6. Only after universal combat passes, character-exclusive supers, finishers, voices and country arenas.

Do not claim production readiness or deploy without visual approval. Do not add new ground shadows (user specifically declined them).
