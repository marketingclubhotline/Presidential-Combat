# Presidential Combat — animation production gate
User repeatedly rejected frozen whole-body rotations and hopping/crossing walk. Do NOT call these visually fixed until actual sprites exist and iPhone QA passes.

## Implemented
- Back+Punch maps to uppercut, facing-relative for either fighter. Uppercut contact gets 11 hitstop frames and 0.62 cinematic slowdown (offline), stronger impact shake. Whiff remains punishable.
- Walk renderer now supports eight authored PNGs per fighter (`art/sprites/<fighter>-walk-1.png` through `-walk-8.png`) in forward and reversed cadence. It activates ONLY when all eight are loaded, preserving static fallback rather than manufacturing a fake gait.
- Existing character art has only single idle/walk/punch/kick/dodge/win sprites, so NO new actual animation poses have been created in this commit.

## Asset production priorities
1. Eight truly distinct walk drawings per fighter: left contact, left push-off, passing, right reach, right contact, right push-off, passing, left reach. Match head/torso scale and ground baseline; keep feet apart.
2. Uppercut: anticipation crouch, shoulder twist, rising fist, extended contact, follow-through, controlled guard recovery; add matching per-frame image loader and contact-synced effect.
3. Flip: lift, arm swing, tuck, inversion, open, kick chamber/hold/retract, landing. Do not replace with whole-body spin.
4. Test Trump and Kim on iPhone and validate foot placement before extending artwork to roster.
5. Add per-character tunable jump velocity, horizontal drift and stance only after shared frame pipeline passes QA; ensure deterministic netplay config parity.

Automated tests verify control logic and asset loader, NOT visual realism.
