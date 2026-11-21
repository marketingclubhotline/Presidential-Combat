# Trump uppercut feedback and implementation

User screenshot IMG_7104: current Trump uppercut resembles jump jab; user wants full-body twist, deep coil, ascending punch, contact slowdown, opponent launch, uppercut held through airborne descent and landing; uppercut should work as combo finisher. Avoid static sprite rotation.

Implementation: scripts/build_uppercut_sprites.py generates eight distinct transparent articulated SVG pose prototypes directly in public/art/sprites/trump-uppercut-1.svg ... -8.svg. public/index.html loads those frames and uses startup/active/recovery-aware pose progression. Existing full-body procedural rotation is bypassed while authored frames are available. Existing uppercut hitstop (11 frames), slowdown on hit, launch and combo counter retained; no collision physics altered. All 347 automated tests pass. Browser asset request HTTP 200.

Limitations: SVGs are basic vector blocking poses, not final illustrated realistic Trump art. Need visual iPhone testing for anatomical quality, scale, foot baseline, silhouette, impact synchronization and hold-through-descent; screenshot-based quality complaint is NOT yet fully resolved. Do not claim visually approved. Additional user gameplay observations pending.

Resume prompt: Read this checkpoint and the prior flip/facing checkpoints, inspect public/index.html and scripts/build_uppercut_sprites.py, confirm 8-frame uppercut in Safari, refine detailed hand/arm/hip motion and falling recovery, test uppercut as combo finisher and slow-motion contact with both characters. Preserve local branch and untracked files; verify writable game GitHub remote before pushing.
