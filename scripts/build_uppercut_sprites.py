#!/usr/bin/env python3
"""Editable eight-pose uppercut prototype, generated directly in the live sprite folder.
Distinct joint angles, crouch, coil, twist, rising fist, apex, descent, guard.
This is a vector blocking pass, not final hand-illustrated character artwork.
"""
from pathlib import Path
P=Path(__file__).resolve().parents[1]/'public/art/sprites'
P.mkdir(parents=True,exist_ok=True)
# torso lean, torso rotation, head tilt, punching arm, guard arm, front knee, rear knee, rise
poses=[(-16,-10,-8,65,-70,42,-34,0),(-25,-24,-15,52,-100,65,-48,8),(-12,-45,-12,-48,-105,30,-35,24),(6,-67,-8,-145,-90,12,-25,46),(16,-80,0,-175,-75,10,-10,63),(12,-65,5,-171,-50,12,-14,57),(4,-30,4,-115,-40,20,-24,31),(0,0,0,-45,42,25,-20,0)]
for i,(lean,twist,head,punch,guard,knee1,knee2,rise) in enumerate(poses,1):
 def limb(x,y,angle,length,width,color):
  return f'<g transform="translate({x} {y}) rotate({angle})"><rect x="{-width/2}" y="0" width="{width}" height="{length}" rx="{width/2}" fill="{color}" stroke="#10151c" stroke-width="3"/></g>'
 # Each frame has separately posed limbs and a shoulder/hip twist, rather than a rotated full-body photograph.
 body=(limb(-14,25,knee1,57,19,'#1c3052')+limb(14,25,knee2,57,19,'#1c3052')+
       f'<g transform="translate(0 -7) skewX({twist*.15}) rotate({lean})">'+
       limb(-23,-26,guard,45,17,'#243b62')+limb(23,-26,punch,62,19,'#243b62')+
       '<path d="M-27 -36 Q0 -51 27 -36 L25 29 Q0 42 -25 29Z" fill="#263d66" stroke="#10151c" stroke-width="4"/>'+
       '<path d="M-4 -34 L5 -34 L2 27 L-7 15Z" fill="#ce2631" stroke="#511015" stroke-width="1"/>'+
       f'<g transform="translate(0 -52) rotate({head})"><rect x="-8" y="-8" width="16" height="15" rx="5" fill="#e5a87d"/><ellipse cx="0" cy="-21" rx="23" ry="26" fill="#e8ad83" stroke="#10151c" stroke-width="3"/><path d="M-21 -27 Q-18 -52 4 -49 Q25 -50 21 -26 Q0 -38 -21 -27" fill="#dfb244" stroke="#10151c" stroke-width="2"/><path d="M-11 -19 L-4 -20 M6 -20 L14 -19" stroke="#202020" stroke-width="2.5"/><path d="M-4 -5 Q3 -3 9 -7" stroke="#8c433a" stroke-width="2" fill="none"/></g></g>')
 # Transparent viewBox, consistent character scale and stance anchor. Upward rise is drawn as pose displacement.
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="280" viewBox="0 0 240 280"><g transform="translate(120 {177-rise}) scale(0.93)">{body}</g></svg>'
 (P/f'trump-uppercut-{i}.svg').write_text(svg)
print('Wrote eight editable uppercut frames:',P)
