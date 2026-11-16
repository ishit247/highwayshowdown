// Scenery beside and over the road: mountains, clouds, bushes, rocks, buildings, bridges and tunnels.
// Everything is visual only (the simulation never sees it) and drawn with a few instanced meshes. Objects are
// recycled by index along the road like the trees in track.js, and their look comes from hash(), not Math.random().
import * as THREE from '../three.js';
import { scene } from '../render/scene.js';
import { BARRIER } from '../config.js';
import { trackAt, slopeAt, hash } from './road.js';
import { S } from '../state.js';

const dummy = new THREE.Object3D(), tint = new THREE.Color();
const mod = (k, n) => ((k % n) + n) % n;
const srgb = hex => new THREE.Color().setHex(hex, THREE.SRGBColorSpace);
function canvasOf(w, h, draw){ const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function instanced(geometry, material, count){
  const m = new THREE.InstancedMesh(geometry, material, count);
  m.frustumCulled = false;                                   // instances span the whole visible stretch of road
  scene.add(m); return m;
}
// Where the road is at s, and the point d metres to its right (the same sideways rule the trees use).
function roadPoint(s, d, out){ const p = trackAt(s); out.set(p.x - Math.cos(p.H)*d, p.y, p.z + Math.sin(p.H)*d); return p; }

/* ---- bridges and tunnels: fixed places along the road ---- */
const BRIDGE_SP = 1000, BRIDGE_OFF = 300, BRIDGE_POOL = 3, BRIDGE_DECK_M = 6.8, BRIDGE_LEN_M = 9;
const TUNNEL_SP = 2400, TUNNEL_OFF = 900, TUNNEL_LEN = 600, SEG_LEN_M = 8, TUNNEL_SEGS = TUNNEL_LEN / SEG_LEN_M, TUNNEL_R = 9.5;
const bridgeS = b => BRIDGE_OFF + b*BRIDGE_SP;
export function inTunnel(s, margin = 0){ return s >= TUNNEL_OFF - margin && (s - TUNNEL_OFF) % TUNNEL_SP < TUNNEL_LEN + margin; }
const bridgeAt = b => b >= 0 && !inTunnel(bridgeS(b), BRIDGE_LEN_M);
// True where a tree, lamp, bush or rock would poke through a bridge or a tunnel roof.
export function nearStructure(s){
  const b = Math.round((s - BRIDGE_OFF) / BRIDGE_SP);
  return inTunnel(s, 6) || (bridgeAt(b) && Math.abs(s - bridgeS(b)) < BRIDGE_LEN_M);
}

const concrete = new THREE.MeshLambertMaterial({color: 0x9a9da2});
const box = new THREE.BoxGeometry(1, 1, 1);
const bridgeParts = instanced(box, concrete, BRIDGE_POOL * 5);
const BRIDGE_HALF_W_M = BARRIER + 5;
// One bridge = deck, two parapets along its edges and two pillars outside the guard rails. [x, y, z, width, height, length]
const BRIDGE_PARTS = [
  [0, BRIDGE_DECK_M, 0, 2*BRIDGE_HALF_W_M, 1.2, BRIDGE_LEN_M],
  [-BRIDGE_HALF_W_M + .3, BRIDGE_DECK_M + 1, 0, .6, 1, BRIDGE_LEN_M], [BRIDGE_HALF_W_M - .3, BRIDGE_DECK_M + 1, 0, .6, 1, BRIDGE_LEN_M],
  [-(BARRIER + 2.8), BRIDGE_DECK_M/2, 0, 1.4, BRIDGE_DECK_M, 5], [BARRIER + 2.8, BRIDGE_DECK_M/2, 0, 1.4, BRIDGE_DECK_M, 5],
];
const bridgeShown = new Array(BRIDGE_POOL).fill(-1);
function placeBridges(){
  const b0 = Math.max(0, Math.floor((S.s - 100 - BRIDGE_OFF) / BRIDGE_SP));
  let changed = false;
  for (let b = b0; b < b0 + BRIDGE_POOL; b++){
    const slot = b % BRIDGE_POOL; if (bridgeShown[slot] === b) continue;
    bridgeShown[slot] = b; changed = true;
    const s = bridgeS(b), p = trackAt(s), cos = Math.cos(p.H), sin = Math.sin(p.H);
    BRIDGE_PARTS.forEach(([x, y, z, w, h, l], i) => {
      dummy.position.set(p.x - cos*x + sin*z, p.y + y, p.z + sin*x + cos*z);
      dummy.rotation.set(0, p.H, 0); dummy.scale.set(bridgeAt(b) ? w : 0, h, l);
      dummy.updateMatrix(); bridgeParts.setMatrixAt(slot*5 + i, dummy.matrix);
    });
  }
  if (changed) bridgeParts.instanceMatrix.needsUpdate = true;
}

// A tunnel is a long row of arch segments: concrete inside, a ring of light on every segment, a mountain over the top,
// and a concrete portal (headwall with the arch cut out, cap and wing walls) at each end.
const arch = (r, len) => new THREE.CylinderGeometry(r, r, len, 14, 1, true, Math.PI/2, Math.PI).rotateX(Math.PI/2);   // upper half-pipe along the road
const PORTAL_HALF_W_M = TUNNEL_R + 6, PORTAL_H_M = TUNNEL_R + 3, PORTAL_THICK_M = 1.6, WING_LEN_M = 14;
const portalGeo = (() => {                                   // the wall starts 1 m below the road so the arch's foot is not on its edge
  const wall = new THREE.Shape().moveTo(-PORTAL_HALF_W_M, -1).lineTo(PORTAL_HALF_W_M, -1).lineTo(PORTAL_HALF_W_M, PORTAL_H_M).lineTo(-PORTAL_HALF_W_M, PORTAL_H_M).closePath();
  wall.holes.push(new THREE.Path().moveTo(TUNNEL_R, 0).absarc(0, 0, TUNNEL_R, 0, Math.PI, false).closePath());
  return new THREE.ExtrudeGeometry(wall, {depth: PORTAL_THICK_M, bevelEnabled: false}).translate(0, 0, -PORTAL_THICK_M/2);
})();
const wallTex = THREE.canvasTexture(canvasOf(128, 128, (x, w, h) => {
  x.fillStyle = '#b9b9b4'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++){ x.fillStyle = `rgba(30,30,25,${.03 + hash(i*1.7)*.08})`; x.fillRect(hash(i*3.1)*w, 0, 2 + hash(i*5.3)*8, h); }   // rain stains run down
  for (let i = 0; i < 1500; i++){ x.fillStyle = `rgba(0,0,0,${hash(i*2.9)*.12})`; x.fillRect(hash(i*7.3)*w, hash(i*1.3)*h, 2, 2); }
}));
const tunnelInside = instanced(arch(TUNNEL_R, SEG_LEN_M + .4), new THREE.MeshBasicMaterial({map: wallTex, side: THREE.BackSide}), TUNNEL_SEGS);
const tunnelLights = instanced(arch(TUNNEL_R - .15, .35), new THREE.MeshBasicMaterial({color: 0xffe6a8, side: THREE.BackSide}), TUNNEL_SEGS);
// The mountain is one ridge mesh made of cross-section rings along the road, so it follows the road's bends. Its height
// rises from just above the portals to the full ridge; its footprint widens with the height (constant side slope),
// so it hugs the portal wall instead of burying the road beyond it. Rewritten only when the tunnel is recycled.
const RIDGE_H_M = 120, RIDGE_SIDE = .8, RIDGE_END_RISE = .8, RIDGE_BASE_M = -4, RIDGE_LEVELS = 4;
const RING_PTS = 2*RIDGE_LEVELS + 1, RINGS = TUNNEL_SEGS + 1;
const ridgeGeo = (() => {
  const g = new THREE.BufferGeometry(), index = new Uint16Array((RINGS - 1)*(RING_PTS - 1)*6);
  let n = 0;
  for (let r = 0; r < RINGS - 1; r++) for (let i = 0; i < RING_PTS - 1; i++){
    const a = r*RING_PTS + i, c = a + RING_PTS; index.set([a, c, a + 1, a + 1, c, c + 1], n); n += 6;
  }
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RINGS*RING_PTS*3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(RINGS*RING_PTS*3), 3));
  return g;
})();
const ridgeBands = [[.3, srgb(0x4f6340)], [.8, srgb(0x6d6a66)], [9, srgb(0xf2f4f7)]];   // grass, rock, snow by height
const tunnelHill = new THREE.Mesh(ridgeGeo, new THREE.MeshLambertMaterial({vertexColors: true, flatShading: true, side: THREE.DoubleSide}));
tunnelHill.frustumCulled = false; tunnelHill.visible = false; scene.add(tunnelHill);
function shapeRidge(start, t){
  const pos = ridgeGeo.attributes.position, col = ridgeGeo.attributes.color;
  for (let r = 0; r < RINGS; r++){
    const s = start + r*SEG_LEN_M, dist = Math.min(r*SEG_LEN_M, TUNNEL_LEN - r*SEG_LEN_M), p = trackAt(s), cos = Math.cos(p.H), sin = Math.sin(p.H);
    const crag = 1 + .3*(hash(r*1.7 + t*13) - .5)*Math.min(1, dist/60);               // a craggy skyline, none at the portals
    const h = Math.min(PORTAL_H_M + 3 + RIDGE_END_RISE*dist, RIDGE_H_M)*crag, halfW = h/RIDGE_SIDE;
    for (let i = 0; i < RING_PTS; i++){
      const level = i <= RIDGE_LEVELS ? i : 2*RIDGE_LEVELS - i, f = level/RIDGE_LEVELS, x = (i <= RIDGE_LEVELS ? -1 : 1)*(1 - f)*halfW;
      const y = RIDGE_BASE_M + f*(h - RIDGE_BASE_M), v = r*RING_PTS + i, c = ridgeBands.find(b => y/RIDGE_H_M < b[0])[1];
      pos.setXYZ(v, p.x - cos*x, p.y + y, p.z + sin*x); col.setXYZ(v, c.r, c.g, c.b);
    }
  }
  pos.needsUpdate = col.needsUpdate = true;
}
const portalWalls = instanced(portalGeo, concrete, 2);
const portalTrim = instanced(box, concrete, 2*3);            // per portal: cap on top, then two wing walls
let tunnelShown = -2;                                        // index of the tunnel whose segments are loaded; -1 none, -2 nothing written yet
function put(mesh, i, s, x, y, z, ry, sx, sy, sz){           // x sideways, z along the road, both measured from the road point at s
  const p = trackAt(s), cos = Math.cos(p.H), sin = Math.sin(p.H);
  dummy.position.set(p.x - cos*x + sin*z, p.y + y, p.z + sin*x + cos*z);
  dummy.rotation.set(0, p.H + ry, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
}
function placeTunnel(){
  const t = Math.max(0, Math.floor((S.s - 40 - TUNNEL_OFF - TUNNEL_LEN) / TUNNEL_SP) + 1), start = TUNNEL_OFF + t*TUNNEL_SP;
  const want = start < S.s + 800 ? t : -1, on = want < 0 ? 0 : 1;
  if (want === tunnelShown) return;
  tunnelShown = want;
  for (let j = 0; j < TUNNEL_SEGS; j++){
    const s = start + (j + .5)*SEG_LEN_M, p = trackAt(s);
    dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(-Math.atan(slopeAt(s)), p.H, 0, 'YXZ');
    dummy.scale.set(on, 1, 1); dummy.updateMatrix();
    tunnelInside.setMatrixAt(j, dummy.matrix); tunnelLights.setMatrixAt(j, dummy.matrix);
  }
  tunnelHill.visible = want >= 0;
  if (want >= 0) shapeRidge(start, want);
  [-1, 1].forEach((end, e) => {                              // end -1 = entrance, +1 = exit
    const s = end < 0 ? start + PORTAL_THICK_M/2 : start + TUNNEL_LEN - PORTAL_THICK_M/2;
    put(portalWalls, e, s, 0, 0, 0, 0, on, on, on);
    put(portalTrim, e*3, s, 0, PORTAL_H_M + .4, 0, 0, 2*PORTAL_HALF_W_M + 1, .8, PORTAL_THICK_M + 1.2*on);
    [-1, 1].forEach((side, w) => put(portalTrim, e*3 + 1 + w, s, side*(PORTAL_HALF_W_M - .4), 2.2, end*(WING_LEN_M/2 + PORTAL_THICK_M/2), 0, .8*on, 5.4, WING_LEN_M));
  });
  for (const m of [tunnelInside, tunnelLights, portalWalls, portalTrim]) m.instanceMatrix.needsUpdate = true;
}

/* ---- belts: things recycled by index along each side of the road ---- */
// Slot (side, k mod perSide) holds item k, so each item is written once as the car approaches. place(k, side, s)
// sets `dummy` (and `tint`) and returns false to hide the item. clear: also hide it where a bridge or tunnel stands.
function belt(mesh, spacing, perSide, back, place, { coloured = false, clear = false } = {}){
  const keys = new Float64Array(perSide * 2).fill(-1e9);
  mesh.count = perSide * 2;
  return () => {
    const k0 = Math.floor((S.s - back) / spacing); let changed = false;
    for (let side = 0; side < 2; side++) for (let k = k0; k < k0 + perSide; k++){
      const slot = side*perSide + mod(k, perSide); if (keys[slot] === k) continue;
      keys[slot] = k; changed = true;
      const s = k*spacing;
      if (s < 0 || (clear && nearStructure(s)) || !place(k, side ? 1 : -1, s)) dummy.scale.set(0, 0, 0);
      dummy.updateMatrix(); mesh.setMatrixAt(slot, dummy.matrix);
      if (coloured) mesh.setColorAt(slot, tint);
    }
    if (changed){ mesh.instanceMatrix.needsUpdate = true; if (coloured) mesh.instanceColor.needsUpdate = true; }
  };
}
const standAt = (s, lat) => { roadPoint(s, lat, dummy.position); return trackAt(s).H; };

const bushes = instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({color: 0xffffff}), 2*40);
const placeBushes = belt(bushes, 12, 40, 40, (k, side, s) => {
  const sc = .7 + hash(k*2.3 + side)*1.1, lat = side*(BARRIER + 1.6 + hash(k*4.1 + side*7)*8);
  standAt(s + hash(k*1.9)*6, lat);
  dummy.rotation.set(0, hash(k)*6, 0); dummy.scale.set(sc*1.3, sc*.8, sc*1.3); dummy.position.y += sc*.3;
  tint.setRGB(.12 + hash(k*3.3)*.12, .3 + hash(k*5.1)*.2, .1 + hash(k*7.7)*.08); return hash(k*8.8) > .25;   // a bush in three
}, {coloured: true, clear: true});

