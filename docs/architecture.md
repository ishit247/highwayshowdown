<meta charset="utf-8">
# Highway Dash 3D — System design

Status of each statement: **Built** (exists in the code today), **Decided** (agreed, in CLAUDE.md),
**Proposed** (my recommendation, not yet confirmed). Open questions live in the Decisions table of
[roadmap.md](roadmap.md).

## 1. Purpose and scope

A single-player 3D highway driving game that runs in a browser and installs as an offline web app.
Goals, in priority order:

1. **Feels good to drive** and stays smooth (steady frame rate on an ordinary PC).
2. **Easy to change.** New cars, keys, effects and modes should each touch few places.
3. **Works offline, opens from a folder or a link,** with no account, no server logic and nothing to install first.

Out of scope for now: multiplayer, accounts, a backend, mobile-first controls (see roadmap).

## 2. Technology choices

| Area | Choice | Why | Alternatives considered | Status |
|---|---|---|---|---|
| Language | Plain JavaScript (ES2022) | No build step; opens from disk; fastest iteration | TypeScript (needs a compiler) | Decided |
| Type safety | JSDoc types + `// @ts-check` in the editor | Catches mistakes with zero build cost | Full TypeScript later if the code grows | Proposed |
| 3D | Three.js 0.187.0 (r187), official ES-module build, local copy in `lib/three/` | Huge community, fine for code-built models; unminified build is ~2 MB, cached for offline use | Babylon.js (heavier, more built in) | Built (upgraded from r128 on 2026-11-14); engine choice still open |
| Dashboard / HUD | 2D canvas drawn each frame | Full control, no DOM cost in the loop | DOM overlay | Built |
| Menus | Plain HTML + CSS | Few screens, no state library needed | React/Preact/Svelte once there are many screens | Decided for now |
| Sound | Web Audio, fully synthesised | No audio files, tiny offline size | Recorded samples (better, larger, licensing) | Built |
| Physics | Our own kinematic model in road coordinates | Predictable, tuned for feel, no dependency | A physics engine (only for racing AI/crashes) | Decided |
| Car models | Built from code (`buildCar`) | No asset pipeline, every part is addressable | glTF models from Blender or a library | Decided, realism question open |
| Offline / install | PWA: manifest + service worker | One codebase for browser and desktop | Electron `.exe` (large, no benefit) | Built |
| Local server | `serve.js`, Node built-ins only | Service workers need `http://localhost` | Any static server | Built |
| Tests | Scripted headless Edge runs (remote-debugging port) | Runs the real game and asserts numbers | A test framework (overkill at this size) | Built, scripts not yet kept in repo |
| Version control | Local git | History, diffs, safe refactors | — | Proposed (no repository yet) |
| Hosting | Any static host | The game is static files | — | Open |

## 3. System overview

```
              input (keys, mouse)
                     |
                     v  writes intent
 +-------------------+--------------------+
 |  GAME STATE  S   (one owner)           |  S: player car, gears, damage, lights, signals, camera mode
 |  traffic[]  W (player world transform) |  traffic: NPC cars     W: position/heading used by render + audio
 +-------+-------------------+------------+
         |                   |
   update(dt)           render(dt)  <- reads state only
   (simulation)         3D scene + 2D HUD + audio
   - driving + gearbox        - track/scenery follow the car
   - collisions + damage      - cars, wheels, bonnet, lights, flames
   - traffic AI               - headlight beams, particles
   - flames/pop queue         - cockpit dashboard, HUD text
                              - engine + effect sounds
```

One frame (`loop`): read `dt` (capped at 0.05 s) -> `update(dt)` -> `AU.update` -> `updateSignals` -> `render3D` -> `drawHUD`.
Simulation never draws; rendering never changes game rules.

### Conventions (Built)
- **Units:** metres, seconds, radians. Speed is m/s inside the code; km/h or mph only when displayed.
- **Road coordinates:** `S.s` distance along the road, `S.d` sideways offset (positive = right), `S.psi` heading relative to the road.
- **Car local axes:** +z forward, +y up. The car's left side is +x, its right side is -x.
- **Game state:** one object `S`, rebuilt by `freshState()` on start/restart. Anything the player can feel lives in `S` or `traffic`.

## 4. Code structure

