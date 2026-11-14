// Bootstrap and the game loop.
// render/frame.js is imported first: it pulls in the scene, track, cars, particles and headlights in the
// order they have always been created, so object ids (and with them the renderer's draw order) stay the same.
import { render3D, rebuildPlayer, updateSignals, addTrafficMesh, removeTrafficMesh } from './render/frame.js';
import { emit } from './render/effects.js';
import { drawHUD } from './ui/hud.js';
import { AU } from './audio/engine-sound.js';
import { popSound, crashSound } from './audio/effects.js';
import { feedback } from './sim/feedback.js';
import { step } from './sim/step.js';
import { listenForInput } from './input/keys.js';
import { S, car, look } from './state.js';

Object.assign(feedback, { crashSound, popSound, emit, trafficAdded: addTrafficMesh, trafficRemoved: removeTrafficMesh });
listenForInput();
rebuildPlayer();                                          // idle scene behind the menu

let last = performance.now();
function loop(now){
  const dt = Math.min(.05,(now-last)/1000); last = now;
  if (S.started) step(dt);
  else { S.s += 18*dt; S.needle=0; S.rpm=900; }           // slow cruise behind menu
  if (!look.drag){ const k = Math.exp(-dt*4); look.yaw*=k; look.pitch*=k; }
  AU.update(S,car,dt); updateSignals(dt);
  render3D(dt);
  drawHUD();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// installable + offline: register the service worker (only works from http://localhost or https, not from a plain file).
// A failed registration is ignored on purpose: the game must still run without offline support.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) addEventListener("load", ()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
