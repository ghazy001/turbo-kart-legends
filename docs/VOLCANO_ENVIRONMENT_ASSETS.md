# Volcano Sprint — supplied calderas and creatures

## Composition and preserved gameplay

Volcano Sprint now uses all six supplied GLBs: a hero caldera inside the loop, three distant volcanic silhouettes, broken rock gardens, and a small set of dragon/dinosaur landmarks at distinct bends. Full wing/tail footprints remain clear of the road and each other. The existing three off-road lava pools remain; the primitive crater/column render batches are replaced by the supplied volcano/rock models. Their old pure scenery helpers remain available to the historical course geometry tests.

Warm ash colors, a softer dusk sky, textured asphalt, amber/cream curbs, course-aligned center dashes and a 2048 shadow map carry the same clean presentation as the other asset passes. The original start area, route and checkpoints remain.

No handling, drift/boost formula, collider, camera, AI navigation, item, scoring, cup order or record compatibility inputs change. Scenery has no physics colliders or damage rules. The 756 m road remains flat and 11 m wide. The creature poses are static; no flight, walking, attack or idle animation is invented.

## Source inspection and derivatives

All six sources match the user's `Downloads/vlocano` files byte-for-byte. Originals live in `public/assets/environment/`; runtime derivatives in `public/assets/optimized/environment/`. Embedded credits remain intact. [Attribution and license declarations](../public/ASSET_CREDITS.md), [source geometry/material/skin audit](assets/environment-audit.json), [optimization report and hashes](assets/environment-optimization.json).

| ID | Supplied file | Source → runtime triangles | Runtime bytes | Texture cap | Runtime batches |
| --- | --- | ---: | ---: | ---: | ---: |
| cartoon-volcano | cartoon_volcano__3d_model.glb | 8,496 → 6,796 | 910,792 | 1024 | 1 |
| charizard | charizard.glb | 43,208 → 17,676 | 568,088 | 512 | 5 |
| desert-rocks | desert_rocks.glb | 992 → 992 | 408,296 | 512 | 1 |
| dinosaur | dinosaur.glb | 37,768 → 37,768 | 2,508,168 | 512 | 1 |
| deadly-nadder | httyd_deadly_nadder.glb | 358,247 → 74,829 | 3,644,312 | 1024 | 1 |
| momma-dino | momma_dino_remake.glb | 67,580 → 33,374 | 3,867,432 | 512 | 7 |

All six have **zero animation clips**. Dinosaur has one real skin, 58 bones and 21 bound mesh primitives. `prepareEnvironmentModel` clones its skeleton independently and freezes the supplied pose into static positions/normals once. UVs/normal maps and all triangles remain; derived buffers no longer contain skin attributes. Source rig/bindings remain untouched. This supports economical static scenery, not animated instanced creatures. Author compatible clips before introducing animation in a separate renderer.

The volcano and dinosaur use legacy specular/glossiness materials unsupported by the current standard loader. `modernize-environment.mjs` explicitly converts only these two runtime derivatives to matte nonmetal materials, preserving diffuse/normal maps, UVs and credits. Legacy specular/glossiness appearance is intentionally approximated, not physically reproduced; source files and unused source image data remain intact. The generic runtime loader retains its existing rejection of other unconverted complex legacy materials.

Momma Dino has mixed vertex-color/UV layouts sharing materials. Batches now separate incompatible attribute layouts instead of dropping authored data or failing a merge. Its tiny transparent cornea uses a light clear shell over the original eye rather than a full-scene transmission pass. Other course material profiles remain unchanged. No entire supplied asset is unsupported; source-material conversion and pose freezing are the explicit integration adaptations.

Dinosaur declares **CC BY-NC 4.0**; the other five declare **CC BY 4.0**. These are embedded uploader declarations and the user's supplied local assets. Franchise-related/public/commercial rights are not independently verified. Keep the credits and rights distinction when preparing a release.

## Files and adding assets

