# Screenshot IMG_7109: high and low guard animation checkpoint

User reports blocking is a rigid pose, requests distinct animated standing block and crouching low block for both fighters.

Implemented editable source `scripts/build_block_sprites.py`, producing 16 transparent SVG poses: four standing high-guard and four crouching low-guard for Trump and Kim, in `public/art/sprites/{trump,kim}-block-{high,low}-{1..4}.svg`. Added `PC_BLOCK_FRAMES` and `pcBlockArt` in `public/index.html`; it selects high/low according to state, cycles breathing/brace frames and shows recoil on blockstun. Collision, hitboxes, and combat physics untouched.

Test status: 347 automated tests passed; SVG served HTTP 200. Art is vector blocking-pass prototype, NOT photorealistic final fighter art. User visual Safari approval pending; verify actual crouch height, guards, foot alignment and impact recoil before expanding to roster.

Resume prompt: Read this checkpoint and earlier flip, uppercut and facing checkpoints; inspect `scripts/build_block_sprites.py`, `public/index.html`, and assets; test standing block, down+block, blockstun for both characters and both facing directions in iPhone Safari; refine anatomical guard silhouettes and align sprite baselines; run npm test; commit new checkpoints. Local Git game remote remains unwritable/unverified; do not push to wrong upstream.
