# Milestone 3.5 — Asset integration and cosmetic garage

Current roster update (2026-11-16): Sonic replaces Aang. Five racers / four karts remain; four drivers are unrigged, Sonic uses a real 56-joint skin, and all have zero clips. The source table and initial milestone checks below document the original integration. See [Sonic integration](SONIC_INTEGRATION.md) for its unit normalization, static seated rig fit and selection migration.

Implemented 2026-11-05 in the existing Vite/React/R3F project. M1–M3 gameplay, controls, AI navigation, checkpoint/lap/race logic, collider dimensions and chase camera are preserved. This is a local prototype using supplied models with the user's explicit local-use permission. Embedded uploader license labels are recorded, not represented as independently verified franchise/public-release rights.

## Changelog

- Added typed `KartId`, `RacerId`, asset definitions and `VisualSelection`. Five racers and four karts produce 20 supported combinations; three other files have explicit exclusion reasons.
- Reused `KartVisual` and the original motion hierarchy. The kart and configurable seat/driver are siblings beneath the same bank/drift/jump/landing parent. No decorative mesh becomes a collider.
- Extended `prepareModel`: skeleton-safe cloning; source-axis baking only for static meshes; compound wheel pivots; independent left/right splitting of joined DS tires. Four tires spin and the front pair steer.
- Added an immutable fitted-template cache. Each racer owns independent object transforms, wheel pivots, cloned bones and animation mixer. Fitted geometry/materials/textures can be shared safely. Static siblings with identical materials/buffer layouts are merged; authored/animated hierarchies and skins are preserved.
- Retained GLTFLoader material/color-space behavior. Runtime texture copies larger than 1024 px are downsampled once and shared, with bounded anisotropy. Source files/cache scenes are not deformed or reparented. No remote decoders are enabled.
- Adapted Crash's specific zero-specular diffuse legacy material to its equivalent metallic/roughness + zero-specular material. Complex legacy spec/gloss materials fail with a conversion message rather than silently losing their appearance.
- Added per-racer static mesh fitting. These are approximate fixed poses, not skeleton rigs or animation clips. All supplied racers have zero skins and zero clips.
- Added an explicit animation map/independent mixer adapter for compatible future idle, left/right steering, leaning, drifting and victory clips. Missing mappings/clips fall back to idle/static. Animated authored preview clips request frames while active; static previews stop after the entrance motion. Pausing freezes the mixer. Supplied models do not pretend to use any of these clips.
- Added the animated garage dialog, native keyboard buttons, visible focus, reduced-motion support, actual 3D orbit previews, loading/error/retry UI, draft/cancel/apply and source credits.
- Added validated, versioned localStorage selection with corrupt/unknown-ID/storage-denial fallback. Appearance can change from the start menu or pause menu without restarting RaceSession, replacing Simulation, altering lap progress or changing handling.
- Replaced AI placeholders with the same GLB visual assembly. Three different racers and three different karts are allocated around the player's selection; Breeze/Nova/Moss retain their existing names, progress and AI profiles. AI visuals are not loaded in the menu/solo modes.
- Kept procedural gameplay fallback on model failure. A failed selection never prevents driving. Reload retries gameplay loads; the garage also has an explicit retry button.
- Extended development fitting tools with registry selectors, seat/driver transforms, raw/static comparison, axes, camera views and JSON output. Added raw recursive source inspection and optional renderer/frame-interval counters. Development routes/QA controls are excluded from production.
- Added the recursive audit command, embedded credits and real-asset regression tests. No dependencies were added or upgraded.

## Source audit and integrations

`npm run assets:audit` generates [the detailed audit](assets/asset-audit.json): all source paths and SHA-256 hashes, asset extras/license/source metadata, meshes/vertices/triangles, scene-space bounds and centers, embedded materials/images, texture dimensions, skins/joints, clips and estimated texture memory. Source GLBs remain byte-for-byte intact. `.DS_Store` is ignored. There are no environment objects or standalone animation files among the supplied assets.