- `config/environmentAssets.ts`: typed IDs, exact source vertex envelopes, canonical height, runtime/source paths, distance limits and six Volcano readiness slots.
- `tracks/volcanoAssetLayout.ts`: deterministic curated calderas/creatures, varied rock gardens, complete footprint road clearance (at least 10 m centerline distance), conservative source-envelope spacing and lava exclusions.
- `render/VolcanicScenery.tsx`: existing lava fields plus shared `EnvironmentAssetScenery` rendering, loading/error handling and distance/frustum instancing.
- `render/models/environmentModel.ts`: explicit dinosaur pose freezing, compatible-attribute batches and cloned material profiles.
- `render/{Environment,TrackVisual}.tsx`, `tracks/trackCatalog.ts`: isolated atmosphere/road presentation.
- `dev/AssetInspection.tsx`: source versus runtime derivative toggle, correctly distinguished declared skins/bound mesh counts, source audit labels.
- `scripts/{modernize-environment,inspect-environment,optimize-environment}.mjs`: reproducible processing and precise/source box audit fields.
- `tests/{volcanoAssets,environmentScenery,sugarScenery}.test.ts`: new composition/loading/material/rig checks and cross-course regressions.

For another source, preserve it and attribution first. Inspect actual vertex bounds/axes, material extensions, bound skins and clips. Add its registry/optimizer definitions and explicit course loading ID. Place the full model envelope through the layout's clearance/lava/spacing checks. Run `npm run assets:environment` to regenerate reports/derivatives, inspect `/?asset-inspect`, and drive a full race. Never use decorative bounds to resize a kart/rail collider.

## Running and verification

`npm install && npm run dev`, then **Quick Race → Racer → Kart → Volcano Sprint → Review → Start race**. Existing keyboard/gamepad/phone controls remain. Development `/?race-preview&render-stats` enables normal-input autodrive/item-use QA and renderer observations.

All six optimized models were inspected visually. Source-byte comparisons, source/derivative metadata, real-buffer grounding/size checks, full-triangle static pose retention, mixed vertex-color preservation, road/lava/prop clearance and 46 focused regressions passed. `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` and the complete `npm run test` suite passed: **466 tests across 39 files**, 189.60 seconds. The suite ran alone under `caffeinate` with loopback permission for existing Socket.IO tests. The app chunk is 269.98 kB / 87.68 kB gzip. Inspection and optimization scripts regenerated the checked-in reports/derivatives; no dependencies changed.

Local in-app browser race: normal menus selected Volcano Sprint; the full asset barrier settled before countdown. Development autodrive and item-use switches supplied the existing normalized inputs. The three-lap race finished **first of four in 2:29.975**, with **zero recoveries and all 12 ordered gates per lap**. All rivals reached lap three; their unfinished times were correctly left absent. Item counters recorded 13 pickups, one shot, two traps, three guards, three turbos and three hits. Pause/resume, restart and Race again worked; a second framing drive checked the supplied creatures and caldera from the chase camera. No browser errors or missing scenery warnings were reported; an existing Three Clock deprecation warning remains.

Proof: [caldera approach](design-qa/volcano-assets/caldera-drive.png), [Nadder corner](design-qa/volcano-assets/nadder-corner.png), [Momma Dino bend](design-qa/volcano-assets/momma-dino-bend.png), [classified race results](design-qa/volcano-assets/race-results.png).

Representative moving observations after loading: 98 calls / 390,990 triangles / 56 textures at median 21.4 ms, p95 34.9 ms; another view showed 124 calls / 516,104 triangles at median 18.0 ms, p95 29.0 ms. These include the full race and shadow passes. The earlier concurrent build caused higher samples; shader warm-up, view, device and background CPU work affect timing. This is not a claim of sustained 60 FPS; lower-end profiling/shadow tuning remains open.

Remaining work: target-device/browser profiling, human art/handling feedback, public-release rights review, and authored creature animation if desired. Local rendering measurements are not a cross-device FPS guarantee. More terrain detail can be a later art pass; moving creatures/hazards require a separate gameplay scope.
