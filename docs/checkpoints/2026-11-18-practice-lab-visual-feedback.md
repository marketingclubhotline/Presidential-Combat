# November 18 Practice Lab visual feedback — next animation pass

Baseline: commit 60ed077; latest practice test confirms combat pacing/interface improvements, but visual animation defects remain.

Priority 1 — shared walk: current public/index.html drawFighter() splits the idle sprite at hip=Math.floor(ah*.61) and at half=Math.floor(aw/2), rotates both rectangular halves. This cuts through upper legs and exposes transparent seams; feet do not convincingly cross. Inspect neon-fist-upstream walking animation/atlas and implement complete, continuous leg artwork or articulated limbs, no transparent rectangles. Forward and backward gait must alternate planted feet, leg crossing and body weight shift. Apply to shared fighter renderer, Trump as baseline. Do not accept automated tests as proof of visual quality.

Priority 2 — double-tap roundhouse: visible hip windup, knee chamber, rotating torso/extended leg, impact, follow-through, guard recovery. Current pose squash/rotation is too fast and looks like a cardboard turn. Preserve gameplay balance, make motion readable on phone.

Priority 3 — back-back-punch microphone grapple: enlarge recognizable microphone head, cable wraps target, retracts into Trump's hand, pulls opponent toward Trump; short stun permits one-two followup then neutral reset. Replace unintelligible/wrong-language voice cue with verified Trump clip from existing assets. Avoid infinite stun/combo.

Priority 4 — back-back-kick MAGA boomerang: hat visibly starts on Trump's head, hand removes it, short-range fast throw, visible return/catch, hat restored. Scale for phone readability; distinct startup/recovery.

Acceptance test: phone Practice Lab, forward/back gait with no holes; roundhouse readable at normal speed; mic/hook/voice and short combo; hat departure/return. Save commit and test before announcing ready. Preserve other edits and backup before changing assets.
