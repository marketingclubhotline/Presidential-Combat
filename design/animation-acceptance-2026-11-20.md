# Animation acceptance — phone test feedback
User rejected static-body somersault and hop/crossing-leg walk. Current presidential art contains only six static pose images per fighter (`idle`, `walk`, `punch`, `kick`, `dodge`, `win`). The original Neon Fist has procedural multi-cell fighter drawings, but those cells do NOT automatically apply to presidential portraits. No authored walk cycle, somersault phases, or aerial kick extension/hold/retraction files are currently present. Do not claim the visual animation is fixed by whole-sprite transforms.

## Implemented now
- Facing-relative Back+Kick starts roundhouse; Down+Kick retains tripSweep; existing directional jump and air kick remain.
- Jump kick active frames increased 5 to 9 and recovery 6 to 12 to improve readability.
- 341 tests pass. No production deployment.

## Mandatory visual work before roster rollout
1. Author per-character cleanly aligned 6–8 walk frames with distinct planted/pass-through/recovery feet; forward and backward sequences, no image splitting.
2. Author 6–10 somersault poses with knee tuck, arm swing, inversion, leg extension and landing. Forward/back can reverse phases with adjustment.
3. Author aerial kick chamber, extension, 3–5-frame hold, retract, landing; preserve orientation while flip attack plays.
4. Verify frame-to-frame body alignment, stable floor anchor, collision readability and mobile control responsiveness in Safari.
5. Reuse approved state machine across roster; unique fighter art still required.
