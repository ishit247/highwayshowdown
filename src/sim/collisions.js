// Damage from crashes, and the player's contacts with NPC cars (solid every frame, damage on first contact).
import { S, car, W } from '../state.js';
import { feedback } from './feedback.js';

function addCrack(){
  const cx = .2+Math.random()*.6, cy = .1+Math.random()*.6, lines=[];
  const n = 5+Math.floor(Math.random()*4);
  for(let i=0;i<n;i++){
    const a = Math.random()*6.28; let x=cx,y=cy; const pts=[[x,y]];
    for(let j=0;j<3+Math.floor(Math.random()*3);j++){ x+=Math.cos(a+(Math.random()-.5))*(.04+Math.random()*.07); y+=Math.sin(a+(Math.random()-.5))*(.04+Math.random()*.07); pts.push([x,y]); }
    lines.push(pts);
  }
  S.cracks.push(lines);
}
// dmg in health points; (wx, wy, wz) is where the sparks fly from
export function crash(dmg, wx, wy, wz){
  if (S.over) return;
  S.health = Math.max(0, S.health-dmg);
  S.shake = Math.min(1, .25+dmg/18); S.flash = Math.max(S.flash, Math.min(.7, dmg/18));
  feedback.crashSound(Math.min(1, dmg/14+.15));
  if (dmg>2) S.pullBias = Math.max(-1,Math.min(1,S.pullBias+(Math.random()-.5)*dmg*.1));
  if (dmg>3.5 && S.cracks.length<7) addCrack();
  for(let i=0;i<Math.min(24,6+dmg*2);i++) feedback.emit(1,wx,wy,wz,(Math.random()-.5)*10+W.fx*S.v*.4,Math.random()*5,(Math.random()-.5)*10+W.fz*S.v*.4,.5+Math.random()*.5,.35,0xffcc66);
  if (S.health<=0){ S.over=true; feedback.crashSound(1); }
}

// half the bumper-to-bumper length at which the player and NPC car t touch
export const contactLength = t => (car.len+t.sp.len)/2*.92;

export function npcContact(t, live){
  const ds = t.s-S.s, dd = t.d-S.d, hl = contactLength(t), hw = (car.wid+t.sp.wid)/2*.9;
  if (!(live && Math.abs(ds)<hl && Math.abs(dd)<hw)) return;
  // damage + bounce only on first contact (1 s cooldown) ...
  const first = t.cool<=0, old = S.v;
  if (first){
    const rel = Math.max(2, Math.abs(S.v-t.v)*(ds>0?1:.6));
    crash(rel*rel*.028*Math.sqrt(1500/car.mass), W.x+W.fx*(ds>0?car.len/2:-car.len/2), W.y+.6, W.z+W.fz*(ds>0?car.len/2:-car.len/2));
    t.cool=1; t.hit=true;
    if (Math.abs(dd)>hw*.65) S.psi += Math.sign(dd)*.12; else S.psi += (Math.random()-.5)*.25;
  }
  // ... but the NPC car is SOLID every frame, so you can never drive through it
  if (Math.abs(dd) > hw*.65){                               // side-swipe: push the two cars apart sideways
    const ov = hw-Math.abs(dd);
    S.d += -Math.sign(dd)*(ov*.6+.02); t.d += Math.sign(dd)*(ov*.4+.02);
    if (first) S.v *= .96;
  } else if (ds > 0){                                       // NPC ahead: you stop behind it
    S.s = t.s-hl-.02;
    if (first) t.v += Math.max(0,old-t.v)*.25;              // shunts it forward a little
    S.v = Math.min(S.v, t.v);
  } else {                                                  // NPC hit you from behind
    t.s = S.s-hl-.02; t.v = Math.min(t.v, Math.max(5,S.v-1));
  }
}

// smoke from a damaged engine; dmgf is the damage share at the start of the frame
export function damageSmoke(dt, dmgf){
  if (S.health<65 && Math.random()<dt*(10+dmgf*40)){
    const hx = W.x+W.fx*(car.len/2-.4), hz = W.z+W.fz*(car.len/2-.4);
    const dark = S.health<30;
    feedback.emit(0,hx,W.y+.85,hz,W.fx*S.v*.9+(Math.random()-.5),1.2+Math.random(),W.fz*S.v*.9+(Math.random()-.5),1.2+Math.random()*.8,.7,dark?0x222222:0xbbbbbb);
  }
}
