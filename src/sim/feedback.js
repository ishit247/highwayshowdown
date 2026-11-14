// The simulation decides when a crash is heard, an exhaust bang pops, sparks fly or a traffic car appears,
// but sim/ must run without a screen or speakers (docs/architecture.md, section 4). main.js plugs the audio,
// particle and car-mesh code in here before the first frame; until then these do nothing. Each is called at
// the moment its rule fires, in the same order as the simulation's own steps.
export const feedback = {
  crashSound(strength){},
  popSound(strength){},
  emit(kind, x, y, z, vx, vy, vz, life, size, col){},   // kind 0 = smoke, 1 = spark
  trafficAdded(t){},
  trafficRemoved(t){},
};
