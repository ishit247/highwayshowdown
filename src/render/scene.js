// Renderer, scene, camera, sky and the two scene lights.
import * as THREE from '../three.js';
import { settings } from '../settings.js';

const glc = document.getElementById('gl');
export const renderer = new THREE.WebGLRenderer({canvas:glc, antialias:true});
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 1800);
const FOG = 0xcfe3f1;
scene.fog = new THREE.Fog(FOG, 40, 760);

// Sky gradient stops (position, day colour, night colour); the sky is redrawn as darkness changes.
const SKY = [[0,0x2f6fc7,0x02040c],[.55,0x8fc0ec,0x070d1f],[.85,0xcfe3f1,0x0d1630],[1,0xcfe3f1,0x0d1630]];
const skyCanvas = document.createElement('canvas'); skyCanvas.width = 8; skyCanvas.height = 256;
const skyCtx = skyCanvas.getContext('2d');
const skyTex = THREE.canvasTexture(skyCanvas);
scene.background = skyTex;
const cA = new THREE.Color(), cB = new THREE.Color();
const mix = (out, day, night, dark) => out.setHex(day).lerp(cB.setHex(night), dark);
function drawSky(dark){
  const g = skyCtx.createLinearGradient(0,0,0,256);
  for (const [at, day, night] of SKY) g.addColorStop(at, mix(cA, day, night, dark).getStyle());
  skyCtx.fillStyle = g; skyCtx.fillRect(0,0,8,256);
  skyTex.needsUpdate = true;
}
drawSky(0);
const LIGHT = { day:{hemi:.7*Math.PI, sun:.85*Math.PI}, night:{hemi:.04*Math.PI, sun:.015*Math.PI} };
// Physical light units: a surface lit head-on by intensity PI reflects its full colour, so the sun and sky
// below are written as PI times the share of full brightness each one gives.
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x4a5a35, LIGHT.day.hemi); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, LIGHT.day.sun); sun.position.set(-60,100,40); scene.add(sun);

// Darkness from 0 (day) to 1 (night): sky, fog and the two scene lights. The unlit road and grass are dimmed by the track (setGroundShade).
export function applyDark(dark){
  drawSky(dark);
  mix(scene.fog.color, FOG, 0x0d1630, dark);
  scene.fog.far = 760 + (420-760)*dark;
  hemi.intensity = LIGHT.day.hemi + (LIGHT.night.hemi-LIGHT.day.hemi)*dark;
  sun.intensity = LIGHT.day.sun + (LIGHT.night.sun-LIGHT.day.sun)*dark;
  mix(sun.color, 0xfff0d0, 0x8fa8ff, dark);
}

export function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, settings.quality === 'low' ? 1 : 2);
  renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

export function disposeObj(o){ scene.remove(o); o.traverse(n=>{ if(n.geometry) n.geometry.dispose(); if(n.material) n.material.dispose && n.material.dispose(); }); }
