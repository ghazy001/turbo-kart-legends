# Sugar Rush Valley — supplied scenery pass

## Result and scope

The unchanged 714 m course now runs through a small candy market: Sugarcube Corner shop landmarks, cotton-candy stands, parked ice-cream trucks, lollipop gardens, static mascot landmarks and one complete gas station. Curated source-envelope spacing leaves the inside chicane readable. Buildings stand on low matching paved supports; the truck serving windows and shop fronts face the course. Repeated gardens vary in scale, yaw and setback.

The road gains textured asphalt, pink/cream curbs, a cream verge and center markings sampled from its actual rendered ribbon. Soft pastel ground, cooler sky/fog, warm sunlight and a 2048 shadow map replace the old primitive candy-tree field. Distant original hills/clouds and the existing start area remain.

This is scenery and road presentation only. The sampled layout, road height/width, collider dimensions, steering/drift/boost formulas, camera, AI, checkpoints, item rules, records and cup order are unchanged. No new jumps, shortcuts, hazards or mascot animations are introduced. Sunshine retains its own eight assets/nine loading slots; Frostbite and Volcano load none of these models.

## Model inspection and provenance

Five new supplied files are preserved byte-for-byte under `public/assets/environment/`; the already integrated `lowpoly-gas-station.glb` is reused and matches the newly supplied file byte-for-byte. Embedded credits remain in originals and runtime GLBs. See [complete attribution](../public/ASSET_CREDITS.md), [source audit](assets/environment-audit.json) and [derivative report](assets/environment-optimization.json).

| Registry ID | Source triangles | Runtime triangles | Runtime bytes | Texture cap | Material batches |
| --- | ---: | ---: | ---: | ---: | ---: |
| cotton-candy-stall | 4,378 | 4,378 | 644,068 | 512 | 12 |
| ice-cream-truck | 13,852 | 11,914 | 707,304 | 1024 | 1 |
| lollipops-pack | 2,640 | 2,640 | 347,076 | 512 | 2 |
| sugar-mascot | 5,392 | 5,392 | 872,380 | 512 | 1 |
| sugarcube-corner | 10,639 | 10,457 | 2,099,104 | 1024 | 1 |
| lowpoly-gas-station | 31,370 | 27,786 | 3,661,660 | 1024 | 5 |

Texture caps reduce GPU image memory; they do not guarantee smaller compressed files. In particular the stall derivative is slightly larger than its source. All copies of each model reuse static per-material geometry/textures and instancing, with distance/frustum compaction. No per-frame geometry/material allocation is added.

All six visible models are static and have zero clips. The mascot declares one skin and contains 56 bones, but its mesh has no skin binding or joint attributes: its skeleton is unused. Its supplied pose is preserved. Sugarcube includes two tiny line segments; the mesh-only batch omits these while preserving both source and derivative data. No full supplied asset is unsupported.

The stall and lollipops use legacy diffuse-only specular/glossiness materials handled by the existing compatible loader. The lollipops' nearly opaque material becomes opaque for stable instancing. Truck, mascot and shop materials get restrained matte settings; station glass retains authored transparency. Base-color color space and normal/roughness data follow the GLTF loader. Precise transformed vertex bounds in the registry correct inflated stall/mascot exporter boxes that otherwise caused floating. Audit `min/size` fields retain the conservative GLTF object boxes; they are not the precise fitting values for those two sources.

Cotton Candy Stall declares **CC BY-NC 4.0**. Lollipops Pack and Sugarcube Corner declare **Sketchfab Standard**. Other new assets declare CC BY 4.0. These are embedded uploader declarations, not independently verified public/commercial-release rights; retain this distinction when preparing a release.

## Files and extension points

- `src/game/config/environmentAssets.ts`: source bounds, scale, facing, runtime paths, distance budgets and course-specific readiness IDs.
- `src/game/tracks/sugarScenery.ts`: deterministic placements and matching paved supports. Whole envelopes stay at least 8 m from the road edge; conservative bounding circles keep props separated.
- `src/game/render/{EnvironmentAssetScenery,SugarScenery}.tsx`: shared static batching/loading/error boundaries and Sugar paving. `SunshineAssetScenery` remains a thin course-specific wrapper.
- `src/game/render/models/environmentModel.ts`: immutable material/buffer preparation.
- `src/game/render/{Environment,TrackVisual,GameCanvas}.tsx`: course composition, road styling and race-loading integration.
- `scripts/{inspect-environment,optimize-environment,optimize-assets}.mjs`: reproducible inspection/derivatives and mode-aware triangle accounting (line segments are not triangles).
- `src/game/tests/{sugarScenery,environmentScenery}.test.ts`: course isolation, clearance, loading failure, static-model capability and real-buffer fitting regressions.

For another GLB, preserve its original and credits first. Inspect axes, actual vertex bounds, material extensions, bound skins and clips; add an explicit registry entry and optimizer job. Place it through the course layout's clearance checks, include its course loading ID, regenerate with `npm run assets:environment`, then inspect `/?asset-inspect` and a real race. Never add decorative model bounds to gameplay colliders.

## Running and verification

Run `npm install && npm run dev`, then select **Quick Race → Racer → Kart → Sugar Rush Valley → Review → Start race**. Existing keyboard/gamepad/phone controls remain. `/?race-preview&render-stats` exposes development-only normal-input autodrive, item-use counters and renderer samples.

Source hash comparisons, all five source-model visual inspections, real optimized-buffer floor/size checks and 54 focused regressions passed. Final checks: `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` and the full `npm run test` suite passed: **452 tests across 38 files**, 191.79 seconds. The full suite ran alone under `caffeinate` with loopback permission for existing Socket.IO tests. `npm run assets:environment` generated the checked-in inspection/derivative reports; no dependencies changed. Production app chunk: 269.49 kB / 87.06 kB gzip.

Browser verification (local in-app browser): selected the course through normal setup, waited for the complete loading barrier, then used development autodrive and item-use switches, which feed the existing normalized input path. Completed three laps in **2:21.714**, first of four, **zero recoveries**, with all twelve gates per lap validated. Rivals reached lap three; on-track rivals correctly have no invented finish time. Item counters recorded 16 pickups, one shot, eight guards, four turbos and one shield block. Checked models sit on the ground/supports and leave the road unobstructed. Browser error log was empty; existing Three Clock/PCFSoftShadowMap deprecation warnings remain outside this pass.

Representative moving samples: 136 calls / 427,928 triangles / 68 textures, median 16.8 ms and p95 27.2 ms; another view showed 118 calls / 368,914 triangles, median 16.7 ms and p95 17.5 ms. Counts include the whole scene and shadow passes, vary by view, and do not measure mobile performance or prove a sustained 60 FPS budget. Proof: [market drive](design-qa/sugar-rush-assets/market-drive.png), [classified results](design-qa/sugar-rush-assets/race-results.png).

Remaining work: human handling/art feedback, target-device/browser profiling, and public-release licensing review. The local renderer samples are observations, not a cross-device FPS guarantee. Future art polish could add authored terrain/ground detail; additional gameplay features should be a separate scoped change.
