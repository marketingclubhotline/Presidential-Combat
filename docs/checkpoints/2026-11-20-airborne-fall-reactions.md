# Airborne knockback and ground fall — Nov 20

Branch: dev/aerial-kicks-20261120

Implemented in public/index.html: shared eight-keyframe interpolated airborne reaction (recoil, arch, tumble, brace) and eight-keyframe KO impact/prone hold, for currently active Trump and Kim. Keyframes affect rendering only, preserving existing hitboxes and rollback. Also aligned heavy-strike finisher HP protection to the 15 HP trigger. Updated arcade tests: 347 passed, 0 failed; git diff --check clean.

IMPORTANT: These are animated silhouette transforms of existing artwork, NOT eight bespoke character pose PNGs. The desired independent limb poses, face-up/face-down variants, grounded bounce/recovery sprites, and final fall artwork remain to be authored and visually approved. Safari playtest not yet performed. Do not claim final art completion.

Next: view on desktop and iPhone, verify feet/floor, rotations, knockback timing, hitbox-to-sprite alignment, and recovery/KO distinction. Replace placeholder transforms with authored art. Preserve untracked design files and safety backups. No public deployment or upstream push.
