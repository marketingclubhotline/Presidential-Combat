# Presidential Combat — Core Combat Balance Contract (all fighters)

**Status:** adopted design rule; shared roster standard. Existing moves require per-character tuning and animation verification.

## Power-for-commitment rule

Every move has startup, active, and recovery frames. The greater the damage, launch, range, or stun, the greater the startup warning, meter cost, punishable recovery, or other meaningful counterplay. No fighter gets a free high-damage instant special. Do not make all moves equally slow: normal attacks must remain responsive.

- **Startup / anticipation:** distinct readable silhouette, charge aura and rising SFX for signature moves. The opponent can react. Startup can be interrupted unless an explicit, balanced armor/invulnerability window begins later.
- **Active:** hitbox becomes live only after startup. On hit: damage, knockback or launch, local sparks, short hitstop and restrained camera shake. On block: chip and blockstun according to the move, but no full reward.
- **Recovery:** attacker cannot instantly act after whiff or block. Stronger specials carry a punishable window.
- **Fairness:** equivalent power-budget for every roster member, though visuals and attacks are character-specific. Evaluate damage, startup, meter, reach, invulnerability, recovery, and combo potential together.
- **Readability:** quick specials use subtle cues; heavy signature moves use an obvious aura and sound. On mobile, props and body poses must be recognizable at actual phone scale.

## Initial reference tuning (60 FPS target; playtest values, not final)

| Attack | Startup | Reward | Risk |
| --- | --- | --- | --- |
| Fast normal | ~3–7 frames | modest damage | short recovery |
| Heavy special | ~10–18 frames | higher damage / knockback | punishable recovery |
| Signature super | ~16–24 frames | strong damage / launch, hitstop | obvious charge, meter cost, longer recovery |

Trump's super uppercut is the first reference: 16-frame startup (~0.27 s), 25 base damage, launcher, 50 meter, 52 recovery frames. Gold-white aura and rising-charge audio are specified as cues; **rendering/audio assets are not yet implemented**. Invulnerability begins late (frames 12–15), leaving frames 0–11 interruptible. Validate counterplay, blocking and netcode synchronization in gameplay before declaring balanced.

## Acceptance criteria for each fighter

1. Visible charge starts before attack activation, and is identifiable without audio.
2. Startup can be punished by a well-timed response (except explicitly documented armor windows).
3. Hit, block and whiff each have visibly different results and appropriate recovery.
4. Higher reward has a measurable tradeoff; no automatic unblockable win.
5. Same timing and outcomes in local play and multiplayer.
6. Confirm on iPhone in both stationary and reactive-opponent tests.
