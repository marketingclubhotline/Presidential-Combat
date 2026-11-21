# User visual QA: screenshot IMG_7106 — fixes staged

Observed in user iPhone Safari screenshot: Trump's straight vertical jump presents a rigid single-body cardboard cutout; Kim visually points away from Trump despite opponent-facing requirement. User has additional issues to report.

Changes in `public/index.html`:
- `fighterVisualFacing` now accounts for Kim's opposite canonical atlas direction, rather than blindly applying f.face. Simulation still automatically sets facing toward opponent when not busy.
- `pcVerticalJumpArt` uses available three-phase kick chamber/retract art for changing tucked-leg jump poses during straight jump, without showing an extended aerial kick until the player presses KICK. Directional flip and actual jumpKick artwork retain precedence.

QA: 347 tests passed. This is a provisional animation improvement; physical iPhone visual retest required, especially Kim orientation after crossing sides and the straight-jump silhouette. Do not claim visual confirmation. No change to attack hitboxes or jump physics. Checkpoints remain local pending verified writable game GitHub remote.

Resume: inspect this checkpoint, reproduce Kim's orientation with user screenshot, verify source art canonical orientation, test left/right and cross-over in Safari, and create dedicated straight-jump art if reused kick poses look unnatural. Gather user's remaining observations before broader changes.
