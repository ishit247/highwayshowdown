// The repeatable behaviour checks from docs/architecture.md section 8. Each returns {name, ok, detail}.
// They read the game through window.__g (see installProbe in harness.mjs) and drive it with keys.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';

const MUSCLE_GT = '3', COMPACT_HATCH = '1', SPORTS_COUPE = '4';

// back to the menu if a run is going, pick a car by its number key, start a run with a known random seed
async function start(p, carKey, seed = 42) {
  if (await p.eval('document.getElementById("menu").style.display === "none"')) await p.press('m');
  await p.press(carKey);
  await p.eval(`__seed(${seed})`);
  await p.press('Enter');
}
const S = (p, expr) => p.eval(`(S => (${expr}))(__g.S)`);

async function flames(p) {
  await start(p, MUSCLE_GT);
  await p.press('t');                                                    // manual gearbox, so nothing shifts on its own
  await p.eval(`(() => { let prev = 0; window.__bursts = 0;
    __watchers = [() => { const f = __g.S.flameI; if (f > prev + 1e-6) __bursts++; prev = f; }]; })()`);
  const bursts = async () => { const n = await p.eval('__bursts'); await p.eval('__bursts = 0'); return n; };
  await p.down('w'); await p.run(128); const hold = await bursts();     // 2 s of gas in 1st gear, at the limiter
  await p.press('e'); await p.run(64); const up = await bursts();       // upshift
  await p.up('w'); await p.down('s'); await p.run(64); await p.up('s'); await bursts();
  await p.press('q'); await p.run(64); const down = await bursts();     // downshift
  await p.eval('__watchers = []');
  return { name: 'flames: 2 bursts on upshift, 4 on downshift, 0 holding gas', ok: hold === 0 && up === 2 && down === 4,
           detail: `hold ${hold}, up ${up}, down ${down}` };
}

async function neutral(p) {
  await start(p, COMPACT_HATCH);
  await p.press('x');
  await p.down('w'); await p.run(128); await p.up('w');
  const { v, rpm, n } = await S(p, '({ v: S.v, rpm: S.rpm, n: S.neutral })');
  return { name: 'neutral: throttle gives no speed, rpm still rises', ok: n && v === 0 && rpm > 3000,
           detail: `speed ${v.toFixed(3)} m/s, ${Math.round(rpm)} rpm` };
}

async function camera(p) {
  await start(p, COMPACT_HATCH);
  const seen = [await S(p, 'S.cam')];
  for (let i = 0; i < 3; i++) { await p.press('v'); seen.push(await S(p, 'S.cam')); }
  return { name: 'V cycles cockpit, chase, free, cockpit', ok: seen.join() === 'fp,chase,free,fp', detail: seen.join(' > ') };
}

async function brakeLights(p) {
  await start(p, COMPACT_HATCH);
  const tail = () => p.eval('__g.playerMesh.userData.tail.color.getHex()');
  await p.down('w'); await p.run(64); const gas = await tail();
  await p.up('w'); await p.down('s'); await p.run(8); const braking = await tail();
  await p.up('s'); await p.run(8); const released = await tail();
  return { name: 'brake lamps: bright only while S is held', ok: braking === 0xff2a2a && gas === 0x8a1010 && released === 0x8a1010,
           detail: `gas ${gas.toString(16)}, brake ${braking.toString(16)}, released ${released.toString(16)}` };
}

