// The 2D overlay canvas: cockpit or corner gauge, score, damage bar, gearbox and lights status,
// indicator arrows, hints and the WRECKED screen.
import { S, car } from '../state.js';
import { drawCockpit, drawGauge, FONT } from './dashboard.js';
import { sigPh } from '../render/frame.js';

const hudc = document.getElementById('hud');
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  hudc.width = innerWidth * dpr; hudc.height = innerHeight * dpr;
}
addEventListener('resize', resize); resize();
const hud = hudc.getContext('2d');

export function drawHUD(){
  const dpr = hudc.width/innerWidth, Wd = innerWidth, Hd = innerHeight;
  hud.setTransform(dpr,0,0,dpr,0,0); hud.clearRect(0,0,Wd,Hd);
  if (S.cam==='fp') drawCockpit(hud,Wd,Hd);
  else { const r = Math.min(Hd*.15,120); drawGauge(hud, Wd-r*1.9, Hd-r*1.5, r); }
  // damage flash
  if (S.flash>0){ const g=hud.createRadialGradient(Wd/2,Hd/2,Hd*.3,Wd/2,Hd/2,Hd*.85); g.addColorStop(0,'rgba(255,0,0,0)'); g.addColorStop(1,`rgba(255,20,0,${S.flash})`); hud.fillStyle=g; hud.fillRect(0,0,Wd,Hd); }
  // top info
  hud.textBaseline='top'; hud.textAlign='left'; hud.fillStyle='#fff'; hud.shadowColor='rgba(0,0,0,.7)'; hud.shadowBlur=4;
  hud.font=`bold 22px ${FONT}`; hud.fillText('Score '+S.score, 18, 14);
  hud.font=`14px ${FONT}`; hud.fillStyle='#dfe8f5'; hud.fillText((S.dist/1000).toFixed(2)+' km · overtakes '+S.overtakes+' · '+car.name, 18, 42);
  hud.textAlign='right'; hud.fillStyle='#fff'; hud.font=`bold 14px ${FONT}`; hud.fillText('DAMAGE', Wd-18, 14);
  hud.shadowBlur=0;
  const bw=170, bx=Wd-18-bw; hud.fillStyle='rgba(0,0,0,.55)'; hud.fillRect(bx,34,bw,10);
  const hp=S.health/100; hud.fillStyle = hp>.6?'#43d17a':hp>.3?'#ffb300':'#ff3d2e'; hud.fillRect(bx,34,bw*hp,10);
  hud.fillStyle='#cfd8e6'; hud.font=`12px ${FONT}`; hud.fillText(Math.round(S.health)+'% · '+(S.cam==='fp'?'V: chase cam':S.cam==='chase'?'V: free cam':'V: cockpit'), Wd-18, 50);
  hud.fillStyle = S.neutral ? '#6fe3ff' : S.auto ? '#cfd8e6' : '#ffd24a'; hud.font=`12px ${FONT}`; hud.fillText('Gearbox: '+(S.rev ? 'REVERSE' : S.neutral ? 'NEUTRAL' : S.auto ? 'AUTO' : 'MANUAL  Q/E shift')+' (T mode · X neutral)', Wd-18, 66);
  if (S.lights>0){ hud.fillStyle='#ffe9a8'; hud.font=`12px ${FONT}`; hud.fillText('Lights: '+(S.lights===1?'WIDE':'FOCUS')+' (L)', Wd-18, 82); }
  if (S.sigL || S.sigR){                                                      // indicator arrows on the dash
    const on = sigPh===1, col = on ? '#3cff6a' : 'rgba(60,255,106,.14)', cx = Wd/2, cy = 38;
    hud.shadowColor = on ? '#3cff6a' : 'transparent'; hud.shadowBlur = on ? 10 : 0; hud.fillStyle = col;
    const arrow = d => { hud.beginPath(); hud.moveTo(cx+d*70,cy); hud.lineTo(cx+d*48,cy-15); hud.lineTo(cx+d*48,cy-6); hud.lineTo(cx+d*26,cy-6); hud.lineTo(cx+d*26,cy+6); hud.lineTo(cx+d*48,cy+6); hud.lineTo(cx+d*48,cy+15); hud.closePath(); hud.fill(); };
    if (S.sigL) arrow(-1);
    if (S.sigR) arrow(1);
    hud.shadowBlur = 0;
  }
  if (S.cam==='free'){
    hud.textAlign='center'; hud.fillStyle='rgba(255,255,255,.8)'; hud.font=`13px ${FONT}`; hud.shadowColor='rgba(0,0,0,.7)'; hud.shadowBlur=4;
    hud.fillText('FREE CAM  ·  hold left mouse button and drag to orbit 360°  ·  mouse wheel to zoom', Wd/2, Hd-26); hud.shadowBlur=0; hud.textAlign='right';
  }
  if (S.hint>0 && S.started && !S.over){
    hud.textAlign='center'; hud.globalAlpha=Math.min(1,S.hint/2); hud.fillStyle='#fff'; hud.shadowColor='#000'; hud.shadowBlur=6; hud.font=`16px ${FONT}`;
    hud.fillText('W gas · S brake/reverse · A/D steer · Space handbrake · V camera · Z/C indicators · L lights · T gearbox (manual: Q/E) · X neutral · N A/C', Wd/2, Hd*.12); hud.globalAlpha=1; hud.shadowBlur=0;
  }
  if (S.over){
    hud.fillStyle='rgba(0,0,0,.6)'; hud.fillRect(0,0,Wd,Hd); hud.textAlign='center'; hud.textBaseline='middle'; hud.fillStyle='#ff4a36';
    hud.font=`bold 64px ${FONT}`; hud.fillText('WRECKED', Wd/2, Hd*.38);
    hud.fillStyle='#fff'; hud.font=`24px ${FONT}`; hud.fillText('Score '+S.score+'  ·  '+(S.dist/1000).toFixed(2)+' km', Wd/2, Hd*.38+60);
    hud.font=`18px ${FONT}`; hud.fillStyle='#cfd8e6'; hud.fillText('R — restart     M — change car', Wd/2, Hd*.38+100);
  }
}
