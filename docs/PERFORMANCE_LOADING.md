# Rendering and race preparation — 2026-11-19

This pass changes loading and rendering ownership only. Handling, fixed stepping, drift/boost/item formulas, AI decisions, checkpoints, collision dimensions, race/cup scoring, trial eligibility, input mappings and camera tuning are unchanged. No source models, textures, placements or dependencies were replaced.

## What changed

- **Lighter first Home:** App defers mounting/importing GameCanvas until an actual session launches. The initial Home has only its existing selected-subject preview, rather than also preparing the entire Sunshine race behind it. Once created, the race renderer is retained and suspended in menus/results as before.
- **One source cache key:** KartAssembly and its preloader now request each GLB by its individual URL, matching portraits and previews. Previously an array key for each kart/driver pair could decode the same source again for different combinations. Source/template caching remains shared; independent scene/skeleton clones, fits and wheel transforms remain per actor.
- **Targeted prefetch:** Options/review prefetch the confirmed player, three actual rival appearances, selected course models/LOD and enabled item models after a cancellable 150 ms delay. Other courses and preserved source archives are not prefetched. In-flight shared GLTF requests can complete after leaving setup; they stay cached, without releasing a race.
- **Full readiness barrier:** Player/CPU assemblies, course scenery and all three imported item visuals must commit or explicitly fail. Solo modes do not wait for rivals/items. Loading is empty, never a temporary procedural kart/weapon; existing error fallbacks and failure notices remain available.
- **GPU preparation:** Under the hidden Canvas, collect unique material/shader textures, upload at most three per animation-frame batch, use Three's `compileAsync`, then make one hidden draw to upload off-camera geometry/shadow variants. Zero-count instances temporarily submit one entry. Visibility, culling flags, counts and matrices are restored in `finally`, including on errors. Instance/color attributes are allocated before compilation to avoid later shader-define changes. Two subsequent paint opportunities precede the reveal. This reduces deferred first-use work; it cannot eliminate every browser/driver stall.
- **Professional loading screen:** Shared startup/race presentation uses the approved coastal teal, cream and warm yellow palette, real asset-count/progress phases, reduced-motion styling, a brief reveal and a Back to menu action. The portal blocks underlying focus, traps Tab, supports Escape/Backspace and restores focus on exit. Graphics errors offer Reload/Back. The race clock/audio/input remain held until preparation/reveal complete; the first released delta is discarded.
- **Less repeated scenery work:** Each asset/LOD computes one visible set shared by all its material batches. Immutable instance matrices/colors are precomputed; batches upload only when visible membership changes. Existing frustum/distance/LOD rules, object counts, silhouettes and placement transforms are retained.
- **Private resource cleanup:** Shared geometry/materials stay cached, but unmounted scenery/item instances explicitly release their private matrix/color buffers. Kart/racer/portrait clones release their own skeleton textures without touching other actors or cached sources. This closes resource leaks hidden by `dispose={null}` while retaining fast source reuse.
- **Bounded GPU cost:** Race shadows honor the existing central 1024² budget rather than overriding it to 2048² (one quarter as many shadow texels). Lights/casters/receivers remain. Menu canvases explicitly use supported PCF shadows instead of the removed soft-map enum.
- **Adaptive resolution:** During active racing only, sustained slow frame intervals lower DPR in steps down to 1; sustained fast intervals raise it toward the initial native/capped maximum of 1.5. Two-second median windows, startup grace and ten-second cooldown prevent rapid oscillation. Loading, pause, backgrounding and suspension outliers do not trigger adjustments. Canvas's declared DPR follows these changes, so React renders cannot silently reset it. No objects/effects are removed, and simulation speed is unaffected.
- **Graphics interruption:** WebGL context loss neutralizes input, pauses and silences the race; restoration re-enters preparation and leaves the game paused for deliberate Resume. Listeners, reveal timers and preparation callbacks clean up. Old aborted preparation cannot release a replacement course.

## Important files

- `src/app/App.tsx`, `src/main.tsx`: deferred scene and shared startup fallback.
- `src/game/ui/LoadingScreen.tsx`, `src/styles/loading.css`: accessible loading presentation.
- `src/game/render/GameCanvas.tsx`, `SceneWarmup.tsx`, `GraphicsContextGuard.tsx`: race readiness and lifecycle ownership.
- `src/game/render/models/sceneWarmup.ts`, `RaceAssetLoading.ts`, `racePreload.ts`: preparation, settlement and targeted cache warming.
- `src/game/render/KartAssembly.tsx`, `ItemVisuals.tsx`, `CombatModels.tsx`, `models/modelInstances.ts`, `src/game/ui/selection/SelectionModel.tsx`: consistent source keys, imported-item readiness and private-buffer/skeleton cleanup.
- `src/game/render/EnvironmentAssetScenery.tsx`, `models/SceneryVisibility.ts`: shared culling and conditional uploads.
- `src/game/render/AdaptiveQuality.tsx`, `models/AdaptiveResolution.ts`, `src/game/config/performanceConfig.ts`: rendering-only budgets.
- `src/game/tests/performanceLoading.test.ts`, `raceAssetLoading.test.ts`: behavioral regressions.