| Registry ID | Source file under `public/assets/` | Triangles | Skins / clips | Integration |
| --- | --- | ---: | --- | --- |
| `supplied` | `characters/my-character.glb` | 36,482 | 0 / 0 | Mario, existing static leg/arm fit; scale 0.24 |
| `aang` | `characters/nickelodeon_kart_racers_3_aang.glb` | 36,746 | 0 / 0 | Static hip/knee/arm fit; scale 0.65 |
| `arnold` | `characters/nickelodeon_kart_racers_3_arnold.glb` | 61,916 | 0 / 0 | Static fit; scale 0.62; source headphones/expression retained |
| `spongebob` | `characters/nickelodeon_kart_racers_3_spongebob.glb` | 43,720 | 0 / 0 | Static fit; scale 0.75; source eyes/bubble wand retained |
| `crash` | `characters/crash_bandicoot_cartoon.glb` | 36,672 | 0 / 0 | Static fit; scale 0.85; compatible legacy material adapter; overlapping source shells retained |
| `practice` | `karts/my-kart.glb` | 7,696 | 0 / 0 | Existing inspected fit, four wheel pivots; scale 1.5 |
| `go64` | `karts/go_kart_64.glb` | 118,786 | 0 / 0 | Source forward is −Z; yaw π and scale 16.5; compound wheel parts grouped into four pivots |
| `ds` | `karts/mario_kart_ds.glb` | 42,301 | 0 / 0 | Scale 12; left/right tire pairs split by disconnected triangle side; compact seat mount |
| `boat` | `characters/nickelodeon_kart_racers_3_spongebob_boat_kart.glb` | 29,964 | 1 / 0 | A kart despite its folder; scale 0.48; original 20-joint chassis skin retained, four static wheel pivots |

All fitted assemblies use meters, +Y up and +Z forward. Per-source world transforms, wheel pivots, grounding offsets and seat anchors are explicit in the registry; raw GLB origins differ substantially. The same 1.8 m planar collision radius remains in force. A source kart's wheel radius affects visual spin only.

### Excluded files and external cleanup

| File | Reason / next action |
| --- | --- |
| `karts/kart_2.glb` | Byte-identical duplicate of Go Kart 64. Use canonical `go64`; do not load another copy. |
| `karts/kart_3d.glb` | 85,668 triangles, complex `KHR_materials_pbrSpecularGlossiness`, approximately 149.34 MiB uncompressed source RGBA textures with mipmaps. Needs Blender/material conversion to metallic/roughness and texture cleanup. Raw inspection reports the conversion requirement; it is not selectable. |
| `karts/standard_kart_from_mario_kart_world.glb` | 560,980 triangles, 46 meshes, length along X. Needs a lower-detail export before use in a four-racer game; not selectable. Raw inspection remains available. |

No supplied racer is rigged. Static vertex bending is a practical visual fit, not production-quality skinning: open palms do not grip every steering wheel, source accessories/expressions remain, and some small cockpit/seat intersections can require authoring cleanup. The boat's high hull intentionally obscures legs. A professional pass should remove/replace the bubble wand and unwanted baked accessories, create arm/hand and hip/knee bones with proper weights, author a seated bind/idle pose and compatible driving/lean/celebration clips, and fit each cockpit in Blender. No seated animation, facial animation or finger articulation is claimed.

Full embedded uploader/author/source/license credits are available in [public/ASSET_CREDITS.md](../public/ASSET_CREDITS.md) and from the garage. No copyright or licensing assertions are inferred from file names alone.

## Important files

- `src/game/config/visualAssets.ts`, `visualSelection.ts`: registry, transforms, poses, capabilities/exclusions, persistence and AI cosmetic allocation.
- `src/game/render/KartAssembly.tsx`, `KartVisual.tsx`, `OpponentVisuals.tsx`: shared attachment hierarchy and independent rendered instances.
- `src/game/render/models/{prepareModel,staticPose,modelInstances,assetLoader,driverAnimation}.ts`: fitting, pivots, skeleton preservation, immutable sharing, texture/static-mesh optimization, compatibility and clips.
- `src/game/ui/{RacerSelection,GaragePreview}.tsx`, `src/styles/garage.css`: garage flow, 3D previews and accessible animated UI.
- `src/app/App.tsx`, `src/game/render/{runtime,GameCanvas}.ts*`, start/pause menus: cosmetic-only application and scene suspension.
- `src/game/dev/{AssetPreview,AssetInspection,RenderStats}.tsx`: development tools.
- `scripts/audit-assets.mjs`, `docs/assets/asset-audit.json`, `src/game/tests/assetRegistry.test.ts`: reproducible audit and asset/regression checks.

## How to add a future GLB

