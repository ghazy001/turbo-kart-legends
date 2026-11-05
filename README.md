# Turbo Kart Legends

An original desktop-browser arcade kart prototype. Milestone 1 includes one driver (Pip), the Tangerine kart, and Sunshine Circuit: a continuous, curving road through a sunny low-poly landscape. All game art, signage and track data are procedural and original. No external asset downloads, remote fonts, backend or accounts.

## Run

Use Node **20.19+ within the 20.x line**, or **22.13+**, and npm.

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite (normally http://127.0.0.1:5173), then click **Play**. Use a desktop browser with WebGL and hardware acceleration. Changes to simulation, keyboard or track modules force a full development-page reload so React Fast Refresh cannot retain an older controller. If an already-open tab has reversed steering, reload it once to start a fresh simulation.

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
```

`npm ci` reproduces the checked-in lockfile. `preview` serves the production build, normally on port 4173. Both servers bind to loopback only.

## Controls

| Key | Action |
| --- | --- |
| W / ↑ | Accelerate |
| S / ↓ | Brake; continue holding to reverse |
| A / ← | Steer left |
| D / → | Steer right |
| R | Reset to the initial spawn, facing forward, with zero motion |
| Escape | Pause / resume |

Reset and pause/help buttons are also available. Tab navigates buttons, Enter/Space activates them, and the pause dialog contains keyboard focus. The game requests pause and clears held keys on window blur or document visibility loss; resume is explicit. After a head-on impact, reverse away or reset. Reset intentionally returns to the initial spawn in this milestone.

The HUD reports **km/h**, using one world unit as one meter (20 units/s = 72 km/h). The course map shows your location; there is no lap scoring.

## Implementation

- React 19.3 / stable R3F 9.8, Three.js 0.187, Vite 8, strict TypeScript, ESLint and Vitest. Versions and peers were checked against npm. Vitest 4 and TypeScript 5.9 keep Node 20 and the lint toolchain compatible. A minimatch override patches the development-tool glob advisory; the lockfile audit is clean.
- Pure simulation in `src/game/core/` and `src/game/kart/`, independent of React and Three.js. One normalized `KartInput` owns throttle, brake and steering. No separate physics engine competes for movement ownership.
- Fixed 60 Hz ticks, at most six catch-up steps / 100 ms, interpolated render poses, and cleared accumulation during pause/reset. Steering is speed-sensitive, with damped lateral slip and signed reverse speed.
- `sunshineCircuit.ts` is the sole track definition. `trackSampling.ts` builds an arc-length-resampled closed spline; rendering derives road/curbs/rails from those same samples. A conservative 1.8 m kart circle is projected inside the road corridor, removing outward velocity and retaining tangential motion. Invalid or distant states recover to spawn.
- Separate kart, track, environment and camera components. Wheels spin and front wheels steer. Scenery is instanced; DPR is capped at 1.5, and one filtered shadow light follows the kart. Camera position/look-ahead use delta-aware damping and reset together with the kart.
- React handles screen-level state. Simulation stays outside React state; HUD/map update at 10 Hz. Listeners, timers, procedural geometries and textures are cleaned up.

Important entry points: `src/app/App.tsx`, `src/game/config/kartConfig.ts`, `src/game/core/simulation.ts`, `src/game/kart/kartController.ts`, `src/game/kart/kartCollision.ts`, `src/game/tracks/`, `src/game/render/`, and `src/game/tests/`.

## Verification and limits

See [the milestone verification record](docs/MILESTONE_1.md) for commands, browser checks and remaining manual checks. Tests cover acceleration/coasting/brake/reverse, speed bounds, left/right steering, slip damping, fixed-step consistency, reset, keyboard cleanup, track continuity/non-intersection, rail impacts/sliding and full-circuit traversal in both directions through player inputs.

This is a flat-road free-drive prototype. There is no audio, drift/boost, AI, lap timing, items, mobile/gamepad input, persistence or network layer. A complete circuit is exercised headlessly; an uninterrupted human-driven browser circuit and Chrome/Firefox/Safari performance testing remain manual checks. Real OS focus-loss behavior also needs manual confirmation outside the automation browser. No measured 60 FPS or device-coverage claim is made.

R3F 9 currently constructs Three.js `Clock`, which Three.js 0.187 warns is deprecated. This is an upstream renderer warning; the kart's fixed-step simulation does not use that clock for integration. It is recorded, not suppressed.

Next: complete the manual browser matrix and tune handling with players, then begin Milestone 2's drift/mini-turbo and gamepad work. The original design and roadmap documents remain in the project root.
