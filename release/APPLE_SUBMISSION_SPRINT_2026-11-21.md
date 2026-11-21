# Presidential Combat — November 21 App Store submission sprint

## Verified baseline (Nov 20)
- Browser game served by Express, `public/index.html`; 353 tests passed at checkpoint 8e37716.
- Xcode 26.6 installed on connected Mac.
- No `.xcodeproj`, `.xcworkspace`, or Capacitor iOS wrapper found in this repository.
- Current git origin is `developerrutu/neon-fist`; do not assume it is the intended production destination.
- Four-fighter 44-move staging manifests exist; do not claim generated sprites are integrated.

## Critical path to submission
1. Freeze a stable playable scope. Do not block submission on all 44 unique animation sets. Verify real character select, 4 functional fighters, mobile controls, audio, win/lose, pause, performance.
2. Create an iOS wrapper using an appropriate native shell (e.g. Capacitor) and bundle the web assets locally. Avoid merely presenting a remote website; add app-specific native value and ensure offline launch, device audio, orientation and touch behavior.
3. Configure unique bundle ID, version/build, icons, launch screen, deployment target, signing team, privacy manifest and required permissions; verify ownership of all art, music, and voices.
4. Build and run on an actual iPhone; archive with Xcode and upload to App Store Connect / TestFlight.
5. Prepare App Store listing, screenshots, support URL, privacy policy URL, age rating, content rights declarations, and review notes. Political satire, violence, Nazi imagery and historical likenesses need careful policy review. Avoid extremist glorification and misleading authentic voice impersonations.
6. Submit for App Review by Nov 21. Approval and public availability before Thanksgiving cannot be guaranteed.

## Parallel work
- Track A: wrapper/build/signing and submission metadata (release blocker)
- Track B: fix only launch-blocking game bugs, run regression tests
- Track C: Higgsfield reference-driven character sheets, inspect before integration
- Track D: audit voice assets and implement missing cues, no speculative replacement

## Gates
- Never overwrite approved sprites with unreviewed generated images.
- Preserve clean commits and test before each integration.
- Don't push to a remote or submit to Apple without confirming the target account/repo and credentials.
