# Nov 21 block and iPhone cache repair

- User's phone playtest still showed basic uppercut/block and static background.
- Root issue in block renderer: p1 (Trump) explicitly returned null in `pcBlockArt`, suppressing all 8 high/low guard SVGs. Removed guard; both fighters can now show four-frame high/low guarding and impact recoil.
- Service worker previously used cache-first for sprite/audio assets. Changed to network-first with offline fallback and bumped cache namespace to `presidential-combat-animation-v7`, to avoid stale sprite files surviving phone refreshes.
- Arena animation effects already coded (fountain, earpiece gestures, searchlight, Red Sea shimmer), but are subtle and not yet visually confirmed on phone; do not claim those visuals have been approved.
- Previous uppercut and flip guard removal commit `3c5609d` is preserved.
- JS syntax checks pass; npm test 353 passed, 0 failed. Public deployment remains blocked by GitHub 403, so user's external link may still show an older build.
- Next: confirm browser build identity/asset loading; visually test on phone, improve stage visibility, and deploy after remote credentials are fixed.
