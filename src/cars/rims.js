// Rim faces for the Muscle GT, Sports Coupe and Hypercar, drawn once on a canvas. The spokes are opaque and the gaps
// transparent, so the brake disc and the brake caliper show through (the disc colour comes with the design). Each design is shared by every wheel that uses it.
import * as THREE from '../three.js';

const C = 128;                                                   // canvas centre; the face is 256 x 256 and the rim lip reaches r = 124
const at = (r, a) => [C + r*Math.cos(a), C + r*Math.sin(a)];     // polar to canvas point
function seg(x, [r0,a0], [r1,a1], w, col){ const [x0,y0]=at(r0,a0), [x1,y1]=at(r1,a1); x.strokeStyle=col; x.lineWidth=w; x.lineCap='round'; x.beginPath(); x.moveTo(x0,y0); x.lineTo(x1,y1); x.stroke(); }
function ring(x, r, w, col){ x.strokeStyle=col; x.lineWidth=w; x.beginPath(); x.arc(C,C,r,0,Math.PI*2); x.stroke(); }
function disc(x, r, col, cx=C, cy=C){ x.fillStyle=col; x.beginPath(); x.arc(cx,cy,r,0,Math.PI*2); x.fill(); }
function nuts(x, r, size, col){ for (let i=0;i<5;i++){ const [px,py]=at(r, i*Math.PI*2/5 - Math.PI/2); disc(x,size,col,px,py); } }

// brake: the colour of the disc behind the spokes; caliper: its colour, or null for none
const DESIGNS = {
  // Muscle GT: glossy blue barrel, gloss black face with five big round openings, no caliper showing
  swirl: { shine:90, specular:0xaaaaaa, caliper:null, brake:'#1b1c20', draw(x){
    disc(x,100,'#0c0c0e');
    x.globalCompositeOperation = 'destination-out';                           // cut the five openings out of the black face
    for (let i=0;i<5;i++){ const [px,py] = at(64, i*Math.PI*2/5 - Math.PI/2 + .1); disc(x,34,'#000',px,py); }
    x.globalCompositeOperation = 'source-over';
    ring(x,111,22,'#1e9bf0'); ring(x,120,3,'#9bdcff'); ring(x,100,2,'#0a6fb8');
    disc(x,24,'#0c0c0e'); ring(x,24,2.5,'#c9cbd0'); nuts(x,15,3.5,'#3a3c42');
  }},
  // Sports Coupe: matte gold, five forked spokes, wide lip, centre-lock hub, no caliper showing
  forged: { shine:25, specular:0x665533, caliper:null, brake:'#1b1c20', draw(x){
    const GOLD = '#b8985a', HI = '#dcc183';
    ring(x,114,18,GOLD); ring(x,123,3,HI); ring(x,102,3,HI);
    for (let i=0;i<5;i++){
      const a = i*Math.PI*2/5 - Math.PI/2;
      seg(x,[20,a],[54,a],18,GOLD);
      seg(x,[54,a],[108,a-.32],9,GOLD); seg(x,[54,a],[108,a+.32],9,GOLD);       // the fork
    }
    disc(x,30,GOLD); disc(x,21,'#111214'); ring(x,21,2.5,HI);
  }},
  // Hypercar: matte black, ten thin spokes that fork near the rim, steel brake disc, red caliper
  twin: { shine:20, specular:0x333333, caliper:0xd01818, brake:'#7d8087', draw(x){
    const BLACK = '#18191c', EDGE = '#3c3e44';
    ring(x,116,14,BLACK); ring(x,122,2,EDGE); ring(x,100,4,BLACK);
    for (let i=0;i<10;i++){
      const a = i*Math.PI/5;
      seg(x,[24,a],[70,a],9,BLACK);
      seg(x,[70,a],[108,a-.17],6,BLACK); seg(x,[70,a],[108,a+.17],6,BLACK);   // the fork
    }
    disc(x,26,BLACK); ring(x,26,3,'#c9cbd0'); disc(x,14,'#2a2b2f');
  }},
};

const built = {};
export function rimFace(name){
  if (built[name]) return built[name];
  const d = DESIGNS[name], c = document.createElement('canvas'); c.width = c.height = 256;
  d.draw(c.getContext('2d'));
  const map = THREE.canvasTexture(c); map.anisotropy = 4;
  return (built[name] = {
    face: new THREE.MeshPhongMaterial({map, transparent:true, alphaTest:.15, shininess:d.shine, specular:d.specular}),
    brake: new THREE.MeshLambertMaterial({color:d.brake}),
    caliper: d.caliper === null ? null : new THREE.MeshLambertMaterial({color:d.caliper}),
  });
}
