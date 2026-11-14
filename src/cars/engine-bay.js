// What is seen with the bonnet open (B key, or popped open by damage): the bonnet underside and the engine bays.
// `b` carries the body measurements and shared materials from buildCar:
// {k, W, hoodL, nd, hinge, yT, body, chrome, M, holeC, holeX, holeH} (hole* = the Muscle GT's supercharger opening).
import * as THREE from '../three.js';
import { extrudeProfile, roundRect } from './shapes.js';

const box = (w,h,d) => new THREE.BoxGeometry(w,h,d);

const _hoodTex = {};
function hoodUnderTexture(kind){
  if (_hoodTex[kind]) return _hoodTex[kind];
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
  if (kind === 'carbon'){                                   // carbon-fibre twill weave
    for (let j=0;j<32;j++) for (let i=0;i<32;i++){
      const a = (i+j)%2, h = ((i>>1)+(j>>1))%2;
      x.fillStyle = a ? (h ? '#2b2d31' : '#1d1f22') : (h ? '#17181b' : '#26282c'); x.fillRect(i*8,j*8,8,8);
      x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(i*8, j*8, 8, a?2:1);
    }
  } else {                                                  // felt insulation pad with cut-out grooves
    x.fillStyle = '#2a2c2e'; x.fillRect(0,0,256,256);
    for (let n=0;n<5200;n++){ const g = 30+Math.random()*34|0; x.fillStyle = 'rgb('+g+','+g+','+(g+2)+')'; x.fillRect(Math.random()*256, Math.random()*256, 1.6, 1.6); }
  }
  const t = THREE.canvasTexture(c); t.anisotropy = 4; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3,3); return (_hoodTex[kind] = t);
}

export function addBonnetUnderside(hood, b){
  const {k, W, hoodL, nd, body, chrome, holeC, holeX, holeH} = b;
  const run = hoodL-.4, ulen = hoodL-.3, zc = ulen/2+.06, slope = Math.atan(nd/run);
  const yAt = u => -nd*Math.min(1,u/run);
  const Wp = W*.9, Lp = ulen;
  // inner panel: body-coloured sheet metal (follows paint colour + damage tint)
  let underGeo;
  if (k === 'muscle'){
    const sh = new THREE.Shape(); sh.moveTo(-Wp/2,-Lp/2); sh.lineTo(Wp/2,-Lp/2); sh.lineTo(Wp/2,Lp/2); sh.lineTo(-Wp/2,Lp/2); sh.lineTo(-Wp/2,-Lp/2);
    const hy = holeC-zc, hole = new THREE.Path(); hole.moveTo(-holeX,hy-holeH); hole.lineTo(-holeX,hy+holeH); hole.lineTo(holeX,hy+holeH); hole.lineTo(holeX,hy-holeH); hole.lineTo(-holeX,hy-holeH);
    sh.holes.push(hole); underGeo = new THREE.ShapeGeometry(sh);
  } else underGeo = new THREE.PlaneGeometry(Wp, Lp);
  const under = new THREE.Mesh(underGeo, body);
  under.rotation.x = Math.PI/2 + slope; under.position.set(0, yAt(zc)-.045, zc); hood.add(under);
  // black insulation pads in the three recesses, split by two diagonal struts that meet near the latch (like a real inner bonnet)
  const padM = new THREE.MeshLambertMaterial({map: hoodUnderTexture(k==='super' ? 'carbon' : 'felt')});
  const bd = .1, sw = .05, xt = .13, xb = Wp/2-bd-.16, yF = Lp/2-bd, yR = -Lp/2+bd;   // +y = front (latch), -y = hinge side
  const poly = pts => { const sh = new THREE.Shape(); sh.moveTo(pts[0][0],pts[0][1]); for (let i=1;i<pts.length;i++) sh.lineTo(pts[i][0],pts[i][1]); sh.closePath(); return sh; };
  const pads = [
    [[-Wp/2+bd,yF],[-xt-sw,yF],[-xb-sw,yR],[-Wp/2+bd,yR]],      // left recess
    [[xt+sw,yF],[Wp/2-bd,yF],[Wp/2-bd,yR],[xb+sw,yR]],          // right recess
    [[-xt+sw,yF],[xt-sw,yF],[xb-sw,yR],[-xb+sw,yR]]             // centre recess
  ];
  pads.forEach((pts, pi) => { if (k==='muscle' && pi===2) return; const pm = new THREE.Mesh(new THREE.ShapeGeometry(poly(pts)), padM); pm.position.z = .004; under.add(pm); });   // (no centre pad where the opening is)
  // grommets / clips along the frame
  const gM = new THREE.MeshBasicMaterial({color:0x050505});
  for (const [gx,gy] of [[-Wp/2+bd/2,yF],[Wp/2-bd/2,yF],[-Wp/2+bd/2,yR],[Wp/2-bd/2,yR],[-Wp/2+bd/2,0],[Wp/2-bd/2,0],[0,yF+bd/2-.01]]){
    const c = new THREE.Mesh(new THREE.CircleGeometry(.018,10), gM); c.position.set(gx,gy,.006); under.add(c);
  }
  for (const sx of [-1,1]){ const h = new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.16,10).rotateZ(Math.PI/2), chrome); h.position.set(sx*W*.38, -.05, .03); hood.add(h); }   // hinge pins
  const latch = new THREE.Mesh(box(.2,.05,.1), chrome); latch.position.set(0, yAt(hoodL-.2)-.075, hoodL-.2); hood.add(latch);                                                   // latch plate
}

