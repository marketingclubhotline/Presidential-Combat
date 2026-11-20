# Approved — super projectile follow-through and counterplay
Reference: user screenshot of Street Fighter II-style combat, 2026-11-19. Motion reference only, not copied assets.

## Combat behavior
- Normal projectile: brief windup, release and short recovery; moderate or low damage.
- Heavy projectile: stronger anticipation and longer vulnerable recovery, medium/high damage.
- Super projectile: distinct charge-up, long sustained throwing/beam pose, substantial but balanced damage, hitstop and impact VFX. Fighter remains hittable and cannot instantly cancel recovery after a miss.
- Recovery is tied to move state, not projectile lifetime: dodging or jumping over the projectile allows a counterattack while the thrower is recovering.
- On successful hit: meaningful health-bar loss and feedback; avoid unavoidable full-health kills. Damage and recovery must be tuned together.
- Different characters need distinct launch and follow-through poses; retain signature animations and move identity.
- Ensure the defender can evade and punish, and the attacker cannot spam supers without meter/cooldown limits.

## Acceptance tests before production
1. Confirm projectile spawns at the specified release frame and travels independently.
2. Confirm the attacker stays vulnerable during post-release recovery and can be punished after a dodge.
3. Confirm hitstop, hit reactions, and health damage on hit; no damage on dodge.
4. Test normal/heavy/super timing and balance on iPhone, both facing directions.

Status: design approved and saved; no unverified damage or recovery values changed yet.
