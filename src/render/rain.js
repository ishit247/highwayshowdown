// Falling rain: short streaks that live in world space inside a box around the camera and wrap round it,
// so driving through them streaks them past the windscreen. Nothing is allocated per frame.
import * as THREE from '../three.js';
import { scene } from './scene.js';

const COUNT = 900, BOX = 30, TOP = 12, FALL = 20, LEN = .7;
const drops = new Float32Array(COUNT*3);                        // head position of each streak
for (let i=0;i<drops.length;i+=3){ drops[i] = Math.random()*BOX; drops[i+1] = Math.random()*TOP; drops[i+2] = Math.random()*BOX; }
const lines = new Float32Array(COUNT*6);
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(lines,3));
const mat = new THREE.LineBasicMaterial({color:0xbcc6d0, transparent:true, opacity:.4, fog:false});
const rain = new THREE.LineSegments(geo, mat);
rain.frustumCulled = false; rain.visible = false; scene.add(rain);

const wrap = (v, origin, size) => origin + ((v - origin) % size + size) % size;

// amount 0..1 sets how many streaks show; dark dims them; (cx, cy, cz) is the camera.
export function updateRain(dt, amount, dark, cx, cy, cz){
  rain.visible = amount > .01;
  if (!rain.visible) return;
  geo.setDrawRange(0, Math.floor(COUNT*amount)*2);
  mat.color.setHex(0xbcc6d0).multiplyScalar(1 - .75*dark);
  const x0 = cx - BOX/2, z0 = cz - BOX/2, y0 = cy - 3;
  for (let i=0, j=0; i<COUNT; i++, j+=6){
    const o = i*3;
    drops[o+1] -= FALL*dt;
    const x = drops[o] = wrap(drops[o], x0, BOX), y = drops[o+1] = wrap(drops[o+1], y0, TOP), z = drops[o+2] = wrap(drops[o+2], z0, BOX);
    lines[j] = x; lines[j+1] = y; lines[j+2] = z; lines[j+3] = x; lines[j+4] = y + LEN; lines[j+5] = z;
  }
  geo.attributes.position.needsUpdate = true;
}
