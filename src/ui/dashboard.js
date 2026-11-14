// The 2D cockpit: analog and digital gauges, cabin shell, dashboard, steering wheel and hands.
import { S, car, look } from '../state.js';

export const D2R = Math.PI/180;
const ang = (a,r)=>[Math.sin(a*D2R)*r, -Math.cos(a*D2R)*r];
function rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
export const FONT = '"Segoe UI",Arial,sans-serif';

function lamp(c,x,y,r,health){       // engine warning lamp
  if (health>=50) return;
  c.fillStyle = health<25 ? '#ff2a1a' : '#ffa000'; c.shadowColor=c.fillStyle; c.shadowBlur=r*1.5;
  c.beginPath(); c.arc(x,y,r,0,7); c.fill(); c.shadowBlur=0;
  c.fillStyle='#000'; c.font=`bold ${r*1.5}px ${FONT}`; c.textAlign='center'; c.textBaseline='middle'; c.fillText('!',x,y+r*.08);
}

function drawAnalog(c,cx,cy,r,val){
  const g = car.gauge, max = g.max;
  c.save(); c.translate(cx,cy);
  let gr = c.createLinearGradient(-r,-r,r,r); gr.addColorStop(0,'#f1f1f3'); gr.addColorStop(.45,'#7c7e84'); gr.addColorStop(1,'#d9dade');
  c.beginPath(); c.arc(0,0,r,0,7); c.fillStyle=gr; c.fill();
  let fc = c.createRadialGradient(0,-r*.25,r*.1,0,0,r*.95); fc.addColorStop(0,'#34363a'); fc.addColorStop(1,'#131416');
  c.beginPath(); c.arc(0,0,r*.935,0,7); c.fillStyle=fc; c.fill();
  c.lineCap='butt';
  for (let t=0;t<=max+.01;t+=g.step/2){
    const major = Math.abs(t%g.step)<.01, a = -135+270*t/max;
    const [x0,y0]=ang(a,r*.88), [x1,y1]=ang(a,r*(.88-(major?.13:.07)));
    c.strokeStyle = t>max*.9 ? '#ff5a3c' : '#f2f2f2'; c.lineWidth = major ? r*.028 : r*.015;
    c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1); c.stroke();
  }
  c.fillStyle='#fff'; c.textAlign='center'; c.textBaseline='middle';
  for (let t=0;t<=max+.01;t+=g.step){
    const a = -135+270*t/max, [x,y]=ang(a,r*.64); c.font=`${t%(g.step*2)===0?'bold ':''}${r*(t%(g.step*2)===0?.14:.1)}px ${FONT}`; c.fillText(t,x,y);
  }
  c.font=`${r*.1}px ${FONT}`; c.fillStyle='#eee'; c.fillText(g.unit,0,-r*.3);
  // lcd
  rr(c,-r*.36,r*.38,r*.72,r*.26,r*.04); c.fillStyle='#0b0605'; c.fill();
  c.fillStyle='#ff9a4a'; c.font=`bold ${r*.12}px ${FONT}`; c.fillText(`${S.neutral?'N':'D'+(S.gear+1)}   ${(S.dist/1000).toFixed(1)} km`,0,r*.52);
  lamp(c,-r*.52,r*.5,r*.06,S.health);
  // needle
  c.save(); c.rotate((-135+270*Math.min(1.03,Math.max(0,val/max)))*D2R);
  c.shadowColor='#ff3b1d'; c.shadowBlur=r*.08;
  const ng=c.createLinearGradient(0,r*.2,0,-r*.9); ng.addColorStop(0,'#ff5a2a'); ng.addColorStop(1,'#ff2a12');
  c.fillStyle=ng; c.beginPath(); c.moveTo(-r*.03,r*.2); c.lineTo(-r*.018,-r*.9); c.lineTo(r*.018,-r*.9); c.lineTo(r*.03,r*.2); c.closePath(); c.fill();
  c.restore(); c.shadowBlur=0;
  const hub=c.createRadialGradient(-r*.04,-r*.04,r*.02,0,0,r*.17); hub.addColorStop(0,'#3a3a3d'); hub.addColorStop(1,'#050505');
  c.beginPath(); c.arc(0,0,r*.17,0,7); c.fillStyle=hub; c.fill();
  c.restore();
}

