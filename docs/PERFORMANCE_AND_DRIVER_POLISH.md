# Performance and driver polish — 2026-11-06

This maintenance pass changes decorative models and their preparation only. Handling, the shared collision capsule, drifting, boost, AI navigation, checkpoints, race rules, input composition and chase camera remain unchanged.

## What changed

- Added a reproducible offline GLB optimizer using the Meshopt simplifier bundled with the installed Three.js version. Nine generated derivatives live in `public/assets/optimized/`; the supplied files remain untouched. The registry now distinguishes `url` (runtime derivative) from `sourceUrl` (original inspection).
- Simplification bounds relative error at 0.0015, weights normals/UVs, locks open borders and silhouette extrema, then compacts complete vertex tuples. Tiny parts, skinned primitives and morph targets retain their topology. Node names/transforms, materials, encoded images, skeleton bindings and animation records remain intact. There is no simplification work or new WASM download in the game loop.
- Added static palette batching: compatible opaque, untextured PBR parts share a shader with their original linear colors stored per vertex. Textured parts, transparency, skins, morph targets and independent wheel transforms stay separate. Materials and source geometry are not mutated.
- Dropped unused intermediate fitted/painted/merged geometry from template ownership after batching. Independent racer objects/bones/wheel pivots still share immutable final buffers.
- Added per-kart hand-grip targets and a static driver-fitting adapter. It converts grip positions through the existing seat/driver transforms and fits the arms per combination. Approximate forearm/upper-arm lengths now reach those targets rather than retaining the wrong reach across differently sized cockpits.
- Protected connected head/neck/headphone islands in Arnold's unrigged model, including vertices duplicated at UV seams. The prior spatial-only arm filter stretched these into long sheets. Added a real-model regression verifying protected vertices retain their source shape while arms actually bend.
- Moved the Boat Kart seat rearward to meet its backrest; moved its visual hand target with it. Removed the separate non-driving SpongeBob accessory mesh from seated assemblies; original source portraits retain it.
- Workshop now shows seat axes plus orange hand targets, copies the grip configuration, and uses original files for raw inspection. Anchor edits intentionally move the already-fitted pose; use Restore defaults after changing registry data during HMR.

## Measured geometry / file budget

`docs/assets/optimization-report.json` records hashes, sizes, triangle counts and actual simplifier errors for each generated source.

| Selectable model | Source triangles | Runtime triangles |
| --- | ---: | ---: |
| Practice Kart | 7,696 | 7,320 |
| Go Kart 64 | 118,786 | 92,862 |
| DS Kart | 42,301 | 30,323 |
| Boat Kart | 29,964 | 29,948 |
| Mario | 36,482 | 25,736 |
| Aang | 36,746 | 23,884 |
| Arnold | 61,916 | 40,412 |
| SpongeBob | 43,720 | 28,726 |
| Crash | 36,672 | 23,836 |
| **All nine** | **414,283** | **303,047** |

Total selectable geometry falls **26.9%**. Combined runtime files fall from 34,778,404 to 31,225,536 bytes (**10.2%**). The Boat Kart changes little because its chassis is skinned and deliberately preserved; its derivative is 536 bytes larger. These totals describe registered files, not the visible triangle count of one frame. Unused source files remain available locally and are also copied by Vite; they are not downloaded by gameplay merely because they exist in public/.

## Browser performance check

In-app Chromium, same viewport/DPR, Sugar Rush Valley Quick Race, Mario + DS Kart, three distinct AI appearances, stationary start grid, paused before release. Read development `/?race-preview&render-stats` counters after warmup:

| Renderer counter | Before | After |
| --- | ---: | ---: |
| Submitted draw calls | 218 | 185 |
| Submitted triangles | 892,226 | 712,270 |
| GPU geometry objects | 159 | 134 |
| GPU texture objects | 29 | 29 |

This is **15.1% fewer calls** and **20.2% fewer submitted triangles**, including shadow passes. The earlier after-capture before unused-buffer pruning showed 136 geometry objects; the final capture shows 134. Texture count is unchanged: encoded source images/materials are preserved and the existing runtime 1024 px cap still applies.

Before sample: median 30.7 ms / p95 48.2 ms. After observed two-second windows: median 16.5–16.6 ms, p95 18.3–27.7 ms. Browser scheduling, compilation, concurrent tests and fitting captures affect these intervals. They are **not isolated GPU timings or a 60 FPS guarantee**. The >150-call prototype budget remains exceeded in this worst-case starting view. `polish-qa/before-grid.png` and `after-grid.png` preserve the comparison; stats also appear in the accessible DOM.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed, zero warnings.
- `npm run test`: **227 tests across 21 files passed**. Includes all existing simulation, drift/boost, steering, collision, AI, lap/cup/VS, keyboard/gamepad and phone relay/input regressions.
- `npm run build`: passed (718 modules).
- New offline checks validate all nine original hashes; node/material/texture/skin preservation; every output index and accessor length; byte-identical retained vertex tuples; and the aggregate triangle reduction.
- All **20 driver/kart combinations** loaded with textures in the workshop and were captured/reviewed. See `polish-qa/fits/` and `fits-contact-sheet.jpg`. Real-model tests check finite bounds, feet above the floor, independent instances and attachment through heading/roll/jump-parent transforms. Static wrist-reference tests cover all 16 generic fits; supplied-driver glove fitting retains separate source-specific logic.

