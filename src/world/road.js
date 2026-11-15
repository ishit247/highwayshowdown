// The road's shape: curves and hills as functions of the distance s along it, sampled every DS metres.
export const DS = 4;
export const TX=[0], TY=[0], TZ=[0], TH=[0];
export function kappa(s){ // left-positive curvature (1/m)
  const r = Math.min(1, s/500);
  return r*(0.0014*Math.sin(s/330)+0.0010*Math.sin(s/151+2)+0.0006*Math.sin(s/73+5))*(0.55+0.45*Math.sin(s/1100+1));
}
function elev(s){
  const r = Math.min(1, s/600);
  return r*(6*Math.sin(s/450)+3.5*Math.sin(s/200+1.3)+1.6*Math.sin(s/90));
}
export function ensure(i){
  while (TX.length <= i) {
    const k = TX.length-1, s = k*DS, H = TH[k], H2 = H + kappa(s)*DS, Hm = (H+H2)/2;
    TX.push(TX[k] + Math.sin(Hm)*DS); TZ.push(TZ[k] + Math.cos(Hm)*DS);
    TH.push(H2); TY.push(elev((k+1)*DS));
  }
}
export function trackAt(s){
  if (s < 0) s = 0;
  const f = s/DS, i = Math.floor(f), u = f - i; ensure(i+2);
  return { x:TX[i]+(TX[i+1]-TX[i])*u, y:TY[i]+(TY[i+1]-TY[i])*u,
           z:TZ[i]+(TZ[i+1]-TZ[i])*u, H:TH[i]+(TH[i+1]-TH[i])*u };
}
export const hash = n => { const x=Math.sin(n*12.9898)*43758.5453; return x-Math.floor(x); };   // repeatable "random" 0..1 per number, so scenery stays where it was
export const slopeAt =s => (elev(s+6)-elev(Math.max(0,s-6)))/12;

// put an object at road coordinates (s along, d sideways, psi heading relative to the road)
export function placeOn(mesh, s, d, psi){
  const p = trackAt(s), rx=-Math.cos(p.H), rz=Math.sin(p.H);
  mesh.position.set(p.x+rx*d, p.y, p.z+rz*d);
  mesh.rotation.set(-Math.atan(slopeAt(s)), p.H+psi, 0, 'YXZ');
  return p;
}
