/* Highway Showdown - service worker: makes the game work offline once it has been opened. */
const CACHE = 'highway-dash-v15';   // bumped: per-car rims (rims.js new), exhaust bang sounds, wet headlight glint, Hypercar engine voice
const ASSETS = ['./car-game.html', './lib/three/three.module.js', './lib/three/three.core.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  './src/main.js', './src/three.js', './src/config.js', './src/state.js', './src/game.js',
  './src/cars/specs.js', './src/cars/shapes.js', './src/cars/build-car.js', './src/cars/engine-bay.js', './src/cars/rims.js',
  './src/world/road.js', './src/world/track.js',
  './src/sim/step.js', './src/sim/driving.js', './src/sim/gearbox.js', './src/sim/collisions.js', './src/sim/traffic.js', './src/sim/feedback.js',
  './src/render/scene.js', './src/render/frame.js', './src/render/headlights.js', './src/render/rain.js', './src/render/effects.js',
  './src/ui/hud.js', './src/ui/dashboard.js', './src/ui/menu.js',
  './src/audio/engine-sound.js', './src/audio/effects.js',
  './src/input/keys.js', './src/settings.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// network first (so updates show up when you are online), cache as the offline fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(m => m || caches.match('./car-game.html')))
  );
});
