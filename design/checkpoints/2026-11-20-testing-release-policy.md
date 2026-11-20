# Testing-release checkpoint — user directive

User requests every completed correction to be exposed in the next playable testing build, never silently withheld. Explain any proposed exclusion and reason BEFORE excluding it. Visual feedback is the primary acceptance gate; do not confuse automated tests with a phone playtest.

## Verified now
- Development branch: dev/aerial-kicks-20261120
- Latest functional fix: dc7f299, P2 facing and KO fall anchor
- Previous changes: 1fbf70b airborne phases; fbfd92a slight head enlargement
- Playtest findings: design/checkpoints/2026-11-20-phone-playtest.md
- Local server on port 8787 serves updated index.html; /health returns ok
- 345 tests pass
- Existing flip loader references 16-frame assets, but directional flip sprite files absent. These cannot be claimed playable.
- External hosted testing deployment has NOT been verified or updated. Do not claim it is ready on user's phone until checked.

## Next actions
1. Determine approved testing hosting target and correct Render workspace/branch; do not deploy to production.
2. Push development branch to appropriate repository only after verifying remote target and permissions.
3. Deploy/verify a test URL accessible from iPhone.
4. Visually test P2 facing in match and selection, KO grounded pose, uppercut, flip art and recovery.
5. Add missing flip and KO sprite artwork and rerun tests; show each iteration in test build.
6. Continue all remaining corrections in phone-playtest checkpoint.