function drawDigital(c,cx,cy,r,val){
  c.save(); c.translate(cx,cy);
  rr(c,-1.55*r,-1.18*r,3.1*r,2.36*r,.28*r); c.fillStyle='#08090b'; c.fill(); c.strokeStyle='#23262b'; c.lineWidth=r*.02; c.stroke();
  const red = car.redline, rpmK = S.rpm/1000;
  const toCanvas = a => (a-90)*D2R;
  // progress band
  const a1 = 180+30*Math.min(9.5,rpmK);
  const bg = c.createLinearGradient(-r,r,-r,-r); bg.addColorStop(0,'rgba(255,255,255,.95)'); bg.addColorStop(1,'rgba(150,150,155,.55)');
  c.beginPath(); c.arc(0,0,r*.84,toCanvas(180),toCanvas(a1)); c.lineWidth=r*.13; c.strokeStyle = rpmK>=red ? 'rgba(255,90,60,.9)' : bg; c.stroke();
  // ticks
  for (let k=0;k<=9.51;k+=.1){
    const major = Math.abs(k-Math.round(k))<.01, a = 180+30*k;
    const [x0,y0]=ang(a,r*1.0), [x1,y1]=ang(a,r*(major?.9:.945));
    c.strokeStyle = k>=red ? '#ff5a3c' : '#f4f4f4'; c.lineWidth = major ? r*.022 : r*.012;
    c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1); c.stroke();
  }
  // inner ring + numbers
  c.beginPath(); c.arc(0,0,r*.74,0,7); c.strokeStyle='rgba(255,255,255,.75)'; c.lineWidth=r*.012; c.stroke();
  c.textAlign='center'; c.textBaseline='middle'; c.font=`${r*.17}px ${FONT}`;
  for (let k=0;k<=9;k++){ const [x,y]=ang(180+30*k,r*.6); c.fillStyle = k>=red ? '#ff7a5c':'#fff'; c.fillText(k,x,y); }
  // speed
  c.strokeStyle='rgba(255,255,255,.55)'; c.lineWidth=r*.01;
  c.beginPath(); c.moveTo(-r*.4,-r*.3); c.lineTo(r*.4,-r*.3); c.moveTo(-r*.4,r*.3); c.lineTo(r*.4,r*.3); c.stroke();
  c.fillStyle='#fff'; c.font=`bold ${r*.46}px ${FONT}`; c.fillText(Math.round(val),0,r*.0);
  c.font=`bold ${r*.12}px ${FONT}`; c.textAlign='right'; c.fillText(car.gauge.unit.toUpperCase(),r*.4,r*.43);
  c.textAlign='left'; c.fillStyle='#bfc4cc'; c.fillText(S.neutral?'N':'D'+(S.gear+1),-r*.4,r*.43);
  c.font=`${r*.075}px ${FONT}`; c.fillStyle='#aab'; c.textAlign='left'; c.fillText('x1000RPM',r*.52,r*1.02);
  lamp(c,-r*1.3,-r*.92,r*.075,S.health);
  c.restore();
}
export function drawGauge(c,cx,cy,r){ (car.gauge.type==='analog'?drawAnalog:drawDigital)(c,cx,cy,r,S.needle); }

