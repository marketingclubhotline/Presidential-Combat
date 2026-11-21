# Presidential Combat — art approval gate (November 20, 2026)

## User-reported visual defects
Trump becomes a faceless, short cartoon during uppercut, standing/crouching block, and occasionally during forward flip. Forward flip runs too quickly; forward flip-to-kick reads as somersault without visible kicking pose. Roundhouse is not visually convincing/recognizable.

## Verified active assets
- trump-flip-forward-1..8.svg and trump-flip-backward-1..8.svg: procedural vector prototypes; NOT approved character art.
- trump-uppercut-1..8.svg: procedural vector prototypes; NOT approved.
- trump-block-high-1..4.svg and trump-block-low-1..4.svg: procedural vector prototypes; NOT approved.
- trump-airkick-forward-1..8.png, trump-airkick-backward-1..8.png: raster sequences, visual approval pending.
- trump-roundhouse-1..8.png: raster sequence, visual approval pending.

## Required workflow
1. Build a contact sheet/storyboard showing each frame of each move at a consistent character scale and baseline, plus idle reference.
2. Obtain visual approval of recognizable face, hair, suit, body proportions, pose continuity, and floor anchor BEFORE activating new art in game code.
3. Animate forward flip distinctly from flip-to-kick; during kick, pause visibly on extended-leg contact pose, but keep hitbox and damage windows unchanged unless separately approved.
4. Verify backward flip, standing/crouching block, twisting uppercut, low sweep, and power-gathering roundhouse in Safari with actual frame playback, not only automated tests.
5. Commit only approved sprites and loader changes; record exact paths, test results, visual approval and Git commit in next checkpoint.

## Current safeguard
Commit 7b2c501 disabled the unapproved Trump uppercut/block/sweep SVGs. The unapproved flip SVGs are still referenced by the loader; do not present them as final. No new animation art was approved at this checkpoint.