### Today (Built): one file, `car-game.html`, ~1,500 lines
| Section | Contents |
|---|---|
| CARS | `STYLES` (shape numbers) and `CARS` (names, speed, grip, gauge) |
| GAME STATE | `freshState()`, the key map |
| THREE SETUP | renderer, scene, lights, sky |
| TRACK | road curves, hills, ribbons, trees and lamps |
| CAR MODELS | geometry helpers, `buildCar` (body, cabin, wheels, lamps, engine bays) |
| PARTICLES / AUDIO | smoke and sparks; engine, crash, pop and indicator sounds |
| TRAFFIC / GAME LOGIC | NPC spawn and AI; `update(dt)` driving, gears, collisions, damage |
| RENDER (3D) / HEADLIGHTS | per-frame scene updates, camera modes, light beams |
| HUD / DASHBOARD | all 2D drawing |
| MENU + INPUT + LOOP | menu, key handler, `loop` |

Other files: `sw.js`, `manifest.webmanifest`, `serve.js`, `Play-Highway-Dash.bat`, `lib/`, `icons/`, `docs/`, `previews/`.

### Target (Proposed): plain ES modules, still no bundler
```
car-game.html            shell: canvas, menu markup, <script type="module" src="src/main.js">
src/
  main.js                bootstrap and the game loop only
  config.js              constants and the key-binding table (single source for menu text + handler)
  state.js               freshState(), the one owner of S
  cars/specs.js          STYLES, CARS (data only)
  cars/build-car.js      geometry builders: body, cabin, wheels, lamps
  cars/engine-bay.js     engine bays and bonnet underside
  world/track.js         road, hills, scenery
  sim/driving.js         steering, speed, rail clamp
  sim/gearbox.js         auto/manual/neutral, pop queue
  sim/collisions.js      NPC and rail contacts, damage
  sim/traffic.js         NPC spawn and AI
  render/scene.js        renderer, camera modes
  render/headlights.js   beams
  render/effects.js      particles, flames
  ui/hud.js  ui/dashboard.js  ui/menu.js
  audio/engine-sound.js  audio/effects.js
  input/keys.js          keydown/keyup -> intents in S
tests/                   scripted headless checks (see section 8)
```
**Dependency rules** (these make the code testable and keep it from tangling):
1. `sim/*` imports nothing from `render/`, `ui/` or `audio/`. It can run without a screen.
2. `render/`, `ui/`, `audio/` read state; they never decide game rules.
3. `input/` only writes player intent into `S`.
4. `cars/specs.js` is data only: no functions that touch the scene.
5. No circular imports. Shared constants live in `config.js`.

Splitting the file is a refactor with no new features: do it in one task, verify the game behaves identically, then continue.

## 5. Rules for efficient code
The target is a steady 60 fps at 1280 × 720 on a mid-range laptop and never below 30 on a low-end PC.

1. **No allocation per frame in hot paths.** Reuse `Vector3`/`Color` objects and arrays; do not `new` them inside `update` or `render`.
2. **Build once, reuse.** Geometries, materials and textures are created once per car style or effect and shared. Traffic cars should reuse their style's geometry (today each spawned car builds its own: known debt).
3. **Dispose what you remove.** Removing a car, texture or light must also dispose its geometry, materials and textures.
4. **Keep lights and draw calls low.** One hemisphere light, one directional light, and at most two spot lights (headlights). Cap the pixel ratio at 2. Prefer fewer, larger meshes over many small ones.
5. **Pool short-lived things.** Smoke, sparks and flames come from a fixed pool, never created and destroyed on demand.
6. **O(n²) is fine only for small n.** Traffic AI loops over about 15 cars; anything that can grow needs a spatial shortcut.
7. **Optimise against a measurement,** not a guess: record frame time in a scripted run, change one thing, compare.
8. **Work in the right place.** Heavy setup runs at start-up or car selection, never inside the frame.

## 6. Rules for clear, maintainable code

1. **One owner per piece of state.** Game state is `S` and `traffic`; no hidden copies in other modules.
2. **One job per function.** If a function needs a "and" in its name, split it. `buildCar` is far too long today (known debt): body, cabin, wheels, lamps and bays should each be their own function.
3. **Data apart from behaviour.** Numbers that describe a car belong in `cars/specs.js`, not inside builder code.
4. **No magic numbers.** Tunable values get a named constant with a unit in the name (`FLAME_DECAY_PER_S`), kept together in `config.js` or at the top of the module.
5. **One source for key bindings.** The key handler, the menu text, the in-game hint and `CLAUDE.md` must come from one table, not four hand-edited copies (known debt: three copies today).
6. **Pure where possible.** Maths with no side effects (curves, gear ratios, collision overlap) lives in small functions you can call with numbers and check.
7. **Names from the domain:** car, traffic, gear, bonnet, flame, indicator, rail. Avoid `tmp`, `data`, `obj`.
8. **Comments explain why, not what.** Every non-obvious constant, sign convention or workaround has one line of reasoning.
9. **Fail loudly in development.** No empty `catch`; documented fallbacks only (service-worker registration, browser storage).
10. **No dead code.** No commented-out blocks, no unused options, no TODO without a roadmap item.
11. **Follow the existing pattern before adding a new one.** Adding a car, key or effect should look like the last one.