const rocks = instanced(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({color: 0xffffff, flatShading: true}), 2*24);
const placeRocks = belt(rocks, 30, 24, 60, (k, side, s) => {
  const sc = .5 + hash(k*3.7 + side)*1.8, lat = side*(BARRIER + 2 + hash(k*6.1 + side*3)*22);
  standAt(s + hash(k*2.9)*20, lat);
  dummy.rotation.set(hash(k*1.3)*3, hash(k*2.1)*6, hash(k*3.1)*3); dummy.scale.set(sc*1.2, sc*.7, sc); dummy.position.y += sc*.25;
  const g = .2 + hash(k*9.1)*.15; tint.setRGB(g, g*.97, g*.92); return hash(k*5.5) > .4;
}, {coloured: true, clear: true});

// Buildings come in stretches (a town every few km), set well back from the road.
const BUILDING_SP = 45, TOWN_PERIOD_M = 1500;
const isTown = s => Math.sin(s/TOWN_PERIOD_M*Math.PI*2/1.2 + 1) > .3;
const windowTex = (lit) => { const t = THREE.canvasTexture(canvasOf(64, 128, (x, w, h) => {
  const COLS = 4, ROWS = 8, cw = w/COLS, rh = h/ROWS;
  x.fillStyle = lit ? '#000' : '#cfcfc8'; x.fillRect(0, 0, w, h);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++){
    x.fillStyle = lit ? (hash(r*7 + c*13) > .45 ? '#ffd98a' : '#000') : '#33465a';
    x.fillRect(c*cw + cw*.2, r*rh + rh*.25, cw*.6, rh*.5);
  }
})); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
const buildingMat = new THREE.MeshLambertMaterial({color: 0xffffff, map: windowTex(false), emissiveMap: windowTex(true), emissive: 0x000000});
const buildings = instanced(box, buildingMat, 2*24);
const placeBuildings = belt(buildings, BUILDING_SP, 24, 60, (k, side, s) => {
  const w = 10 + hash(k*1.1 + side)*12, d = 10 + hash(k*2.2 + side)*8, h = 14 + hash(k*3.3 + side)*28;
  if (!isTown(s) || hash(k*4.4 + side) < .25) return false;
  const lat = side*(BARRIER + 24 + d/2 + hash(k*5.5 + side)*40), H = standAt(s, lat);
  dummy.rotation.set(0, H, 0); dummy.scale.set(w, h, d); dummy.position.y += h/2 - .3;
  const g = .35 + hash(k*6.6)*.35; tint.setRGB(g, g*(.9 + hash(k*7.7)*.15), g*.9); return true;
}, {coloured: true});

