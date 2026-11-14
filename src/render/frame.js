// Per-frame scene update: the player's and traffic cars' meshes (pose, wheels, bonnet, paint, flames,
// indicators), the track around the car, the camera modes, and the render itself.
import * as THREE from '../three.js';
import { renderer, scene, camera, disposeObj, applyDark } from './scene.js';
import { updateTrack, placeScenery, setGroundShade } from '../world/track.js';
import { buildCar, glowK } from '../cars/build-car.js';
import { updateParts, updateFlames } from './effects.js';
import { updateHeadlights } from './headlights.js';
import { placeOn, slopeAt } from '../world/road.js';
import { S, W, car, free, look } from '../state.js';
import { traffic } from '../sim/traffic.js';
import { cancelIndicatorsAfterTurn } from '../sim/driving.js';
import { clickSound } from '../audio/effects.js';

export const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();

export let playerMesh = null;
export function rebuildPlayer(){ if (playerMesh) disposeObj(playerMesh); playerMesh = buildCar(car, car.color, {stripes:car.stripes, flames:true}); scene.add(playerMesh); }

const trafficMeshes = new Map();                       // traffic record -> its car mesh
export function addTrafficMesh(t){ const m = buildCar(t.sp, t.color); scene.add(m); trafficMeshes.set(t, m); }
export function removeTrafficMesh(t){ disposeObj(trafficMeshes.get(t)); trafficMeshes.delete(t); }