### Adding things (the intended paths)
- **A new car:** one entry in `cars/specs.js`, a `kind` branch in `cars/build-car.js`, an engine bay in `cars/engine-bay.js`, one engine sound profile, and one preview render.
- **A new key:** one row in the key-binding table; the menu text and hint follow from it.
- **A new effect:** a function in `render/effects.js` fed from state; never read keys inside it.

## 7. Best practices (web, security, accessibility)

- **No third-party code at runtime.** Scripts, fonts and images are local. A CDN may be used once to fetch a file, which is then kept under `lib/`.
- **Service worker:** caches only its own origin, must never block the game if registration fails, and its cache name is bumped when cached files change so players do not keep a stale game.
- **Browser storage** (future settings and scores): wrapped in try/catch, parsed once with a safe default, stored under one versioned key prefix. Never build HTML from text a player typed.
- **Accessibility and comfort:** keyboard remapping is on the roadmap; a screen-shake / flash reduction option is proposed but not yet listed there. Keep colour from being the only signal (indicators also click, gear state is shown as text).
- **Compatibility:** target current Edge, Chrome and Firefox with WebGL. Detect missing WebGL and show a plain message.
- **Asset licensing:** anything imported (models, sounds, fonts) has its licence recorded next to it.
- **Offline first:** every file the game needs is in the cache list in `sw.js`.

## 8. Verification strategy
Match the check to the risk (see CLAUDE.md "How much verification").

| Change | Check |
|---|---|
| Collisions, damage, gears, steering, traffic AI, the offline cache | Scripted headless run of the real game with asserted numbers |
| Shapes, paint, lights | Rendered screenshots from the angles that show the change |
| Documentation | Nothing beyond reading it once |

**Invariants worth keeping as repeatable checks:**
- The player never overlaps an NPC car and never ends up past the rail.
- NPC cars never overlap each other over a long run.
- Flames and pops occur only on gear changes: two bursts on upshift, four on downshift, none while holding the gas.
- In neutral, throttle gives no acceleration and engine rpm still rises.
- `V` cycles cockpit, chase and free camera; `T`, `X`, `Z`, `C`, `L`, `B` toggle what the menu says they do.
- The service worker installs and the cache holds every file in `sw.js`.

Today these scripts exist only in the session scratchpad. **Proposed:** keep them in `tests/` as small Node scripts that start `serve.js`, drive Edge through its debugging port, assert, and print one line per check. Scripts cannot judge feel (sound level, handling); those still need the player.

## 9. Build, release and versioning
- **No build step today.** Run `Play-Highway-Dash.bat` (ES modules need http, so opening `car-game.html` by double-click shows a hint instead of the game).
- **Colour and light units:** the game deliberately keeps the old look (`ColorManagement` off, linear output, light intensities x PI). Switching to the sRGB pipeline is a roadmap task.
- **Install as an app:** from `http://localhost:8123` use the browser's Install button.
- **Release:** the whole folder is the product; publish it to any static host. Before publishing, bump the cache name in `sw.js`.
- **Versioning (Proposed):** initialise a local git repository, one commit per finished task, tag meaningful milestones. No remote without asking.

## 10. Known technical debt (honest list)
| Item | Impact | Fix |
|---|---|---|
| One ~1,500-line file with global state | Hard to navigate and test | Module split in section 4 |
| `buildCar` is ~450 lines | Risky to change | Split into builders per part |
| Traffic cars rebuild full geometry on spawn | Spikes and memory | Cache geometry per style; instancing later |
| Some per-frame allocations (damage tint colour, chase-camera target) | Garbage collection hitches | Reuse objects |
| Key hints duplicated in menu, HUD hint and docs | Easy to get out of sync | One key table |
| Magic numbers throughout | Hard to tune | Named constants in `config.js` |
| Test scripts not in the repository | Checks are not repeatable | `tests/` folder |
| No git repository | No history or safe rollback | `git init` |
| Service-worker cache name is manual | Players may see a stale game | Bump on release (script later) |

## 11. Change checklist (use on every task)
1. Does it follow an existing pattern, or does it need a decision recorded in the roadmap?
2. Is the new state owned in one place, and are the numbers named?
3. Any new per-frame allocation, light, texture or draw-call cost? Measured?
4. Does `sim/` stay free of rendering and audio?
5. Was it verified in the way section 8 says, and did the report say plainly what was and was not checked?
6. Are the key list, roadmap and this document still accurate?