// Mountains stand far off (the fog turns them blue-grey with distance); a rock band, then a snow cap.
const MOUNTAIN_SP = 260;
const mountainGeo = new THREE.CylinderGeometry(.02, 1, 1, 7, 5);
{
  const pos = mountainGeo.attributes.position, col = new Float32Array(pos.count*3), band = [[.25, 0x4f6340], [.72, 0x6d6a66], [1.1, 0xf2f4f7]];
  for (let i = 0; i < pos.count; i++){ const up = pos.getY(i) + .5, c = srgb(band.find(b => up < b[0])[1]); col.set([c.r, c.g, c.b], i*3); }
  mountainGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
const mountains = instanced(mountainGeo, new THREE.MeshLambertMaterial({vertexColors: true, flatShading: true}), 2*10);
const placeMountains = belt(mountains, MOUNTAIN_SP, 10, 400, (k, side, s) => {
  const r = 170 + hash(k*1.7 + side)*140, h = 120 + hash(k*2.9 + side)*160, lat = side*(r + 300 + hash(k*3.9 + side)*180), p = trackAt(s);
  roadPoint(s, lat, dummy.position); dummy.position.y = p.y + h/2 - 25;
  dummy.rotation.set(0, hash(k)*6, 0); dummy.scale.set(r, h, r*(.7 + hash(k*4.9)*.5)); return true;
});

// Clouds are soft white patches high above the road, seen from below.
const CLOUD_SP = 140;
const cloudTex = THREE.canvasTexture(canvasOf(128, 128, (x, w, h) => {
  for (let i = 0; i < 14; i++){
    const cx = w*(.2 + hash(i*1.3)*.6), cy = h*(.3 + hash(i*2.7)*.4), r = w*(.12 + hash(i*4.1)*.14), g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  }
}));
const cloudMat = new THREE.MeshBasicMaterial({map: cloudTex, transparent: true, depthWrite: false, fog: false});
const clouds = instanced(new THREE.PlaneGeometry(1, 1).rotateX(Math.PI/2), cloudMat, 2*14);   // face down, so the road sees their underside
const placeClouds = belt(clouds, CLOUD_SP, 14, 400, (k, side, s) => {
  const w = 160 + hash(k*1.9 + side)*220, p = trackAt(s);
  roadPoint(s, side*hash(k*2.3 + side*5)*420, dummy.position); dummy.position.y = p.y + 150 + hash(k*3.7 + side)*110;
  dummy.rotation.set(0, hash(k*4.3)*6, 0); dummy.scale.set(w, 1, w*(.45 + hash(k*5.9)*.4)); return true;
});

export function placeWorld(){
  placeMountains(); placeClouds(); placeBushes(); placeRocks(); placeBuildings(); placeBridges(); placeTunnel();
}

// Unlit materials need their own darkness (0 day .. 1 night), rain and mist (each 0..1), like the ground in track.js:
// clouds go grey and dark, lit windows glow at night, and the tunnel's inside stays dim.
export function setSceneryShade(dark, rain, mist){
  const k = 1 - .35*Math.max(rain*.8, mist), night = 1 + (.03 - 1)*dark;
  cloudMat.color.setRGB(k*night, k*(1 + (.04 - 1)*dark), k*(1 + (.1 - 1)*dark)); cloudMat.opacity = 1 - mist;
  buildingMat.emissive.setScalar(dark);
  tunnelInside.material.color.setScalar(.14*(1 - .75*dark));
}

setSceneryShade(0, 0, 0);                                    // the unlit materials start in full daylight
