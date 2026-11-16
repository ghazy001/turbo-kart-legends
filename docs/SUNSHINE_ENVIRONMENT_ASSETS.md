# Sunshine Circuit — supplied environment integration

## What changed

Sunshine's flat primitive palm crowns/trunks, flower blobs and ellipsoid placeholder crowds are removed. The supplied tree, fuel dispenser, spectators and tire wall now populate the circuit using independently configurable static asset definitions. Other circuits, handling, physics/capsules, navigation, boost/jump triggers, checkpoints, camera and race rules are unchanged. The existing lagoon/lighthouse, road, ground and some stone details remain as supporting scenery; they are not replacements for the supplied assets.

- **Trees:** inspected source is a 0.564 m tall exporter-scale tree with a detailed leafy crown. Runtime source-reference height is 8.4 m, with seeded scale/yaw/position variation in ten deliberate grove areas. Placement clears the track, lagoon, neighboring trees and viewing lawns. Two LODs share the same original origin/envelope; simplification cannot resize/recenter the tree on a switch. The distant LOD keeps leaf coverage using enlarged retained source cards; no synthetic tree model was substituted. Alpha cutout avoids blended-leaf ordering/double-pass problems.
- **Fuel area:** the gas-station file actually contains one detailed 2.50 m retro dispenser. Two 3 m runtime pumps face the track on separate paved service areas at course fractions 0.085 and 0.61. No refueling mechanic or station building is claimed.
- **Spectators:** the source is one merged group of static posed people across an approximately 11.34 × 10.71 m footprint, 2.19 m tall. Three level viewing terraces at fractions 0.14, 0.365 and 0.71 support it at 1.8 m human height (one group slightly larger). This avoids intersecting the multi-row source group with narrow stepped benches. There are no animated cheers/rigs.
- **Tires:** short protective runs back the existing rails on three outside bends (fractions 0.18–0.27, 0.44–0.495, 0.79–0.865). The 4.03 m source long axis is aligned with the road tangent, centered, and grounded at 0.95 m height. Whole transformed footprint samples must stay at least 0.16 m outside the existing rail contact face; checkpoint flags have clearance gaps. The visible foreground rail remains the actual collision face. Tires do not add invisible or enlarged colliders.

## Ownership / files

- `config/environmentAssets.ts`: typed IDs, source/runtime/LOD paths, inspected original bounds, source-relative height/yaw, visibility distances and footprint helper.
- `tracks/sunshineAssetLayout.ts`: deterministic curated placement and whole-footprint road clearance. It returns no placements for other circuits.
- `render/models/environmentModel.ts`: static single-material validation, source-preserving transform baking, compatible material merging and bounded shared buffer cache. Cached GLTF scenes/materials are not reparented or recolored per placement. Each instance has its own transform/color. Original texture color spaces/UVs are retained; anisotropy and restrained surface/alpha settings suit the existing sunny lighting. Normal builds require no converter.
- `render/SunshineAssetScenery.tsx`: Drei loading, per-material instancing, camera/frustum/distance compaction, tree LOD and near shadows. No geometry/material allocation per frame. Distant tree batches do not cast shadows. Missing scenery logs a warning, settles the loading slot and is omitted instead of substituting a primitive.
- `render/{SunshineScenery,Environment,GameCanvas}.tsx`: integrate into Sunshine only; existing race asset-readiness barrier includes seven scenery slots. Countdown and driving wait until the models settle, preserving the existing no-placeholder race start. One unavailable scenery asset does not stop gameplay; the existing racer fallback remains independent.
- `tracks/sunshineScenery.ts`: removes old palm/crowd/flower primitives; retains reflectors/rocks and level viewing/forecourt supports; the old block architecture is removed.
- `dev/AssetInspection.tsx`: the existing `?asset-inspect` picker includes all six untouched source models for origin/orientation inspection. It does not affect production menus.
- `scripts/{inspect-environment,optimize-environment,thin-tree-leaves}.mjs`: reproducible geometry/metadata inspection, texture caps, static simplification and source-card LOD thinning. `optimize-assets.mjs` adds opt-in compaction/spatial simplification; existing asset-generation defaults remain unchanged.
- `tests/environmentScenery.test.ts`: supplied-file metadata, actual canonical mesh fitting, independent buffers/materials, bounded batches, near/far anchors, variant density, asset coverage, original scene preservation and road clearance.

## Source and performance budgets

