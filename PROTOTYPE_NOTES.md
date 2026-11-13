# Presidential Combat — Prototype 0.1

Source: developerrutu/neon-fist, upstream commit c28ffb7e7e81ed8f9cec274772c43c30d2876d42.

Initial edits: title, fighter names, preliminary procedural costume colors, blond hairstyle for Trump, dark jacket/hair for Kim Jong Un. These are placeholder silhouettes, NOT finished recognizable portraits or sprite sheets.

Original MIT license retained. No third-party political portrait photos embedded.

Next: test baseline gameplay and netplay, replace procedural placeholder sprites with original licensed art, White House arena, real iPhone-to-iPhone connectivity and mobile UX.

Added character-selection screen with 2 active preview choices and 10 unnamed locked slots. Character switching in actual combat is NOT yet wired; selection is explicitly preview-only to avoid netplay desync.

Higgsfield master and two six-pose references copied to public/art; selection cards now show generated character art. Combat still uses original procedural sprites pending clean background removal, crop and frame mapping.

Extracted 12 approximately transparent sprite cutouts with scripts/extract_sprites.py (Pillow dependency installed outside repository at /tmp/prescombat-pylibs). Wired rendering-only pose selection for idle/walk/punch/kick/dodge/win; legacy procedural sprite fallback preserved. These are single-pose placeholders, not fluid animations, and transparency/cropping require visual QA. Physics and netcode unchanged.

Added offline-only post-match Presidential Finishers overlay: Trump You're Fired (cartoon flame icon), Hair Apparent, hidden Secret Service Shuffle; Kim Supreme Inspection, Grand Parade, hidden Rocket-Powered Confetti. Up and Left shortcuts plus ↑↑↓↓←→ secret sequence (1.2 s between inputs). Presentation-only, no damage or gore, and disabled in netplay pending synchronized implementation. This is text/emoji/CSS effects, not fully animated fatalities.

Added a five-second (300 simulation frames at 60 Hz) pre-fight countdown and compact matchup move guide with both fighters' keyboard controls and two visible post-match executions. Secret executions intentionally omitted. Guide is hidden on FIGHT. Existing specials are not all yet mapped to character-specific labels; missile special remains planned, not implemented. Needs browser/mobile visual QA and rollback testing.

Fairness: both existing projectile attacks now share 15 HP direct damage, 3 HP chip, identical 24-frame hitstun, 12-frame blockstun, push, collision box, speed and lifetime. P1 projectile rendered as spinning red hat, P2 as cartoon missile; purely visual, deterministic simulation untouched. Dedicated back-back-forward motion, cooldown and per-fighter voice lines still pending; current existing fireball motion launches these projectiles.

### Audio prototype — 2026-11-12
- Existing synthesized WebAudio: punch, kick, block, whiff, jump, land, KO, round bell, countdown, fight, projectile launch/impact, music.
- Added swish on attacks, hurt grunt on hit, execution boom/stinger; projectile spawn now plays owner-specific voice.
- Generated local generic TTS placeholders using macOS `say`, not a real-person voice clone: `public/audio/trump-maga.wav` (English MAGA) and `public/audio/kim-balsa.wav` (Korean 발사). Optional asynchronous decode, synthesized fallback if unavailable. Approx 98KB total.
- Candidate future licensed audio: Kenney Impact Sounds (https://kenney.nl/assets/impact-sounds), Sci-Fi Sounds and Interface Sounds, CC0; attempted direct Kenney archive download, server returned HTTP 403, so **no external third-party sound files were imported**.
- Still requires browser/iPhone listening QA, volume balance, audio overlap testing, separate fighter pain voices, animation-linked swishes and richer finishers. Current voice is tied to the preexisting fireball motion; back-back-forward special not yet implemented.

Added accessible main-menu ABOUT · COMPETITIVE FAIRNESS dialog, with trade-off explanations, frame-data glossary, matchup testing policy and explicit distinction between goals and proven balance. Does not affect game simulation.

Roster expansion approved: Abraham Lincoln, Napoleon Bonaparte, Fidel Castro, Queen Elizabeth II, Julius Caesar as high-tier secret unlock, and Saddam Hussein as historical antagonist (satirical, non-glorifying). Added visible coming-soon roster note to main menu; no playable fighters or unlock logic added yet. All fighters must follow Competitive Fairness policy.

Added data/presidential-legends.json with 10 locked legend character designs (Lincoln, Napoleon, Castro, Elizabeth II, Caesar, Saddam, Bush, Obama, Biden, Clinton). Each has two named specials with planned motion inputs, two finishers, a style and explicit counterplay. Main-menu locked cards now open interactive character previews. This does NOT implement actual playable characters, combat animations, damage, unlock tracking, or execution of those commands. Avoid implying these are functional until assets, simulation, deterministic network sync and balance testing exist.

George W. Bush expression direction: distinctive asymmetrical smirk and eyebrow raise on idle/dodge/counter/win, with four additional move concepts in legends JSON. Concept data only; no character art or combat changes.

### Arcade announcer and captions — 2026-11-12
- Eight original generic-announcer voice placeholders requested: round one, round two, final round, fight, knockout, victory, presidential combo, presidential finish.
- WebAudio optional WAV loading and round/fight/KO/victory/finisher hooks added. Missing files silently fall back to existing synthesized cues.
- Metallic gold/red combo caption CSS added; combo text still derives from existing deterministic state. Presidential Combo recorded but automatic threshold trigger deferred until browser QA to avoid spam.
- Synthetic crowd cheers at fight and KO/finisher; real crowds and Suno tracks not yet imported.
- Audio/visual browser and iPhone QA still required; these are placeholders, not professional voice performances.
