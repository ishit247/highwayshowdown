// The audio context and the continuous sound bed: engine voice per car, tyre screech, wind, road,
// rail scrape, A/C fan and horn. Everything is synthesised with Web Audio (no audio files).
import { keys } from '../state.js';

const SND = {   // t: waveforms, g: osc gains, m: frequency multipliers, cb/ck/ct: filter base/rpm/throttle, lf+rough: engine shudder
  hatch :{t:['sawtooth','triangle','sine'],     g:[.30,.25,.35], m:[2,1,3],   cb:500,ck:.40,ct:900,  vol:.85, drive:5,  q:1.0, lf:20, rough:.05},   // light buzzy 4-cyl
  sedan :{t:['triangle','sawtooth','sine'],     g:[.45,.12,.40], m:[2,1,4],   cb:350,ck:.28,ct:500,  vol:.75, drive:3,  q:.8,  lf:12, rough:.02},   // smooth, quiet 4-cyl
  muscle:{t:['sawtooth','square','triangle'],   g:[.45,.25,.35], m:[1,.5,2],   cb:180,ck:.17,ct:700,  vol:1.0, drive:14, q:1.6, lf:26, rough:.09},   // deep V8 burble
  coupe :{t:['sawtooth','square','triangle'],   g:[.38,.12,.30], m:[2,1,4],   cb:450,ck:.38,ct:1300, vol:.85, drive:8,  q:1.2, lf:15, rough:.03},   // raspy inline-6
  super :{t:['sawtooth','sawtooth','square'],   g:[.35,.25,.12], m:[2,1,6],   cb:650,ck:.50,ct:1700, vol:.9,  drive:10, q:1.4, lf:11, rough:.02},   // high-revving V8 scream
};
export const AU = {
  ctx:null,
  init(){
    if (this.ctx){ this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if(!C) return;
    const ctx = this.ctx = new C();
    const master = this.master = ctx.createGain(); master.gain.value=.32;
    const mlp = ctx.createBiquadFilter(); mlp.type='lowpass'; mlp.frequency.value=4200;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value=-24; comp.ratio.value=10; comp.attack.value=.003; comp.release.value=.2;
    master.connect(mlp); mlp.connect(comp); comp.connect(ctx.destination);
    this.m=[2,1,4]; this.cutB=350; this.cutK=.32; this.cutT=900; this.vol=1; this.lf=14;
    const nb = ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate), d = nb.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i]=Math.random()*2-1; this.nb = nb;
    const noise = (type,f,q)=>{ const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true; const fl=ctx.createBiquadFilter(); fl.type=type; fl.frequency.value=f; fl.Q.value=q||1; const g=ctx.createGain(); g.gain.value=0; s.connect(fl); fl.connect(g); g.connect(master); s.start(); return {g,fl}; };
    this.eA=ctx.createOscillator(); this.eA.type='sawtooth';
    this.eB=ctx.createOscillator(); this.eB.type='square';
    this.eC=ctx.createOscillator(); this.eC.type='triangle';
    const mix=ctx.createGain(); mix.gain.value=.22;
    const ga=this.ga=ctx.createGain(), gb=this.gb=ctx.createGain(), gc=this.gc=ctx.createGain(); ga.gain.value=.5; gb.gain.value=.25; gc.gain.value=.3;
    this.eA.connect(ga); this.eB.connect(gb); this.eC.connect(gc); ga.connect(mix); gb.connect(mix); gc.connect(mix);
    const sh=this.sh=ctx.createWaveShaper(); this.setDrive(8);
    this.elp=ctx.createBiquadFilter(); this.elp.type='lowpass'; this.elp.frequency.value=800; this.elp.Q.value=1.2;
    this.eg=ctx.createGain(); this.eg.gain.value=0;
    mix.connect(sh); sh.connect(this.elp); this.elp.connect(this.eg); this.eg.connect(master);
    this.lfo=ctx.createOscillator(); this.lfo.frequency.value=17; const lg=this.lg=ctx.createGain(); lg.gain.value=.03; this.lfo.connect(lg); lg.connect(this.eg.gain); this.lfo.start();
    [this.eA,this.eB,this.eC].forEach(o=>o.start());
    this.screech=noise('bandpass',1300,3); this.wind=noise('lowpass',600,.7); this.road=noise('lowpass',180,.7); this.scrape=noise('bandpass',2300,1.4); this.ac=noise('bandpass',1100,.5);
    const h1=ctx.createOscillator(), h2=ctx.createOscillator(); h1.type=h2.type='square'; h1.frequency.value=415; h2.frequency.value=523;
    this.horn=ctx.createGain(); this.horn.gain.value=0; const hl=ctx.createBiquadFilter(); hl.type='lowpass'; hl.frequency.value=1200;
    h1.connect(hl); h2.connect(hl); hl.connect(this.horn); this.horn.connect(master); h1.start(); h2.start();
  },
  setDrive(k){ const cv=new Float32Array(256); for(let i=0;i<256;i++){ const x=i/128-1; cv[i]=(Math.PI+k)*x/(Math.PI+k*Math.abs(x)); } this.sh.curve=cv; },
  setCar(c){                       // every car gets its own engine voice
    if(!this.ctx) return; const p = SND[c.style];
    this.eA.type=p.t[0]; this.eB.type=p.t[1]; this.eC.type=p.t[2];
    this.ga.gain.value=p.g[0]; this.gb.gain.value=p.g[1]; this.gc.gain.value=p.g[2];
    this.m=p.m; this.cutB=p.cb; this.cutK=p.ck; this.cutT=p.ct; this.vol=p.vol; this.lf=p.lf; this.lg.gain.value=p.rough;
    this.elp.Q.value=p.q; this.setDrive(p.drive);
  },
  update(S,car,dt){
    if(!this.ctx) return; const t=this.ctx.currentTime, tc=.06;
    const f = Math.max(10, S.rpm/60*car.cyl/2), thr = S.throttle, dm = 1-S.health/100;
    this.eA.frequency.setTargetAtTime(f*this.m[0],t,tc); this.eB.frequency.setTargetAtTime(f*this.m[1],t,tc); this.eC.frequency.setTargetAtTime(f*this.m[2],t,tc);
    this.elp.frequency.setTargetAtTime(this.cutB+S.rpm*this.cutK+thr*this.cutT,t,tc);
    const run = S.started && !S.over ? 1 : (S.over ? .35 : .6);
    this.eg.gain.setTargetAtTime((.08+.12*thr+S.rpm/60000)*run*this.vol,t,tc);
    this.lfo.frequency.setTargetAtTime(this.lf+dm*12,t,.1);
    const sl = Math.min(1, S.slip*1.4 + (S.hand && S.v>8 ? .5:0));
    this.screech.g.gain.setTargetAtTime(sl*.08*Math.min(1,S.v/10),t,.05);
    this.screech.fl.frequency.setTargetAtTime(1100+S.v*8,t,.1);
    this.wind.g.gain.setTargetAtTime(Math.pow(S.v/90,1.6)*.22,t,.1);
    this.road.g.gain.setTargetAtTime(Math.min(1,S.v/40)*.14,t,.1);
    this.scrape.g.gain.setTargetAtTime(S.scrapeT>0 ? .12 : 0,t,.03);
    this.ac.g.gain.setTargetAtTime(S.ac ? .05 : 0,t,.2);
    this.horn.gain.setTargetAtTime(keys['h'] ? .07 : 0,t,.015);
  },
};
