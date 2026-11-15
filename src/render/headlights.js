// Headlights (L: off -> wide beam -> focused beam -> off).
// Road and grass are unlit materials, so the beam is drawn as light cones and a glow pool on the road,
// plus real spot lights so traffic and scenery objects get lit.
import * as THREE from '../three.js';
import { scene } from './scene.js';
import { radTex } from './effects.js';
import { placeOn } from '../world/road.js';
import { S, W, car } from '../state.js';

const HL = (function(){
  const g = new THREE.Group(); scene.add(g);
  const geo = new THREE.ConeGeometry(1,1,28,1,true); geo.translate(0,-.5,0); geo.rotateX(-Math.PI/2);   // apex at origin, opens toward +z
  const pos = geo.attributes.position, col = new Float32Array(pos.count*3);
  for (let i=0;i<pos.count;i++){ const t = pos.getZ(i), ramp = Math.min(1,t/.18), v = Math.pow(1-t,1.8)*ramp*ramp*(3-2*ramp); col[i*3]=v; col[i*3+1]=v*.95; col[i*3+2]=v*.78; }
  geo.setAttribute('color', new THREE.BufferAttribute(col,3));
  const coneMat = new THREE.MeshBasicMaterial({vertexColors:true, transparent:true, opacity:.22, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide});
  const cones = [0,1,2,3,4,5].map(()=>{ const m = new THREE.Mesh(geo, coneMat); m.visible=false; m.frustumCulled=false; g.add(m); return m; });   // 3 layers per lamp
  const poolG = new THREE.Object3D(); scene.add(poolG);
  const poolMat = new THREE.MeshBasicMaterial({map:radTex('rgba(255,240,190,1)','rgba(255,240,190,0)'), transparent:true, opacity:.4, blending:THREE.AdditiveBlending, depthWrite:false});
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1,1), poolMat); pool.rotation.x = -Math.PI/2; pool.position.y = .06; pool.visible=false; poolG.add(pool);
  // On a wet road the beam also leaves long thin reflections stretched along the road; they fade out towards every edge
  // of the pool, so they only ever show inside the beam.
  const glintTex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d');
    for (let i=0;i<26;i++){
      const sx = 8+Math.random()*112, w = 1.5+Math.random()*4, y0 = Math.random()*120, len = 90+Math.random()*130;
      const g = x.createLinearGradient(0,y0,0,y0+len); g.addColorStop(0,'rgba(255,236,190,0)'); g.addColorStop(.5,`rgba(255,236,190,${.25+Math.random()*.45})`); g.addColorStop(1,'rgba(255,236,190,0)');
      x.fillStyle = g; x.fillRect(sx-w/2, y0, w, len);
    }
    x.globalCompositeOperation = 'destination-in';
    const m = x.createRadialGradient(64,128,0,64,128,128); m.addColorStop(0,'#fff'); m.addColorStop(.6,'rgba(255,255,255,.6)'); m.addColorStop(1,'rgba(255,255,255,0)');
    x.setTransform(.5,0,0,1,32,0); x.fillStyle = m; x.fillRect(0,0,256,256);          // squashed to an ellipse that fits the 128 x 256 canvas
    const t = THREE.canvasTexture(c); return t;
  })();
  const glintMat = new THREE.MeshBasicMaterial({map:glintTex, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false});
  const glint = new THREE.Mesh(new THREE.PlaneGeometry(1,1), glintMat); glint.rotation.x = -Math.PI/2; glint.position.y = .08; glint.visible = false; poolG.add(glint);
  const glowTex = radTex('rgba(255,246,210,1)','rgba(255,246,210,0)');
  const glows = [0,1].map(()=>{ const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, opacity:.8})); sp.visible=false; scene.add(sp); return sp; });
  const spots = [0,1].map(()=>{ const l = new THREE.SpotLight(0xfff0cc, 0, 60, .6, .6, 1); scene.add(l, l.target); return l; });
  return {cones, poolG, pool, poolMat, glint, glintMat, glows, spots};
})();
const _hv = new THREE.Vector3();
export function updateHeadlights(Hc, sl){
  const mode = S.started ? S.lights : 0, on = mode>0, focus = mode===2;
  const fx = Math.sin(Hc), fz = Math.cos(Hc), rx = -Math.cos(Hc), rz = Math.sin(Hc);
  const P = focus ? {pitch:.03, len:115, rad:3.4, cone:.3,  spotA:.16, spotI:2.8, spotD:140, tgt:60, poolD:58, poolW:5, poolL:96, poolO:.62, glow:.55}
                  : {pitch:.10, len:30, rad:11,  cone:.15, spotA:.62, spotI:1.5, spotD:55,  tgt:20, poolD:22, poolW:13,  poolL:26, poolO:.32, glow:.42};
  const lamp = W.y + car.bodyH*.56 + .22;
  for (let i=0;i<2;i++){
    const sx = i ? 1 : -1, off = car.kind==='super' ? car.wid/2-.19 : car.wid/2-.34, fwd = car.len/2-.1;
    const lx = W.x + fx*fwd + rx*sx*off, lz = W.z + fz*fwd + rz*sx*off;
    const gl = HL.glows[i], sp = HL.spots[i], showFX = on && S.cam!=='fp';
    gl.visible = showFX;
    for (let j=0;j<3;j++){
      const c = HL.cones[i*3+j]; c.visible = showFX;
      if (!showFX) continue;
      const k = [1,.62,.32][j];
      c.position.set(lx,lamp,lz); _hv.set(lx+fx, lamp+sl-P.pitch, lz+fz); c.lookAt(_hv); c.scale.set(P.rad*k,P.rad*k,P.len);
    }
    HL.cones[0].material.opacity = P.cone;
    if (!on){ sp.intensity = 0; continue; }
    gl.position.set(lx+fx*.2,lamp,lz+fz*.2); gl.scale.setScalar(P.glow);
    sp.position.set(lx,lamp,lz); sp.target.position.set(lx+fx*P.tgt, lamp+(sl-P.pitch)*P.tgt, lz+fz*P.tgt);
    sp.angle = P.spotA; sp.intensity = P.spotI*Math.PI; sp.distance = P.spotD;
  }
  HL.pool.visible = on;
  if (on){ placeOn(HL.poolG, S.s+P.poolD, S.d, S.psi); HL.pool.scale.set(P.poolW, P.poolL, 1); HL.poolMat.opacity = P.poolO; }
  const wet = S.rain*(1-S.mist)*S.dark;                                                // reflections need rain and a dark sky
  HL.glint.visible = on && wet > .02;
  if (HL.glint.visible){ HL.glint.scale.set(P.poolW*.9, P.poolL*1.25, 1); HL.glintMat.opacity = .75*wet; }
}
