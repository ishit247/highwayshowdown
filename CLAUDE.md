# Highway Dash 3D

A browser driving game: five cars (Compact Hatch, Family Sedan, Muscle GT, Sports Coupe,
Hypercar), traffic, damage, manual/automatic gears, headlights, indicators, exhaust
flames and an openable bonnet with a modelled engine bay. It runs from one HTML file and
installs as an offline web app. The folder also holds two other small games
(`shooter.html`, `temple-of-boom.html`) and a launcher (`index.html`); this file is about
the car game unless a task says otherwise.

Start with [docs/roadmap.md](docs/roadmap.md): it holds the current position, the phases
with their size and priority, and the open decisions. The design, code structure and the
rules for efficient, clear code are in [docs/architecture.md](docs/architecture.md). Read
only the sections the current task needs.

Decided (do not re-ask):

- Plain JavaScript ES modules, no build step: `car-game.html` is the page shell and the code is
  in `src/` (start at `src/main.js`; layout and dependency rules in `docs/architecture.md`
  section 4). Split from the single file on 2026-11-14.
- 3D with Three.js 0.187.0 (r187), official ES-module build in `lib/three/`
  (`three.module.js` + `three.core.js`), imported only through `src/three.js`. No runtime script comes
  from a CDN. The game uses the sRGB colour pipeline with physical light units (adopted
  2026-11-14; see `docs/architecture.md`).
  Three.js was inherited from the first version of the game, not a researched choice; Three.js
  versus Babylon.js is an open decision in `docs/roadmap.md`.
- ES modules cannot load from a plain file, so the game must be served over http: use
  `Play-Highway-Dash.bat` (or `node serve.js`). Opening `car-game.html` by double-click shows a
  message that says so.
