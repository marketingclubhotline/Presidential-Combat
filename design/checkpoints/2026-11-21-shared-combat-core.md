# Shared combat core, November 21

User direction: use original fighter template and shared core across all fighters; complete within ten review exchanges. Prioritize realistic high-quality uppercuts, blocks, sweeps/trips, flip-to-kick transitions. Individual signatures later.

Current visual problem: SVG uppercut, block, sweep prototypes are rough hand-built cartoon vectors unlike the original high-detail PNGs. Enabling them made visual quality worse. Original template already has shared combat state, `tripSweep` collision/knockdown, and universal uppercut inputs; no need to reimplement physics.

Change: Keep original detailed character PNGs as interim render for uppercut, blocks and sweeps instead of showing rough vector placeholders. Add shared animated guard brace/low crouch/hold motion for both players. Retain authored SVGs and all fighter files for reference, without deletion. Existing uppercut rise/twist transform applies to both fighters, but true pose-by-pose photographic quality is NOT yet delivered. TripSweep is already in game simulation; pose artwork still requires work.

Verified: 353 automated tests pass, inline JS syntax valid. iPhone visual approval pending. Local server at 10.0.0.96:8787. GitHub remote push blocked by 403; local commits safe.

Next: Create proper segmented high-detail sprite rig from original fighter art or approved Higgsfield individual cutouts, render distinct frame-by-frame uppercut and trip for both, validate on Safari, then propagate shared move renderer to fighters three and four. Do not label current animation production-quality.
