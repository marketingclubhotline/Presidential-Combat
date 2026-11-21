# November 20 iPhone visual playtest — uppercut and flip feedback

User observed: Trump's uppercut looks like forward punch + jump, no body twist. Forward/backward flips still rotate an upright cardboard sprite. Flip-to-air-kick contact is too fast to read. Ground kicks/effects looked good; roundhouse not yet evaluated.

Implemented in this pass: Trump's normal and super uppercut receive a stronger crouch, pivot, rising torso twist and unwind in presentation, without changing combat hitboxes. Added optional 8-frame dedicated Trump uppercut PNG loader (art still missing). Aerial kick sprite playback now holds its central contact phase longer within the same move duration; collision timing unchanged. npm test 347 passed, 0 failed.

NOT COMPLETE: Flip frame loader already expects 16 authored PNGs per direction per fighter, but the files do not exist in public/art/sprites. Existing whole-sprite rotation fallback remains and is visibly unacceptable. Requires genuine full-body articulated flip poses; do not misrepresent as fixed. Uppercut still uses transformed existing art until authored sprites are supplied. iPhone re-test required. Do not push upstream template.
