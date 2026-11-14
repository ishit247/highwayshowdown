// Three.js for this game. Every module imports it from here. Colour management is on (Three.js default):
// colours written as hex or CSS are sRGB, lighting is computed in linear space, output is sRGB.
import { CanvasTexture, SRGBColorSpace } from '../lib/three/three.module.js';
export * from '../lib/three/three.module.js';

// The one way to turn a drawn canvas into a colour texture (textures hold sRGB colours, so they must be tagged).
export function canvasTexture(canvas){
  const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace; return t;
}
