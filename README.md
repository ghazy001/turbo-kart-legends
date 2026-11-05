# Turbo Kart Legends

A desktop-browser arcade kart prototype. **Milestone 3** adds three-lap Quick Races against three AI rivals, solo Time Trials, a countdown, ordered checkpoints, lap/split timing, live standings and race results. Free Drive and all M2 drifting, turbo, hops, audio and controller features remain available on Sunshine Circuit.

The current local prototype uses the user-supplied kart and character GLBs. Scenery, track, AI kart/driver art and audio remain procedural. The supplied character is recognizable franchise art, used locally by explicit user choice. Source credits, fitting limitations and the original-art release requirement are recorded in [asset integration](docs/ASSET_INTEGRATION.md). No remote asset service, backend or account is required.

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

## Kart and driver assets

Drei loads both GLBs into a reusable visual assembly, with animated wheel pivots and a configurable driver seat anchor. The driver follows all kart turns, drifts, hops and landing feedback. Imported meshes stay separate from colliders; original kart handling and camera tuning remain intact. The supplied character has no skeleton or animation clips; its approximate seated mesh pose is static, with hands near the wheel. It needs Blender rigging and animation for proper driving/grip motion.

Edit `src/game/config/visualAssets.ts` for kart/driver URLs, scale, rotation and seat offsets. During development, open `/?asset-preview` for a fitting workshop with orbit controls, original-model inspection, anchor axes and position/rotation/scale inputs. Copy the resulting settings into the config to save them. This view is excluded from production. If model loading fails, the game displays a notice and uses the original procedural kart. See [the model audit and verification](docs/ASSET_INTEGRATION.md).

## Race modes

Choose a mode on the menu, then click **Play**:

- **Quick Race:** three laps against Breeze, Nova and Moss. Karts wait through 3–2–1; hold throttle to launch at GO. Rivals have distinct colors, target speeds, traffic avoidance and limited catch-up through normal inputs.
- **Time Trial:** the same validated three-lap run without opponents. Race time, current/best lap and checkpoint splits appear in the HUD. Best lap is for the current run; no record is persisted yet.
- **Free Drive:** untimed M2 driving, with no opponents or lap validation.

Cross all 12 gates in order and in the forward direction. Green road-edge chevrons indicate the next required gate; poles/flags mark checkpoints. The finish line is checkpoint zero, aligned with the painted stripe. A reverse crossing, skipped gate, crossing outside the road or an implausible teleport cannot award a lap. A sustained wrong-way warning gives recovery guidance.

During a race, **R / Reset** returns to the last validated checkpoint with zero speed; time continues and no gate/lap is awarded. Before the first start crossing it returns to your grid slot. In Free Drive it retains the original spawn reset. Pause freezes the countdown, every racer, boosts and timing. **Pause → Restart session** starts a fresh countdown; **Race again** on results does the same. Results show your three lap times, best lap, total time and final position. Rivals still driving when you finish are labeled **On track**, with no invented finish times. Finished AI leaves the active circuit so it cannot obstruct the finish.

## Controls

| Key | Action |
| --- | --- |
| W / ↑ | Accelerate |
| S / ↓ | Brake; continue holding to reverse |
| A / ← | Steer left |
| D / → | Steer right |
| Space | At speed, hop; hold with steering to drift; release to trigger a charged mini-turbo |
| R | Recover to the last validated gate in a race; reset to spawn in Free Drive |
| Escape | Pause / resume |

Reset and pause/help buttons are also available. Tab navigates buttons, Enter/Space activates them, and the pause dialog contains keyboard focus. The game requests pause and clears held keys on window blur or document visibility loss; resume is explicit. After a head-on impact, reverse away or reset. Race recovery returns to the last validated gate; Free Drive reset returns to the initial spawn.

Use the Sound on/off button to mute or enable synthesized driving cues. Audio unlocks after Play or another explicit user gesture.

The HUD reports **km/h**, using one world unit as one meter (normal top speed: 72 km/h). The course map shows the player and active rivals. Race modes also show validated laps, position and timing.

## Drift and mini-turbo

1. Reach at least **27 km/h**. Start steering, then press and hold Space to hop into a drift.
2. Charge builds after landing while you keep steering. Steer into the drift to tighten it; countersteer to widen it. The drift stays in its original direction until released.
3. Release Space when a tier is ready. Keep W/↑ held to accelerate through the boost.

| Tier | Grounded charge | Boost duration | Speed cap |
| --- | --- | --- | --- |
| 1 · Spark | 0.65 s | 0.65 s | 86.4 km/h |
| 2 · Surge | 1.50 s | 1.05 s | 93.6 km/h |
| 3 · Flare | 2.60 s | 1.50 s | 100.8 km/h |

