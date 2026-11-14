// The visible road: road, grass and rail ribbons that follow the car, plus recycled trees and street lamps.
import * as THREE from '../three.js';
import { scene } from '../render/scene.js';
import { HALF, BARRIER, LANES } from '../config.js';
import { DS, TX, TY, TZ, TH, kappa, ensure, trackAt } from './road.js';
import { S } from '../state.js';

/* textures */
function makeTex(w,h,draw,repeatX){
  const c = document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h);
  const t = THREE.canvasTexture(c);
  t.wrapT = THREE.RepeatWrapping; t.wrapS = repeatX ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.anisotropy = 8; return t;
}
function noise(x,w,h,n,a){ for(let i=0;i<n;i++){ x.fillStyle=`rgba(${Math.random()<.5?0:255},${Math.random()<.5?0:255},${Math.random()<.5?0:255},${a})`; x.fillRect(Math.random()*w,Math.random()*h,2,2);} }
const roadTex = makeTex(512,512,(x,w,h)=>{
  const px = m => (m+BARRIER)/(2*BARRIER)*w;
  x.fillStyle='#3a3b3f'; x.fillRect(0,0,w,h);
  x.fillStyle='#57575c'; x.fillRect(0,0,px(-HALF),h); x.fillRect(px(HALF),0,w-px(HALF),h);       // shoulders
  x.fillStyle='rgba(0,0,0,.16)';                                                                    // tyre wear
  for (const l of LANES){ x.fillRect(px(l-1.0),0,px(l-0.4)-px(l-1.0),h); x.fillRect(px(l+0.4),0,px(l+1.0)-px(l+0.4),h); }
  noise(x,w,h,9000,.06);
  x.fillStyle='#f4f4f4';
  x.fillRect(px(-HALF-.1),0,px(.18)-px(0),h); x.fillRect(px(HALF-.08),0,px(.18)-px(0),h);          // edge lines
  for (const l of [-1.8,1.8]) x.fillRect(px(l-.08),0,px(.16)-px(0),h*.28);                         // dashes
  x.fillStyle='rgba(20,20,20,.18)'; x.fillRect(px(-HALF-.1),h*.3,2,6);
}, false);
const grassTex = makeTex(256,256,(x,w,h)=>{
  x.fillStyle='#3f7d34'; x.fillRect(0,0,w,h);
  for(let i=0;i<5000;i++){ const g=100+Math.random()*60; x.fillStyle=`rgba(${40+Math.random()*30},${g},${30+Math.random()*30},.5)`; x.fillRect(Math.random()*w,Math.random()*h,3,3); }
}, true); grassTex.wrapS = THREE.RepeatWrapping;
const railTex = makeTex(64,64,(x,w,h)=>{
  x.fillStyle='#aeb4ba'; x.fillRect(0,0,w,h);
  x.fillStyle='#8a9097'; x.fillRect(0,h*.35,w,h*.12); x.fillRect(0,h*.65,w,h*.1);
  x.fillStyle='#555a60'; x.fillRect(0,0,w,h*.1);
}, false);

const N = 150;
function makeRibbon(mat){
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array((N+1)*6), uv = new Float32Array((N+1)*4), idx = [];
  for (let i=0;i<N;i++){ const a=i*2; idx.push(a,a+1,a+2,a+1,a+3,a+2); }
  g.setIndex(idx);
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv,2));
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; scene.add(m);
  return {m,pos,uv,g};
}
const mk = (tex)=>new THREE.MeshBasicMaterial({map:tex, side:THREE.DoubleSide});
const rbRoad = makeRibbon(mk(roadTex)), rbGL = makeRibbon(mk(grassTex)), rbGR = makeRibbon(mk(grassTex)),
      rbRL = makeRibbon(mk(railTex)), rbRR = makeRibbon(mk(railTex));
