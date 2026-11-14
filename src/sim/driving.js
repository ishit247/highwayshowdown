// The player's car in road coordinates: pedals and steering from the held keys, speed, the grip-limited
// kinematic bicycle, and the guard-rail clamp.
import { S, car, keys, W } from '../state.js';
import { LIM, BARRIER } from '../config.js';
import { kappa } from '../world/road.js';
import { G_MAX, G_BOOST } from './gearbox.js';
import { crash } from './collisions.js';
import { feedback } from './feedback.js';

// live: the run was going at the start of the frame; dmgf: damage share at the start of the frame
export function drive(dt, live, dmgf){
  S.t += dt;
  S.hint = Math.max(0, S.hint-dt);
  S.shake = Math.max(0, S.shake-dt*1.6); S.flash = Math.max(0, S.flash-dt*1.5); S.cool=Math.max(0,S.cool-dt);
  S.scrapeT = Math.max(0, S.scrapeT-dt);
  S.throttle = live && (keys['w']||keys['arrowup']) ? 1 : 0;
  S.brake    = live && (keys['s']||keys['arrowdown']) ? 1 : 0;
  S.hand     = live && keys[' '] ? 1 : 0;
  const tgt = live ? ((keys['d']||keys['arrowright']?1:0) - (keys['a']||keys['arrowleft']?1:0)) : 0;
  S.steer += (tgt-S.steer)*Math.min(1, dt*(tgt?4.5:9));

  const vmax = car.topKmh/3.6*(1-.4*dmgf);
  let v = S.v;
  let a = S.neutral ? 0 : car.accel*G_BOOST[S.gear]*S.throttle*(1-Math.pow(Math.max(0,v)/vmax,2.4));   // neutral: no drive to the wheels
  if (S.shiftT>0){ S.shiftT-=dt; a*=.15; }
  if (!S.auto){                                    // manual box: rev limiter + lugging
    const r0 = v/(car.topKmh/3.6*G_MAX[S.gear]);
    if (r0>1) a*=.05; a*=Math.min(1,.3+r0*1.4);
  }
  a -= .12 + .0008*v*v;
  if (!S.throttle && !S.neutral) a -= .5;                                          // no engine braking in neutral
  if (S.brake) a -= 10*(car.grip/10)*(1-.35*dmgf);
  if (S.hand) a -= 5;
  if (S.over) a -= 14;
  if (v>vmax && S.throttle) a -= .3*(v-vmax);
  v = Math.max(0, v + a*dt);

  // steering: kinematic bicycle in road coordinates with a grip limit (understeer)
  const L = 2.7, delta = S.steer*.32/(1+Math.pow(v/12,1.5));
  let yaw = -v*Math.tan(delta)/L;
  let aMax = car.grip*(S.hand?.55:1);
  const aLat = v*Math.abs(yaw); S.slip = 0;
  if (aLat>aMax){ yaw *= aMax/aLat; S.slip = Math.min(1,(aLat-aMax)/aMax+.35); }
  if (S.hand && v>8 && Math.abs(S.steer)>.1) S.slip = Math.max(S.slip,.6);
  yaw += S.pullBias*dmgf*.05*Math.min(1,v/12);
  S.psi += (yaw - v*kappa(S.s))*dt;
  S.psi = Math.max(-1.1,Math.min(1.1,S.psi));
  v -= v*Math.abs(Math.sin(S.psi))*1.6*dt;           // tyre scrub when sideways
  if (Math.abs(Math.sin(S.psi))>.18) S.slip = Math.max(S.slip, Math.abs(Math.sin(S.psi))*2);

  S.d += -v*Math.sin(S.psi)*dt;
  S.s += v*Math.cos(S.psi)*dt;
  S.dist += v*dt;

  // guard rails
  // the rail face is at BARRIER-.45: stop the car body (width + length at its yaw angle), not just its centre
  const bodyExt = (car.wid/2+.2)*Math.abs(Math.cos(S.psi)) + (car.len/2+.1)*Math.abs(Math.sin(S.psi));
  const dLim = Math.min(LIM, BARRIER-.45-.05-bodyExt);
  if (Math.abs(S.d) >= dLim){
    const side = Math.sign(S.d), impact = v*Math.abs(Math.sin(S.psi))+v*.08;
    S.d = side*dLim;
    if (S.cool<=0 && impact>2.5){ crash(impact*impact*.02*Math.sqrt(1500/car.mass), W.x, W.y+.5, W.z); S.cool=.5; S.psi = -side*Math.abs(S.psi)*.3 + (-side)*.08; v*=.85; }
    S.scrapeT = .15; v -= 4*dt*(1+v/20);
    if (v>3) feedback.emit(1,W.x+(-Math.cos(W.H))*side*bodyExt,W.y+.3,W.z+Math.sin(W.H)*side*bodyExt,(Math.random()-.5)*4,Math.random()*3,(Math.random()-.5)*4,.4,.25,0xffd070);
    S.psi *= (1-3*dt);
    v = Math.max(0,v);
  }
  S.v = v;
}

// an indicator cancels itself once you have steered into the turn and straightened up again
export function cancelIndicatorsAfterTurn(){
  const dir = S.sigR ? 1 : S.sigL ? -1 : 0;
  if (S.started && dir){ if (S.steer*dir>.45) S.sigSteer = 1; else if (S.sigSteer && S.steer*dir<.08){ S.sigL = S.sigR = false; S.sigSteer = 0; } }
  else S.sigSteer = 0;
}
