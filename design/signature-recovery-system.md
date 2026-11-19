# Presidential Combat — Signature Recovery Moments (approved design checkpoint, 2026-11-19)

## Shared rules for every fighter
- Each fighter gets distinct special moves, sound cues, facial/body poses, and short humorous signature moments.
- Strong connected attacks may trigger a short **attacker flourish during the defender's existing hitstun/recovery**. Do not freeze the opponent, add free stun, or lengthen recovery solely to show a joke. Never force a taunt on a whiff or block.
- Separate the shared deterministic combat logic (hit detection, meter, knockback, recovery, network rules) from fighter-specific cosmetic choreography and voice/audio assets.
- Telegraph major specials with a readable, brief pose; synchronize voice and SFX to actual release/contact; no projectile from the waist. Preserve dodge/block opportunities and clear counterplay.
- All characters share the corrected alternating-leg forward/backward walk, proper facing, believable falls, no foot shadows/cropped white cutouts, and consistent camera/audio timing. Unique gait styling may be layered on top.
- Keep signature taunts interruptible or within recovery budget; do not interfere with input responsiveness, multiplayer sync, or balance. Prototype offline before multiplayer.
- Implement as reusable data: fighterId, triggerMove, triggerCondition=confirmedHit, cue, poseFrames, effect, optional voice, cleanup. Only one flourish at a time; reset on round end, KO, interrupt, or scene change.

## Trump
- Mic grapple: shoulder/mouth-height microphone speech pose, brief visible anticipation with the user-provided 'Grab her by the—' voice clip, hand release, fast medium-range cable throw, hook and reel on hit, brief existing hitstun; faster retract on miss; distinct microphone silhouette. Do not use Mortal Kombat's 'Get over here' line. 'You're fired!' reserved for a finisher; inspect existing supplied audio before generating duplicates.
- MAGA boomerang: bareheaded at idle; hat appears only during attack, is taken from head, thrown from raised hand, catches/returns and disappears. Never permanent headband; no waist-origin projectile.
- **Presidential Spin / Mic Stand Speech**: planned super, requested BACK BACK PUNCH PUNCH (confirm input buffering to avoid conflict with BACK BACK PUNCH mic grapple). Reveal a full microphone stand, spin forward with it extended (short-range, balanced multihit), land in podium-like speech pose, glance left/right, gesture to crowd while opponent is recovering. Stand vanishes after pose. 'And that's my plan!' is a placeholder; may suit Obama better. Use confirmed hit to allow the extra taunt; shorter recovery on whiff.

## Fighter-specific flourish catalog
- Obama: confident wave/swagger after connected special; possible 'And that's my plan!' speech gag pending voice choice.
- Kim Jong-un: military salute during opponent's recovery after parade/missile signature.
- George W. Bush: straighten tie after dodging a shoe or landing counter; shoe-dodge defense stays unique.
- Isaias Afwerki (Eritrea): Red Sea Spin — swirling water/storm spin attack, then brush water off shoulders. Alternate short taunts: bite of injera, sip of bun (coffee). Avoid requiring every flourish at once.
- Putin: reserve distinct recognizable short signature gesture/line; not selected yet, do not invent or hardcode.
- Other roster fighters: follow the same shared recovery-flourish architecture, but individual concepts need review and approval.

## Rollout / acceptance
1. Verify common walking and clean silhouettes first.
2. Finish Trump mic grapple, voice timing, visual hand origin, speed/range, and MAGA hat sequence.
3. Prototype mic-stand spin, meter/counterplay, and hit-confirmed speech flourish.
4. Implement reusable cosmetic recovery hooks, add each fighter's signature catalog entry, and validate animations on phone Safari.
5. Add ElevenLabs SFX/voice only where needed; verify actual assets, licensing, and sync. Preserve all existing production assets and secrets.

Status: design checkpoint saved; individual concepts here are NOT claims of completed gameplay implementation.
