# Presidential Combat — approved shared rolling throw (2026-11-21)

User approved a universal baseline grab-and-throw for Trump and Kim, then future playable fighters. Character-specific signature throws can differ later.

## Motion
1. Close-range upper-body grab, with attacker and defender visibly contacting.
2. Pull opponent off balance.
3. Attacker rolls backward with articulated torso, shoulders, hips, knees and arms; both fighters move in a synchronized paired animation.
4. Attacker throws opponent behind the attacker's original facing direction, with trajectory and facing updates.
5. Opponent hits floor, bounces or slides briefly, and gets up; attacker recovers to stance.

## Input and fairness
- Proposed input: hold toward opponent + Punch + Block simultaneously; works on keyboard and multitouch virtual controls. Distinguish directional forward from screen-right using facing.
- Require standing, close range, grounded opponent, non-stunned attacker, and no existing throw lock. Resolve the simultaneous chord before punch/block actions to avoid accidental attacks.
- Whiff has recovery; successful throw has moderate damage and brief recovery. No throw loops or repeated grab stun-lock.
- Opponent cannot block a completed close-range grab; allow out-of-range whiff and startup interruption. Define online deterministic state and synchronized victim reaction.

## Existing art audit
- Trump and Kim each have four SVG high-block and four low-block poses, plus eight forward-flip and eight backward-flip poses.
- Trump has eight SVG uppercut poses. Kim uppercut art and final PNG integration require verification.
- No grab/throw sprite sequence found during this audit.
- User rejects cardboard-like whole-body flip rotation: verify articulated pose sequencing and sprite frame hookup, not merely frame file existence.

## Acceptance checks
- Test P1 and P2, both facing directions, wall proximity, airborne opponents, whiff, blocked defender, input priority, touchscreen multitouch, and round transitions.
- Run npm test and browser playtest before deployment. Do not claim complete until visually inspected.
- GitHub push blocked by 403: current Mac credentials marketingclubhotline cannot push to developerrutu/neon-fist; preserve local commits until access is corrected.