These are caps, not an instant speed jump. The HUD, sparks and exhaust color show the tier. Braking, rail contact, insufficient speed, or stopping steering cancel charge. Pause clears a charging drift without paying out; an already-active boost freezes with the simulation. Reset clears everything. Boosts cannot be refreshed by holding Space: finish the boost/recovery interval and make a new drift press. Hops never bypass the road barriers.

## Gamepad (optional)

Connect a standard-mapped controller, press a controller button if your browser requires it, and click Play. Left stick/D-pad steers; RT accelerates; LT brakes/reverses; bottom face button (A/cross) or RB drifts; Menu/Start pauses; View/Select resets. Release held triggers/buttons after connection, pause or reset before driving again. Keyboard steering takes priority if both devices are used. Disconnection requests pause. Physical-controller testing remains required; normalization, deadzone, action edges and neutral gating are unit-tested.

## Implementation

- React 19.3 / stable R3F 9.8, Drei 10.7.9, Three.js 0.187, Vite 8, strict TypeScript, ESLint and Vitest. Versions and peers were checked against npm. Vitest 4 and TypeScript 5.9 keep Node 20 and the lint toolchain compatible. A minimatch override patches the development-tool glob advisory; the lockfile audit is clean.
- Pure simulation in `src/game/core/` and `src/game/kart/`, independent of React and Three.js. One normalized `KartInput` owns throttle, brake, steering and drift for keyboard/gamepad adapters. No separate physics engine competes for movement ownership.
- Fixed 60 Hz ticks, at most six catch-up steps / 100 ms, interpolated render poses, and cleared accumulation during pause/reset. Steering is speed-sensitive, with damped lateral slip and signed reverse speed.
- `sunshineCircuit.ts` is the sole track definition. `trackSampling.ts` builds an arc-length-resampled closed spline; rendering derives road/curbs/rails from those same samples. A conservative 1.8 m kart circle is projected inside the road corridor, removing outward velocity and retaining tangential motion. Invalid or distant states recover to spawn.
- Separate kart, track, environment and camera components. Wheels spin and front wheels steer. Scenery is instanced; DPR is capped at 1.5, and one filtered shadow light follows the kart. Camera position/look-ahead use delta-aware damping and reset together with the kart.
- React handles screen-level state. Simulation stays outside React state; HUD/map update at 10 Hz. Listeners, timers, procedural geometries and textures are cleaned up.
- `driftConfig.ts` centralizes thresholds, caps, boost durations and hop tuning. `driftController.ts` owns charge/release/recovery and `jumpController.ts` owns ballistic vertical movement. `KartEffects.tsx` uses pooled sparks and lightweight exhaust geometry; `DrivingAudio.ts` synthesizes original cues and releases one-shot audio nodes. No new dependencies were needed for M2.

Race entry points: `src/game/race/RaceSession.ts`, `raceProgress.ts`, `trackProgress.ts`, `racerCollision.ts`, `src/game/ai/waypointController.ts`, `src/game/config/raceConfig.ts`, and `src/game/ui/{RaceHUD,ResultsMenu}.tsx`. Development-only `/?race-preview` adds normal-input autodrive for end-to-end browser checks. It does not teleport or skip validation and is excluded from production.

Important entry points: `src/app/App.tsx`, `src/game/config/kartConfig.ts`, `src/game/core/simulation.ts`, `src/game/kart/kartController.ts`, `src/game/kart/kartCollision.ts`, `src/game/tracks/`, `src/game/render/`, and `src/game/tests/`.

## Verification and limits

See [M3 verification](docs/MILESTONE_3.md), [GLB integration verification](docs/ASSET_INTEGRATION.md), [M2 verification](docs/MILESTONE_2.md) and the [historical M1 record](docs/MILESTONE_1.md). Tests cover movement, steering direction, drift tiers, boost limits/recovery, hop/landing, pause/reset cancellation, keyboard/gamepad input, audio lifecycle, fixed-step consistency, track continuity/non-intersection, rail impacts/sliding and full-circuit traversal through player inputs.

This is a flat-road racing prototype with drift-entry hops; it has no ramps or terrain jumps. There are no items, mobile input, persisted records or network layer. Full three-lap Time Trials, Quick Races with traffic and all three opponents finishing are exercised headlessly. Browser verification and remaining device/manual checks are recorded in the M3 notes. Higher-tier human drift tuning, listening checks and Chrome/Firefox/Safari performance testing remain manual. Real OS focus-loss behavior also needs manual confirmation outside the automation browser. No measured 60 FPS or device-coverage claim is made.

R3F 9 currently constructs Three.js `Clock`, which Three.js 0.187 warns is deprecated. This is an upstream renderer warning; the kart's fixed-step simulation does not use that clock for integration. It is recorded, not suppressed.

Next: complete the manual browser/controller/listening matrix and human race/AI tuning, finish the original seated driver art, then begin Milestone 4's original items and combat. The original design and roadmap documents remain in the project root.
