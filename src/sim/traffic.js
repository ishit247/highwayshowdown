// NPC cars: spawning ahead of the player, the lane-keeping and overtaking AI, and despawning behind.
import { S, car } from '../state.js';
import { LANES } from '../config.js';
import { STYLES } from '../cars/specs.js';
import { npcContact, contactLength } from './collisions.js';
import { feedback } from './feedback.js';

export const traffic = [];
const TCOL = [0xffffff,0xc9ccd1,0x202226,0x1f4fa3,0xb71c1c,0x2e7d32,0xf5f5f5,0x5d4037,0x9e9e9e];
function spawnTraffic(){
  const li = Math.floor(Math.random()*3), lane = LANES[li], s = S.s + 450 + Math.random()*400;
  if (traffic.some(t=>Math.abs(t.d-lane)<2.2 && Math.abs(t.s-s)<70)) return;
  const names = Object.keys(STYLES), st = STYLES[names[Math.floor(Math.random()*names.length)]];
  const color = TCOL[Math.floor(Math.random()*TCOL.length)];
  const v0 = 15+Math.random()*15;
  const t = {sp:st, color, s, d:lane, lane:li, v:v0, v0, psi:0, lcT:0, sig:0, sigT:0, cool:0, passed:false, hit:false};
  traffic.push(t); feedback.trafficAdded(t);
}
export function clearTraffic(){ traffic.forEach(t=>feedback.trafficRemoved(t)); traffic.length=0; }

// live: the run was going at the start of the frame
export function updateTraffic(dt, live){
  const want = 7 + Math.min(8, Math.floor(S.dist/1500));
  if (traffic.length < want && S.started) spawnTraffic();
  for (let i=traffic.length-1;i>=0;i--){
    const t = traffic[i]; t.cool -= dt;
    // --- traffic AI: keep a gap to the car ahead, overtake when the next lane is clear, never overlap ---
    let lead = null, gap = 1e9;
    for (const o of traffic){
      if (o===t || Math.abs(o.d-t.d) > 2.0) continue;
      const g = o.s-t.s-(o.sp.len+t.sp.len)/2;
      if (g > -1 && g < gap){ gap = g; lead = o; }
    }
    const safe = 8 + t.v*1.1;
    let vt = t.v0;
    if (lead && gap < safe){
      vt = Math.min(t.v0, lead.v*(.6+.4*Math.max(0,gap-3)/(safe-3)));
      if (gap < 3) vt = Math.min(vt, lead.v*.6);
    }
    t.braking = vt < t.v - .5;                                  // lights the brake lamps (render/frame.js)
    t.v += Math.max(-9*dt, Math.min(3*dt, vt - t.v));
    if (lead && gap < 1.2){ t.s -= (1.2-gap); t.v = Math.min(t.v, lead.v); }
    t.lcT -= dt;
    if (lead && gap < safe && t.v0 > lead.v+1.5 && t.lcT <= 0 && Math.abs(t.d-LANES[t.lane]) < .3){
      for (const dl of (Math.random()<.5 ? [-1,1] : [1,-1])){
        const nl = t.lane+dl; if (nl<0 || nl>2) continue; const nd = LANES[nl];
        const busy = traffic.some(o=>o!==t && Math.abs(o.d-nd)<2.2 && o.s-t.s > -(12+o.v*.5) && o.s-t.s < safe+14);
        const pBusy = Math.abs(S.d-nd)<2.2 && S.s-t.s > -20 && S.s-t.s < 25;
        if (!busy && !pBusy){ t.lane = nl; t.lcT = 4; t.sig = dl; t.sigT = 3; break; }
      }
      if (t.lcT <= 0) t.lcT = 1;
    }
    const lvel = Math.max(-2.2, Math.min(2.2, (LANES[t.lane]-t.d)*2)); t.d += lvel*dt; t.psi = -Math.atan2(lvel, Math.max(5,t.v));
    t.s += t.v*dt;
    npcContact(t, live);
    if (!t.passed && t.s < S.s-contactLength(t)){ t.passed=true; if(!t.hit) S.overtakes++; }
    if (t.s < S.s-140 || t.s > S.s+1200){ feedback.trafficRemoved(t); traffic.splice(i,1); }
  }
}