async function reverse(p) {
  await start(p, COMPACT_HATCH);
  const s0 = await S(p, 'S.s');
  await p.down('s'); await p.run(128);
  const back = await S(p, '({ s: S.s, v: S.v, rev: S.rev })');
  const lamps = await p.eval('({ rev: __g.playerMesh.userData.reverseLamp.color.getHex(), tail: __g.playerMesh.userData.tail.color.getHex() })');
  await p.up('s'); await p.down('w'); await p.run(192); await p.up('w');
  const fwd = await S(p, '({ s: S.s, rev: S.rev })');
  const ok = back.rev && back.s < s0 - 2 && back.v > 1 && back.v <= 6.01 && lamps.rev === 0xfff6cc && lamps.tail === 0x8a1010 && !fwd.rev && fwd.s > back.s;
  return { name: 'reverse: S at a standstill backs up with white lamps; W stops then drives forward', ok,
           detail: `moved ${(back.s - s0).toFixed(1)} m at ${back.v.toFixed(1)} m/s, lamps ${lamps.rev.toString(16)}/${lamps.tail.toString(16)}, then forward ${(fwd.s - back.s).toFixed(1)} m, rev ${fwd.rev}` };
}

async function toggles(p) {
  await start(p, COMPACT_HATCH);
  const got = [];
  const after = async (key, expr) => { await p.press(key); got.push(key + '=' + JSON.stringify(await S(p, expr))); };
  await after('t', 'S.auto'); await after('t', 'S.auto');
  await after('x', 'S.neutral'); await after('x', 'S.neutral');
  await after('z', '[S.sigL, S.sigR]'); await after('c', '[S.sigL, S.sigR]'); await after('c', '[S.sigL, S.sigR]');
  await after('l', 'S.lights'); await after('l', 'S.lights'); await after('l', 'S.lights');
  await after('b', 'S.hoodOpen'); await after('b', 'S.hoodOpen');
  const want = 't=false t=true x=true x=false z=[true,false] c=[false,true] c=[false,false] l=1 l=2 l=0 b=true b=false';
  return { name: 'T, X, Z, C, L, B toggle what the menu says', ok: got.join(' ') === want, detail: got.join(' ') };
}

async function night(p) {
  await start(p, COMPACT_HATCH);
  const fog = () => p.eval('__g.scene.fog.color.getHex()');
  const day = await fog();
  await p.press('k'); await p.run(2);
  const dark = await fog(), on = await S(p, 'S.night');
  await p.press('k'); await p.run(2);
  const back = await fog();
  return { name: 'K switches night on (dark fog) and back to day', ok: on && dark !== day && back === day,
           detail: `day ${day.toString(16)}, night ${dark.toString(16)}, back ${back.toString(16)}` };
}

// A long drive that rams traffic (an autopilot steers at the nearest car ahead), then weaves into both rails.
// Health is topped up every frame so the run never ends.
async function contacts(p) {
  await start(p, SPORTS_COUPE, 7);
  await p.eval(`(() => {
    const R = window.__contacts = { npcHits: 0, railHits: 0, npc: -1e9, rail: -1e9, npcPairs: 0, frames: 0, chase: true };
    let steer = null;
    const steerTo = k => { if (k === steer) return; if (steer) __key(steer, false); if (k) __key(k, true); steer = k; };
    __watchers = [() => {
      const S = __g.S, car = __g.car, T = __g.traffic; R.frames++;
      let hitNpc = false;
      for (const t of T) {                       // player vs NPC, in the overlap box the game itself uses
        if (t.cool === 1) { R.npcHits++; hitNpc = true; }
        const hl = (car.len + t.sp.len) / 2 * .92, hw = (car.wid + t.sp.wid) / 2 * .9;
        const gs = hl - Math.abs(t.s - S.s), gd = hw - Math.abs(t.d - S.d);
        if (gs > -1 && gd > -1) R.npc = Math.max(R.npc, Math.min(gs, gd));
      }
      if (S.health < 100) { if (!hitNpc) R.railHits++; S.health = 100; }
      if (R.chase) {                             // head for the nearest car ahead (or the centre lane); D turns right (+d, psi falls)
        let near = null; for (const t of T) if (t.s > S.s && t.s - S.s < 300 && (!near || t.s < near.s)) near = t;
        const want = -Math.max(-.12, Math.min(.12, ((near ? near.d : 0) - S.d) * .06));
        steerTo(S.psi > want + .01 ? 'd' : S.psi < want - .01 ? 'a' : null);
      } else steerTo(null);
      const ext = (car.wid / 2 + .2) * Math.abs(Math.cos(S.psi)) + (car.len / 2 + .1) * Math.abs(Math.sin(S.psi));
      R.rail = Math.max(R.rail, Math.abs(S.d) + ext - (__g.BARRIER - .45));
      let pair = false;
      for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
        const a = T[i], b = T[j];
        if (Math.abs(a.s - b.s) < (a.sp.len + b.sp.len) / 2 && Math.abs(a.d - b.d) < (a.sp.wid + b.sp.wid) / 2 * .9) pair = true;
      }
      if (pair) R.npcPairs++;
    }];
  })()`);
  await p.down('w');
  await p.run(3840);                             // 60 s ramming traffic
  await p.eval('__contacts.chase = false');
  for (const k of ['d', 'a', 'd', 'a', 'd', 'a']) { await p.down(k); await p.run(128); await p.up(k); }   // 12 s rail to rail
  await p.up('w');
  const R = await p.eval('__watchers = [], __contacts');
  return [
    { name: 'player never overlaps an NPC car', ok: R.npc <= 1e-9 && R.npcHits >= 10, detail: `closest ${R.npc.toFixed(3)} m (negative = gap) over ${R.npcHits} NPC hits, ${R.frames} frames` },
    { name: 'player never ends up past the rail', ok: R.rail <= 1e-9 && R.railHits >= 3, detail: `max overshoot ${R.rail.toFixed(3)} m, ${R.railHits} rail hits` },
    { name: 'NPC cars never overlap each other', ok: R.npcPairs === 0, detail: `${R.npcPairs} frames with an overlap` },
  ];
}

