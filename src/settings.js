// Player choices kept between visits (last car, gearbox mode, camera) in browser storage.
// Parsed once here with safe defaults; storage may be unavailable or hold junk, which must never stop the game.
import { CARS } from './cars/specs.js';

const KEY = 'highway-dash:v1:settings';
const CAMS = ['fp', 'chase', 'free'];

function load() {
  const d = { car: 0, auto: true, cam: 'fp' };
  let o;
  try { o = JSON.parse(localStorage.getItem(KEY)); }
  catch (e) { return d; }                                  // documented fallback: storage blocked or corrupt
  if (!o || typeof o !== 'object') return d;
  if (Number.isInteger(o.car) && o.car >= 0 && o.car < CARS.length) d.car = o.car;
  if (typeof o.auto === 'boolean') d.auto = o.auto;
  if (CAMS.includes(o.cam)) d.cam = o.cam;
  return d;
}

export const settings = load();

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); }
  catch (e) { /* documented fallback: storage blocked or full; the game goes on without saving */ }
}
