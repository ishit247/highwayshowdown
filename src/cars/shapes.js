// Geometry helpers shared by the car body and the engine bays.
import * as THREE from '../three.js';

// extrude a side profile (shape x = car length/z, shape y = height) across the car's width, centred on x=0
export function extrudeProfile(shape, width, bev){
  const d = Math.max(.01, width-2*bev);
  const g = new THREE.ExtrudeGeometry(shape, {depth:d, bevelEnabled:true, bevelThickness:bev, bevelSize:bev, bevelSegments:3, curveSegments:10});
  g.translate(0,0,-d/2); g.rotateY(-Math.PI/2); return g;
}
// narrow the width linearly from 1 at y0 to `k` at y1 (tumblehome)
export function taperX(geo, y0, y1, k){
  const p = geo.attributes.position;
  for (let i=0;i<p.count;i++){ const t = Math.min(1,Math.max(0,(p.getY(i)-y0)/(y1-y0))); p.setX(i, p.getX(i)*(1-(1-k)*t)); }
  p.needsUpdate = true;
}
export const lerpN = (a,b,t)=>a+(b-a)*t;
export function bez(p0,c,p2,t){ const a=(1-t)*(1-t), b=2*(1-t)*t, d=t*t; return [a*p0[0]+b*c[0]+d*p2[0], a*p0[1]+b*c[1]+d*p2[1]]; }
export function roundRect(u0,v0,u1,v1,r){
  const s = new THREE.Shape();
  s.moveTo(u0+r,v0); s.lineTo(u1-r,v0); s.quadraticCurveTo(u1,v0,u1,v0+r); s.lineTo(u1,v1-r); s.quadraticCurveTo(u1,v1,u1-r,v1);
  s.lineTo(u0+r,v1); s.quadraticCurveTo(u0,v1,u0,v1-r); s.lineTo(u0,v0+r); s.quadraticCurveTo(u0,v0,u0+r,v0); return s;
}
// flat strip lying on a top surface: pts = [[z,y],...]
export function ribbon(pts, xc, w, mat){
  const pos=[], idx=[];
  pts.forEach((p,i)=>{ pos.push(xc-w/2,p[1],p[0], xc+w/2,p[1],p[0]); if(i){ const a=(i-1)*2; idx.push(a,a+1,a+2,a+1,a+3,a+2); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
