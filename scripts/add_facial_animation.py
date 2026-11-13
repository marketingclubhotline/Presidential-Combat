from pathlib import Path
import json
root=Path('/Users/jpsstudio/PresidentialCombat/presidential-combat-dev')
p=root/'public/index.html'
s=p.read_text()
needle="function drawFighter(g,f){"
assert s.count(needle)==1
insert="""// Facial animation standard V1: optional per-character transparent PNG overlays.
// Existing full-body poses remain the fallback until matching facial art is supplied.
const PC_FACIAL_STATES=['idle','blink','attack','hurt','block','super','victory'];
const PC_FACES={};
function pcRegisterFaces(character){
  if(PC_FACES[character])return PC_FACES[character];
  const faces=PC_FACES[character]={};
  for(const state of PC_FACIAL_STATES){
    const im=new Image();
    im.onload=()=>{faces[state]=im;};
    im.onerror=()=>{faces[state]=null;};
    im.src='art/faces/'+character+'/'+state+'.png';
  }
  return faces;
}
function pcFacialState(f){
  if(f.state==='win'||f.anim==='win')return 'victory';
  if(f.state==='hitstun'||f.state==='airstun'||f.anim==='hit')return 'hurt';
  if(f.state==='block'||f.state==='crouchBlock'||f.state==='blockstun')return 'block';
  if(f.move?.special)return 'super';
  if(f.move||['punch','kick','uppercut','spinKick','jumpKick'].includes(f.anim))return 'attack';
  if(f.state==='idle'&&Math.floor((Game.frame+(f.side==='p2'?61:0))%211)<7)return 'blink';
  return 'idle';
}
function pcDrawFace(g,f,character,bodyWidth,bodyHeight){
  const cfg=PC_FACE_CONFIG[character];
  if(!cfg)return;
  const faces=pcRegisterFaces(character);
  const state=pcFacialState(f);
  const face=faces[state]||faces.idle;
  if(!face||!face.complete||!face.naturalWidth)return;
  // Coordinates are fractions of the rendered body sprite. The face artwork
  // is an overlay with transparent padding, not a replacement for the body.
  const w=bodyWidth*cfg.width,h=w*(face.naturalHeight/face.naturalWidth);
  g.drawImage(face,-bodyWidth/2+bodyWidth*cfg.x-w/2,-bodyHeight+bodyHeight*cfg.y-h/2,w,h);
}
const PC_FACE_CONFIG={
  trump:{x:0.50,y:0.19,width:0.30},
  kim:{x:0.50,y:0.19,width:0.30}
};
"""
s=s.replace(needle,insert+needle)
needle="    g.drawImage(art,-aw*scale/2,-195,aw*scale,195);"
assert s.count(needle)==1
s=s.replace(needle,needle+"\n    pcDrawFace(g,f,f.side==='p1'?'trump':'kim',aw*scale,195);")
p.write_text(s)
config={"schemaVersion":1,"standard":"Transparent facial PNG overlays triggered by game state","states":["idle","blink","attack","hurt","block","super","victory"],"assetPattern":"public/art/faces/{character}/{state}.png","characters":["trump","kim","obama","putin","isaias-afwerki"],"notes":"Only Trump and Kim are currently playable. Overlay frames are not yet authored. Do not use opaque face photos. Facial overlays need matching pose and alignment review. Existing full-body sprite remains fallback. No simulation or netcode changes."}
(root/'design/facial-animation-standard-v1.json').write_text(json.dumps(config,indent=2))
(root/'public/art/faces').mkdir(parents=True,exist_ok=True)
(root/'public/art/faces/README.md').write_text('# Facial animation overlays\n\nEach character directory accepts transparent PNGs named idle, blink, attack, hurt, block, super, victory. Match the body pose and transparent crop. The renderer uses the full-body pose if overlays are absent.\n')
p.write_text(s)
print('Facial animation state machine and optional PNG overlay renderer installed')
