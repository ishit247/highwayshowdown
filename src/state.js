// The one owner of the game state S and the car being driven. Other modules read and write S's fields;
// only newRun() replaces S itself.
import { CARS } from './cars/specs.js';

function freshState() {
  return {
    s:0, d:0, psi:0, v:0, steer:0, throttle:0, brake:0, hand:0,
    gear:0, rpm:900, shiftT:0, health:100, pullBias:0, cracks:[],
    dist:0, overtakes:0, score:0, flash:0, shake:0, needle:0,
    ac:false, auto:true, neutral:false, rev:false, shAnim:0, lastGear:0,
    popQ:[], flameI:0, sigL:false, sigR:false, sigSteer:0, lights:0, night:false, hoodA:0, hoodOpen:false, cam:'fp', over:false, started:false, scrapeT:0, slip:0, cool:0, t:0, hint:12
  };
}

export let S = freshState(), car = CARS[0];
export function newRun(c) { car = c; S = freshState(); }

export const keys = {};                                // held keys, by lower-case e.key
export const W = {x:0,y:0,z:0,H:0,fx:0,fz:1};          // player world pose, written by the renderer each frame (sparks and smoke start here)
export const free = {rel:0, pitch:.35, dist:9};        // free orbit camera (mouse): rel = angle around the car, any value = full 360 degrees
export const look = {yaw:0, pitch:0, drag:false};      // mouse look (hold left button and move)