- Library policy: every library is kept on its latest stable version, so later upgrades stay
  small. Three.js was upgraded from r128 to 0.187.0 (r187) on 2026-11-14 (see "Library upgrade
  plan" in `docs/roadmap.md`). A new library goes in at its current stable version; check the
  package registry first and record the version in `docs/architecture.md`.
- HUD and cockpit are drawn on a 2D canvas; all sound is synthesised with Web Audio
  (no audio files).
- Driving uses our own simple physics (road coordinates `S.s`, `S.d`, `S.psi`); a physics
  engine is not wanted until the roadmap needs one.
- Cars are built from code in `buildCar`, one spec per car in `STYLES` / `CARS`.
- Desktop and offline use is a PWA: `manifest.webmanifest`, `sw.js`, `icons/`, started
  locally with `Play-Highway-Dash.bat` (`serve.js`, Node built-ins only).
- Controls: W/S gas/brake, A/D steer, Space handbrake, T automatic/manual gears,
  Q/E shift (manual only), X neutral, Z/C left/right indicator, L headlights
  (wide, focus, off), B bonnet, V camera (cockpit, chase, free orbit with the left
  mouse button), K day/night, N air conditioning, H horn, R restart, M menu. Keep this list and the
  start-menu help text in step.

Proposed, not confirmed: keep code-built cars (stylised) rather than moving to glTF
models. Hosting for other players is not decided (any static host would do).

Ask the user only about the open decisions in the Decisions table of `docs/roadmap.md`,
and only when you reach the work that needs the answer. Record the answer in that table.

# Working agreements

What follows are policies, not preferences. **If one of them is wrong for the
task in front of you, say so and ask before departing from it.** Never decide
silently to skip one — an unasked-for exception is indistinguishable from
forgetting.

## Development phase: single player, no real users yet

Until other people play the game, nothing is irreplaceable: saved settings and scores are
test data. So **fix a thing where it was first written** instead of layering a patch on top,
and keep a single way to start from scratch (open `car-game.html`, or run
`Play-Highway-Dash.bat`).

- Browser storage (settings, best scores) is versioned under one key prefix. While there are
  no real players, change the stored shape freely; do not write migration code.
- Never leave a half-finished feature behind a flag or a commented-out block.

**Ask before:** adding save data that a player would be upset to lose, because from then on
its shape needs migrations.

## Engineering standards

The game must be smooth (a steady frame rate on an ordinary PC) and easy to maintain.
These apply to every task.

- **Simplest design that meets the documented requirement.** No speculative abstractions,
  options or layers. A module or helper is created when its first real use arrives, never
  as a placeholder.
- **One job per function; one way to do each thing.** Follow the existing pattern before
  adding a new one (one key handler, one HUD drawer, one way to build a car part, one place
  that owns the game state `S`).
- **Validate at the edges, trust types inside.** Anything read from outside the code
  (browser storage, query string, a loaded file) is parsed once where it enters, with a safe
  default. Internal code does not re-check it.
- **Fail loudly during development.** No swallowed errors; every `catch` handles, adds
  context and rethrows, or is a documented fallback (for example the service-worker
  registration, which must never block the game).
- **Efficient by construction, optimised by measurement.** Do not allocate objects per frame
  in hot paths, reuse geometries and materials, and keep draw calls in check. Optimise further
  only against a measured frame-time budget.
- **Few, well-kept dependencies.** Prefer browser APIs and Node built-ins. Three.js is the
  only runtime dependency; any new one is named and justified in the change that adds it.
- **Tests describe behaviour.** Through the running game: a scripted headless run that
  presses keys and asserts game state, one reason to fail per check. A bug fix starts with a
  check that fails.
- **Readable code.** Names from the domain (car, traffic, gear, bonnet, flame, indicator).
  Comments say why, not what. No dead code, and no TODO without a roadmap item.

## Editing files

- Change files with the Edit tool, or Write for new ones. Do not patch files
  through `sed`, `python`, or a heredoc when Edit would do: a file changed outside
  the editing tools gets re-printed in full afterwards.
- Never re-read a file to check that an edit landed. The edit would have failed
  loudly if it had not.
- **Ask before:** a mechanical change across many files at once, where a script
  genuinely is the cheaper tool.

## Command output

- Filter at the source. `| grep`, `| tail`, `-q`, `--format` — decide what
  matters before running the command, not after reading the output.
- Never surface a full log. Extract the summary line, the failing check, and the
  assertion.

## Reading

- Read the range you need, not the whole file. Search before reading: find the
  few lines that matter, then read around them. The code is split by job under `src/`; find the
  module from the layout in `docs/architecture.md` section 4, then search for the function.
- Behaviour checks: `node tests/run.mjs` (about 3 minutes; run it in the background).

## Long-running work

- Background anything slow — a server, a long scripted run, a render of many angles — and
  come back to filtered output. Do not poll it, and do not sit in a foreground wait.
- Never chain sleeps to wait for a condition. Use an `until` loop in a background command.

## How much verification

Match the verification to what the change can break.

- Behaviour that players feel — collisions, damage, gears, steering, traffic AI, the
  service worker / offline cache — gets a scripted headless run of the real game with
  asserted numbers, plus a screenshot where it is visible.
- Visual changes (shapes, paint, lights) get a rendered check from the angles that show them.
- Comments, documentation and copy get a syntax check and nothing more.
- Say which of the two happened. A change reported as verified when only the syntax was
  checked is worse than one honestly reported as unverified. Scripts do not play the game:
  say so, and ask the user to try anything that depends on feel (sound level, handling).
- Check UI work at a normal window (1280 × 720) and a small one (800 × 450), and use
  browser automation for diagnosis rather than growing a large functional suite.
- **Ask before:** spending a long verification pass on something that looks cosmetic but
  might not be. Describe the risk and let the decision be made.

## Web safety rules that recur

- **No runtime third-party code.** Scripts, fonts and images are local files. A CDN is used
  only to fetch a file once, which is then committed under `lib/`.
- **The service worker caches only its own origin** and must keep working if registration
  fails. Bump its cache name whenever cached files change shape, so players do not get a
  stale game.
- **Never build HTML from text a player typed** without escaping it (names on a future
  leaderboard).
- **Browser storage can be unavailable or hold junk.** Wrap reads and writes, fall back to
  defaults, never crash the game over it.

## Documents and deliverables

- Every document belongs in this repository: write plans, guides, reports and
  checklists to a file under `docs/` and say where it is.
- **Never publish a document as a hosted artifact** (claude.ai or anywhere
  else). A page outside the repository is invisible to `git`, cannot be reviewed
  in a diff, and publishing is close to irreversible.
- HTML documents are bare fragments opened from disk; give them
  `<meta charset="utf-8">` or dashes and curly quotes arrive as mojibake.
- Preview images and test renders live under `previews/`.
- **Ask before:** producing a deliverable in any form that lives outside the
  working tree.

## Development stays on this machine

During development, the repository and this machine are the only places project
information lives. (Putting the finished game on a public host is a separate matter and an
open decision in `docs/roadmap.md`.)

- No hosted artifacts, no cloud or remote execution, no scheduled routines that
  ship the working tree elsewhere.
- Sessions are local only; Remote Control stays off. A session that finds Remote Control
  connected says so at once and asks before doing anything else.
- Nothing is pasted outward: source, screenshots, test renders and the user's files do not
  go into a web search, a URL query string, an issue tracker, a paste service, or a
  third-party API. Reading public documentation, or downloading a public library file, is
  fine; sending project content out with the request is not.
- No git remotes without asking. The local repository has no remote.
- **Ask before:** any step that moves project information off this machine, even
  a convenience. Say what would be sent and to whom.

## Tooling and environment

- Windows machine. Install tooling and large caches (package stores, build caches) on the
  **D:** drive, not C:. The project itself lives on E:.
- Node is available; `serve.js` uses only its built-ins. Edge is available for headless
  rendering and for driving the game through its remote-debugging port.
- Throw-away scripts, scratch pages and test renders go in the session scratchpad, not in
  the project folder, unless they are kept on purpose.

## Multi-agent work

- Do not spawn workflows or parallel subagents unless asked for by name. **Ask
  before** proposing one, with a sentence on what it would cost.

## Session hygiene

- One task per session. When a piece of work is finished and the next request is
  unrelated, say plainly that a fresh session would carry less baggage.
- Name files by path when referring to them.

## Token budget

Policies for keeping sessions cheap. If one is wrong for the task, say so and ask; do not drop it silently.

- **Start from the handover, not from the code.** Read CLAUDE.md and the relevant section of
  `docs/roadmap.md`. Read source files only when the task needs them, and by line range.
- **Fresh sessions save tokens.** After a substantial task, if this session has already done
  two or more, or a long design discussion preceded the work, say plainly: "This is done; start a
  new session to continue with <next item>." Record the current position in `docs/roadmap.md`.
- **Results in one line.** Report checks as counts plus the names of failures; never paste logs
  or full output.
- **Decisions: a recommendation and the one question that matters**, not a survey of options.
  Prototype a look once as a preview image, then treat it as frozen.
- **Do not re-read what is already in context,** and do not re-print a file after editing it.

## Model usage plan (with a reminder)

A stronger model costs more per token but is worth it where one subtle mistake is expensive and hard to see.
The recommendation is per task; the user decides, but must be reminded.

| Work | Recommended model |
|---|---|
| Collision and damage logic, driving physics, traffic AI, service worker and offline cache, changes that cut across several `src/` modules, anything that could silently break existing behaviour | **HIGH** (Opus or Fable) |
| Car shapes, paint, lights, engine bays, HUD and dashboard drawing, sounds, new keys that follow the existing handler, scenery | STANDARD (Sonnet) |
| Documentation, roadmap updates, running scripted checks, status questions | STANDARD, or cheaper |

**The reminder (a rule for the assistant).** At the start of a session, and again before starting any task marked HIGH
above, compare the model you are running as with the plan. If a HIGH task is about to start on a lower model,
**stop and say so in one line before doing any work** ("This task is marked HIGH; this session is on <model>. Switch with
/model, or tell me to continue here."), then wait for the user's answer. If a STANDARD task is about to run on a HIGH
model, mention once that STANDARD would do. The user's answer applies to that task only; do not ask again within it.
If you cannot tell which model you are running as, say that instead of guessing.