Browser races completed on both courses with the existing QA autodriver supplying normal waypoint inputs; it does not alter positions, timing or lap state. Results are recorded below.

## Remaining art and device work

All five supplied racers remain **unrigged, with zero animation clips**. This is static mesh fitting, not a seated driving animation or runtime IK. Open palms, finger closure, exact steering-wheel contact and some clothing/cockpit intersections remain artist work. The Boat Kart's open cockpit/windscreen needs a proper authored wheel/hand pose; generic hand targets do not create missing geometry. SpongeBob's accessory removal is mesh-level; small prop details joined into the body can remain. Crash retains both supplied overlapping mesh shells. No claim of triangle-perfect contact or zero clipping is made.

For production driver art: separate or weight head/torso/arms/legs cleanly, pose the pelvis against each seat, author wrist/finger grips, and export a tested seated idle plus steering/drift/victory clips. Keep the same Y-up/+Z-forward meter convention and cosmetic-only transforms. Inspect the generated derivative against the source before accepting it.

Physical iPhone Safari, Android Chrome, Wi-Fi latency, hardware gamepad and human handling checks **remain unverified** in this environment. The automated phone/gamepad suite passing is not a physical-device test. Use `docs/PHONE_CONTROLLER.md` for HTTPS/LAN setup, then test neutral calibration/inversion, sensitivity/dead-zone smoothing, RTT under Wi-Fi load, phone blur/disconnect recovery, keyboard takeover, pause/reset, and a human lap on both courses. Do not infer physical tilt behavior from desktop browser automation.

## Rebuilding / adding assets

1. Keep the licensed source GLB under its existing source folder; do not overwrite it with a fitted export.
2. Add its relative path and desired reduction ratio to `sources` in `scripts/optimize-assets.mjs`. The script is intentionally limited to inspected, embedded-buffer GLBs with supported accessor layouts; sparse/compressed geometry needs explicit conversion first.
3. Run `npm run assets:optimize`. Commit the generated GLB and `docs/assets/optimization-report.json`. No new dependency install is required.
4. Set registry `url` to `/assets/optimized/...` and `sourceUrl` to the original. Add wheel definitions, uniform model transform, seat and symmetric right-hand `steeringGrip` in assembly meters. Keep colliders unchanged.
5. For an unrigged driver, configure the inspected static pose and optional driving-only hidden nodes. Use `armMeshes`/`protectComponentsAbove` only when the source topology warrants them. For genuinely rigged drivers, retain `pose: 'authored'` and map only existing compatible animation names.
6. Inspect every combo at `/?asset-preview`, including side/front/top and orange grip targets. Portraits use source poses; they do not establish cockpit fit.
7. Run typecheck/lint/test/build. Check both courses in a real browser with CPU traffic, steering, drifting/hops, reset and pause. Update credits and the source audit (`npm run assets:audit`, which excludes generated derivatives).

## Files in this pass

| Area | Added / changed |
| --- | --- |
| Offline generation | `scripts/optimize-assets.mjs`, `scripts/optimize-assets.test.mjs`, `scripts/audit-assets.mjs`, package `assets:optimize` script |
| Runtime assets | Nine `public/assets/optimized/**/*.glb` files; `docs/assets/optimization-report.json`; `public/ASSET_CREDITS.md` |
| Registry and assembly | `config/visualAssets.ts`, `render/KartAssembly.tsx`, `dev/AssetPreview.tsx` |
| Model preparation | New `render/models/driverFit.ts`, `paletteBatch.ts`, `poseRegions.ts`; updated `prepareModel.ts`, `modelInstances.ts`, `staticPose.ts`, `staticDriverPose.ts` |
| Regression coverage | `tests/visualPolish.test.ts`, updated `tests/assetRegistry.test.ts` |
| Documentation / evidence | This report, README/architecture/roadmap/scope notes and `docs/polish-qa/` |

Browser smoke: Sugar Rush Valley Quick Race, three laps, **2:21.664**, best **0:46.607**, **zero recoveries**. All four racer positions and lap results populated correctly; no captured console errors. Sunshine Circuit Quick Race, three laps, **2:14.674**, best **0:44.295**, **zero recoveries**. Its CPU field, ordered gates, standings and results also remained functional. Captured no render errors. Evidence: `polish-qa/sugar-race-result.png`, `sunshine-race-result.png`, and `sunshine-driving.png`. QA autodrive was disabled and the browser restored to the normal home route afterward. These automated-input runs do not replace human handling or hardware validation.