## Browser verification

A separate hidden localhost development tab used the existing normal-input QA driver; it did not inject positions, progress or race outcomes. Original user tabs were preserved, and the QA tab was closed afterward.

| Check | Observed result |
| --- | --- |
| Initial Home | One preview Canvas, no mounted race Canvas/render-stats output |
| Sunshine VS / 1 lap / Hard | Finished 0:49.617; 8 pickups, Spark Bolt, shields, Turbo Charge; player 3 boosts / 1 jump / 1 landing |
| Sugar Rush VS / 1 lap / Hard | Finished 0:41.627; 5 pickups, bolt, 2 traps, shield and block |
| Frostbite VS / 1 lap / Hard | Finished 0:47.860; 7 pickups, bolt, 2 traps, 4 shields and block |
| Volcano VS / 1 lap / Hard | Finished 0:43.843; 6 pickups and 5 shields; three CPUs classified |
| Loading | Sunshine displayed 0/16 slots; Sugar/Frostbite/Volcano displayed texture preparation; solo clock read 0:00.000 while preparation was visible |
| Cancel/re-enter | Canceled Frostbite during texture preparation, returned to usable Home with focus, then loaded and finished a new Frostbite race |
| Warm restart | Race again returned to READY 3 / 0:00.000 with loaded actors |
| Pause/Home | Pause stopped the race and Back to menu remained usable after warm restart and solo check |
| Time Trial | Solo three-lap HUD, no item slot/opponents/pickups; boosts/jump/landing still worked; exited before finish, without creating a QA record |
| Production preview | Built Home/setup and two Sunshine launches with Sonic/Boat Kart rendered after repeated scene/preview disposal; no QA controls shipped |
| Console | No error-level logs in the QA tab; existing dependency `THREE.Clock` deprecation remains |

Captures and actual DOM snapshots are in [performance-qa](performance-qa/). [Loading](performance-qa/loading.jpg), [Sugar scenery/traffic](performance-qa/sugar-racing.jpg), [Frostbite](performance-qa/frostbite-racing.jpg).

### Timing observations, not a controlled speedup claim

At 1422×800 CSS pixels, DPR 1.5, the last live-frame sampling windows retained at results were:

| Course | Calls | Submitted triangles | Median / p95 frame interval |
| --- | ---: | ---: | --- |
| Sunshine before | 246 | 931,341 | 16.7 / 27.1 ms |
| Sunshine after | 163 | 533,927 | 18.0 / 26.4 ms |
| Sugar after | 191 | 416,848 | 18.2 / 33.8 ms |
| Frostbite after | 143 | 232,908 | 16.7 / 18.4 ms |

Different camera/traffic positions, random item seeds, idle time before enabling autodrive and overlapping development/build work make these **unsuitable for percentage FPS/draw-call improvement claims**. Calls include shadow passes; intervals include browser scheduling, not GPU time. The observed runs did not trigger a DPR downgrade; adaptation/hysteresis are unit-tested. Newly warming off-camera geometry can increase the initial geometry counter: it moves work before the race instead of removing scenery. A production build on target hardware is the next meaningful performance baseline.

## Automated verification

Typecheck, zero-warning lint, full tests and production build are required for this pass. The added tests cover sustained-resolution changes/recovery/outliers, unchanged LOD/frustum membership, shared-upload versions and independent course state, texture deduplication/batching, cancellation during late compilation, GPU failure and exact restoration after a failed hidden draw, and private bone/instance disposal that preserves shared assets. The item barrier regression prevents starting before a not-yet-used weapon settles. The first full run passed **517 tests / 44 files in 158.62 s**. After the final private-resource cleanup, the focused loading/model suite passed **57 tests**; typecheck, lint and production build passed. **Final full suite: 519 tests / 44 files passed in 146.00 s.** `npm run typecheck`, `npm run lint`, `npm run build` and `git diff --check` passed on the final changes. The final production build transformed 814 modules; the separate GameCanvas chunk is 83.66 kB / 25.16 kB gzip. See [actual final test output](performance-qa/tests-final.txt).

## Limits and next checks

- No physical low-end device, hardware gamepad, phone tilt/Wi-Fi, forced WebGL context loss, throttled network or broad Safari/Firefox matrix was tested in this pass. Context-loss recovery is implemented but remains a hardware/browser QA item.
- Source parsing, static fitting and each GPU submission can still briefly occupy the main thread. Compile parallelism depends on browser/driver support. Loading is intentionally allowed to take longer so preparation happens before driving.
- Shared caches retain visited sources/fitted templates. Existing runtime derivatives/texture caps are unchanged. This is not an unlimited-memory streaming/eviction system; public source archives still contribute to deployment size without being requested by gameplay.
- Keep dev tools closed for representative play. Use `npm run build && npm run preview` for production behavior; dev QA flags are stripped from production. `npm run dev` plus `/?race-preview&render-stats` exposes the existing input-driven regression controls and frame diagnostics.
- Next: record repeatable production CPU/GPU traces and long-session memory on the intended desktop/laptop/browser targets, then choose any further mesh/material budgets from those traces. No universal 60 FPS or zero-stutter guarantee is claimed.
