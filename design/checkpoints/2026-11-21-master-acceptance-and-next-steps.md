# Presidential Combat — authoritative current mission and acceptance checklist

## Mission
Complete a playable four-fighter shared combat core quickly by reusing the original Neon Fist template's mechanics and adapting existing detailed fighter artwork. Do not expand individual ten-move catalogs until shared moves look correct. Preserve progress with code commits AND a structured checkpoint containing DONE / NOT DONE / NEXT TEST / BLOCKERS. User should not need to repeat defects.

## User-reported defects / acceptance criteria (NOT DONE unless independently verified visually)
- Trump uppercut: eight distinct high-quality poses, recognizable wardrobe and body, coil/twist/rising punch/apex/recovery. No pencil-drawn SVG cartoon, no whole-body cardboard rotation.
- Forward/backward flip: articulated eight-frame motion, higher jump, slightly slowed timing, distinctive transitions into forward/back aerial kicks; no rigid sprite spin.
- Shared standing/crouch blocking: guard raise, hold, impact recoil, recovery; no basic stationary guard.
- Shared low trip/sweep: visible extended leg, opponent stumbles/falls; maintain existing tripSweep simulation.
- Shared walk, roundhouse, basic punch/kick, jump-kick, KO/fall, daze: all should use genuine sequential poses and correct hitboxes.
- Stage: moving background elements clearly visible without covering fight.
- Finisher: triggered BEFORE knockout at final health bars; announcer audibly says FINISH HIM; loser in animated startled daze; moderate dim, bright spotlights on both fighters; large red 10-to-0 countdown; winner can finish; loser falls in multi-frame collapse and stays down, not blocking on floor.
- Announcer archive: locate and identify user-supplied ZIP and the actual FINISH HIM recording; current `public/audio/recorded-announcer` has other round/fight lines but no file explicitly named finish-him. No audio success claim until verified.
- User-supplied ElevenLabs sitcom laughter: asset received in conversation but not yet verified in Mac game audio folder.
- Four playable fighters using shared core, then individual ten signature features per fighter from existing notes.

## Done in latest local change
- Finisher timer 7 -> 10 seconds, red large on-screen number, moderate dim instead of 58% blackout, two translucent spotlight areas, announce('finishHim') hook. NOTE: no corresponding recorded voice cue confirmed yet; audio still NOT DONE.
- Test expectation updated for 10-second finish; 353 automated tests pass.
- Earlier PNG uppercut renderer hook exists (commit d43d046), but PNG files generated in conversation workspace are NOT on Mac yet, so uppercut is NOT DONE and still falls back to cardboard original. Do not claim otherwise.

## Current blockers / next steps
1. Transfer actual eight PNG uppercut files from conversation sandbox to Mac; ensure transparent crop and alignment; verify all 8 assets serve HTTP 200, inspect in Safari. No remote upload tool confirmed; do not claim integration until transfer.
2. Obtain/verify FINISH HIM announcer file, register/decode cue; test actual sound on iPhone.
3. Visually verify spotlight/daze/countdown/KO, tune placement for phone.
4. Convert high-quality sprites for shared block/sweep/flip; test and extend to four fighters.
5. GitHub push still 403 for current authenticated account; local game accessible at http://10.0.0.96:8787 and is not public Render deployment.

## QA protocol
After each coherent change: JS syntax, automated tests, Safari visual test, local commit, attempt verified push; report failures and outstanding blockers explicitly.
