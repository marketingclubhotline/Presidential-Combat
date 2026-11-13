from pathlib import Path
p=Path('/Users/jpsstudio/PresidentialCombat/presidential-combat-dev/public/index.html')
s=p.read_text()
old="""const PC_SPRITES={p1:{},p2:{}};
for(const [side,name] of [['p1','trump'],['p2','kim']]){
  for(const pose of ['idle','walk','punch','kick','dodge','win']){
    const im=new Image();im.src='art/sprites/'+name+'-'+pose+'.png';
    PC_SPRITES[side][pose]=im;
  }
}"""
new="""// Non-destructive runtime matte cleanup: removes only near-white pixels
// connected to the transparent/exterior background, preserving interior whites.
function pcCleanSprite(im){
  const w=im.naturalWidth,h=im.naturalHeight,n=w*h;
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(im,0,0);
  const frame=cx.getImageData(0,0,w,h),d=frame.data;
  const outside=new Uint8Array(n),q=new Int32Array(n);let head=0,tail=0;
  const white=i=>{const j=i*4,r=d[j],g=d[j+1],b=d[j+2];
    return d[j+3]<8||(r>239&&g>239&&b>239&&Math.max(r,g,b)-Math.min(r,g,b)<14);};
  const add=i=>{if(!outside[i]&&white(i)){outside[i]=1;q[tail++]=i;}};
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}
  for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
  while(head<tail){const i=q[head++],x=i%w;
    if(x>0)add(i-1);if(x<w-1)add(i+1);
    if(i>=w)add(i-w);if(i<n-w)add(i+w);
  }
  for(let i=0;i<n;i++)if(outside[i])d[i*4+3]=0;
  // Despill the last pale fringe only when adjacent to the removed matte.
  for(let i=0;i<n;i++){
    if(outside[i])continue;
    const x=i%w,j=i*4,r=d[j],g=d[j+1],b=d[j+2];
    const edge=(x>0&&outside[i-1])||(x<w-1&&outside[i+1])||
      (i>=w&&outside[i-w])||(i<n-w&&outside[i+w]);
    if(edge&&r>190&&g>190&&b>190&&Math.max(r,g,b)-Math.min(r,g,b)<35)
      d[j+3]=Math.min(d[j+3],105);
  }
  cx.putImageData(frame,0,0);return c;
}
const PC_SPRITES={p1:{},p2:{}};
for(const [side,name] of [['p1','trump'],['p2','kim']]){
  for(const pose of ['idle','walk','punch','kick','dodge','win']){
    const im=new Image();
    PC_SPRITES[side][pose]=im;
    im.onload=()=>{try{PC_SPRITES[side][pose]=pcCleanSprite(im);}catch(e){console.warn('sprite matte cleanup skipped',name,pose,e);}};
    im.src='art/sprites/'+name+'-'+pose+'.png';
  }
}"""
assert s.count(old)==1
s=s.replace(old,new)
s=s.replace("if(art?.complete && art.naturalWidth>0){\n    const scale=195/art.naturalHeight;","if(art && (art instanceof HTMLCanvasElement || art.complete) && (art.naturalWidth||art.width)>0){\n    const aw=art.naturalWidth||art.width,ah=art.naturalHeight||art.height;\n    const scale=195/ah;")
s=s.replace("g.drawImage(art,-art.naturalWidth*scale/2,-195,art.naturalWidth*scale,195);","g.drawImage(art,-aw*scale/2,-195,aw*scale,195);")
p.write_text(s)
print('Runtime matte cleanup installed for all 12 Trump/Kim sprite poses')
