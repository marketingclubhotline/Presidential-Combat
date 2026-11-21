#!/usr/bin/env python3
"""Generate editable high/low blocking pose prototypes for Trump and Kim."""
from pathlib import Path
P=Path(__file__).resolve().parents[1]/'public/art/sprites';P.mkdir(parents=True,exist_ok=True)
for fighter in ('trump','kim'):
 jacket='#243c67' if fighter=='trump' else '#34383b'
 hair='#e0b23e' if fighter=='trump' else '#17191b'
 for stance in ('high','low'):
  for i in range(1,5):
   low=stance=='low';impact=i==3
   knee=48 if low else 17
   h=36 if low else 0
   lean=(-8 if impact else -3 if i==2 else 0)
   guard=(-130 if low else -105)+(12 if impact else -7 if i==2 else 0)
   arm2=(-70 if low else -135)-(12 if impact else 0)
   def limb(x,y,ang,length,w):
    return f'<g transform="translate({x} {y}) rotate({ang})"><rect x="{-w/2}" y="0" width="{w}" height="{length}" rx="{w/2}" fill="{jacket}" stroke="#14181d" stroke-width="3"/></g>'
   body=(limb(-15,27,knee,56,20)+limb(15,27,-knee,56,20)+
         f'<g transform="translate(0 {-h}) rotate({lean})">'+
         limb(-24,-30,guard,53,18)+limb(24,-30,arm2,53,18)+
         f'<path d="M-27 -40 Q0 -52 27 -40 L25 28 Q0 42 -25 28Z" fill="{jacket}" stroke="#14181d" stroke-width="4"/>'+
         ('<path d="M-5 -36 L6 -35 L1 20 L-7 9Z" fill="#d5272b"/>' if fighter=='trump' else '')+
         f'<rect x="-8" y="-55" width="16" height="14" rx="4" fill="#e3a47b"/><ellipse cx="0" cy="-72" rx="22" ry="25" fill="#e5aa82" stroke="#14181d" stroke-width="3"/><path d="M-21 -78 Q-17 -102 4 -98 Q24 -98 21 -77 Q2 -89 -21 -78" fill="{hair}" stroke="#14181d" stroke-width="2"/></g>')
   # Visual lean, bent legs, raised forearms, impact recoil. Transparent backgrounds.
   svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="280" viewBox="0 0 240 280"><g transform="translate(120 {181+h*.15}) scale(.92)">{body}</g></svg>'
   (P/f'{fighter}-block-{stance}-{i}.svg').write_text(svg)
print('Generated 16 high/low guard SVGs')
