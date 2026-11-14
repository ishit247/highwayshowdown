// Drives the real game in headless Edge through its remote-debugging port (Node built-ins only).
// The page gets a shim before any game code runs: Math.random is seeded and frames are stepped by
// hand (fixed 1/64 s), so every run of a check sees exactly the same game.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const SHIM = `(() => {
  let seed = 1;
  Math.random = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  window.__seed = n => { seed = n; };
  let now = 0, queue = [];
  performance.now = () => now;
  window.requestAnimationFrame = cb => { queue.push(cb); return queue.length; };
  window.__watchers = [];
  // 1/64 s per frame: exact in binary, so frame times never pick up rounding that depends on the clock value
  window.__run = n => { for (let i = 0; i < n; i++) { now += 15.625; const q = queue; queue = [];
    for (const cb of q) cb(now); for (const w of window.__watchers) w(); } };
  window.__key = (key, down) => dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key }));
})();`;

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.calls = new Map(); this.handlers = [];
    ws.addEventListener('message', m => {
      const msg = JSON.parse(m.data);
      if (msg.id && this.calls.has(msg.id)) {
        const { resolve, reject, method } = this.calls.get(msg.id); this.calls.delete(msg.id);
        msg.error ? reject(new Error(method + ': ' + msg.error.message)) : resolve(msg.result);
      } else for (const h of this.handlers) h(msg);
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => this.calls.set(id, { resolve, reject, method }));
  }
}

async function until(fn, what, ms = 15000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn(); if (v) return v;
    if (Date.now() > end) throw new Error('timed out waiting for ' + what);
    await new Promise(r => setTimeout(r, 100));
  }
}

// Starts serve.js and Edge, opens the game, returns a page with eval/run/key helpers.
// beforeLoad(page) runs after the shim is installed and before navigation (for request interception).
export async function openGame({ port = 8124, width = 800, height = 450, beforeLoad } = {}) {
  const server = spawn(process.execPath, [join(ROOT, 'serve.js')], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  const profile = mkdtempSync(join(tmpdir(), 'hd3d-edge-'));
  const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run',
    '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', '--mute-audio',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' });
  const close = async () => {
    edge.kill(); server.kill();
    await new Promise(r => setTimeout(r, 500));
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };
  try {
    const portFile = join(profile, 'DevToolsActivePort');
    await until(() => existsSync(portFile) && readFileSync(portFile, 'utf8').includes('\n'), 'Edge debugging port');
    const [cdpPort, wsPath] = readFileSync(portFile, 'utf8').split('\n');
    const ws = new WebSocket(`ws://127.0.0.1:${cdpPort}${wsPath.trim()}`);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('cannot connect to Edge')); });
    const cdp = new Cdp(ws);
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const send = (m, p) => cdp.send(m, p, sessionId);
    const errors = [];
    cdp.handlers.push(msg => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map(a => a.value ?? a.description).join(' '));
    });
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: SHIM });

    const page = {
      cdp, send, errors, port, close,
      async eval(expr) {
        const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error('page: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
        return r.result.value;
      },
      run: n => page.eval(`__run(${n})`),
      async press(key, frames = 1) { await page.eval(`__key(${JSON.stringify(key)}, true)`); await page.run(frames); await page.eval(`__key(${JSON.stringify(key)}, false)`); },
      down: key => page.eval(`__key(${JSON.stringify(key)}, true)`),
      up: key => page.eval(`__key(${JSON.stringify(key)}, false)`),
      async screenshot() { return Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'); },
    };
    if (beforeLoad) await beforeLoad(page);
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/car-game.html` });
    await until(() => page.eval('document.readyState === "complete"').catch(() => false), 'page load');
    return page;
  } catch (e) { await close(); throw e; }
}

// Gives the page `window.__g` with live views of the game state, read from the game's own modules.
export function installProbe(page) {
  return page.eval(`(async () => {
    const st = await import('/src/state.js'), tr = await import('/src/sim/traffic.js'), cfg = await import('/src/config.js'), sc = await import('/src/render/scene.js'), fr = await import('/src/render/frame.js');
    window.__g = { get S() { return st.S; }, get playerMesh() { return fr.playerMesh; }, get car() { return st.car; }, traffic: tr.traffic, BARRIER: cfg.BARRIER, scene: sc.scene };
  })()`);
}
