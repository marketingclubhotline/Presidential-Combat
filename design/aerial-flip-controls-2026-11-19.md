# Approved: mobile jump button and directional aerial flips
- Up alone or right-side JUMP alone: straight jump.
- Forward + up/JUMP: forward flip; backward + up/JUMP: backward flip. Direction is relative to facing.
- Kick during a flip: aerial kick, interrupting the decorative flip rotation so the hit is readable.
- A flip without a kick is evasive and must retain normal projectile collision rules.
- All fighters get the base move; distinct character animations are later polish.
- Keep BLOCK and SWEEP accessible; check iPhone touch target sizes and layout.
- Initial implementation: added right-side JUMP mapped to existing UP input; airborne rotation uses a placeholder whole-sprite transform. NOT final articulated animation. Requires real tucked-knee frames and visual testing.
- Check that rotation progress and air-kick cancel look natural; verify both facing directions, jump height and mobile multi-touch.
