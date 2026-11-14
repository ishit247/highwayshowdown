<meta charset="utf-8">
# Highway Dash 3D — Roadmap

## How to read and update this tracker
- **Effort:** S = under an hour · M = a few hours · L = a day or more.
- **Priority** (phase heading): P1 do next · P2 worth doing · P3 nice to have.
- **Model:** the model recommended for the task, following the table in [CLAUDE.md](../CLAUDE.md).
  **HIGH** = Opus or Fable, for work that could silently break existing behaviour (collisions, driving physics, traffic AI, service worker, module split).
  **STD** = Sonnet, for visuals, sounds, menus and anything that follows an existing pattern.
  Where one task has a conditional, it says so. The assistant reminds you before a HIGH task starts on a lower model.
- **Status:** `Todo` · `In progress` · `Waiting` (needs your go-ahead or an answer) · `Done`.
- Update a task's Status in the same change as the work, and add a line to "Current position". Move finished items into "Where we are (done)" when a phase closes.

**Last updated:** 2026-11-14
**Tracking:** 39 tasks · 2 done · 1 in progress · 0 waiting · 36 todo

**Current position (2026-11-14):** the Three.js upgrade and the split into ES modules (`src/`) are both done. All 9 checks in `tests/` pass, and the module version replays a scripted drive with the same state as the single file. The sRGB colour pipeline and physical light units are in (day and night checked in screenshots; all 9 checks passed before the final lamp edits). The coupe's rear band and headlamps now use the unlit lamp materials so they show at night. Nothing is committed yet (the split, the sRGB change and the coupe lamps). Next: reload with Ctrl+F5 and play a round by day and by night, commit, then brake lights that react (S). Reverse lights need a reverse gear first, which the game does not have (speed is clamped at 0 in `src/sim/driving.js`); that is a separate HIGH task. The coupe's front amber indicators are still static and dull.

## Where we are (done)
- 5 cars with their own shapes, paint and engine sound: Compact Hatch, Family Sedan, Muscle GT, Sports Coupe, Hypercar.
- Driving: automatic or manual gears (T), neutral (X), indicators (Z / C), headlights wide and focus (L), horn, handbrake.
- Damage: dents, smoke, pulling steering, bonnet pops open; bonnet opens with B and shows a real engine bay (V8 + supercharger on the Muscle GT, engine on the Hypercar).
- Exhaust flames and bangs on gear changes.
- Traffic that follows, overtakes and signals; solid collisions with NPCs and the guard rails.
- Cameras: cockpit, chase, free orbit.
- Installable offline web app (see the last section).