// These materials ignore lights, so darkness (0 day .. 1 night) is a colour multiplier on their textures
// (linear values: a dim, blue moonlit ground).
export function setGroundShade(dark){
  for (const rb of [rbRoad,rbGL,rbGR,rbRL,rbRR]) rb.m.material.color.setRGB(1+(.018-1)*dark, 1+(.023-1)*dark, 1+(.056-1)*dark);
}
function setRow(rb,k,a,b,c,d,e,f,u0,u1,v){
  const p=rb.pos; let o=k*6; p[o]=a;p[o+1]=b;p[o+2]=c;p[o+3]=d;p[o+4]=e;p[o+5]=f;
  o=k*4; rb.uv[o]=u0; rb.uv[o+1]=v; rb.uv[o+2]=u1; rb.uv[o+3]=v;
}
export function updateTrack(){
  const i0 = Math.max(0, Math.floor(S.s/DS)-10); ensure(i0+N+3);
  for (let k=0;k<=N;k++){
    const i=i0+k, H=TH[i], rx=-Math.cos(H), rz=Math.sin(H), x=TX[i], y=TY[i], z=TZ[i], v=i/3;
    const ext = Math.min(420, 0.8/(Math.abs(kappa(i*DS))+1e-4));
    setRow(rbRoad,k, x-rx*BARRIER,y,z-rz*BARRIER, x+rx*BARRIER,y,z+rz*BARRIER, 0,1,v);
    setRow(rbGL,k, x-rx*ext,y-.06,z-rz*ext, x-rx*BARRIER,y-.06,z-rz*BARRIER, -ext/14,-BARRIER/14, i*DS/14);
    setRow(rbGR,k, x+rx*BARRIER,y-.06,z+rz*BARRIER, x+rx*ext,y-.06,z+rz*ext, BARRIER/14,ext/14, i*DS/14);
    const rl = BARRIER-.45;
    setRow(rbRL,k, x-rx*rl,y,z-rz*rl, x-rx*rl,y+.8,z-rz*rl, 0,1,i*DS/4);
    setRow(rbRR,k, x+rx*rl,y,z+rz*rl, x+rx*rl,y+.8,z+rz*rl, 0,1,i*DS/4);
  }
  for (const rb of [rbRoad,rbGL,rbGR,rbRL,rbRR]){ rb.g.attributes.position.needsUpdate=true; rb.g.attributes.uv.needsUpdate=true; }
}

/* scenery: trees + street lamps, recycled by index */
const hash = n => { const x=Math.sin(n*12.9898)*43758.5453; return x-Math.floor(x); };
function makeTree(){
  const g = new THREE.Group();
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(.25,.35,2.2,6), new THREE.MeshLambertMaterial({color:0x5d4030})); tr.position.y=1.1; g.add(tr);
  const gm = new THREE.MeshLambertMaterial({color:new THREE.Color().setRGB((0x2e+Math.random()*0x12)/255,(0x6b+Math.random()*0x25)/255,(0x2c+Math.random()*0x10)/255, THREE.SRGBColorSpace)});   // varied greens
  const c1 = new THREE.Mesh(new THREE.ConeGeometry(2.0,4.2,7), gm); c1.position.y=4; g.add(c1);
  const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.5,3.4,7), gm); c2.position.y=6; g.add(c2);
  scene.add(g); return g;
}
function makeLamp(){
  const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({color:0x777d85});
  const p = new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,9,6), m); p.position.y=4.5; g.add(p);
  const a = new THREE.Mesh(new THREE.BoxGeometry(2.6,.12,.12), m); a.position.set(-1.2,9,0); g.add(a);
  const h = new THREE.Mesh(new THREE.BoxGeometry(.7,.12,.3), new THREE.MeshBasicMaterial({color:0xfff2c0})); h.position.set(-2.4,8.9,0); g.add(h);
  scene.add(g); return g;
}
const TREE_SP = 20, TPOOL = 70, LAMP_SP = 80, LPOOL = 16;
const trees = [[],[]], lamps = [[],[]];
for (let sd=0; sd<2; sd++){
  for (let i=0;i<TPOOL;i++) trees[sd].push({m:makeTree(), k:-1e9});
  for (let i=0;i<LPOOL;i++) lamps[sd].push({m:makeLamp(), k:-1e9});
}
export function placeScenery(){
  const k0 = Math.floor((S.s-80)/TREE_SP);
  for (let sd=0; sd<2; sd++){
    const side = sd ? 1 : -1;
    for (let k=k0;k<k0+TPOOL-2;k++){
      const o = trees[sd][((k%TPOOL)+TPOOL)%TPOOL]; if (o.k===k) continue; o.k=k;
      const s = k*TREE_SP + hash(k*3.1+sd)*14; const p = trackAt(s), lat = side*(BARRIER+3+hash(k*1.7+sd*9)*(hash(k)>.6?60:18));
      o.m.position.set(p.x-Math.cos(p.H)*lat, p.y, p.z+Math.sin(p.H)*lat);
      const sc = .8+hash(k*5.3)*1.1; o.m.scale.set(sc,sc,sc); o.m.rotation.y = hash(k)*6;
    }
    const l0 = Math.floor((S.s-80)/LAMP_SP);
    for (let k=l0;k<l0+LPOOL-2;k++){
      const o = lamps[sd][((k%LPOOL)+LPOOL)%LPOOL]; if (o.k===k) continue; o.k=k;
      const p = trackAt(k*LAMP_SP + sd*40), lat = side*(BARRIER+1.2);
      o.m.position.set(p.x-Math.cos(p.H)*lat, p.y, p.z+Math.sin(p.H)*lat);
      o.m.rotation.y = p.H + (side>0 ? Math.PI/2 : -Math.PI/2) + Math.PI; // arm reaches over road
    }
  }
}
