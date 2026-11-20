import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
export async function run(t){
 const d=JSON.parse(readFileSync(resolve('public/data/shared-combat-library.json'),'utf8'));
 const ids=Object.values(d.categories).flat().map(x=>x.id);
 t.eq(new Set(ids).size,ids.length,'shared combat feature IDs are unique');
 t.ok(ids.includes('throw_forward')&&ids.includes('throw_escape'),'throws and escapes are included');
 t.ok(ids.includes('crossup_facing')&&ids.includes('corner_escape'),'crossups and corner combat are included');
 t.ok(ids.includes('reach_alignment')&&ids.includes('light_heavy_strength'),'reach and attack strengths are included');
 t.ok(ids.includes('flip_kick')&&ids.includes('ground_roll'),'aerial attacks and recovery are included');
 t.ok(d.categories.grappling.every(x=>x.status==='planned'),'unimplemented grappling is not falsely marked complete');
}
