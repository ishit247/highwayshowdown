// One-shot sounds: indicator tick, exhaust bang, crash. They play through the context made by AU.init().
import { AU } from './engine-sound.js';

export function clickSound(ph){    // indicator tick / tock
  if(!AU.ctx) return; const ctx=AU.ctx, t=ctx.currentTime;
  const o=ctx.createOscillator(); o.type='square'; o.frequency.value = ph ? 1500 : 1100;
  const g=ctx.createGain(); g.gain.setValueAtTime(.05,t); g.gain.exponentialRampToValueAtTime(.001,t+.035);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t+.04);
}
export function popSound(a){      // gunshot-style exhaust bang
  if(!AU.ctx) return; const ctx=AU.ctx, t=ctx.currentTime, v=Math.min(1.6,a);
  const c=ctx.createBufferSource(); c.buffer=AU.nb; const cf=ctx.createBiquadFilter(); cf.type="bandpass"; cf.frequency.value=2800+Math.random()*1800; cf.Q.value=.7;
  const cg=ctx.createGain(); cg.gain.setValueAtTime(.92*v,t); cg.gain.exponentialRampToValueAtTime(.001,t+.07);
  c.connect(cf); cf.connect(cg); cg.connect(AU.master); c.start(t,Math.random()); c.stop(t+.09);
  const b=ctx.createBufferSource(); b.buffer=AU.nb; const bf=ctx.createBiquadFilter(); bf.type="lowpass"; bf.frequency.value=1100;
  const bg=ctx.createGain(); bg.gain.setValueAtTime(.72*v,t); bg.gain.exponentialRampToValueAtTime(.001,t+.2);
  b.connect(bf); bf.connect(bg); bg.connect(AU.master); b.start(t,Math.random()); b.stop(t+.22);
  const o=ctx.createOscillator(); o.type="sine"; o.frequency.setValueAtTime(230+Math.random()*40,t); o.frequency.exponentialRampToValueAtTime(55,t+.12);
  const og=ctx.createGain(); og.gain.setValueAtTime(1.0*v,t); og.gain.exponentialRampToValueAtTime(.001,t+.15);
  o.connect(og); og.connect(AU.master); o.start(t); o.stop(t+.18);
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
