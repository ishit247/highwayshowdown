// The start menu: one card per car, and which car is selected.
import { CARS } from '../cars/specs.js';

const menu = document.getElementById('menu'), cardsEl = document.getElementById('cards');
import { settings, saveSettings } from '../settings.js';

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

export function select(i){ sel = (i+CARS.length)%CARS.length; settings.car = sel; saveSettings(); buildMenu(); }   // wraps round at both ends
export const menuOpen = () => menu.style.display!=='none';
export function showMenu(){ menu.style.display='flex'; }
export function hideMenu(){ menu.style.display='none'; }
