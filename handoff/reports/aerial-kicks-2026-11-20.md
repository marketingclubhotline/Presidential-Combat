# Aerial kick animation handoff

Generated 48 local PNG frames: Trump and Kim, 8 frames each for vertical, forward flip, backward flip aerial kicks.

Art provenance: first-pass derivatives from each fighter's existing chamber/extend/retract PNGs, transformed on the Mac. These are NOT 48 independently hand-drawn poses. Review for smoothness, clipping, contact frame alignment and apparent body rotation; replace with bespoke authored poses after QA.

Game code: public/index.html selects aerial kick variant at attack activation and loads the corresponding sprite sequence, with existing jumpKick combat timings and hitboxes unchanged. Flip and walking/roundhouse changes are included in the local code checkpoint.

QA: run npm test; visually test Trump vs Kim on desktop and mobile Safari. Do not merge into production before approval.
