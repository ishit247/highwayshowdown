// Starting a run (menu button, Enter, R) and going back to the menu (M).
import { S, newRun } from './state.js';
import { CARS } from './cars/specs.js';
import { AU } from './audio/engine-sound.js';
import { clearTraffic } from './sim/traffic.js';
import { camPos, rebuildPlayer } from './render/frame.js';
import { settings } from './settings.js';
import { sel, showMenu, hideMenu } from './ui/menu.js';

export function startGame(){
  AU.init(); const c = CARS[sel]; AU.setCar(c); clearTraffic(); newRun(c); S.started = true; S.auto = settings.auto; S.cam = settings.cam;
  camPos.set(0,0,0); rebuildPlayer(); hideMenu();
  document.activeElement && document.activeElement.blur();
}
export function openMenu(){ S.started=false; showMenu(); }
