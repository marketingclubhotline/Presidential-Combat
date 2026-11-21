# Eight-fighter release gap — verified Nov 20

## Critical finding
- The current character-select HTML exposes only **Trump and Kim** as `.roster-card.active` combat selections.
- The code explicitly states: `Character selection: preview only for now; combat roster stays fixed to preserve deterministic netplay.`
- Other named legends are `.roster-card.locked` preview entries and the `PC_LEGENDS` data labels many `prototypeStatus: design only; not playable`.
- Current `public/art/sprites/` filename prefixes show Trump and Kim sprite sets; other fighters' sprites are not established there.
- Some other characters have stage music and/or voice assets; that does **not** establish playable fighter support.
- Therefore do not represent the build as eight playable fighters until implemented and device-tested.

## Release requirements from owner
- Eight actually selectable/playable fighters by Saturday night, Nov 21.
- Family-watchable political parody: cartoon stars, daze, non-graphic personality-driven finishers, exaggerated landing poses, no gore.
- Reuse common attack animation skeletons when needed; unique face/costume/pose, a few distinct traits and stage cues take priority.
- Eight-fighter local play must be validated before marketing a multiplayer tournament. Online multiplayer must be separately tested; existing netplay assumptions may break if roster selection changes.

## Shortest safe execution order
1. Preserve a working two-fighter baseline and tests.
2. Extract fighter-specific configuration from hard-coded P1/P2; add a roster mapping with eight entries and placeholder status flags that never misrepresent readiness.
3. Implement one additional fighter end-to-end with real sprites, collision, audio, selection and opponent handling; run tests and Safari playtest.
4. Replicate the validated pipeline for remaining five, using shared moves with individually identifiable art.
5. Add cartoon KO stars and humorous, non-graphic finishers after the core selection and matches work.
6. Run actual 8-character matchup smoke tests, touch/audio/landscape tests and iOS wrapper tests.
7. Package, sign and upload through Xcode; Apple approval/public availability not guaranteed.

## Scope caution
Do not claim all eight are playable, or promise eight will be complete, solely because manifests/music/previews exist. Keep release eligibility tied to tested gameplay.
