import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function run(t){
  const config=JSON.parse(readFileSync(resolve(root,'public/data/fighter.neon.json'),'utf8'));
  const html=readFileSync(resolve(root,'public/index.html'),'utf8');
  const sweep=config.moves.tripSweep;
  t.ok(!!sweep,'sweep is defined in fighter config');
  t.eq(sweep.height,'low','sweep is blockable low');
  t.ok(sweep.startup>=7 && sweep.recovery>=12,'sweep has counterplay windows');
  t.ok(sweep.box.y<0 && sweep.box.y>-55,'sweep collision is at ankle height');
  t.ok(html.includes("this.buf.consume('kick'); this.startMove('tripSweep');"),'DOWN + KICK triggers sweep');
  t.ok(html.includes("atk.key==='tripSweep'"),'sweep has distinct knockdown response');
  t.ok(html.includes('const stagedFall='),'KO uses staged fall motion');
  t.ok(html.includes('moveFrames/60'),'voice timing considers move duration');
  t.ok(html.includes("Game.phase='finishWindow'"),'finisher interrupts combat before KO');
  t.ok(html.includes('P1.hp<=15&&P2.hp>15'),'finisher threshold uses final 15 health points');
  t.ok(html.includes("if(T>=420){pcFinisherClose();endRound(Game.winner,true);}"),'finisher timeout completes normal knockout');
  t.ok(html.includes("if(f.anim==='ko'||f.state==='ko')return 'idle';"),'KO uses relaxed idle sprite instead of guarding sprite');
  t.ok(html.includes("Game.phase==='finishWindow' && pcFinisherShown"),'shared daze is confined to pre-KO window');
  t.eq(config.moves.micLasso.superCost,35,'Trump mic super costs 35 meter');
  t.ok(config.motions.some(m=>m.move==='micLasso'&&m.btn==='kick'),'mic super has a kick motion input');
  t.ok(html.includes("p.kind==='mic'"),'microphone has a distinct projectile presentation');
  t.ok(html.includes('Math.min(65,Math.max(0,Math.abs(gap)-78))'),'microphone pull is bounded');
  t.ok(html.includes("this.idx!==0 || Net.active"),'prototype mic super limited to Trump and offline matches');
}
