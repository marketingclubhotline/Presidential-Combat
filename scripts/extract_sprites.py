"""Extract six conceptual pose cutouts from each Higgsfield contact sheet.
Background masking is approximate; review sprites before shipping.
"""
from PIL import Image
from collections import deque
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'public/art'
for fighter in ('trump','kim'):
    src=Image.open(root/f'{fighter}-poses.png').convert('RGBA')
    W,H=src.size
    for i,name in enumerate(('idle','walk','punch','kick','dodge','win')):
        col,row=i%3,i//3
        x0=round(col*W/3)+3;x1=round((col+1)*W/3)-3
        y0=round(row*H/2)+3;y1=round((row+1)*H/2)-3
        im=src.crop((x0,y0,x1,y1)); w,h=im.size
        pix=im.load();seen=bytearray(w*h);q=deque()
        def bg(x,y):
            r,g,b,a=pix[x,y]
            return min(r,g,b)>162 and max(r,g,b)-min(r,g,b)<28
        for x in range(w):
            for y in (0,h-1):
                if bg(x,y):q.append((x,y));seen[y*w+x]=1
        for y in range(h):
            for x in (0,w-1):
                if bg(x,y) and not seen[y*w+x]:q.append((x,y));seen[y*w+x]=1
        while q:
            x,y=q.popleft()
            for xx,yy in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0<=xx<w and 0<=yy<h and not seen[yy*w+xx] and bg(xx,yy):
                    seen[yy*w+xx]=1;q.append((xx,yy))
        for y in range(h):
            for x in range(w):
                if seen[y*w+x]:pix[x,y]=(0,0,0,0)
        box=im.getbbox()
        if box: im=im.crop(box)
        out=root/'sprites'/f'{fighter}-{name}.png';im.save(out,optimize=True)
        print(out.name,im.size)
