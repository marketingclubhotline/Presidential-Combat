#!/usr/bin/env python3
"""Editable seven-pose vertical jump prototypes; retain established fighter palette."""
from pathlib import Path
P=Path(__file__).resolve().parents[1]/'public/art/sprites'
# Compression, left/right knee, arms, torso lean, torso lift, arm reach
poses=[(20,53,-53,-125,-55,7,0),(8,25,-28,-145,-38,-4,0),(0,17,-22,-158,-25,-10,0),
       (13,65,-65,-115,-65,-2,0),(17,76,-76,-102,-78,0,0),
       (5,30,-36,-130,-40,0,0),(22,50,-50,-110,-65,8,0)]
for name in ('trump','kim'):
 jacket='#243c67' if name=='trump' else '#34383b'
 hair='#e0b23e' if name=='trump' else '#17191b'
 def limb(x,y,ang,length,width):
  return f'<g transform="translate({x} {y}) rotate({ang})"><rect x="{-width/2}" y="0" width="{width}" height="{length}" rx="{width/2}" fill="{jacket}" stroke="#14181d" stroke-width="3"/></g>'
 for i,(compress,lleg,rleg,larm,rarm,lean,_) in enumerate(poses,1):
  body=(limb(-15,27,lleg,56,20)+limb(15,27,rleg,56,20)+
   f'<g transform="translate(0 {-compress}) rotate({lean})">'+
   limb(-24,-30,larm,53,18)+limb(24,-30,rarm,53,18)+
   f'<path d="M-27 -40 Q0 -52 27 -40 L25 28 Q0 42 -25 28Z" fill="{jacket}" stroke="#14181d" stroke-width="4"/>'+
   ('<path d="M-5 -36 L6 -35 L1 20 L-7 9Z" fill="#d5272b"/>' if name=='trump' else '')+
   f'<rect x="-8" y="-55" width="16" height="14" rx="4" fill="#e3a47b"/><ellipse cx="0" cy="-72" rx="22" ry="25" fill="#e5aa82" stroke="#14181d" stroke-width="3"/><path d="M-21 -78 Q-17 -102 4 -98 Q24 -98 21 -77 Q2 -89 -21 -78" fill="{hair}" stroke="#14181d" stroke-width="2"/></g>')
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="280" viewBox="0 0 240 280"><g transform="translate(120 {181+compress*.15}) scale(.92)">{body}</g></svg>'
  (P/f'{name}-vertical-jump-{i}.svg').write_text(svg)
print('Generated 14 articulated vertical jump pose prototypes')
