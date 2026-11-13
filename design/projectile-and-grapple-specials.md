# Presidential Combat — four fighter ranged specials and counters

Goal: each of the initial four fighters has a recognizable ranged throw/energy attack, with fair counterplay. Original button mappings remain unchanged. Prototype these as data/visual plans first; do not claim gameplay implementation.

## Trump — MIC DROP / CORD COMMAND
Cartoon wired podium microphone toss. On hit, cable wraps loosely around opponent's torso (no injury/gore); pull draws them a short, capped distance toward Trump and enables a follow-up microphone uppercut or speech shockwave. On block or whiff, microphone retracts and Trump is vulnerable. Cable range, startup, hitstun, pull distance, and follow-up must be bounded. Silly feedback: microphone squeals, announcer says 'MIC DROP!'. Hat toss remains a separate projectile.

## Obama — SWAGGER DISC / YES WE CAN COUNTER
Throws a stylized glowing campaign-button disc (original graphic, not borrowed from another game). On hit: brief stagger; on block: bounce/recover. Optional well-timed counterstep yields a short combo. Footwork and precision, no unavoidable loops.

## Putin — RED BUTTON / TANK TOKEN
Throws a cartoon red-button energy pulse; distant tank silhouette can be a cosmetic cue, not an unavoidable attack. Slow visible startup and punishable recovery.

## Isaias Afwerki — RED SEA RISING / INJERA SLAP
Short-range cresting water projectile and optional spinning injera toss. Massawa harbor background, visible telegraph, balanced recovery. Suwa power-up can be a temporary cosmetic or tightly capped buff after balance tests.

## Engine constraints
Existing fighting engine currently has two equal-damage projectile attacks and two preview fighters (Trump/Kim). First implement local four-fighter selection and character-specific projectile presentation; avoid touching rollback/netplay until deterministic inputs and tests cover new grapple. All attacks should have block, jump, dodge, whiff and cooldown counterplay. Preserve original upstream and AI Ring Assistant.

## Trump victory hat flourish (approved 2026-11-12)
After a successful finishing move, Trump puts on a bright red MAGA-style cap, pauses for a comic victory pose, and plays the recorded 'Make America Great Again!' line IF that exact clip is verified in the voicepack. If the clip is not verified, use a neutral victory stinger until audio QA. The hat must appear on the character sprite (not just as a projectile); retain the existing spinning red-hat projectile as a separate move. Trigger only after confirmed victory; cosmetic only, no gameplay advantage. Avoid using this as a default post-combo animation that interrupts combat. Keep audio optional and interruptible on restart.
