// Keyboard and mouse. Held keys go into `keys` (read by the simulation each frame); presses toggle the
// player's choices in S. Keep this list in step with the start-menu help text in car-game.html and CLAUDE.md.
import { S, keys, free, look } from '../state.js';
import { sel, select, menuOpen } from '../ui/menu.js';
import { settings, saveSettings } from '../settings.js';
import { shiftUp, shiftDown } from '../sim/gearbox.js';
import { startGame, openMenu } from '../game.js';

export function listenForInput(){
  document.getElementById('go').onclick = startGame;

  addEventListener('keydown', e=>{
    const k = e.key.toLowerCase();
    if (menuOpen() && e.target instanceof Element && e.target.matches('input, button, summary')) return;   // the settings controls use the keys themselves
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
    if (menuOpen()){
      if (k==='arrowleft') select(sel-1);
      else if (k==='arrowright') select(sel+1);
      else if (k>='1' && k<='5') select(+k-1);
      else if (k==='enter' || k===' ') startGame();
      return;
    }
    if (e.repeat) { keys[k]=true; return; }
    keys[k]=true;
    if (k==='b') S.hoodOpen = !S.hoodOpen;
    if (k==='l') S.lights = (S.lights+1)%3;                 // off -> wide -> focus -> off
    if (k==='k') S.sky = S.sky==='day' ? 'night' : S.sky==='night' ? 'auto' : 'day';   // day -> night -> automatic cycle -> day
    if (k==='v'){ S.cam = S.cam==='fp' ? 'chase' : S.cam==='chase' ? 'free' : 'fp'; settings.cam = S.cam; saveSettings(); if (S.cam==='free'){ free.rel=0; free.pitch=.35; free.dist=9; } }
    if (k==='n') S.ac = !S.ac;
    if (k==='z'){ S.sigL = !S.sigL; if (S.sigL) S.sigR = false; S.sigSteer = 0; }       // left indicator
    if (k==='c'){ S.sigR = !S.sigR; if (S.sigR) S.sigL = false; S.sigSteer = 0; }       // right indicator
    if (k==='t'){ S.auto = !S.auto; settings.auto = S.auto; saveSettings(); }                                                    // automatic <-> manual gearbox
    if (k==='x' && S.started && !S.over) S.neutral = !S.neutral;                        // neutral on/off (works in auto and manual)
    if (S.started && !S.over && !S.auto){                                               // Q/E only work in manual
      if (k==='e') shiftUp();
      if (k==='q') shiftDown();
    }
    if (k==='r'){ startGame(); }
    if (k==='m') openMenu();
  });
  addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });

  // hold the left mouse button and move to look around (view springs back on release)
  addEventListener('mousedown', e=>{ if (e.button===0 && !menuOpen()){ look.drag=true; e.preventDefault(); } });
  addEventListener('mouseup', e=>{ if (e.button===0) look.drag=false; });
  addEventListener('mousemove', e=>{
    if (look.drag && (e.buttons&1) && S.cam==='free'){
      free.rel -= e.movementX*.008; free.pitch = Math.max(.03,Math.min(1.5,free.pitch + e.movementY*.006));
    } else if (look.drag && (e.buttons&1)){
      look.yaw = Math.max(-1.5,Math.min(1.5,look.yaw + e.movementX*.004));
      look.pitch = Math.max(-.5,Math.min(.7,look.pitch - e.movementY*.004));
    } else look.drag = false;
  });
  addEventListener('wheel', e=>{ if (S.cam==='free' && !menuOpen()){ free.dist = Math.max(3.5,Math.min(30,free.dist*Math.exp(e.deltaY*.001))); e.preventDefault(); } }, {passive:false});
  addEventListener('blur', ()=>{ for(const k in keys) keys[k]=false; });
}
