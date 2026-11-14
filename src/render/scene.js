// Renderer, scene, camera, sky and the two scene lights.
import * as THREE from '../three.js';
import { settings } from '../settings.js';

const glc = document.getElementById('gl');
export const renderer = new THREE.WebGLRenderer({canvas:glc, antialias:true});
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 1800);
const FOG = 0xcfe3f1;
scene.fog = new THREE.Fog(FOG, 40, 760);

function skyTexture(stops){
  const c = document.createElement('canvas'); c.width = 8; c.height = 256;
  const x = c.getContext('2d'); const g = x.createLinearGradient(0,0,0,256);
  for (const [at, col] of stops) g.addColorStop(at, col);
  x.fillStyle = g; x.fillRect(0,0,8,256);
  return THREE.canvasTexture(c);
}
const SKY_DAY = skyTexture([[0,'#2f6fc7'],[.55,'#8fc0ec'],[.85,'#cfe3f1'],[1,'#cfe3f1']]);
const SKY_NIGHT = skyTexture([[0,'#02040c'],[.55,'#070d1f'],[.85,'#0d1630'],[1,'#0d1630']]);
scene.background = SKY_DAY;
const LIGHT = { day:{hemi:.7*Math.PI, sun:.85*Math.PI}, night:{hemi:.04*Math.PI, sun:.015*Math.PI} };
// Physical light units: a surface lit head-on by intensity PI reflects its full colour, so the sun and sky
// below are written as PI times the share of full brightness each one gives.
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x4a5a35, LIGHT.day.hemi); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, LIGHT.day.sun); sun.position.set(-60,100,40); scene.add(sun);

// Day or night: sky, fog and the two scene lights. The unlit road and grass are dimmed by the track (setGroundShade).
export function applyNight(night){
  scene.background = night ? SKY_NIGHT : SKY_DAY;
  scene.fog.color.setHex(night ? 0x0d1630 : FOG);
  scene.fog.far = night ? 420 : 760;
  const L = night ? LIGHT.night : LIGHT.day;
  hemi.intensity = L.hemi; sun.intensity = L.sun;
  sun.color.setHex(night ? 0x8fa8ff : 0xfff0d0);
}

export function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, settings.quality === 'low' ? 1 : 2);
  renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

export function disposeObj(o){ scene.remove(o); o.traverse(n=>{ if(n.geometry) n.geometry.dispose(); if(n.material) n.material.dispose && n.material.dispose(); }); }
