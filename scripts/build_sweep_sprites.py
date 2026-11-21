#!/usr/bin/env python3
"""Generate eight distinct low-trip poses per fighter; feet remain floor-anchored."""
from pathlib import Path
P=Path(__file__).resolve().parents[1]/'public/art/sprites'
P.mkdir(parents=True,exist_ok=True)
for fighter in ('trump','kim'):
 jacket='#243c67' if fighter=='trump' else '#34383b'
 hair='#e0b23e' if fighter=='trump' else '#17191b'
 for i in range(8):
  # Anticipation, crouch, leg chamber, low extension, contact, retract, brace, guard.
  reach=[0,0,18,72,94,45,12,0][i]
  crouch=[4,18,35,43,45,37,23,8][i]
  lean=[0,-6,-11,-16,-13,-6,0,0][i]
  hip=188+crouch*.38
  torso=f'<g transform="translate({lean} {-crouch})"><path d="M-24 -45 Q0 -54 24 -45 L23 22 Q0 33 -23 22Z" fill="{jacket}" stroke="#17191d" stroke-width="4"/><path d="M-22 -38 L-39 -2 L-25 10" fill="none" stroke="{jacket}" stroke-width="17" stroke-linecap="round"/><path d="M21 -38 L35 -10 L20 8" fill="none" stroke="{jacket}" stroke-width="17" stroke-linecap="round"/><rect x="-8" y="-59" width="16" height="15" fill="#dfaa83"/><ellipse cx="0" cy="-75" rx="22" ry="24" fill="#e5aa82" stroke="#17191d" stroke-width="3"/><path d="M-21 -80 Q-17 -104 4 -100 Q24 -100 21 -79 Q0 -91 -21 -80" fill="{hair}"/></g>'
  if fighter=='trump': torso=torso.replace('</g>','<path d="M-4 -40 L7 -39 L2 12 L-5 4Z" fill="#c92e34"/></g>',1)
  # Bent supporting knee; extended kicking foot remains near ground, not head height.
  legs=f'<path d="M-12 14 L-34 {39+crouch*.18:.1f} L-38 70" fill="none" stroke="{jacket}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><path d="M-44 70 L-61 70" stroke="#17191d" stroke-width="12" stroke-linecap="round"/>'
  legs+=f'<path d="M13 14 L{23+reach*.38:.1f} {35+crouch*.16:.1f} L{26+reach:.1f} 66" fill="none" stroke="{jacket}" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/><path d="M{21+reach:.1f} 68 L{43+reach:.1f} 68" stroke="#17191d" stroke-width="12" stroke-linecap="round"/>'
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="280" viewBox="0 0 300 280"><g transform="translate(112 164)">{legs}{torso}</g></svg>'
  (P/f'{fighter}-sweep-{i+1}.svg').write_text(svg)
print('Generated 16 articulated low-sweep SVG frames')
