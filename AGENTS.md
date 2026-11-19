# Presidential Combat — Autonomous Development Instructions

## Mission
Improve the playable iPhone-first fighter, beginning from the current development branch. Work in small, testable increments; do not claim visual fixes are complete based on automated tests alone.

## Priorities
1. Replace Trump's forward/backward slide with readable alternating-leg walk cycles, planted feet, consistent facing, and no transparency cutouts.
2. Improve roundhouse windup, turning/contact frames, and recovery; verify the existing timing changes visually.
3. MAGA hat: hand reaches to head, hat disappears from head, visibly recognizable red hat travels out and returns, hand/head reset. Ensure readability on a small phone.
4. Microphone: hand visibly raises microphone to mouth, throws from hand (not torso), pulls target, retrieves microphone. Replace weak/cartoonish sound with a distinct appropriate effect.
5. Uppercut and super kick: anticipation poses, charge cues, interruptible startup, strong impact and recovery; distinguish ordinary and charged attacks.
6. Synchronize impact flashes, hitstop, knockback, sounds, and restrained screen shake to actual contact events.

## Core balance rule
Across ALL fighters: stronger attacks require more startup/commitment and provide counterplay (block, dodge, interrupt); reward successful hits with proportionate damage and reaction, and punish whiffs with recovery. Preserve documented rules in docs/CORE_COMBAT_BALANCE.md.

## Operating rules
- Work only in this repository and on the existing development branch unless instructed otherwise.
- Inspect source and tests before edits. Make focused changes and preserve the current playable baseline.
- Run `npm test` after each meaningful change. Record counts and failures accurately.
- Review the actual rendered animation in a browser/phone-sized viewport when possible. Automated green tests do NOT certify visual quality.
- Save coherent Git commits with clear messages. Never commit secrets, environment files, or .safety-backups.
- Do not delete external assets, force push, deploy production, change paid services, or alter unrelated projects.
- If blocked by missing sprites or tools, document the exact blocker rather than fabricate completion.
- Provide a concise report: commit hash, changes, test results, visual verification status, remaining issues, and the test URL only if confirmed live.

## Acceptance
Before requesting a new human playtest, confirm that the build contains visibly new walk, roundhouse, microphone, and hat animations, and distinguish stationary Kim training from reactive-opponent testing.
