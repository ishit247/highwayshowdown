// The start menu: one card per car, and which car is selected.
import { CARS } from '../cars/specs.js';

const menu = document.getElementById('menu'), cardsEl = document.getElementById('cards');
import { settings, saveSettings } from '../settings.js';
import { AU } from '../audio/engine-sound.js';
import { resize } from '../render/scene.js';

export let sel = settings.car;
function bar(l,v){ return `<div class="lbl">${l}</div><div class="bar"><i style="width:${Math.round(v*100)}%"></i></div>`; }
function buildMenu(){
  cardsEl.innerHTML = '';
  CARS.forEach((c,i)=>{
    const d = document.createElement('div'); d.className='card'+(i===sel?' sel':'');
    const gtxt = c.gauge.type==='analog' ? 'Analog dial · '+c.gauge.unit : 'Digital cluster · '+c.gauge.unit;
    d.innerHTML = `<h3><span class="dot" style="background:#${c.color.toString(16).padStart(6,'0')}"></span>${c.name}</h3>
      <div class="d">${c.desc}</div><span class="tag">${gtxt}</span>
      ${bar('Top speed · '+c.topKmh+' km/h',c.topKmh/340)}${bar('Acceleration',c.accel/9.5)}${bar('Handling',c.grip/14)}`;
    d.onclick = ()=>select(i);
    cardsEl.appendChild(d);
  });
}
buildMenu();

// Volume and quality controls. They apply at once and are remembered.
const volumeEl = document.getElementById('volume'), volumeOut = document.getElementById('volumeOut');
const qualityEls = document.querySelectorAll('[data-quality]');
function showVolume(){ volumeEl.value = Math.round(settings.volume*100); volumeOut.textContent = volumeEl.value+'%'; }
function showQuality(){ qualityEls.forEach(b=>b.classList.toggle('on', b.dataset.quality===settings.quality)); }
volumeEl.oninput = ()=>{ settings.volume = volumeEl.value/100; showVolume(); AU.setVolume(settings.volume); saveSettings(); };
qualityEls.forEach(b=>{ b.onclick = ()=>{ settings.quality = b.dataset.quality; showQuality(); resize(); saveSettings(); b.blur(); }; });
showVolume(); showQuality();

export function select(i){ sel = (i+CARS.length)%CARS.length; settings.car = sel; saveSettings(); buildMenu(); }   // wraps round at both ends
export const menuOpen = () => menu.style.display!=='none';
export function showMenu(){ menu.style.display='flex'; }
export function hideMenu(){ menu.style.display='none'; }
