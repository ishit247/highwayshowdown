// Builds a car from its style spec: body, bonnet, cabin, wheels, lamps, exhaust flames and per-car details.
// The caller adds the returned group to the scene.
import * as THREE from '../three.js';
import { extrudeProfile, taperX, lerpN, bez, roundRect, ribbon } from './shapes.js';
import { addBonnetUnderside, addEngineBay, addHyperEngine } from './engine-bay.js';

const _tireG = {}, _tireM = new THREE.MeshLambertMaterial({color:0x0b0b0d});
function addWheel(g, sx, z, hw, wr, ww, rimCol){
  const key = wr+'_'+ww;
  if (!_tireG[key]){
    _tireG[key] = {
      tire: new THREE.CylinderGeometry(wr,wr,ww,24).rotateZ(Math.PI/2),
      disc: new THREE.CylinderGeometry(wr*.7,wr*.7,ww+.02,20).rotateZ(Math.PI/2),
      cap : new THREE.CylinderGeometry(wr*.13,wr*.13,ww+.04,10).rotateZ(Math.PI/2),
      spoke: new THREE.BoxGeometry(.014, wr*.6, wr*.2)
    };
  }
  const G = _tireG[key], rimM = new THREE.MeshPhongMaterial({color:rimCol, shininess:80, specular:0x888888});
  const dark = new THREE.MeshLambertMaterial({color:0x1b1c20});
  const o = new THREE.Group(); o.position.set(sx*hw, wr, z);
  const w = new THREE.Group(); o.add(w);          // w spins, o steers
  w.add(new THREE.Mesh(G.tire,_tireM), new THREE.Mesh(G.disc,dark), new THREE.Mesh(G.cap,rimM));
  for (let i=0;i<5;i++){
    const a = new THREE.Group(); a.rotation.x = i*Math.PI*2/5;
    const sp = new THREE.Mesh(G.spoke, rimM); sp.position.set(sx*(ww/2+.012), wr*.34, 0); a.add(sp); w.add(a);
  }
  g.add(o); return {o, w};
}

let _meshTex = null;
function meshTexture(){
  if (_meshTex) return _meshTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#121316'; x.fillRect(0,0,64,64);
  x.strokeStyle = '#6a6e75'; x.lineWidth = 5; x.lineCap = 'round';
  x.beginPath(); x.moveTo(0,32); x.lineTo(32,0); x.lineTo(64,32); x.lineTo(32,64); x.lineTo(0,32); x.stroke();
  const t = THREE.canvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return (_meshTex = t);
}
// self-glow that lifts the shaded side panels of dark paint (none on light paint, it would blow out the roof)
export const glowK = c => .2*Math.max(0, 1 - (.299*c.r+.587*c.g+.114*c.b)*1.25);

