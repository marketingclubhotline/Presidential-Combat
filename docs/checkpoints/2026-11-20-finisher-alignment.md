# Presidential Combat — finisher alignment, November 20

Branch: dev/aerial-kicks-20261120.

Implemented: shared FINISH HIM threshold 15 HP, duration 7 seconds, and matching UI countdown; both frame-based expiry and UI timer use the same duration. Updated arcade regression expectations. npm test: 345 passed, 0 failed; git diff --check clean.

Existing local assets: 48 transformed aerial kick PNG frames for Trump and Kim, 8 each in vertical, forward and backward variants. These are derivative poses, NOT bespoke illustrated frames. Existing walking, roundhouse and flip presentation still require device-level visual approval.

Still outstanding: real multi-frame directional flip art (current canvas rotation is a placeholder), articulated roundhouse and walking poses, visual inspection of kick frames and collision alignment, cinematic finisher art, other roster fighters, audio audition, and Safari playtest. Do not claim these complete. Do not push to template upstream or deploy without verified user-owned destination.

Preserve unrelated untracked design notes and .safety-backups. Next: inspect and replace placeholder flip/roundhouse frames, then test in Safari and capture defects before deploy.