## Phase 1 — Stabilise (P1)
| Task | Effort | Model | Status | Notes |
|---|---|---|---|---|
| Full play-test of all 5 cars: every key, crash, restart, menu round-trip | S | You (by hand) | Done | Played by hand on 2026-11-14, no problems found. Nothing left to fix from it |
| Fix whatever the play-test finds | S–M | STD (HIGH if it touches physics or collisions) | Done | The play-test found nothing |
| Performance check on a weaker PC (frame rate, lots of traffic) | S | STD | Measured | 2026-11-14, headless Edge, software GL (frame ms is relative only), 1280×720, Hypercar player, cars held in view. Per car: about 125 meshes, 80 draw calls after culling, 4,200 triangles, 55 geometries, none shared. Draw calls: 0 traffic 1,100 · 15 (the game's cap) 1,870 · 30 3,270 · 60 6,060. A weak PC is limited by draw calls, so the cap of 15 is already heavy. Not measured: a real GPU, a real weak PC. Next: share geometry per style and merge each car's static parts (architecture.md section 5, rules 2 and 4); then re-measure with the same method |
| `git init` and a first commit | S | STD | Done | Project committed by you after the Three.js upgrade; no remote |
| **Upgrade Three.js from r128 (2021) to the current stable release** | M–L | **HIGH** | Done | 0.187.0 (r187) in `lib/three/`, done 2026-11-14. Looks identical, all scripted checks pass. The game now needs the local server: `car-game.html` no longer opens by double-click. Steps under "Library upgrade plan" |
| Remember settings (last car, gearbox mode, camera) in the browser | S | STD | Done 2026-11-14 | `src/settings.js`. Open: also keep the look-around view (free orbit angle/zoom; first person and chase would need the view to stop springing back plus a re-centre key) |
| Settings screen: volume, quality, key list | M | STD | Todo | Needed before sharing with others |

## Phase 2 — Look and atmosphere (P1/P2)
| Task | Effort | Model | Status | Notes |
|---|---|---|---|---|
| **Night mode** (key K; auto cycle not done) | M | STD | Built, needs a hand play-test | Makes headlights, indicators, brake lights and flames really show. Do after the Three.js upgrade |
| Adopt Three.js's sRGB colour pipeline and physical light units | M | STD | Done (2026-11-14) | sRGB on, canvas textures tagged, lights retuned so day and night look like before (checked in screenshots); no tone mapping. Needs a hand look |
| Brake lights and reverse lights that react | S | STD | Built, unplayed | Tail lamps dim, bright on brake/handbrake and when traffic slows; white reverse lamps light in reverse |
| Weather: rain, fog, wet road shine | M | STD | Todo | |
| Scenery: mountains, clouds, bushes, rocks, buildings, bridges, tunnels | M | STD | Todo | Grass is flat and plain right now |
| Skid marks and tyre smoke | M | STD | Todo | |
| Visible dents / scratches on the body | L | STD | Todo | Damage only darkens the paint now |
| Interior for the cockpit view per car | L | STD | Todo | Currently one shared dashboard |

## Phase 3 — Gameplay (P1/P2)
| Task | Effort | Model | Status | Notes |
|---|---|---|---|---|
| Game modes: endless (now), time trial, checkpoint race | M | STD | Todo | |
| Race against AI cars | L | **HIGH** | Todo | Reuses and extends the traffic AI |
| Police chase mode | L | **HIGH** | Todo | New AI behaviour and collision rules |
| Coins / score multipliers for close passes and clean driving | S–M | STD | Todo | |
| Local leaderboard (best scores per car) | S | STD | Todo | Browser storage, escape any names shown |
| Ghost car of your best lap | L | **HIGH** | Todo | Needs the simulation to replay identically |
| Several tracks (city, desert, mountain, coast) | L | STD | Todo | Needs the scenery work first |

## Phase 4 — Cars (P2)
| Task | Effort | Model | Status | Notes |
|---|---|---|---|---|
| Engines for Hatch, Sedan, Coupe (inline-4, inline-4, flat-6) | M | STD | Todo | Only the Muscle GT and Hypercar are detailed |
| W16 engine for the Hypercar like the reference photo | M | STD | Todo | |
| Reverse gear | S | **HIGH** | Built, unplayed | S at a standstill reverses (6 m/s cap), W brakes then goes forward; white reverse lamps, R on the gear display. Reversing into traffic behind reuses the "hit from behind" logic, untuned |
| Manual clutch option | M | **HIGH** | Todo | Driving physics |
| More cars: SUV, pickup, small sports car | L | STD | Todo | |
| Paint colours and wheel choices in the menu | M | STD | Todo | |
| Upgrades with coins (engine, tyres, brakes) | L | STD | Todo | Needs coins first; HIGH if it changes the physics formulas |

## Phase 5 — Sound and feel (P2)
| Task | Effort | Model | Status | Notes |
|---|---|---|---|---|
| Turbo spool and blow-off, backfire variations | S–M | STD | Todo | Builds on the pop sound |
| Tyre squeal that varies by surface | S | STD | Todo | |
| Radio / music with a volume control | M | STD | Todo | The dashboard already shows a "now playing" bar |
| Gamepad support with rumble | M | STD | Todo | |
| Touch controls for phones and tablets | M | STD | Todo | |
| Key rebinding | M | STD | Todo | Needed once the key list gets long |

## Phase 6 — Ship it (P1 when you are ready to share)
| Task | Effort | Model | Status | Notes |
|---|---|---|---|---|
| Split the single 1,500-line HTML file into ES modules | M | **HIGH** | Done | 2026-11-14, no feature change: 25 modules under `src/`, layout and reasons in [architecture.md](architecture.md) section 4. Checks kept in `tests/` (`node tests/run.mjs`). A seeded, frame-stepped replay (all checks plus a scripted drive, 6,040 frames) matched the single file on every frame, and its five screenshots were byte-identical. In that replay, Three.js's UUID draws used their own random stream. One change can't be seen in play: a traffic car's mesh is now built after its speed is drawn, so with a fixed seed the traffic speeds come from a different point in the random stream (still 15–30 m/s). Service-worker cache `highway-dash-v3` |
| Launcher page (index.html) listing all games | S | STD | Todo | |
| Installable web app (PWA) with offline play | S | STD | Done | Run `Play-Highway-Dash.bat`, then use the browser's Install button. See the last section |
| Host it online so others can play | S | STD | Todo | Static hosting is enough; ask before anything leaves this machine |

## Suggested order
1. Phase 1 play-test and fix, 2. `git init`, 3. Three.js upgrade (before anything that depends on it), 4. Split into ES modules, 5. Night mode (its bloom and post-effects use add-ons that must match the Three.js version), 6. Scenery, 7. Engines for the other three cars, 8. Lap/time-trial mode with a leaderboard, 9. Hosting.

## Library upgrade plan (Three.js r128 -> current stable)
Why first: the longer we stay on r128, the more code is written against old behaviour, and the add-ons we want next (bloom, glTF loader) only ship for current versions.
Only one library is involved: Three.js (`lib/three/`). Nothing else in the project is a dependency.
Whole task: **HIGH** model, effort M–L, status **Done** (2026-11-14, Three.js 0.187.0 / r187, run on the Sonnet session at your request).

| Step | What | Risk | Status |
|---|---|---|---|
| 1 | Back up the working game and keep the old `lib/three.min.js` until the check passes | none | Done (file copy in the scratch folder; nothing was committed, see Phase 1) |
| 2 | Look up the current stable version from the package registry (no project content sent), download the official module build into `lib/three/` | low | Done: 0.187.0, published 2026-10-30 |
| 3 | Switch the page to ES modules; current releases no longer ship the single-file `three.min.js` build | medium | Done: `<script type="module">` importing `lib/three/three.module.js`; opening the file from disk now shows a message pointing to `Play-Highway-Dash.bat` |
| 4 | Colour management | medium: colours shift if missed | Kept the old behaviour at first (`ColorManagement` off); the proper sRGB pipeline was then adopted in Phase 2 (2026-11-14) |
| 5 | Lighting: physically based light units | medium | Done: hemisphere, sun and headlight intensities multiplied by PI, which reproduces the old brightness |
| 6 | Fix any removed or renamed API the console reports | low | Done: none needed, the console was clean |
| 7 | Compare before/after renders | the check that matters | Done: four scenes (Muscle GT chase, Hypercar chase, Sports Coupe cockpit, Hatch with focus beams) identical to the eye |
| 8 | Re-run the scripted checks | the check that matters | Done: flames 2 bursts up / 4 down / 0 holding gas, neutral (speed 0, 5,847 rpm), camera cycle, NPC overlap 0 m over 27 crashes, rail overshoot -0.071 m, traffic overlap 0 frames, service worker cache holds all files |
| 9 | Update `sw.js` file list and cache name, CLAUDE.md and the architecture table | low | Done: cache name `highway-dash-v2` |

Done when: the game looks the same to the eye, every scripted check passes, and `docs/architecture.md` names the exact version. **Met.** Not checked: a real Install click and offline relaunch, and play feel by hand.

## Decisions
| Decision | Status | Recommendation |
|---|---|---|
| Keep code-built (stylised) cars, or move to real glTF car models | open | Keep code-built; revisit only if photo-realism is wanted |
| Engine: stay on Three.js (upgrade r128 first) or switch to Babylon.js | open | Stay on Three.js. Babylon.js only if the answer above is realistic models, plus night-mode bloom and physics-based racing; a switch means rewriting about 1,800 lines of rendering and car code |
| Where other players get the game (which static host), if at all | open | Decide when Phase 6 starts; any static host works |
| Which roadmap phase after the play-test | open | Three.js upgrade, then night mode (Phase 2) |
| Add a reverse gear and a manual clutch | open | Reverse yes (small); clutch later |
| Start the Three.js upgrade now, on which model | decided | Done on the Sonnet session at your request (2026-11-14) |

## Known gaps today
- Menu and HUD key hints are long; a settings or help screen would be cleaner.
- Traffic only reacts to other traffic, not to the player's lane changes.
- The three non-hyper engines are simple shapes.
- `car-game.html` no longer opens by double-click (ES modules need a server): start it with `Play-Highway-Dash.bat`.

## Web app / desktop install (done)
- `Play-Highway-Dash.bat` starts a tiny local server (`serve.js`, needs Node) and opens http://localhost:8123/car-game.html.
- In Edge or Chrome click the **Install** icon in the address bar (or menu > Apps > Install this site as an app). It gets its own window, desktop / Start-menu icon and works offline.
- Files: `manifest.webmanifest`, `sw.js` (offline cache), `icons/`, `lib/three/` (Three.js 0.187.0, `three.module.js` + `three.core.js`, a local copy so the game needs no internet).
- To let other people play: upload the whole folder to any static host (GitHub Pages, Netlify, Cloudflare Pages). It then installs the same way from the link.
