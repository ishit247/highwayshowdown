// Smoke and sparks from a fixed pool of sprites, and the exhaust flames on gear changes.
import * as THREE from '../three.js';
import { scene } from './scene.js';
import { S } from '../state.js';

export function radTex(inner, outer){
  const c = document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d');
  const g = x.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,inner); g.addColorStop(1,outer);
  x.fillStyle=g; x.fillRect(0,0,64,64); return THREE.canvasTexture(c);
}
const smokeTex = radTex('rgba(255,255,255,.9)','rgba(255,255,255,0)'), sparkTex = radTex('rgba(255,220,120,1)','rgba(255,120,0,0)');
const parts = [];
for (let i=0;i<80;i++){
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTex, transparent:true, depthWrite:false}));
  sp.visible=false; scene.add(sp); parts.push({sp, life:0, max:1, vx:0,vy:0,vz:0, kind:0, size:1});
}
// kind 0 = smoke, 1 = spark
export function emit(kind,x,y,z,vx,vy,vz,life,size,col){
  const p = parts.find(q=>q.life<=0); if(!p) return;
  p.kind=kind; p.life=p.max=life; p.size=size; p.vx=vx;p.vy=vy;p.vz=vz;
  p.sp.material.map = kind ? sparkTex : smokeTex;
  p.sp.material.blending = kind ? THREE.AdditiveBlending : THREE.NormalBlending;
  p.sp.material.color.set(col||0xffffff); p.sp.position.set(x,y,z); p.sp.visible=true;
}
export function updateParts(dt){
  for (const p of parts){
    if (p.life<=0) continue; p.life-=dt;
    if (p.life<=0){ p.sp.visible=false; continue; }
    const k = 1-p.life/p.max;
    p.sp.position.x+=p.vx*dt; p.sp.position.y+=p.vy*dt; p.sp.position.z+=p.vz*dt;
    if (p.kind){ p.vy-=9*dt; p.sp.scale.setScalar(p.size); p.sp.material.opacity=1-k; }
    else { p.vx*=1-1.6*dt; p.vz*=1-1.6*dt; p.sp.scale.setScalar(p.size*(.5+k*3)); p.sp.material.opacity=.55*(1-k); }
  }
}

// exhaust fire: only on gear changes (S.flameI): two bursts on upshift, four big ones on downshift
export function updateFlames(fl){
  if (!fl.length) return;
  let fi = S.flameI;                                                            // only the gear-change bursts
  if (S.over || !S.started) fi = 0;
  const rad = 1 + Math.max(0,fi-1)*.6;
  for (const f of fl){
    f.visible = fi>.05;
    if (f.visible) f.scale.set(rad*(.85+Math.random()*.4), rad*(.85+Math.random()*.4), (.15+fi*1.0)*(.75+Math.random()*.5));
  }
}
