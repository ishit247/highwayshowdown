// One simulation step. The phases run in this order because each reads what the previous one wrote.
import { S } from '../state.js';
import { drive } from './driving.js';
import { updateGearbox } from './gearbox.js';
import { updateTraffic } from './traffic.js';
import { damageSmoke } from './collisions.js';

export function step(dt){
  const live = S.started && !S.over, dmgf = 1-S.health/100;   // as they were at the start of the frame
  drive(dt, live, dmgf);
  updateGearbox(dt);
  updateTraffic(dt, live);
  S.score = Math.floor(S.dist/10) + S.overtakes*50;
  damageSmoke(dt, dmgf);
}
