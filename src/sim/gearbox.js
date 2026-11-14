// Gears (automatic, manual, neutral), the exhaust-bang queue, engine rpm and the speedometer needle.
import { S, car } from '../state.js';
import { feedback } from './feedback.js';

export const G_MAX = [.2,.35,.5,.65,.82,1.0],      // top speed share per gear
             G_BOOST = [1.5,1.3,1.1,.95,.85,.75];  // acceleration factor per gear

export function updateGearbox(dt){
  const v = S.v, top = car.topKmh/3.6;
  let gs = top*G_MAX[S.gear], r = v/gs;
  if (S.auto && !S.neutral && !S.rev){
    if (r>.93 && S.gear<5 && S.shiftT<=0){ S.gear++; S.shiftT=.22; }
    else if (S.gear>0 && v/(top*G_MAX[S.gear-1])<.55){ S.gear--; }
  }
  if (S.gear!==S.lastGear){
    if (["muscle","coupe","super"].includes(car.style) && S.started && !S.over){
      if (S.gear>S.lastGear){ S.popQ.push({t:0, s:1.15}); S.popQ.push({t:.12, s:1.05}); }  // upshift: two bangs
      else for (let i=0;i<4;i++) S.popQ.push({t:i*.11, s:1.8});                        // downshift: four big bangs
    }
    S.shAnim=1; S.lastGear=S.gear;
  }
  S.flameI = Math.max(0, S.flameI - dt*14);
  for (let i=S.popQ.length-1;i>=0;i--){ const p = S.popQ[i]; p.t -= dt; if (p.t<=0){ feedback.popSound(p.s); S.flameI = p.s; S.popQ.splice(i,1); } }
  S.shAnim = Math.max(0,S.shAnim-dt*4);
  gs = top*G_MAX[S.gear]; r = v/gs;
  const idle = 900, red = car.redline*1000;
  const target = S.neutral ? idle + S.throttle*(red-idle)*.97                                 // neutral: engine revs freely with the pedal
               : idle + Math.min(1.03,r)*(red-idle) + (S.shiftT>0?-500:0) + (S.throttle && v<2 ? 2500*S.throttle : 0);
  S.rpm += (target-S.rpm)*Math.min(1,dt*(S.neutral ? 6 : 10));
  S.rpm = Math.min(S.rpm, red*1.02);
  S.needle += (v*(car.gauge.unit==='mph'?2.23694:3.6) - S.needle)*Math.min(1,dt*8);
}

// manual gearbox (E): engage from neutral, else shift up
export function shiftUp(){
  if (S.neutral) S.neutral = false; else if (S.gear<5){ S.gear++; S.shiftT=.2; }
}
// manual gearbox (Q): shift down unless that would over-rev, or from 1st into neutral
export function shiftDown(){
  if (S.neutral) return;
  if (S.gear>0){ if (S.v/(car.topKmh/3.6*G_MAX[S.gear-1])<1.03){ S.gear--; S.shiftT=.15; } } else S.neutral = true;
}