// front-engined cars: V8 with supercharger (Muscle GT) or a covered inline engine (Hatch, Sedan, Coupe)
export function addEngineBay(g, b){
  const {k, hoodL, nd, hinge, yT, chrome, M} = b;
  const eg = new THREE.Group(); eg.visible = false; g.add(eg); g.userData.engine = eg;
  eg.scale.setScalar(Math.min(1.05, hoodL/1.5)); eg.position.set(0, yT-nd*.4-.035, hinge+hoodL*(k==='muscle' ? .52 : .6));
  const ea = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); eg.add(m); return m; };
  const cyl = (r, h, mat, x, y, z) => ea(new THREE.CylinderGeometry(r,r,h,14), mat, x, y, z);
  const plastic = new THREE.MeshPhongMaterial({color:0x1c1d20, shininess:45, specular:0x3a3a3a});
  const rubber = M(0x0e0e0f), gold = new THREE.MeshPhongMaterial({color:0xb5832a, shininess:60, specular:0xaaaaaa});
  const alu = new THREE.MeshPhongMaterial({color:0xb4b8be, shininess:90, specular:0xffffff});
  const yel = M(0xf1c40f), red = M(0xc0171b), cream = M(0xe6dfc6), blue = M(0x2a6fd6), grey = M(0x6a6d72), dk = M(0x131415);
  const hose = (a, b, r, mat) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,10), mat||rubber); m.position.copy(A).addScaledVector(d,.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.normalize()); eg.add(m); return m; };
  // bay structure: floor, inner fender walls, strut towers, firewall, radiator + support
  ea(box(1.5,.02,1.0), M(0x0b0b0c), 0, 0, 0);
  for (const sx of [-1,1]){ ea(box(.05,.2,1.0), dk, sx*.72, .1, 0); cyl(.075,.14,grey, sx*.5, .08, -.2); cyl(.03,.03,chrome, sx*.5, .165, -.2); }
  ea(box(1.44,.3,.05), M(0x101112), 0, .15, -.5);
  ea(box(1.3,.24,.05), M(0x161718), 0, .13, .46); ea(box(1.25,.05,.09), gold, 0, .27, .46); ea(box(1.4,.05,.06), M(0x222324), 0, .31, .5);
  cyl(.035,.04,yel, -.5, .31, .43);                                               // radiator cap
  // engine
  const rbox = (w, h, d, mat, x, y, z, r) => { const m = new THREE.Mesh(extrudeProfile(roundRect(-d/2,-h/2,d/2,h/2,Math.min(r||.03,h/2*.9)), w, .015), mat); m.position.set(x,y,z); eg.add(m); return m; };
  const cylz = (r, len, mat, x, y, z) => ea(new THREE.CylinderGeometry(r,r,len,14).rotateX(Math.PI/2), mat, x, y, z);
  const iron = M(0x4a3b32);
  if (k === 'muscle'){
    // V8: block, two angled valve covers with chrome rims, cast-iron manifolds, belt drive + fan, finned round air cleaner
    rbox(.5,.1,.64, M(0x2b2c2f), 0, .07, 0, .02);
    const vcM = new THREE.MeshPhongMaterial({color:0x4a4e55, shininess:90, specular:0xdddddd});
    for (const sx of [-1,1]){
      const bank = new THREE.Group(); bank.position.set(sx*.17, .13, 0); bank.rotation.z = -sx*.32; eg.add(bank);
      bank.add(new THREE.Mesh(extrudeProfile(roundRect(-.31,0,.31,.1,.045), .2, .02), vcM));
      const rim = new THREE.Mesh(extrudeProfile(roundRect(-.33,-.012,.33,.018,.008), .24, .012), chrome); bank.add(rim);
      for (let i=0;i<3;i++){ const bolt = new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.022,8), chrome); bolt.position.set(0,.115,-.2+i*.2); bank.add(bolt); }
      ea(box(.09,.08,.52), iron, sx*.37, .07, 0);                                   // exhaust manifold
      for (let i=0;i<4;i++) cyl(.022,.1,iron, sx*.37, .03, -.2+i*.13);              // runners
      for (let i=0;i<4;i++){ const w = new THREE.Mesh(new THREE.CylinderGeometry(.01,.01,.14,6), rubber); w.position.set(sx*.1, .11, -.2+i*.13); w.rotation.z = -sx*.9; eg.add(w); }   // plug leads
    }
    // supercharger (roots blower): polished case + twin lobes, ribbed top, intake hat, belt-driven pulley. Rises through the bonnet opening.
    ea(box(.18,.08,.42), M(0x26272a), 0, .14, 0);                                      // intake manifold under the blower
    rbox(.34,.15,.5, alu, 0, .21, 0, .05);                                              // blower case
    cylz(.085,.5,alu, -.085, .235, 0); cylz(.085,.5,alu, .085, .235, 0);                // twin rotor housings
    for (let i=0;i<6;i++) ea(box(.3,.012,.022), M(0x8d9198), 0, .31, -.2+i*.08);        // cooling ribs
    cylz(.075,.12,chrome, 0, .25, .3); cylz(.058,.03,M(0x0d0d0e), 0, .25, .365);        // inlet snout + throttle plate
    cyl(.1,.07,chrome, 0, .345, -.04); cyl(.085,.03,M(0x1a1b1d), 0, .385, -.04);        // injector hat on top
    cylz(.07,.03,M(0x1a1a1c), 0, .24, .39); cylz(.025,.035,chrome, 0, .24, .39);        // blower drive pulley
    hose([0,.24,.405],[0,.09,.362],.007); hose([0,.24,.405],[.2,.17,.362],.007);        // blower belt
    cylz(.06,.04,M(0x1a1a1c), 0, .09, .34); cylz(.05,.04,M(0x1a1a1c), .2, .17, .34); cylz(.055,.04,M(0x1a1a1c), -.2, .17, .34);    // pulleys
    hose([0,.09,.362],[.2,.17,.362],.007); hose([.2,.17,.362],[-.2,.17,.362],.007); hose([-.2,.17,.362],[0,.09,.362],.007);          // belt
    ea(box(.04,.44,.012), M(0x0f0f10), 0, .17, .41); ea(box(.44,.04,.012), M(0x0f0f10), 0, .17, .41); cylz(.04,.03,M(0x2a2b2e), 0, .17, .42);   // fan
    rbox(.2,.12,.2, M(0x1d3f78), .5, .1, .02, .03); cyl(.03,.03,M(0xdddddd), .5, .17, .02);                                                  // washer tank
  } else {                                                                          // inline engine: rounded plastic cover
    rbox(.5,.09,.64, M(0x2a2b2e), -.12, .07, 0, .02);
    rbox(.46,.1,.58, plastic, -.12, .17, 0, .04);
    for (let i=0;i<6;i++) ea(box(.4,.01,.02), M(0x34363a), -.12, .226, -.22+i*.085);
    cyl(.025,.02,yel, -.22, .235, .14);                                              // oil filler cap
    rbox(.12,.07,.5, plastic, .14, .14, 0, .03);                                     // intake plenum
    ea(new THREE.TorusGeometry(.03,.007,8,14), yel, -.02, .15, .33);                 // dipstick ring
    rbox(.34,.15,.46, plastic, .46, .13, .08, .05); rbox(.33,.035,.45, M(0x222325), .46, .215, .08, .015);     // air box + lid
    for (const cz of [-.12,.04,.2]) ea(box(.03,.04,.02), M(0x0a0a0a), .3, .2, cz+.03);
    hose([.3,.19,.1],[.06,.17,.1], .045);
  }
  // radiator hoses, battery, reservoirs
  hose([-.3,.2,.12],[-.45,.28,.43], .04); hose([-.05,.12,.3],[.32,.2,.44], .038);
  ea(box(.24,.17,.17), M(0x151617), -.52, .095, -.36); ea(box(.07,.03,.06), red, -.57, .195, -.36); ea(box(.07,.03,.06), M(0x111111), -.47, .195, -.36);
  ea(box(.1,.1,.09), cream, .5, .11, -.38); cyl(.03,.03,rubber, .5, .175, -.38);
  cyl(.05,.12,M(0xd8d4c4), .2, .11, -.3); cyl(.035,.03,rubber, .2, .185, -.3);
  cyl(.045,.08,blue, -.3, .09, .38);
  hose([.5,.15,-.38],[.3,.12,-.15], .02);
}

