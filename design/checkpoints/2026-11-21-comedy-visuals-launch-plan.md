# Presidential Combat — approved comedy, visuals, national pride, and launch checkpoint

Recorded from the November 20–21 voice planning discussion. This is the approved creative and implementation backlog, NOT a claim that all items are finished.

## Creative direction
- Arcade fighter with Street Fighter-style combat, political sitcom comedy, and World Cup-style national pride. Family-watchable, playful, non-graphic satire.
- Each fighter needs at least one distinctive comedic move/pose that is funny even when the player is losing. Character-specific kicks, gestures, entrances, and reactions; avoid generic identical moves as final art.
- Laughter is a punchline cue, never constant ambience, and never on solemn salutes or serious gestures.

## Comedy pose timing (approved)
- Maintain smooth presentation (target 60 FPS); do NOT reduce renderer frame rate to simulate cinematic timing.
- On qualifying special move/pose: impact -> brief hit-stop -> slow-motion/exaggerated pose hold -> face/gesture readable -> audience laugh timed to the visual punchline -> smoothly resume combat.
- Avoid control sluggishness, broken input buffering, and multiplayer desync. Keep effects presentation-only where possible; test on iPhone. Use per-event cooldown; don't repeatedly trigger laughs from one held pose.
- Trump: tie adjustment with smug expression after an outrageous move; MAGA hat throw with hand-to-hat windup; microphone lasso visual wrapping/pull; characteristic comedy.
- George W. Bush: dodge a thrown shoe, turn to opponent with sarcastic 'miss me?' reaction, laughter after the look.
- Obama: finish smooth combo, straighten jacket, smile confidently; laughter only when pose lands.
- No laughter during salutes or solemn national gestures.
- Prefer a properly licensed recorded sitcom laugh; current synthesized fallback is not a final licensed recording.

## Visuals and arenas
- Enlarge fighter visuals approximately 5% on phones without changing hitboxes, combat reach, foot baseline, or collision; ensure no clipping and stable animation.
- Subtle facial reactions and distinctive fighter-specific idle, walk, jump, flip, kick, hit, and victory animations.
- Trump White House arena: flowing fountain, Secret Service earpiece gestures, MAGA supporters taking red hats off/on, waving flags, cheering crowd.
- Kim North Korea arena: parade/tanks/soldiers/searchlights and appropriate crowd movement.
- Other arenas: country-specific flags, background motion, crowds and environmental details (including Eritrea port/Red Sea/camels where applicable).
- Keep effects mobile-friendly and background motion behind fighters, without visual clutter.

## National pride
- Fighter nationality conveyed through flags, stage, entrance, music, and crowd response; sports-tournament energy without demeaning countries.

## Future multiplayer and prizes — defer from initial launch
- Chicago vs Cincinnati and other cross-city challenges, ranking points, fair matchmaking, tournaments, anti-cheat, leaderboards.
- Physical championship jacket/trophy possible after validated contest rules, legality, fulfillment and multiplayer fairness.
- Virtual currency is optional later, not a launch blocker.

## Immediate launch priorities
1. Stable, genuinely playable phone game; fix facing, animation gaps, KO, controls, timing, audio sync and loading.
2. Eight truly playable fighters is the desired initial roster; only Trump and Kim were confirmed playable at checkpoint time. Do not present locked concept-art characters as playable.
3. Convert imported Higgsfield concept sheets to reviewed, clean animation frames; connect appropriate sprites to game actions and playtest. Contact sheets alone are NOT production-ready sprites.
4. Build native iOS project, test on device, prepare App Store metadata and submission. Submission and approval dates are not guaranteed.
5. Save git checkpoints and run tests after each change. Do not push to an unverified production remote or claim deployment without confirmation.

## Confirmed implementation state at checkpoint creation
- Fighter render heights Trump 215, Kim 200; visuals only.
- Trump arena fountain/Secret Service and red-hat crowd overlays; Kim searchlight; general spectator motion.
- Finisher laugh shifted ~240 ms after impact, but full per-character pose-triggered comedic timing remains to be implemented.
- Five Higgsfield concept PNGs imported into public/art/higgsfield-concepts with review page; not yet converted into playable animations.
- Capacitor dependencies installed; native iOS project not yet generated.
- 353 automated tests passing at previous checkpoint; still require visual playtesting.

## Next acceptance criteria
- Trump tie-adjustment pose and laugh fire once, at readable moment, without dropping render FPS or altering fight physics.
- Bush shoe-dodge and Obama jacket pose only after those fighters are implemented; no placeholder claims.
- Background loops and +5% sizing look correct on an actual iPhone.
- All new fighter frames have transparent clean edges, consistent scale/foot anchors, and coherent animation timing.
