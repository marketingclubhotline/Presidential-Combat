#!/usr/bin/env python3
"""Shared eight-stage KO and eight-stage hands-up victory prototypes for Trump/Kim."""
from pathlib import Path
P=Path(__file__).resolve().parents[1]/'public/art/sprites'
P.mkdir(parents=True,exist_ok=True)
for fighter in ('trump','kim'):
 suit='#273e6b' if fighter=='trump' else '#343a40'
 hair='#e2b63f' if fighter=='trump' else '#171819'
 skin='#e6af87'
 for kind in ('ko','victory'):
  for i in range(8):
   if kind=='ko':
    # Falling is a change of joint positions, not a rotation of the entire image.
    torso_x=[0,-4,-12,-19,-25,-28,-28,-28][i]
    torso_y=[0,12,28,41,52,58,60,60][i]
    angle=[0,-10,-27,-49,-69,-81,-83,-83][i]
    knee=[0,9,23,35,44,40,36,36][i]
    arm=[0,15,28,39,54,65,68,68][i]
    leg=f'<path d="M-13 22 L{-29-knee} {62-knee*.22} L{-38-knee} 89 M13 22 L{30+knee*.35} {63-knee*.2} L{45+knee*.5} 90" stroke="{suit}" stroke-width="20" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    arms=f'<path d="M-23 -33 L{-42-arm*.2} {-12+arm*.35} L{-50-arm*.35} {5+arm*.45} M23 -33 L{43+arm*.1} {-7+arm*.4} L{48+arm*.4} {12+arm*.45}" stroke="{suit}" stroke-width="17" fill="none" stroke-linecap="round"/>'
    # Last frames settle prone on the floor, staying within the art canvas.
    transform=f'translate({150+torso_x} {153+torso_y}) rotate({angle})'
   else:
    rise=[0,8,20,37,53,68,75,78][i]
    leg=f'<path d="M-13 22 L-22 67 L-27 91 M13 22 L24 67 L30 91" stroke="{suit}" stroke-width="20" fill="none" stroke-linecap="round"/>'
    arms=f'<path d="M-23 -33 L{-37-rise*.12} {-13-rise*.7} L{-42-rise*.17} {7-rise*1.3} M23 -33 L{37+rise*.12} {-13-rise*.7} L{42+rise*.17} {7-rise*1.3}" stroke="{suit}" stroke-width="17" fill="none" stroke-linecap="round"/>'
    transform='translate(150 151)'
   svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="320" height="310" viewBox="0 0 320 310"><g transform="{transform}">{leg}{arms}<path d="M-25 -43 Q0 -55 25 -43 L22 22 Q0 32 -22 22Z" fill="{suit}" stroke="#161923" stroke-width="3"/><rect x="-8" y="-59" width="16" height="16" fill="{skin}"/><ellipse cx="0" cy="-76" rx="23" ry="25" fill="{skin}" stroke="#17191d" stroke-width="3"/><path d="M-23 -81 Q-18 -108 5 -102 Q26 -98 23 -80 Q0 -93 -23 -81" fill="{hair}"/>{'<path d="M-4 -42 L7 -41 L2 14 L-5 3Z" fill="#c52c36"/>' if fighter=='trump' else ''}</g></svg>'''
   (P/f'{fighter}-{kind}-{i+1}.svg').write_text(svg)
print('Generated 32 KO/victory prototype SVG frames')