// Hypercar: engine bay floor and the twin-bank engine under the front cover
export function addHyperEngine(g, b){
  const {W, hinge, yT, chrome, M} = b;
  const eng = new THREE.Group(); eng.visible = false; g.add(eng); g.userData.engine = eng;
  const ey = yT-.05, ez = hinge+.8;
  const alu = new THREE.MeshPhongMaterial({color:0xb9bdc3, shininess:90, specular:0xffffff});
  const gun = new THREE.MeshPhongMaterial({color:0x4b4e54, shininess:100, specular:0xbbbbbb});
  const ea = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); eng.add(m); return m; };
  ea(box(W*.78,.02,1.0), M(0x0a0a0c), 0, ey+.03, ez);                                   // engine bay floor
  ea(box(.12,.07,.9), M(0x111214), 0, ey+.07, ez);                                       // central valley
  for (const sx of [-1,1]){
    ea(box(.3,.15,.62), alu, sx*.27, ey+.11, ez);                                        // cam-cover bank
    ea(box(.2,.012,.4),  M(0x16171a), sx*.27, ey+.19, ez-.04);                           // mesh vents
    ea(box(.13,.012,.1), gun, sx*.27, ey+.19, ez+.2);                                    // badge plate
    ea(new THREE.CylinderGeometry(.04,.04,.14,12), gun, sx*.27, ey+.16, ez-.38);         // intake stubs
    ea(new THREE.CylinderGeometry(.04,.04,.14,12), gun, sx*.4,  ey+.16, ez-.38);
    ea(box(.26,.06,.14), alu, sx*.27, ey+.08, ez+.38);                                   // exhaust-side manifold cover
    ea(new THREE.CylinderGeometry(.06,.06,.72,16).rotateX(Math.PI/2), gun, sx*.085, ey+.2, ez); // intake tubes
    ea(new THREE.CylinderGeometry(.075,.075,.06,16).rotateX(Math.PI/2), chrome, sx*.085, ey+.2, ez+.2);     // clamps
    ea(new THREE.CylinderGeometry(.075,.075,.06,16).rotateX(Math.PI/2), chrome, sx*.085, ey+.2, ez-.2);
  }
}
