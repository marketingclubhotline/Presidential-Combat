# Core KO and victory handoff — 2026-11-20

Repository: /Users/jpsstudio/PresidentialCombat/presidential-combat-dev
Active client: public/index.html
Branch: dev/aerial-kicks-20261120 (verify with git branch --show-current)

User acceptance: defeated fighter collapses visibly onto arena floor and remains there; never flies off screen. Winner performs a default hands-up victory pose until a fighter-specific celebration replaces it. Shared system must work for every fighter, including FINISH HIM transitions.

Implemented this pass: endRound no longer launches defeated fighter with vx=-face*10 and vy=-6; locks initial KO to arena floor and clamps position to visible interior. Existing shared visual KO staging is still a placeholder made of transformed artwork. Existing win sprite is not verified as raised-hands pose. No final pose assets created this pass.

Next: replace shared KO transform with eight distinct articulated fall/ground poses and final prone hold; add shared victory hands-up sequence, then allow per-fighter overrides; verify both fighters and finish-window transition in iPhone Safari. Keep actual GitHub push separate until writable destination verified.

Validation: npm test: 353 passed, 0 failed. Visual verification pending.