1. Confirm appropriate usage rights and retain source/author/license metadata. Put a separate kart/driver GLB under `public/assets/karts` or `characters`; avoid embedding a second driver in a kart.
2. Export glTF 2.0 with supported metallic/roughness materials. Prefer ≤1024 px texture atlases and substantially lower geometry than the excluded 561k-triangle kart. Avoid textures, lights or hidden meshes unrelated to the asset.
3. Run `npm run assets:audit`. Inspect raw bounds, origin, axes, material support, mesh names, skins and actual clips at `/?asset-inspect`.
4. Add a unique registry key/ID. For karts, configure transform, grounding, seat anchor, four wheel definitions and visual wheel radius. `nodes` groups compound wheels; `side` splits a joined tire pair only when triangles are disconnected across X=0. Do not change collision dimensions to fit art.
5. For a seated, rigged racer use `pose: 'authored'`; preserve its hierarchy. Map only exact, inspected compatible seated clip names in `clips`. For unrigged art provide an inspected static pose fit or author a seated mesh externally; do not relabel standing/walking clips as driving.
6. Use `/?asset-preview` to test every kart/racer combination from side/front/top; adjust transforms/seat settings and copy JSON into the registry. Align hips with the seat, feet inside the cockpit above the road, and hands near the actual wheel. Verify at speed, during drift/hop/landing/reset and when paused.
7. Add/extend real-asset tests, credits and exclusions. Run `typecheck`, `lint`, `test`, `build`, then exercise the production preview. New IDs automatically join the garage/AI cosmetic pool; ensure at least four karts and racers for distinct traffic choices.

## Verification

- `npm install`: passed, existing dependencies up to date; no peer dependency changes.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run test`: **109 tests / 12 files passed**. The original 78 gameplay tests remain, including full Quick Race/Time Trial, all AI finishes, lap validation, traffic/rails, drift tiers, hops, pause/reset/input and FPS consistency.
- 31 new tests cover all 20 real-GLB combinations, four wheels/grounding/collider containment for each kart, preserved source scenes, independent boat skeletons/pivots with shared immutable buffers, selection validation/storage failures, distinct AI allocation, explicit clip/mixer isolation/pause, duplicate detection and exact-vs-unsupported legacy materials.
- All 20 combinations loaded and were inspected in the browser fitting tool. Saved evidence is in `docs/assets/qa/`; fit screenshots document approximate static poses, not a claim of exact skin/hand/seat collision-free authoring.
- Production preview passed model loading/material/skeleton/garage smoke checks; manual throttle reached 48 km/h and Escape paused. Garage Escape returned to the paused dialog without resuming. No gameplay errors were logged; only the upstream Three.Clock warning. Evidence: `docs/assets/qa/production-garage.png`.
- Manual development checks confirmed throttle, reverse (20 km/h), reset to zero speed, hop/drift attachment, and release Spark turbo (70 km/h). Hop evidence: `docs/assets/qa/hop-attached.png`.
- Raw inspection loaded the high-detail World kart and contained the expected legacy-material conversion error for `kart_3d.glb`. That intentional excluded-source inspection logs the rejection; it is separate from the clean gameplay console.
- SHA-256 verification confirmed all 12 source GLBs and the existing core/kart/race/AI/input/tuning/camera files are unchanged. Finder metadata (`.DS_Store`) is ignored.
- Selection was applied from the start menu and survived a browser reload. During lap 2, a pause-menu change from Crash/Go Kart 64 to Aang/Boat Kart preserved race time **1:11.183**, lap 2, position 1/4 and next gate 7/11. Resume continued that same race.

- A full browser Quick Race finished **1/4 in 2:14.668**, laps **46.074 / 44.294 / 44.300 seconds**, with **zero recoveries** after the mid-race cosmetic switch. Results evidence: `docs/assets/qa/race-results.png`. Console: only the existing upstream Three.Clock deprecation warning.

### Performance design and measurement limits

The fitted-template cache avoids duplicating deformed buffers per racer; SkeletonUtils isolates mutable object/bone state. Static same-material/layout parts merge without flattening skins or authored animation tracks. GPU texture copies cap the largest dimension at 1024, retain color-space/UV/wrapping settings and share across instances. Original decoded source images remain in the GLTF cache for the page lifetime; this is not KTX2 compression or an on-disk asset optimization. All source bytes still ship with the local project, including excluded files.

The garage/fitting/raw canvases render on demand. The main scene stops rendering behind the garage; physics was already paused/menu-owned. AI assets load only in Quick Race. One game shadow light and bounded DPR/shadow resolution remain unchanged. The dense World kart is excluded rather than multiplied across opponents.

Development `?render-stats` reports renderer counts and rolling frame intervals, including browser scheduling. A local Quick Race sample with Crash/Go Kart 64, three distinct GLB rivals and normal-input driving showed **119–122 draw calls, approximately 445k triangles, 229 resident geometries, 27 textures, median 16.7 ms and p95 17.5–17.7 ms** at the sampled road views. These are local, camera-dependent samples; frustum/shadow culling affects counts, resident counts include cached assets, and frame intervals are not isolated GPU timings. They do not establish cross-device/browser 60 FPS. Browser-specific hardware/controller/listening and lower-end performance checks remain manual.

The existing upstream Three.Clock deprecation warning from R3F is recorded and not suppressed. No physics migration, AI tuning, lap/race change, collider resize, backend, items or new gameplay system was introduced.
