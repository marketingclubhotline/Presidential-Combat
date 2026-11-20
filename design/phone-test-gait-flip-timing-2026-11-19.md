# iPhone feedback and iteration
User observed crossing/hopping walk, flat cardboard flip, and unreadably fast powerful kicks/roundhouse.

Changes: disabled the procedural leg-split walk generator (it rotated the legs across each other); reduced walking full-body bounce and tilt. Existing single walk image is still NOT a real alternating-foot animation. Improved flip rotation to pivot about torso with easing and tuck, but still needs new authored pose frames and visual testing. Increased heavy kick active/recovery timing and roundhouse startup/active/recovery; left light punch startup unchanged because OTA/live config tests depend on baseline 4. This is an incremental fix, not animation acceptance.

Validation: 338 automated tests passed; local LAN server HTTP 200. Need iPhone re-test, authored multi-frame walks and aerial somersaults before roster-wide rollout. No production deployment.