| Model | Source triangles | Runtime triangles | Runtime bytes | Maximum texture side |
| --- | ---: | ---: | ---: | ---: |
| Fuel dispenser | 26,118 | 21,970 | 4,604,160 | 1,024 |
| Tire wall | 3,392 | 3,392 | 566,808 | 512 |
| Spectator group | 5,038 | 5,038 | 700,776 | 1,024 (actual 512) |
| Tree near | 182,154 | 36,211 | 2,995,560 | 512 |
| Tree far | same preserved source | 11,611 | 970,748 | 256 |

The aggressive first derivative looked sparse and was rejected during browser review. The final canopy deliberately trades more triangles for closer visual fidelity. Exact leaf/branch processing and image hashes are recorded in `docs/assets/environment-optimization.json`; its `beforeTriangles` is after source-card thinning, not the original asset count above. Original hashes and untouched bounds/materials/credits are in `docs/assets/environment-audit.json`.

One shared merged part per pump, tire wall or crowd, and two parts per tree LOD replace separate scene copies and the pump's original 41 meshes. Near trees switch to far detail at 42 m, with a 135 m tree cutoff; other asset cutoffs are 115–135 m. Normal browser rendering still depends strongly on supplied racer models, device, viewport and shadows. No universal 60 FPS or hardware/browser certification is claimed. At the LOD boundary geometry detail can change; this is not a cross-faded impostor system.

## Reproducing / extending

Run `npm run assets:environment` to re-audit/regenerate these checked-in derivatives. macOS `sips` is needed only for offline image resizing. `npm install && npm run dev` uses the checked-in files. Full `npm run assets:optimize` also regenerates the environment after existing game models; it keeps original sources.

For a future scenery GLB: preserve it in `public/assets/environment/`, record credits, inspect axes/bounds/textures/clips, add its typed definition and a static-only derivative job, then add placements with full footprint clearance. Supply one material per primitive; compatible parts merge by material. Skins, morph animation and incompatible geometry layouts require a separate authored/runtime pipeline, not a silent static conversion. Do not derive gameplay colliders from decorative bounds. Update regression budgets and verify the real asset in the browser before release.

## Validation

- `npm run assets:environment` processing was executed through its two underlying Node scripts; untouched source audit and checked-in derivatives were generated. Metadata, skins/clips, exporter bounds and image dimensions were inspected. All four actual source assets were also viewed in the existing browser inspection route.
- Focused environment / Sunshine / race-loading tests: **27 passed across three files**, including nine new environment cases. Typecheck, lint, production build and `git diff --check` passed. Full `npm run test`: **425 tests / 36 files passed in 243.79 seconds**, including all-course AI/race/collision/cup/items, visual models, selection, records and phone regressions. The phone-relay cases ran with local loopback permission.
- Browser Quick Race using normal pursuit inputs completed three validated laps in **2:39.262**, finishing third with **zero recoveries**. The initial lap includes time stationary before enabling QA driving; it is not a performance/handling benchmark. Each racer recorded three launches/landings. Player had five boosts; race item counters reported 13 pickups, seven shots, one trap, three Turbo Charges and eight hits. Existing standings/results classified a still-racing opponent correctly.
- Clean browser play: R reset and held W accelerated; the scene appeared with supplied trees, pumps and spectator group, without a primitive-tree flash. Both normal and diagnostic scene loads completed. No asset-loading errors or WebGL failures were captured. Existing Three/Drei Clock and podium shadow-mode deprecation warnings were observed; this task does not change those dependencies/results rendering.
- Example local development frame samples: 142–219 draw calls, ~606–724k triangles in the observed views, median ~17–24 ms and p95 ~32–35 ms. These include browser scheduling, traffic, diagnostic UI and occasional concurrent build activity. They are not isolated GPU timings, a before/after comparison or guaranteed 60 FPS. Physical devices, all browser engines, production profiling and forced network-failure injection remain unverified.
- Screenshots: [clean paddock](design-qa/sunshine-assets/paddock.png), [trees/crowd/tire-lined bend during a jump](design-qa/sunshine-assets/racing.png), [validated results](design-qa/sunshine-assets/results.png).

Final follow-up: after adding the paved pump forecourt, the 27 focused cases, typecheck, lint and production build were repeated successfully (build 1.26 s; app chunk 260.67 kB / 83.98 kB gzip). The clean screenshot includes the finished paving. All four archived sources still match their initial audit hashes. No runtime handling/camera/race-source modules were changed.


## House / cactus follow-up (2026-11-16)