/* indicators: one blink phase for every car, the HUD arrows and the tick sound */
let _sigT = 0;
export let sigPh = 1;
const SIG_ON = 0xffb020, SIG_OFF = 0x3a2200;
function setSig(mesh, l, r, ph){ const u = mesh.userData.ind; if (!u) return; u.L.color.setHex(l&&ph ? SIG_ON : SIG_OFF); u.R.color.setHex(r&&ph ? SIG_ON : SIG_OFF); }
const TAIL_DIM = 0x8a1010, TAIL_BRAKE = 0xff2a2a;
function setBrake(mesh, on){ mesh.userData.tail.color.setHex(on ? TAIL_BRAKE : TAIL_DIM); }
export function updateSignals(dt){
  _sigT += dt; const ph = (Math.floor(_sigT*2.6)%2)===0 ? 1 : 0;
  if ((S.sigL || S.sigR) && S.started && ph!==sigPh) clickSound(ph);
  sigPh = ph;
  cancelIndicatorsAfterTurn();
  setSig(playerMesh, S.sigL, S.sigR, ph);
  setBrake(playerMesh, S.brake || S.hand);
  playerMesh.userData.reverseLamp.color.setHex(S.rev ? 0xfff6cc : 0x4a4a46);
  for (const t of traffic){ t.sigT -= dt; const m = trafficMeshes.get(t); setSig(m, t.sig<0 && t.sigT>0, t.sig>0 && t.sigT>0, ph); setBrake(m, t.braking); }
}
function spinWheels(mesh, v, steer, dt){
  const u = mesh.userData, step = Math.max(-.9, Math.min(.9, v*dt/u.wr));   // capped so fast wheels do not strobe; negative v spins backwards
  u.spin += step;
  for (const w of u.wheels){ w.w.rotation.x = u.spin; if (w.front) w.o.rotation.y = -steer; }
}
const DAY_LENGTH = 240;                                // seconds for one full day in the automatic cycle (starts at noon)
let darkShown = 0;
function updateSky(dt){
  if (S.sky === 'auto') S.clock = (S.clock + dt/DAY_LENGTH) % 1;
  const noonToMidnight = .5 - .5*Math.cos(S.clock*2*Math.PI);                  // 0 at noon, 1 at midnight
  const target = S.sky === 'night' ? 1 : S.sky === 'day' ? 0 : Math.min(1, Math.max(0, (noonToMidnight-.25)*2));   // long days and nights, short dusk
  S.dark += (target - S.dark) * Math.min(1, dt*1.5);                           // K eases between day and night instead of cutting
  if (Math.abs(S.dark - darkShown) > .004){ darkShown = S.dark; applyDark(darkShown); setGroundShade(darkShown); }
}
export function render3D(dt){
  updateSky(dt);
  const p = placeOn(playerMesh, S.s, S.d, S.psi);
  const Hc = p.H + S.psi, rx=-Math.cos(p.H), rz=Math.sin(p.H);
  W.x = p.x+rx*S.d; W.y = p.y; W.z = p.z+rz*S.d; W.H = Hc; W.fx = Math.sin(Hc); W.fz = Math.cos(Hc);
  playerMesh.visible = S.cam!=='fp';
  const dm = 1-S.health/100;
  spinWheels(playerMesh, S.rev ? -S.v : S.v, S.steer*.32/(1+Math.pow(S.v/12,1.5))*1.1, dt);
  S.hoodA += ((S.hoodOpen ? .95 : 0) - S.hoodA)*Math.min(1, dt*5);
  playerMesh.userData.hood.rotation.x = -Math.max(dm*.5, S.hoodA);
  if (playerMesh.userData.engine) playerMesh.userData.engine.visible = playerMesh.userData.hood.rotation.x < -.15;
  playerMesh.userData.body.color.copy(playerMesh.userData.baseColor).lerp(new THREE.Color(0x151515), dm*.55);
  playerMesh.userData.body.emissive.copy(playerMesh.userData.body.color).multiplyScalar(glowK(playerMesh.userData.body.color));
  updateFlames(playerMesh.userData.flames);

  for (const t of traffic){ const m = trafficMeshes.get(t); placeOn(m, t.s, t.d, t.psi||0); spinWheels(m, t.v, 0, dt); }
  updateTrack(); placeScenery(); updateParts(dt);

  const sl = slopeAt(S.s);
  const sh = S.shake*.12;
  updateHeadlights(Hc, sl);
  if (S.cam==='fp'){
    camera.fov = 72; camera.updateProjectionMatrix();
    camPos.set(W.x+W.fx*.25 + (Math.random()-.5)*sh, W.y+1.2+(Math.random()-.5)*sh, W.z+W.fz*.25);
    camera.position.copy(camPos);
    const hl = Hc - look.yaw;
    camLook.set(camPos.x+Math.sin(hl)*30, camPos.y+sl*30-5.0+Math.tan(look.pitch)*30, camPos.z+Math.cos(hl)*30);
    camera.lookAt(camLook);
    camera.rotateZ(-S.steer*Math.min(1,S.v/40)*.015 + (Math.random()-.5)*sh*.2);
  } else if (S.cam==='free'){
    camera.fov = 60; camera.updateProjectionMatrix();
    const az = Hc + Math.PI + free.rel, cp = Math.cos(free.pitch), d = free.dist;
    camPos.set(W.x + Math.sin(az)*cp*d, W.y + .8 + Math.sin(free.pitch)*d, W.z + Math.cos(az)*cp*d);
    camera.position.set(camPos.x+(Math.random()-.5)*sh*.5, camPos.y+(Math.random()-.5)*sh*.5, camPos.z);
    camera.lookAt(W.x, W.y+.7, W.z);
  } else {
    camera.fov = 64; camera.updateProjectionMatrix();
    const hl = Hc - look.yaw, dist = 7.2+S.v*.02;
    const want = new THREE.Vector3(W.x-Math.sin(hl)*dist, Math.max(W.y+.8, W.y+2.6+sl*-4+Math.max(-1.7,Math.tan(look.pitch)*dist)), W.z-Math.cos(hl)*dist);   // never dips under the road
    camPos.lerp(want, Math.min(1,dt*6)); if (camPos.distanceTo(want)>30) camPos.copy(want);
    camera.position.set(camPos.x+(Math.random()-.5)*sh, camPos.y+(Math.random()-.5)*sh, camPos.z);
    camera.lookAt(W.x+W.fx*8, W.y+1.0+sl*8, W.z+W.fz*8);
  }
  renderer.render(scene, camera);
}
