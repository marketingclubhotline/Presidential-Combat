# Mobile controller layout — screenshot IMG_7110

User final requested layout, after self-corrections: right action grid top-left KICK, top-right PUNCH, bottom-left large JUMP, bottom-right BLOCK. Remove redundant SWEEP touch button. Raise left directional controls slightly for thumb comfort. Keep directional pad up/down/left/right; down+kick still triggers sweep. No change to keyboard bindings or combat mechanics.

Implemented in `public/index.html`: right grid now 2x2 with exactly those four buttons, same-size jump as other actions; dpad bottom raised from `clamp(75px,19vh,160px)` to `clamp(87px,22vh,178px)`. Updated `tests/t_arcade.js` to verify new button positions and removed sweep. Tests: 350 passed, zero failed. User iPhone visual retest pending.

Resume prompt: Open this checkpoint, inspect right-hand button mapping and thumb reach on iPhone landscape, ensure all buttons register simultaneous directional and attack touches; test down+kick sweep, crouching block, jump kick, uppercut and side switching. Keep existing branch and untracked work safe. Save further checkpoint after user QA. Do not push to unverified upstream.