export function buildCar(sp, color, opt){
  opt = opt || {};
  const g = new THREE.Group(), k = sp.kind, L=sp.len, W=sp.wid, wr=sp.wr, clear=.22, bh=sp.bodyH, bv=.05;
  const M = c => new THREE.MeshLambertMaterial({color:c});
  const body  = new THREE.MeshPhongMaterial({color, shininess:90, specular:0x666666});
  body.emissive.set(color).multiplyScalar(glowK(body.color));
  const glass = new THREE.MeshPhongMaterial({color:0x0f1a26, shininess:90, specular:0x0a1018, side:THREE.DoubleSide});
  const black = M(0x0c0c0c), gloss = new THREE.MeshPhongMaterial({color:0x111214, shininess:120, specular:0x555555});
  const chrome = new THREE.MeshPhongMaterial({color:0xd0d4da, shininess:120, specular:0xffffff});
  const lampW = new THREE.MeshBasicMaterial({color:0xfff6cc}), lampR = new THREE.MeshBasicMaterial({color:0x8a1010});   // tail lamp: dim red, bright while braking (render/frame.js)
  const hoodL = L*sp.hf, nd = sp.nd, hinge = L/2-hoodL;
  const yT = clear+bh-.09, yDeck = clear+bh-.03;
  const add = (geo, mat, x,y,z) => { const m = new THREE.Mesh(geo,mat); m.position.set(x,y,z); g.add(m); return m; };
  const box = (w,h,d) => new THREE.BoxGeometry(w,h,d);

  /* ---- main body: smooth side profile ---- */
  const nP0=[L/2-.02, clear+bh*(sp.nf||.40)], nC=[L/2-.02, yT-nd], nP2=[L/2-.4, yT-nd];
  const noseZ = y => { if (y<=nP0[1]) return nP0[0]; let pr=nP0;
    for (let i=1;i<=20;i++){ const q=bez(nP0,nC,nP2,i/20); if (q[1]>=y){ return lerpN(pr[0],q[0],(y-pr[1])/((q[1]-pr[1])||1)); } pr=q; } return nP2[0]; };
  const dP0=[hinge, yT], dC=[-L/2+.9, yT], dP2=[-L/2+.45, yDeck];
  const bs = new THREE.Shape();
  bs.moveTo(-L/2+.12, clear); bs.lineTo(L/2-.12, clear);
  bs.quadraticCurveTo(L/2-.02, clear, L/2-.02, clear+bh*.25);
  bs.lineTo(nP0[0], nP0[1]);
  bs.quadraticCurveTo(nC[0], nC[1], nP2[0], nP2[1]);
  bs.lineTo(dP0[0], dP0[1]);
  bs.quadraticCurveTo(dC[0], dC[1], dP2[0], dP2[1]);
  bs.quadraticCurveTo(-L/2-.02, yDeck, -L/2-.02, clear+bh*.5);
  bs.lineTo(-L/2-.02, clear+.14);
  bs.quadraticCurveTo(-L/2-.02, clear, -L/2+.12, clear);
  g.add(new THREE.Mesh(extrudeProfile(bs, W-.02, bv), body));
  // rear haunches / wide hips
  const flare = {coupe:{w:1.07,z0:-L/2+.2,z1:-.45}, muscle:{w:1.025,z0:-L/2+.2,z1:-.55}, super:{w:1.05,z0:-L/2+.2,z1:-.3}}[k];
  if (flare) g.add(new THREE.Mesh(extrudeProfile(roundRect(flare.z0,clear+.04,flare.z1,yDeck-.02,.28), W*flare.w, .04), body));
  const hwF = W/2-.06, hwR = (flare ? W*flare.w/2 : W/2)-.06;

  /* ---- hood: thin sloped panel hinged at the windshield base (pivot used by damage animation) ---- */
  const hood = new THREE.Group(); hood.position.set(0,yT,hinge);
  const hs = new THREE.Shape();
  hs.moveTo(0,0); hs.lineTo(hoodL-.4,-nd); hs.lineTo(hoodL-.1,-nd); hs.quadraticCurveTo(hoodL,-nd,hoodL,.04-nd);
  hs.quadraticCurveTo(hoodL,.075-nd,hoodL-.2,.085-nd); hs.lineTo(0,.11); hs.lineTo(0,0);
  const holeC = hoodL*.28+.41, holeX = .25, holeH = .28;        // opening for the supercharger (centred under the scoop)
  if (k === 'muscle'){
    const topY = u => u <= hoodL-.2 ? .11 + ((.085-nd)-.11)*(u/(hoodL-.2)) : .085-nd, botY = u => -nd*Math.min(1,u/(hoodL-.4));
    const c0 = holeC-holeH, c1 = holeC+holeH, ws = (W*.97-holeX*2)/2;
    const rearS = new THREE.Shape(); rearS.moveTo(0,0); rearS.lineTo(c0,botY(c0)); rearS.lineTo(c0,topY(c0)); rearS.lineTo(0,.11); rearS.lineTo(0,0);
    const frontS = new THREE.Shape(); frontS.moveTo(c1,botY(c1)); frontS.lineTo(hoodL-.4,-nd); frontS.lineTo(hoodL-.1,-nd); frontS.quadraticCurveTo(hoodL,-nd,hoodL,.04-nd);
    frontS.quadraticCurveTo(hoodL,.075-nd,hoodL-.2,.085-nd); frontS.lineTo(c1,topY(c1)); frontS.lineTo(c1,botY(c1));
    for (const sx of [-1,1]){ const gs = extrudeProfile(hs, ws+.04, .006); gs.translate(sx*(holeX+ws/2-.02),0,0); hood.add(new THREE.Mesh(gs, body)); }   // side panels, full length
    hood.add(new THREE.Mesh(extrudeProfile(rearS, holeX*2+.04, .006), body));                                                                       // centre, behind the opening
    hood.add(new THREE.Mesh(extrudeProfile(frontS, holeX*2+.04, .006), body));                                                                      // centre, in front of the opening
    g.add(hood);
  } else {
    hood.add(new THREE.Mesh(extrudeProfile(hs, W*.97, .03), body)); g.add(hood);
  }
  const bay = {k, W, hoodL, nd, hinge, yT, body, chrome, M, holeC, holeX, holeH};
  addBonnetUnderside(hood, bay);
  if (k !== 'super') addEngineBay(g, bay);

  /* ---- cabin (greenhouse) ---- */
  const cl = L*sp.cl, ch = sp.ch+.05, cabZ = L*sp.off, cabY = clear+bh-.05;
  const fa = cl/2 - sp.fi*.7, ra = -cl/2 + sp.ri*.7, rc = sp.rc;
  const cabG = new THREE.Group(); cabG.position.set(0,cabY,cabZ); g.add(cabG);
  const hwAt = (y,inset) => W*.45*(1-(1-sp.tsx)*(y/ch)) - inset;
  function slopeGlass(base, top, t0, t1, sgn, mat, inset, push){
    const pt = t => [lerpN(base[0],top[0],t), lerpN(base[1],top[1],t)], a = pt(t0), b = pt(t1);
    const dz = top[0]-base[0], dy = top[1]-base[1], n = Math.hypot(dy,dz), nz = sgn*dy/n, ny = -sgn*dz/n;
    const pos = [-hwAt(a[1],inset),a[1]+ny*push,a[0]+nz*push,  hwAt(a[1],inset),a[1]+ny*push,a[0]+nz*push,
                  hwAt(b[1],inset),b[1]+ny*push,b[0]+nz*push, -hwAt(b[1],inset),b[1]+ny*push,b[0]+nz*push];
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
    geo.setIndex([0,1,2,0,2,3]); geo.computeVertexNormals(); const m = new THREE.Mesh(geo,mat); cabG.add(m); return m;
  }
  const roofP0=[fa-.2,ch+.01], roofC=[(fa+ra)/2,ch+rc], roofP2=[ra+.25,ch+.01];
  {
    const cs = new THREE.Shape();
    cs.moveTo(-cl/2,0); cs.lineTo(cl/2,0);
    cs.lineTo(lerpN(cl/2,fa,.9), ch*.9); cs.quadraticCurveTo(fa, ch, roofP0[0], roofP0[1]);
    cs.quadraticCurveTo(roofC[0], roofC[1], roofP2[0], roofP2[1]);
    cs.quadraticCurveTo(ra, ch, lerpN(-cl/2,ra,.88), ch*.88); cs.lineTo(-cl/2,0);
    const cg = extrudeProfile(cs, W*.9, .04); taperX(cg, 0, ch, sp.tsx);
    cabG.add(new THREE.Mesh(cg, body));
    // side windows
    const gf = .84, gs = new THREE.Shape();
    gs.moveTo(-cl/2*1.01,.02); gs.lineTo(cl/2*1.01,.02); gs.lineTo(lerpN(cl/2,fa,gf), ch*gf); gs.lineTo(lerpN(-cl/2,ra,gf), ch*gf); gs.lineTo(-cl/2*1.01,.02);
    const gg = extrudeProfile(gs, W*.9+.03, .01); taperX(gg, 0, ch, sp.tsx); cabG.add(new THREE.Mesh(gg, glass));
    // windshield + rear glass
    slopeGlass([cl/2,0],[fa,ch], .04,.9, +1, glass, .07, .062);
    slopeGlass([-cl/2,0],[ra,ch], .04,.9, -1, glass, .07, .062);
  }

  /* ---- mirrors, door lines ---- */
  const mz = cabZ+cl/2-.38;
  for (const sx of [-1,1]){
    add(box(.07,.09,.17), body, sx*(W/2+.06), clear+bh+.02, mz);
    add(box(.1,.012,.03), black, sx*(W/2+.02), clear+bh-.02, mz);
  }
  const seams = (k==='hatch'||k==='sedan') ? [cabZ+cl/2-.3, cabZ-.1, -L*.205] : (k==='super' ? [cabZ+cl/2-.2] : [cabZ+cl/2-.35, -L*.2]);
  for (const sx of [-1,1]) for (const z of seams) add(box(.01,bh-.16,.012), black, sx*(W/2-.006), clear+.1+(bh-.16)/2, z);

  /* ---- wheels + dark arches ---- */
  const wheels = [];
  const wz = L*.31, ww = k==='coupe' ? .30 : (k==='muscle' ? .30 : .26);
  const archR = Math.min(wr+.045, yT-nd*.5-(wr+.02)-.01);
  for (const sx of [-1,1]) for (const sz of [-1,1]){
    const hw = sz<0 ? hwR : hwF;
    const wh = addWheel(g, sx, sz*wz, hw, wr, ww, sp.rim); wh.front = sz>0; wheels.push(wh);
    const a = new THREE.Mesh(new THREE.CircleGeometry(archR,22), M(0x050505));
    a.position.set(sx*(hw+.06+.012), wr+.02, sz*wz); a.rotation.y = sx*Math.PI/2; g.add(a);
  }

  /* ---- lights helpers ---- */
  const zF = L/2-.02+bv, zR = -L/2-.02-bv;
  const lampAt = (geo, mat, x, y, rz) => { const m = add(geo, mat, x, y, noseZ(y)+bv-.02); m.rotation.z = rz||0; return m; };
  const plate = () => add(box(.42,.12,.012), M(0xf2f2f2), 0, clear+bh*.3, zR-.004);
  const flames = [];
  const flameMats = [new THREE.MeshBasicMaterial({color:0xff4a00, transparent:true, opacity:.85, depthWrite:false, side:THREE.DoubleSide}),
                     new THREE.MeshBasicMaterial({color:0xffc233, transparent:true, opacity:.95, depthWrite:false, side:THREE.DoubleSide})];
  const pipe = (x,r,y) => {
    const py = y||clear+.07, c = new THREE.Mesh(new THREE.CylinderGeometry(r,r,.14,12).rotateX(Math.PI/2), chrome); c.position.set(x,py,zR-.05); g.add(c);
    if (opt.flames && (k==="muscle"||k==="coupe"||k==="super")){      // exhaust fire (animated from render/effects.js)
      const fg = new THREE.Group(); fg.position.set(x,py,zR-.12); fg.visible = false;
      [[1.9,1,0],[1.05,.62,1]].forEach(([rm,lm,mi])=>{ const geo = new THREE.ConeGeometry(r*rm,lm,10,1,true); geo.translate(0,lm/2,0); geo.rotateX(-Math.PI/2); fg.add(new THREE.Mesh(geo, flameMats[mi])); });
      g.add(fg); flames.push(fg);
    }
  };
  const lip = (w,d,y,mat) => add(box(w,.07,d), mat||black, 0, y, L/2+.03-d/2+.07);

  /* =================== per-car details =================== */
  if (k === 'hatch'){
    add(box(W*.6,.13,.05), black, 0, clear+bh*.22, zF-.01);                 // lower intake
    add(box(W*.42,.055,.05), gloss, 0, clear+bh*.42, noseZ(clear+bh*.42)+bv-.02); // slim upper grille
    for (const sx of [-1,1]) lampAt(box(.46,.085,.07), lampW, sx*(W/2-.34), clear+bh*.56, sx*-.14);
    for (const sx of [-1,1]){ add(box(.34,.13,.05), lampR, sx*(W/2-.22), clear+bh*.46, zR-.012); }
    lip(W*.86,.28,clear+.03);
    add(box(W*.8,.04,.24), gloss, 0, cabY+ch-.01, cabZ+ra-.12).rotation.x = .08;      // roof spoiler
    add(box(W*.7,.05,.2), black, 0, clear+.06, zR+.02);                                // diffuser
    pipe(-.16,.045); pipe(.16,.045); plate();
  }
  if (k === 'sedan'){
    add(box(W*.56,.1,.05), gloss, 0, clear+bh*.34, zF-.01);
    add(box(W*.56,.025,.05), chrome, 0, clear+bh*.5, noseZ(clear+bh*.5)+bv-.02);
    for (const sx of [-1,1]) lampAt(box(.5,.075,.07), lampW, sx*(W/2-.36), clear+bh*.58, sx*-.1);
    for (const sx of [-1,1]) add(box(.5,.085,.05), lampR, sx*(W/2-.3), clear+bh*.4, zR-.012);
    lip(W*.88,.24,clear+.03);
    add(box(W*.78,.03,.12), body, 0, yDeck+.01, -L/2+.2);                              // trunk lip
    pipe(-.55,.04); pipe(.55,.04); plate();
  }
  if (k === 'muscle'){
    // hood scoop (ram-air / blower style): rounded bulge rising from the bonnet with a dark intake at the front; attached to the hood so it lifts with it
    {
      const SL = .82, SH = .24, SW = .62, bevS = .05;
      const sh = new THREE.Shape();
      sh.moveTo(0,0); sh.quadraticCurveTo(.22,SH*.95,.56,SH); sh.lineTo(.72,SH*.92); sh.quadraticCurveTo(SL,SH*.8,SL,SH*.42); sh.lineTo(SL,0); sh.lineTo(0,0);
      const scoopG = new THREE.Mesh(extrudeProfile(sh, SW, bevS), body);
      const su = hoodL*.28, slope = Math.atan((.11-(.085-nd))/(hoodL-.2));
      scoopG.position.set(0, .095, su); scoopG.rotation.x = slope; hood.add(scoopG);
      const mouth = new THREE.Mesh(box(SW*.72,SH*.34,.04), new THREE.MeshBasicMaterial({color:0x050506}));     // dark intake opening
      mouth.position.set(0, .095+SH*.26, su+SL+bevS-.005); mouth.rotation.x = slope; hood.add(mouth);
      const mesh2 = new THREE.Mesh(box(SW*.72,SH*.34,.012), new THREE.MeshBasicMaterial({map:(()=>{ const t = meshTexture().clone(); t.needsUpdate = true; t.repeat.set(8,3); return t; })()}));
      mesh2.position.set(0, .095+SH*.26, su+SL+bevS+.018); mesh2.rotation.x = slope; hood.add(mesh2);                // mesh screen inside the opening
      const lipM = new THREE.Mesh(box(SW*.78,.02,.03), chrome); lipM.position.set(0, .095+SH*.26+SH*.19, su+SL+bevS+.01); lipM.rotation.x = slope; hood.add(lipM);
    }
    add(box(W*.6,.15,.05), gloss, 0, clear+bh*.3, zF-.01);                              // big grille
    add(box(W*.22,.07,.05), M(0xb01010), 0, clear+bh*.3, zF+.012);                      // emblem
    for (const sx of [-1,1]){ lampAt(box(.48,.09,.07), lampW, sx*(W/2-.36), clear+bh*.55, sx*-.12);
      add(box(.3,.07,.04), lampW, sx*(W/2-.3), clear+bh*.18, zF-.005); }
    add(box(W*.97,.04,.5), gloss, 0, clear-.005, L/2+.04);                              // front splitter
    for (const sx of [-1,1]){ for (let i=0;i<3;i++) add(box(.13,.1,.05), lampR, sx*(W/2-.2-i*.17), clear+bh*.4, zR-.012); }
    add(box(W*.7,.07,.3), black, 0, clear+.08, zR+.03);                                 // diffuser
    // GT-style rear wing
    add(box(W*.94,.035,.4), gloss, 0, yDeck+.3, -L/2+.2).rotation.x = -.06;
    for (const sx of [-1,1]){ add(box(.03,.07,.4), gloss, sx*W*.47, yDeck+.31, -L/2+.2); add(box(.045,.3,.09), gloss, sx*W*.28, yDeck+.14, -L/2+.2); }
    pipe(-.72,.05); pipe(-.58,.05); pipe(.58,.05); pipe(.72,.05); plate();
    for (const sx of [-1,1]) add(box(.01,.2,.04), black, sx*(W/2-.004), clear+bh*.55, hinge-.12).rotation.z = 0; // fender vent
  }
  if (k === 'coupe'){
    // raised round-lamp fenders (964 style)
    for (const sx of [-1,1]){
      const y = clear+bh*.52, zl = noseZ(y)+bv;
      const fend = add(new THREE.SphereGeometry(1,18,12), body, sx*.6, yT-nd+.02, zl-.32); fend.scale.set(.3,.13,.5);
      const lamp = add(new THREE.SphereGeometry(1,18,12), lampW, sx*.6, y+.07, zl-.04); lamp.scale.set(.15,.15,.08);
      add(box(.14,.05,.03), M(0xff8c1a), sx*.55, clear+bh*.2, zF-.005);                  // amber indicator
    }
    add(box(W*.9,.045,.05), black, 0, clear+.1, zF-.005);                               // front valance
    add(box(W*.88,.1,.05), lampR, 0, clear+bh*.42, zR-.012);                            // red rear band (unlit, so it shows at night)
    add(box(W*.9,.05,.05), black, 0, clear+.1, zR-.01);
    // whale-tail wing: big raised duck tail with grille
    const wz0 = -L/2+.38;
    add(box(W*.9,.05,.8), gloss, 0, yDeck+.2, wz0).rotation.x = .12;
    add(box(W*.9,.1,.05), gloss, 0, yDeck+.25, wz0-.38);
    for (const sx of [-1,1]) add(box(.04,.1,.78), gloss, sx*W*.45, yDeck+.2, wz0).rotation.x = .12;
    add(box(W*.5,.012,.4), M(0x050505), 0, yDeck+.226, wz0+.05).rotation.x = .12;
    for (const sx of [-1,1]) add(box(.05,.2,.06), gloss, sx*W*.3, yDeck+.1, wz0+.1);
    pipe(.5,.05, clear+.08); pipe(.64,.05, clear+.08); plate();
  }
  if (k === 'super'){
    // closed roof (cab above) - engine cover behind it, front fenders + hood ridge like the Mistral
    const hs2 = new THREE.Shape(); hs2.moveTo(-.9,yT-.04);
    hs2.quadraticCurveTo(-1.1,yT+.16,-1.6,yT+.16); hs2.quadraticCurveTo(-2.0,yT+.14,-L/2+.1,yDeck+.02); hs2.lineTo(-L/2+.05,yT-.04); hs2.lineTo(-.9,yT-.04);
    g.add(new THREE.Mesh(extrudeProfile(hs2, W*.78, .06), body));
    const ridge = new THREE.Mesh(box(.06,.04,hoodL*.85), body); ridge.position.set(0,.13,hoodL*.5); hood.add(ridge);
    for (const sx of [-1,1]){
      add(box(.012,.16,L*.55), M(0x1c2a44), sx*(W/2-.004), clear+.1, 0);              // dark two-tone sill
    }
    addHyperEngine(g, bay);                                                            // visible only when the bonnet is open
    // big wing
    add(box(W*.96,.035,.45), gloss, 0, yDeck+.5, -L/2+.1).rotation.x = -.08;
    for (const sx of [-1,1]){ add(box(.03,.14,.45), gloss, sx*W*.48, yDeck+.5, -L/2+.1); add(box(.05,.5,.1), gloss, sx*W*.26, yDeck+.26, -L/2+.2); }
    // horseshoe grille + LED headlights
    const gw = .16, gh = .37, gt = .028, gb = clear+.075;                        // half-width, height, frame thickness, bottom y
    const horseshoe = (w,h,yb) => { const sh = new THREE.Shape(); sh.moveTo(-w,yb); sh.lineTo(w,yb); sh.lineTo(w,h-w); sh.absarc(0,h-w,w,0,Math.PI,false); sh.lineTo(-w,yb); return sh; };
    const frameG = new THREE.ShapeGeometry(horseshoe(gw,gh,0), 24);
    const meshG  = new THREE.ShapeGeometry(horseshoe(gw-gt,gh-gt,gt), 24);
    const mt = meshTexture().clone(); mt.needsUpdate = true; mt.repeat.set(1/.045, 1/.045);
    add(frameG, chrome, 0, gb, zF+.004);
    add(meshG, new THREE.MeshBasicMaterial({map:mt}), 0, gb, zF+.007);
    add(box(.022,.07,.02), chrome, 0, gb+gt+.03, zF+.012);                         // centre rib at the bottom
    const badge = add(new THREE.CircleGeometry(.032,20), M(0xc8161d), 0, gb+gh*.62, zF+.012); badge.scale.set(1.55,1,1);
    const badgeR = add(new THREE.RingGeometry(.032,.04,20), chrome, 0, gb+gh*.62, zF+.013); badgeR.scale.set(1.55,1,1);
    for (const sx of [-1,1]){
      // tall slanted LED headlight: dark housing + stack of horizontal LED slats
      const ly = clear+bh*.55, lg = new THREE.Group();
      lg.position.set(sx*(W/2-.19), ly, noseZ(ly)+bv-.02); lg.rotation.z = sx*.34; lg.rotation.y = sx*.28; lg.scale.set(1.3,1.3,1); g.add(lg);
      const hsg = new THREE.Mesh(box(.15,.36,.05), gloss); lg.add(hsg);
      for (let i=-2;i<=2;i++){
        const slat = new THREE.Mesh(box(.105,.02,.058), new THREE.MeshBasicMaterial({color: i===0 ? 0xffffff : 0xcfe9ff})); slat.position.set(0, i*.065, .004); lg.add(slat);
      }
      const bezel = new THREE.Mesh(box(.16,.012,.052), chrome); bezel.position.set(0,.185,0); lg.add(bezel);
      add(box(.55,.17,.05), M(0x070709), sx*.62, clear+bh*.26, zF-.01);
      add(box(.06,.18,.05), lampR, sx*(W/2-.1), clear+bh*.42, zR-.012);
    }
    add(box(W*.84,.05,.05), lampR, 0, clear+bh*.5, zR-.012);
    add(box(W*.82,.07,.3), black, 0, clear+.035, L/2-.04);                              // chin
    add(box(W*.7,.08,.3), black, 0, clear+.05, zR+.04);                                 // diffuser
    pipe(-.34,.07); pipe(.34,.07);
  }

  /* ---- reverse lamps: two small white lamps beside the plate, lit while reversing ---- */
  const lampRev = new THREE.MeshBasicMaterial({color:0x4a4a46});
  for (const sx of [-1,1]) add(box(.1,.06,.04), lampRev, sx*.34, clear+bh*.3, zR-.012);

  /* ---- turn-signal lamps ---- */
  const indL = new THREE.MeshBasicMaterial({color:0x3a2200}), indR = new THREE.MeshBasicMaterial({color:0x3a2200});
  for (const sx of [-1,1]){
    const m = sx>0 ? indL : indR;
    add(box(.17,.06,.045), m, sx*(W/2-.16), clear+bh*.30, zF-.002);
    add(box(.17,.06,.045), m, sx*(W/2-.16), clear+bh*.24, zR-.012);
  }

  /* ---- Muscle GT racing stripes (ribbons following the top surface) ---- */
  if (opt.stripes){
    const blue = new THREE.MeshPhongMaterial({color:0x1d4fd8, shininess:80, specular:0x666666, side:THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:-3, polygonOffsetUnits:-3});
    const wh = new THREE.MeshPhongMaterial({color:0xffffff, shininess:80, side:THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:-4, polygonOffsetUnits:-4});
    const hoodPts = [[0,.116],[hoodL*.4,.11],[hoodL*.7,.098],[hoodL-.12,.09]];
    const roofPts = []; for (let i=0;i<=10;i++){ const q = bez(roofP0,roofC,roofP2,i/10); roofPts.push([q[0],q[1]+.006]); }
    const deckPts = []; for (let i=0;i<=8;i++){ const q = bez([cabZ-cl/2+.1,yDeck],[ -L/2+.3,yDeck],[-L/2-.02,clear+bh*.55], i/8*.55); deckPts.push([q[0],q[1]+.006]); }
    for (const sx of [-1,1]){
      for (const [xc,w,m] of [[sx*.2,.25,blue],[sx*.045,.035,wh]]){
        hood.add(ribbon(hoodPts, xc, w, m));
        cabG.add(ribbon(roofPts, xc, w, m));
        g.add(ribbon(deckPts, xc, w, m));
      }
    }
  }

  Object.assign(g.userData, {hood, body, flames, ind:{L:indL,R:indR}, tail:lampR, reverseLamp:lampRev, wheels, wr, spin:0, baseColor:new THREE.Color(color)});
  return g;
}
