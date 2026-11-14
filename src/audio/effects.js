// One-shot sounds: indicator tick, exhaust bang, crash. They play through the context made by AU.init().
import { AU } from './engine-sound.js';

export function clickSound(ph){    // indicator tick / tock
  if(!AU.ctx) return; const ctx=AU.ctx, t=ctx.currentTime;
  const o=ctx.createOscillator(); o.type='square'; o.frequency.value = ph ? 1500 : 1100;
  const g=ctx.createGain(); g.gain.setValueAtTime(.05,t); g.gain.exponentialRampToValueAtTime(.001,t+.035);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t+.04);
}
function noiseBurst(t, type, freq, q, peak, len){
  const ctx=AU.ctx, s=ctx.createBufferSource(); s.buffer=AU.nb; const f=ctx.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q;
  const g=ctx.createGain(); g.gain.setValueAtTime(peak,t); g.gain.exponentialRampToValueAtTime(.001,t+len);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t,Math.random()); s.stop(t+len+.02);
}
// Exhaust bang in the voice of the current car (AU.pop, set per car in engine-sound.js): a sharp crack, a pipe boom
// with a body of noise under it, and after the big downshift bangs a few small crackles. Cars with no AU.pop stay silent.
export function popSound(a){
  const P = AU.pop; if(!AU.ctx || !P) return;
  const ctx=AU.ctx, t=ctx.currentTime, v=Math.min(1.6,a), [lo,hi]=P.crack, band=()=>lo+Math.random()*(hi-lo);
  noiseBurst(t,'bandpass',band(),.9,.85*v,.05);                                   // crack
  noiseBurst(t,'lowpass',P.body,.7,.6*v,.22);                                     // body
  const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(P.boom[0]*(.95+Math.random()*.1),t); o.frequency.exponentialRampToValueAtTime(P.boom[1],t+.13);
  const og=ctx.createGain(); og.gain.setValueAtTime(v,t); og.gain.exponentialRampToValueAtTime(.001,t+.17);
  o.connect(og); og.connect(AU.master); o.start(t); o.stop(t+.2);
  for (let i=0, n=a>1.5 ? P.tail : 1; i<n; i++) noiseBurst(t+.06+i*.045+Math.random()*.04,'bandpass',band(),1.4,Math.max(.08,.32-.05*i)*v,.025);   // crackle
}
export function crashSound(a){
  if(!AU.ctx) return; const ctx=AU.ctx, t=ctx.currentTime;
  const s=ctx.createBufferSource(); s.buffer=AU.nb; const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=1800;
  const g=ctx.createGain(); g.gain.setValueAtTime(.5*a,t); g.gain.exponentialRampToValueAtTime(.001,t+.7);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t,Math.random()); s.stop(t+.8);
  const s2=ctx.createBufferSource(); s2.buffer=AU.nb; const f2=ctx.createBiquadFilter(); f2.type='bandpass'; f2.frequency.value=3200; f2.Q.value=.8;
  const g2=ctx.createGain(); g2.gain.setValueAtTime(.18*a,t); g2.gain.exponentialRampToValueAtTime(.001,t+.35);
  s2.connect(f2); f2.connect(g2); g2.connect(AU.master); s2.start(t,Math.random()); s2.stop(t+.4);
  const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(90,t); o.frequency.exponentialRampToValueAtTime(28,t+.4);
  const og=ctx.createGain(); og.gain.setValueAtTime(.6*a,t); og.gain.exponentialRampToValueAtTime(.001,t+.5);
  o.connect(og); og.connect(AU.master); o.start(t); o.stop(t+.55);
}