The user's `viking_house.glb` and `cactus.glb` are preserved byte-for-byte as `assets/environment/viking-house.glb` and `cactus.glb`. Both have zero skins and zero clips. The house is a broad timber building with a tall tower, outlined geometry and baked unlit textures; its supplied look is retained rather than replaced with a generated house. Source bounds are 42.299 × 32.063 × 16.031 exporter units; canonical ground-aligned height is 7.5 m. The cactus source is 1.220 × 1.985 × 0.386 m; canonical height is 2.8 m.

- **14 houses** replace all four primitive clubhouse/garage assemblies and their floating sign. Small groups occupy fractions 0.005–0.075, 0.21–0.245, 0.465–0.54 and scattered outer stretches. Setbacks vary between 23/24/29 m, with seeded height/angle variation and road-facing facades. The original lagoon/lighthouse stays open.
- **62 cacti** frame houses and both service areas, with sparse outer-verge accents. Seeded size/yaw variations, actual source envelopes and clearance rejection avoid overlapping houses, crowds, trees or road. The source is fairly flat in depth; yaw variation preserves its actual geometry, without manufacturing branches or a different cactus.
- **Two relocated fuel dispensers** now sit at fractions 0.085 and 0.61, 14.5 m from the centerline, each on a 7 × 10 m paved pad. `sunshineServiceAreas.ts` is the single definition for pumps and paving. There is no refueling mechanic or invented complete gas-station building.
- **32 existing supplied trees** remain in deliberately spaced groves. Houses, trees and cacti reserve their full horizontal bounding-circle envelopes plus at least 1 m between props. Full transformed road footprints and the lagoon exclusion also apply. Props remain cosmetic behind the unchanged collision rails.

| Added model | Source triangles | Runtime triangles | Runtime bytes | Texture cap | Shared material batches |
| --- | ---: | ---: | ---: | ---: | ---: |
| Viking House | 47,814 | 34,640 | 3,425,160 | 1,024 | 2 |
| Cactus | 3,780 | 3,780 | 470,952 | 512 | 1 |

House simplification preserves the outlined silhouette/UVs; cactus geometry is retained and both textures are capped offline. Per-material instancing shares buffers across every placement, with distance/frustum compaction and bounded shadows. Source files and embedded credits remain intact. Both uploaders declare CC BY 4.0; this records supplied metadata rather than independently verifying release rights. See `public/ASSET_CREDITS.md` and the regenerated audit/optimization reports.

Seven scenery readiness slots now derive from the typed registry, avoiding a missing hardcoded slot when adding an asset. Simulation, camera, course surface, collision, checkpoints, AI, items and all other circuits are unchanged.


### Follow-up verification

- `npm run assets:environment` regenerated the six-source audit and seven runtime derivatives; original house/cactus copies were compared byte-for-byte with the user's Downloads files and match their recorded SHA-256 hashes.
- `npm run typecheck`, `npm run lint`, `npm run build` and `git diff --check` passed. Production build completed in 2.06 s; app chunk 261.50 kB / 84.37 kB gzip. The three focused environment / Sunshine / loading suites passed **32 tests**, including actual fitting/material batching for both new models, house/cactus separation, pump/paving alignment and full service-pad road clearance.
- Both untouched sources were inspected visually in `?asset-inspect`. The finished Sunshine scene loaded all models without an asset error. A browser Quick Race using the existing normal-input QA driver completed **three laps in 2:15.649**, first of four, **zero recoveries**. All four racers recorded three jumps and three landings. Player counters reported six pad boosts; race item counters reported 13 pickups, three shots, three guards, five Turbo Charges and one hit. A new race also restarted successfully.
- Example development renderer samples ranged from **88–225 calls / 577–948k triangles**, with median **16.6–27.3 ms** and p95 **18.9–35.6 ms** in observed views. The samples include asset warm-up and normal browser scheduling; they are not an isolated before/after benchmark or a 60 FPS guarantee. Physical device / cross-browser QA remains open. The pre-existing Three.Clock deprecation warning was observed; no model/WebGL errors were logged.
- Captures: [cactus-lined racing](design-qa/sunshine-settlement/racing.png), [house/garden bend](design-qa/sunshine-settlement/settlement.png), [validated results](design-qa/sunshine-settlement/results.png).

- Full `npm run test`: **430 tests / 36 files passed in 196.41 s**, including existing driving/collision/AI/cup/items/records/phone coverage. The relay tests ran with local loopback access; the browser QA tab was closed before this run.


Latest follow-up: the previously documented 14-Viking-house layout is superseded by a 10/4 Stylized/Viking mix and the complete western gas station, with nine scenery slots. See [Sunshine road polish](SUNSHINE_ROAD_POLISH.md) for current counts, provenance, road/feature redesign and verification.
