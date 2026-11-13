from pathlib import Path
p=Path('/Users/jpsstudio/PresidentialCombat/presidential-combat-dev/public/index.html')
s=p.read_text()
needle="  bgCanvas=c;\n}\n\n/* Presidential Combat concept sprite layer."
assert needle in s
addition="""  // Arcade White House stage preview. Approved photographic artwork is still pending import.
  g.save();
  const lawn=FLOOR-60;
  g.fillStyle='#dce7f0';g.fillRect(VW/2-230,lawn-205,460,180);
  g.fillStyle='#f7f3e7';g.fillRect(VW/2-255,lawn-35,510,35);
  g.fillStyle='#c5d6e8';g.beginPath();g.moveTo(VW/2-255,lawn-205);g.lineTo(VW/2,lawn-270);g.lineTo(VW/2+255,lawn-205);g.closePath();g.fill();
  for(let i=-4;i<=4;i++){g.fillStyle='#fff8ed';g.fillRect(VW/2+i*48-12,lawn-195,24,160);g.fillStyle='#9aaec3';g.fillRect(VW/2+i*48-17,lawn-198,34,9);}
  g.fillStyle='#26344b';g.fillRect(VW/2-37,lawn-105,74,75);
  g.fillStyle='#15243c';g.fillRect(VW/2-260,lawn,520,9);
  // Cartoon limousine and spectators behind the playable floor.
  g.fillStyle='#111827';g.fillRect(70,lawn-30,190,27);g.fillRect(105,lawn-48,95,20);
  g.fillStyle='#9ee4ff';g.fillRect(116,lawn-43,70,13);
  for(let x of [110,222]){g.fillStyle='#0a0a14';g.beginPath();g.arc(x,lawn-2,15,0,Math.PI*2);g.fill();}
  for(let i=0;i<30;i++){const x=20+i*36,y=lawn-11+(i%3)*5;g.fillStyle=['#70452f','#bb8968','#e2bd95','#59382d'][i%4];g.beginPath();g.arc(x,y-27,9,0,7);g.fill();g.fillStyle=['#e23c43','#3a5a9b','#f2e9d5'][i%3];g.fillRect(x-10,y-17,20,19);}
  for(const [x,t] of [[135,'MAGA'],[820,'USA'],[955,'MAGA']]){g.fillStyle='#fff5d8';g.fillRect(x-37,lawn-100,74,27);g.strokeStyle='#e63e42';g.lineWidth=3;g.strokeRect(x-37,lawn-100,74,27);g.fillStyle='#ad2235';g.font='bold 17px sans-serif';g.textAlign='center';g.fillText(t,x,lawn-80);}
  g.restore();
"""
s=s.replace(needle,addition+needle)
needle="  if(f.anim==='crouch'||f.anim==='crouchBlock'||f.anim==='hit')return 'dodge';"
assert needle in s
s=s.replace(needle,"  if(f.anim==='block'||f.anim==='blockstun')return 'dodge';\n"+needle)
needle="    Audio5.play(m.special?'fire':'swish', m.special?0.5:0.3, 0.9+Rng.range(0,0.2));"
assert needle in s
s=s.replace(needle,"    Audio5.play(m.special?'fire':(key.toLowerCase().includes('kick')?'kick':'punch'), m.special?0.5:0.42, 0.9+Rng.range(0,0.2));")
p.write_text(s)
print('Stage preview, blocking pose and attack sound cues patched')
