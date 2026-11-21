#!/usr/bin/env python3
"""Generate editable 8-pose vector flip prototypes directly in the game's sprite folder.
No external transfers or dependencies. Source poses are articulated (not a rotated idle bitmap).
"""
from pathlib import Path
import math
ROOT=Path(__file__).resolve().parents[1]/'public/art/sprites'
ROOT.mkdir(parents=True,exist_ok=True)
# Pose: torso angle, hip/shoulder offset, leg1,leg2, arm1,arm2, kick extension.
POSES=[(-12,0,20,75,-55,50,0),(-36,-10,35,110,-90,-30,0),(-105,-20,125,165,-130,-45,0),(-180,-24,145,195,-110,-70,0),(-245,-18,65,120,-75,45,0),(-310,-5,10,100,-70,20,1),(-345,8,70,105,-65,60,0),(0,0,20,-20,-45,45,0)]
for fighter in ('trump','kim'):
 for direction in ('forward','backward'):
  for index,(torso,offset,leg_a,leg_b,arm_a,arm_b,kick) in enumerate(POSES,1):
   if direction=='backward': torso=-torso;leg_a,leg_b=-leg_b,-leg_a;arm_a,arm_b=-arm_b,-arm_a
   # Figure assembled from independent articulated shapes in a local body frame.
   # Rotation is specific to each pose; arms, legs and head change independently.
   jacket='#172b53' if fighter=='trump' else '#242b31'
   hair='#e5b13a' if fighter=='trump' else '#11171c'
   tie='<path d="M0 -19 L6 -13 L1 20 L-5 13 Z" fill="#c82728" stroke="#111" stroke-width="1"/>' if fighter=='trump' else '<path d="M-12 -14 L12 -14" stroke="#555" stroke-width="3"/>'
   def limb(x,y,ang,length,width,fill):
    return f'<g transform="translate({x} {y}) rotate({ang})"><path d="M{-width/2} 0 Q{-width/2-3} {length/2} {-width/2} {length} L{width/2} {length} Q{width/2+3} {length/2} {width/2} 0Z" fill="{fill}" stroke="#11141b" stroke-width="3" stroke-linejoin="round"/></g>'
   body=(limb(-14,25,leg_a,48,19,jacket)+limb(14,25,leg_b,48,19,jacket)+
         limb(-23,-27,arm_a,44,15,jacket)+limb(23,-27,arm_b,44,15,jacket)+
         '<path d="M-25 -37 Q0 -49 25 -37 L28 25 Q0 38 -28 25Z" fill="'+jacket+'" stroke="#10131b" stroke-width="4"/>'+tie+
         '<rect x="-9" y="-49" width="18" height="15" rx="5" fill="#e8a879"/>'+
         '<ellipse cx="0" cy="-65" rx="22" ry="26" fill="#e8a879" stroke="#111" stroke-width="3"/>'+
         f'<path d="M-20 -72 Q-18 -96 0 -93 Q22 -94 22 -71 Q6 -84 -20 -72" fill="{hair}" stroke="#111" stroke-width="2"/>'+
         '<path d="M-12 -63 L-4 -64 M6 -64 L14 -63" stroke="#171717" stroke-width="3"/>'+
         '<path d="M-5 -49 Q1 -46 9 -50" fill="none" stroke="#6b3429" stroke-width="2"/>')
   # Frames have transparent backgrounds; all character elements inside the viewport.
   # Distinct aerial poses, including an extended lead leg in the attack-transition frame.
   scale=.83 if index in (3,4,5) else .92
   x=120+offset
   y=132 if index in (1,7,8) else (116 if index in (2,6) else 108)
   svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><g transform="translate({x} {y}) scale({scale}) rotate({torso})">{body}</g></svg>'''
   (ROOT/f'{fighter}-flip-{direction}-{index}.svg').write_text(svg)
print('Created 32 transparent, articulated SVG flip prototypes in',ROOT)