function drawHand(c,H_,a){          // local frame: x = along rim, -y = outward
  const skin='#c98e66', dark='rgba(90,45,25,.6)';
  c.save(); c.rotate(a);
  c.fillStyle=skin; rr(c,-H_*.04,-H_*.075,H_*.08,H_*.085,H_*.03); c.fill();           // back of hand
  c.fillStyle='rgba(255,230,200,.18)'; rr(c,-H_*.03,-H_*.068,H_*.05,H_*.03,H_*.015); c.fill();
  for (let i=0;i<4;i++){                                                              // fingers wrapped round the rim
    const x=-H_*.036+i*H_*.0245;
    c.fillStyle=i%2?'#c28760':skin; rr(c,x,-H_*.012,H_*.022,H_*.088,H_*.011); c.fill();
    c.strokeStyle=dark; c.lineWidth=1.5; c.beginPath(); c.moveTo(x+H_*.002,H_*.03); c.lineTo(x+H_*.02,H_*.03); c.stroke();
  }
  c.fillStyle='#d6a07a'; c.beginPath(); c.ellipse(H_*.052,-H_*.03,H_*.014,H_*.032,.35,0,7); c.fill();   // thumb
  c.restore();
}

export function drawCockpit(c,W_,H_){
  const f = (H_/2)/Math.tan(36*D2R), ox = -f*Math.tan(look.yaw), oy = f*Math.tan(look.pitch);
  const dashY = H_*.52, gcx = W_/2, gr = H_*.075, gcy = H_*.64;
  const wR = H_*.30, wcx = W_/2, wcy = H_*.82, rot = S.steer*1.45, HA = 72*D2R;
  const X = -3*W_, XW = 7*W_, sill = dashY-H_*.05, B = H_*1.25, cx = W_/2;
  c.save(); c.translate(ox,oy);

  /* ---- cabin shell: roof, pillars, doors (window openings stay transparent) ---- */
  c.fillStyle='#0c0d0f';
  c.fillRect(X,-3*H_,XW,3*H_+H_*.04);                                   // roof liner
  c.beginPath(); c.moveTo(0,0); c.lineTo(W_*.12,0); c.lineTo(0,dashY); c.fill();             // A pillars
  c.beginPath(); c.moveTo(W_,0); c.lineTo(W_*.88,0); c.lineTo(W_,dashY); c.fill();
  c.fillRect(-B-H_*.07,-3*H_,H_*.14,3*H_+sill); c.fillRect(W_+B-H_*.07,-3*H_,H_*.14,3*H_+sill);  // B pillars
  c.fillRect(X,-3*H_,-B-H_*.07-X,9*H_);
  c.fillRect(W_+B+H_*.07,-3*H_,XW,9*H_);
  const dg0=c.createLinearGradient(0,sill,0,sill+H_*.5); dg0.addColorStop(0,'#2a2c31'); dg0.addColorStop(1,'#0e0f11');
  c.fillStyle=dg0; c.fillRect(X,sill,-X,6*H_); c.fillRect(W_,sill,-X,6*H_);                 // door panels
  c.strokeStyle='rgba(255,255,255,.16)'; c.lineWidth=2; c.beginPath(); c.moveTo(X,sill); c.lineTo(0,sill); c.moveTo(W_,sill); c.lineTo(W_-X,sill); c.stroke();
  for (const sd of [-1,1]){                                                  // door handle, armrest, window switches
    const bx = sd<0 ? -H_*.95 : W_+H_*.55;
    c.fillStyle='#34363b'; rr(c,bx,sill+H_*.1,H_*.4,H_*.045,H_*.02); c.fill();
    c.fillStyle='#101113'; rr(c,sd<0?-H_*1.15:W_+H_*.2,sill+H_*.26,H_*.95,H_*.14,H_*.05); c.fill();
    c.fillStyle='#2b2d32'; for(let i=0;i<3;i++){ rr(c,(sd<0?-H_*.4:W_+H_*.28)+i*H_*.06,sill+H_*.3,H_*.045,H_*.06,H_*.01); c.fill(); }
  }
  // side mirrors
  for (const sd of [-1,1]){
    const mx = sd<0 ? W_*.012 : W_*.988-H_*.16;
    c.fillStyle='#15161a'; rr(c,mx,H_*.46,H_*.16,H_*.095,H_*.035); c.fill();
    const sg=c.createLinearGradient(mx,0,mx+H_*.16,0); sg.addColorStop(0,'#8895a3'); sg.addColorStop(1,'#3a4450');
    c.fillStyle=sg; rr(c,mx+H_*.012,H_*.469,H_*.136,H_*.077,H_*.028); c.fill();
  }
  // rear-view mirror
  c.fillStyle='#1a1c20'; rr(c,cx-W_*.09,H_*.035,W_*.18,H_*.07,H_*.012); c.fill();
  const mg=c.createLinearGradient(0,H_*.04,0,H_*.1); mg.addColorStop(0,'#6b7480'); mg.addColorStop(1,'#303640');
  c.fillStyle=mg; rr(c,cx-W_*.085,H_*.042,W_*.17,H_*.056,H_*.01); c.fill();

  /* ---- windshield cracks ---- */
  c.save(); c.lineCap='round'; c.lineJoin='round';
  const gx=W_*.12, gw=W_*.76, gy=H_*.1, gh=dashY-gy;
  for (const set of S.cracks) for (const ln of set){
    c.beginPath(); ln.forEach((p,i)=>{ const x=gx+p[0]*gw, y=gy+p[1]*gh; i?c.lineTo(x,y):c.moveTo(x,y); });
    c.strokeStyle='rgba(0,0,0,.35)'; c.lineWidth=3; c.stroke(); c.strokeStyle='rgba(235,245,255,.75)'; c.lineWidth=1.3; c.stroke();
  }
  c.restore();

  /* ---- dashboard ---- */
  const dg=c.createLinearGradient(0,dashY,0,H_); dg.addColorStop(0,'#2a2c31'); dg.addColorStop(.3,'#15161a'); dg.addColorStop(1,'#08080a');
  c.fillStyle=dg; c.beginPath(); c.moveTo(X,dashY+H_*.03); c.lineTo(0,dashY+H_*.03); c.quadraticCurveTo(cx,dashY-H_*.03,W_,dashY+H_*.03);
  c.lineTo(W_-X,dashY+H_*.03); c.lineTo(W_-X,4*H_); c.lineTo(X,4*H_); c.closePath(); c.fill();
  c.strokeStyle='rgba(255,255,255,.12)'; c.lineWidth=2; c.beginPath(); c.moveTo(0,dashY+H_*.03); c.quadraticCurveTo(cx,dashY-H_*.03,W_,dashY+H_*.03); c.stroke();
  // instrument cluster
  c.fillStyle='#0a0a0c'; rr(c,gcx-gr*1.6,gcy-gr*1.3,gr*3.2,gr*2.6,gr*.5); c.fill();
  drawGauge(c,gcx,gcy,gr);
  // AC vents (both sides) – glow + airflow streaks when AC is on
  for (const sd of [-1,1]){                       // round vents flanking the cluster
    const vx = cx+sd*H_*.5, vy = H_*.585, vr = H_*.052;
    c.fillStyle='#08080a'; c.beginPath(); c.arc(vx,vy,vr,0,7); c.fill();
    c.strokeStyle='#3a3d43'; c.lineWidth=H_*.007; c.stroke();
    c.save(); c.beginPath(); c.arc(vx,vy,vr*.92,0,7); c.clip(); c.strokeStyle='#26282d'; c.lineWidth=2.5;
    for(let i=-3;i<=3;i++){ c.beginPath(); c.moveTo(vx-vr,vy+i*vr*.27); c.lineTo(vx+vr,vy+i*vr*.27); c.stroke(); } c.restore();
    c.fillStyle='#4b4e55'; c.beginPath(); c.arc(vx,vy,vr*.14,0,7); c.fill();
    if (S.ac){ c.strokeStyle='rgba(140,220,255,.28)'; c.lineWidth=2; for(let i=0;i<3;i++){ const o=((S.t*40+i*18)%50); c.beginPath(); c.moveTo(vx-vr*.5+i*vr*.5,vy-vr-o*.25); c.lineTo(vx-vr*.45+i*vr*.5,vy-vr-o*.25-H_*.014); c.stroke(); } }
  }
  // touchscreen (right of wheel): clock + animated "now playing" equalizer
  { const tx=cx+H_*.58, ty=H_*.545, tw=H_*.3, th=H_*.135;
    c.fillStyle='#050608'; rr(c,tx,ty,tw,th,H_*.014); c.fill(); c.strokeStyle='#33363c'; c.lineWidth=2; c.stroke();
    c.fillStyle='#8fb4ff'; c.font=`${H_*.017}px ${FONT}`; c.textAlign='left'; c.textBaseline='middle';
    c.fillText('NOW PLAYING: HIGHWAY MIX', tx+H_*.014, ty+H_*.022);
    for (let i=0;i<12;i++){ const hh = H_*.07*(.25+.75*Math.abs(Math.sin(S.t*2.2+i*1.3)))*(.5+Math.min(1,S.rpm/7000)*.6);
      c.fillStyle = i>8 ? '#ff6a3c' : '#f0b429'; c.fillRect(tx+H_*.016+i*H_*.0225, ty+th-H_*.014-hh, H_*.015, hh); }
  }
  // climate panel (below the screen)
  const px = cx+H_*.5, py = H_*.70;
  c.fillStyle='#0b0c0e'; rr(c,px,py,H_*.42,H_*.13,H_*.02); c.fill(); c.strokeStyle='#2a2c31'; c.lineWidth=1.5; c.stroke();
  c.fillStyle = S.ac ? '#06242c' : '#050505'; rr(c,px+H_*.02,py+H_*.016,H_*.22,H_*.05,H_*.008); c.fill();
  c.fillStyle = S.ac ? '#59e0ff' : '#33383d'; c.font=`bold ${H_*.027}px ${FONT}`; c.textAlign='left'; c.textBaseline='middle';
  c.fillText(S.ac ? 'AC ON  21°C  ▮▮▮' : 'AC OFF', px+H_*.03, py+H_*.041);
  for (let i=0;i<3;i++){
    const kx=px+H_*.3+i*H_*.04, ky=py+H_*.035, kg=c.createRadialGradient(kx-2,ky-2,1,kx,ky,H_*.018);
    kg.addColorStop(0,'#c5c9cf'); kg.addColorStop(1,'#4a4d53'); c.fillStyle=kg; c.beginPath(); c.arc(kx,ky,H_*.017,0,7); c.fill();
  }
  c.fillStyle='#7c828a'; c.font=`${H_*.016}px ${FONT}`; c.textAlign='center'; c.fillText('N  A/C',px+H_*.34,py+H_*.1);
  c.fillStyle='#1b1d21'; for(let i=0;i<4;i++){ rr(c,px+H_*.03+i*H_*.055,py+H_*.075,H_*.045,H_*.035,H_*.008); c.fill(); }
  // gear shifter (centre console)
  const sx = cx+H_*.73, sy = H_*.95, kick = S.shAnim*H_*.02*(S.gear>(S.lastGear||0)?-1:1);
  c.fillStyle='#09090b'; rr(c,sx-H_*.09,sy-H_*.04,H_*.18,H_*.14,H_*.02); c.fill(); c.strokeStyle='#2a2c31'; c.lineWidth=1.5; c.stroke();
  c.font=`bold ${H_*.019}px ${FONT}`; c.textAlign='center'; c.textBaseline='middle';
  const lets = ['P','R','N',S.auto?'D':'M'];
  lets.forEach((ch,i)=>{ c.fillStyle = i===(S.neutral?2:3) ? '#ffa32b' : '#69707a'; c.fillText(ch, sx-H_*.063+i*H_*.042, sy-H_*.022); });
  c.fillStyle='#ffa32b'; c.font=`bold ${H_*.021}px ${FONT}`; c.fillText(S.neutral?'N':String(S.gear+1), sx, sy+H_*.07);
  c.strokeStyle='#050505'; c.lineWidth=H_*.024; c.lineCap='round'; c.beginPath(); c.moveTo(sx,sy+H_*.01); c.lineTo(sx+kick*.5,sy-H_*.045+kick); c.stroke();
  const kg2=c.createRadialGradient(sx-H_*.01,sy-H_*.075+kick,1,sx,sy-H_*.065+kick,H_*.038);
  kg2.addColorStop(0,'#4b4d52'); kg2.addColorStop(1,'#0c0c0e');
  c.fillStyle=kg2; c.beginPath(); c.ellipse(sx+kick*.5,sy-H_*.068+kick,H_*.03,H_*.036,0,0,7); c.fill();

  /* ---- forearms (behind wheel) ---- */
  const hp = a => { const t=a+rot; return [wcx+Math.sin(t)*wR, wcy-Math.cos(t)*wR]; };
  c.lineCap='round';
  for (const sd of [-1,1]){
    const h = hp(sd*HA), ex = wcx+sd*H_*.72, ey = H_*1.15;
    const g = c.createLinearGradient(h[0],h[1],ex,ey); g.addColorStop(0,'#c98e66'); g.addColorStop(.5,'#b97d58'); g.addColorStop(.52,'#2b3542'); g.addColorStop(1,'#1c232d');
    c.strokeStyle=g; c.lineWidth=H_*.1; c.beginPath(); c.moveTo(h[0]+sd*H_*.01,h[1]+H_*.02); c.lineTo(ex,ey); c.stroke();
  }
  /* ---- steering wheel ---- */
  c.save(); c.translate(wcx,wcy); c.rotate(rot);
  c.lineWidth=H_*.055; c.strokeStyle='#0d0d0f'; c.beginPath(); c.arc(0,0,wR,0,7); c.stroke();
  c.lineWidth=H_*.008; c.strokeStyle='rgba(255,255,255,.16)'; c.beginPath(); c.arc(0,0,wR+H_*.016,Math.PI*1.05,Math.PI*1.95); c.stroke();
  c.lineWidth=H_*.01; c.strokeStyle='rgba(255,255,255,.07)'; c.setLineDash([H_*.012,H_*.01]); c.beginPath(); c.arc(0,0,wR-H_*.014,0,7); c.stroke(); c.setLineDash([]);
  c.lineCap='butt'; c.strokeStyle='#18191c';
  for (const a of [-90,90]){ const [x,y]=ang(a,wR*.97); c.lineWidth=H_*.07; c.beginPath(); c.moveTo(0,H_*.01); c.lineTo(x,y+H_*.01); c.stroke();
    c.lineWidth=H_*.016; c.strokeStyle='#b8bcc2'; c.beginPath(); c.moveTo(x*.72,y*.72+H_*.01); c.lineTo(x*.9,y*.9+H_*.01); c.stroke(); c.strokeStyle='#18191c'; }
  c.lineWidth=H_*.065; c.beginPath(); c.moveTo(0,0); c.lineTo(0,wR*.96); c.stroke();
  c.lineWidth=H_*.014; c.strokeStyle='#b8bcc2'; c.beginPath(); c.moveTo(0,wR*.62); c.lineTo(0,wR*.82); c.stroke();
  const hg=c.createLinearGradient(0,-wR*.3,0,wR*.3); hg.addColorStop(0,'#26282c'); hg.addColorStop(1,'#0f1012');
  c.fillStyle=hg; c.beginPath(); c.moveTo(-wR*.3,-wR*.12); c.quadraticCurveTo(0,-wR*.36,wR*.3,-wR*.12); c.lineTo(wR*.26,wR*.28); c.quadraticCurveTo(0,wR*.34,-wR*.26,wR*.28); c.closePath(); c.fill();
  c.strokeStyle='rgba(255,255,255,.1)'; c.lineWidth=2; c.stroke();
  c.fillStyle='#c9ccd2'; c.font=`bold ${H_*.02}px ${FONT}`; c.textAlign='center'; c.textBaseline='middle'; c.fillText('HIGHWAY',0,wR*.02);
  c.fillStyle='#d9a21b'; c.fillRect(-H_*.005,-wR-H_*.025,H_*.01,H_*.05);
  for (const sd of [-1,1]){ c.save(); c.translate(Math.sin(sd*HA)*wR,-Math.cos(sd*HA)*wR); drawHand(c,H_,sd*HA); c.restore(); }
  c.restore();
  c.restore();   // overlay shift
}
