# Presidential Combat — Flip Art Pipeline and Resume Checkpoint

## Verified location and branch
- Mac device: Vics-Mac-mini.local, device ID `eab7c769-7f11-4f31-ae1d-a7019a283c3f`
- Local working repo: `/Users/jpsstudio/Desktop/PresidentialCombat/presidential-combat-dev` (canonical path may resolve from Desktop symlink)
- Branch: `dev/aerial-kicks-20261120`
- Game code: `public/index.html`; sprite directory: `public/art/sprites/`; tests: `npm test`
- Local Safari game: `http://10.0.0.96:8787/` while Mac and phone share Wi-Fi; server uses port 8787
- Current Git origin `developerrutu/neon-fist`, not an authenticated owned writable game repository. Do NOT force-push or modify upstream. GitHub account currently exposes `ai-ring-assistant` as writable, which is NOT the game repo. Keep game commits local until correct GitHub remote is available.

## Reusable art workflow — no ChatGPT ZIP round-trip
1. Make or revise pose definitions directly in `scripts/build_flip_sprites.py` on the Mac.
2. Run `python3 scripts/build_flip_sprites.py`; generates 32 transparent SVG assets (8 poses × 2 directions × 2 fighters) in `public/art/sprites`.
3. Game loader `PC_FLIP_FRAMES` in `public/index.html` loads the generated `.svg` files; aerial kick sprites take precedence during active kicks.
4. Run `npm test`, verify assets return HTTP 200 and visually playtest on Safari. Do not claim artwork quality verified until inspected on screen.
5. Commit the code, generated art and this checkpoint together. Push only to a verified user-owned or authorized game remote.
6. Use this pipeline as the shared core for more fighters, then customize pose timing, anatomy, costumes and signature kick transitions per character.

## Current art status and limits
- The generated SVGs are editable, simple vector prototypes with independently positioned limbs and eight distinct poses per direction, NOT the previously recovered detailed illustrations. They are a temporary testable core design; visual polish and game QA remain.
- Original concept reference remains in ChatGPT Library under `Presidential Combat Flip Animation Concepts.png` and `Presidential Flip Animation Sprite Sheet.png`. This workflow does not depend on downloading these files to the Mac.
- The flip-kick transition relies on existing aerial-kick frames, which override flip frames while the attack is active. Check timing and continuity manually.
- The current `pcCleanSprite` routine converts SVGs to canvases and strips transparent outside pixels.

## Resume prompt
`Resume Presidential Combat from docs/checkpoints/2026-11-20-flip-pipeline-and-resume.md. Inspect current branch and git status; preserve production and untracked assets. Regenerate and refine the 32 articulated flip SVGs from scripts/build_flip_sprites.py, playtest forward/backward flips and airborne kick transitions for Trump and Kim, fix alignment/timing/art quality, run npm test, and commit. Verify writable GitHub game remote before any push; do not push to developerrutu/neon-fist without authorization. Record test evidence and next actions in a new checkpoint.`