async function offlineCache(p) {
  const src = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const cacheName = src.match(/const CACHE = '([^']+)'/)[1];
  const assets = JSON.parse(src.match(/const ASSETS = (\[[^\]]*\])/s)[1].replace(/'/g, '"'));
  const r = await p.eval(`(async () => {
    await navigator.serviceWorker.ready;
    const c = await caches.open(${JSON.stringify(cacheName)});
    return { names: await caches.keys(), urls: (await c.keys()).map(q => new URL(q.url).pathname) };
  })()`);
  const missing = assets.map(a => a.replace(/^\./, '')).filter(a => !r.urls.includes(a));
  return { name: 'service worker installs and caches every file in sw.js', ok: r.names.includes(cacheName) && missing.length === 0,
           detail: `${cacheName}: ${assets.length - missing.length}/${assets.length} files` + (missing.length ? ', missing ' + missing.join(' ') : '') };
}

// The settings controls in the start menu: they apply at once and are kept in browser storage.
async function settingsScreen(p) {
  if (await p.eval('document.getElementById("menu").style.display === "none"')) await p.press('m');
  const out = await p.eval(`(async () => {
    const sc = await import('/src/render/scene.js');
    const v = document.getElementById('volume'); v.value = 40; v.dispatchEvent(new Event('input'));
    document.querySelector('[data-quality=low]').click();
    const saved = JSON.parse(localStorage.getItem('highway-dash:v1:settings'));
    const low = sc.renderer.getPixelRatio();
    document.querySelector('[data-quality=high]').click();
    return { vol: saved.volume, q: saved.quality, low, high: sc.renderer.getPixelRatio(), keys: !!document.getElementById('keylist') };
  })()`);
  return { name: 'settings: volume and quality apply and are stored, key list present',
           ok: out.vol === 0.4 && out.q === 'low' && out.low === 1 && out.high >= 1 && out.keys, detail: JSON.stringify(out) };
}

export async function runChecks(p) {
  const results = [];
  for (const check of [offlineCache, flames, neutral, camera, brakeLights, reverse, toggles, night, contacts, settingsScreen]) results.push(...[await check(p)].flat());
  results.push({ name: 'no errors in the console', ok: p.errors.length === 0, detail: p.errors.length ? p.errors.slice(0, 3).join(' | ') : 'clean' });
  return results;
}
