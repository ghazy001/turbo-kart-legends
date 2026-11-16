# Frostbite Peak — supplied winter scenery

## Result and scope

The six supplied assets replace the old primitive forest with mixed snowy pine/fir groves, small cabin clearings, snowmen and a few wolves. Both similarly named tree files are distinct models by different authors; both are used. The X House model includes its decorated tree, presents, bench, lamp, snowman and snow patch, and remains an intact scene rather than an isolated house mesh. The Witch House already has snow on its roof and icicles.

The original mountains, snowbanks, Glacier Gate and Summit Pass remain. Complete model footprints reserve the road, mountain bases, both tunnel shells and their approach/exit zones. Groves vary their scale, rotation and setback, with open gaps rather than a uniform tree wall. Grounded source-relative fitting handles the snowman's unusually large exporter units and both house scene envelopes.

Road presentation gains sampled-ribbon center dashes, textured asphalt, blue/white curbs and a cool shoulder. The existing blue road/rail and snowy palette remain. Fog visibility and the shadow map now match the detailed course settings (145–350 m fog, 2048 shadow map).

The 853 m route, 11 m road width, flat road surface, grip, handling, drift/boost, camera, AI, capsule/rail collision dimensions, ordered checkpoints, items, records and cup order are unchanged. Scenery has no new colliders or interaction rules. All six supplied models have **zero skins and zero animation clips**; the wolves and snowmen are static scenery, not animated or moving hazards.

## Assets and provenance

Original copies under `public/assets/environment/` match the supplied `Downloads/snow` files byte-for-byte. Runtime derivatives preserve embedded author/source/license metadata and live under `public/assets/optimized/environment/`. See [credits](../public/ASSET_CREDITS.md), [source audit](assets/environment-audit.json) and [optimization/hash report](assets/environment-optimization.json).

| ID | Supplied filename | Triangles (source/runtime) | Runtime bytes | Texture cap | Prepared batches |
| --- | --- | ---: | ---: | ---: | ---: |
| happy-snowman | happy_snowman.glb | 3,612 / 3,612 | 879,572 | 512 | 2 |
| snow-wolf | loup.glb | 2,180 / 2,180 | 682,852 | 512 | 1 |
| snow-pine | low_poly_snow_tree.glb | 926 / 926 | 74,464 | no images | 1 |
| snow-fir | low-poly_snow_tree.glb | 582 / 582 | 40,984 | no images | 1 |
| witch-house | witch_house.glb | 3,902 / 3,902 | 931,320 | 1024 | 4 |
| winter-cabin | x_house.glb | 6,145 / 6,145 | 463,608 | no images | 1 |

These already lightweight meshes retain their full topology. Texture caps reduce image memory, without promising every compressed derivative is smaller than its source. The wolf receives an explicit matte nonmetal conversion of its legacy specular/glossiness material in the derivative only. Diffuse map, UVs and credits remain; legacy specular appearance is approximated, not physically reproduced. The original source and unused source specular image remain intact.

The two trees and cabin contain only opaque, untextured solid colors with compatible layouts. Runtime preparation copies their original **linear** material colors into vertex attributes and uses one shared white matte material per asset. Thus the 39-material cabin becomes one batch and each three-material tree becomes one batch, while preserving every source triangle/color. Source buffers/materials remain untouched. Happy Snowman's blended materials become depth-writing alpha-tested matte materials for stable instanced faces/body/shadows; unnecessary source emissive glow is suppressed. The houses/wolf retain their texture settings with restrained metalness.

All six uploaders declare **CC BY 4.0**. This records embedded metadata and preserves attribution; public-release rights have not been independently verified. No whole supplied asset is unsupported, and no rig/animation is invented. The wolf's derivative conversion is required for the current loader.

## Files and extension points

- `src/game/config/environmentAssets.ts`: IDs, exact source envelopes, canonical heights, runtime/source URLs, distance budgets and six Frostbite loading slots.
- `src/game/tracks/frostbiteAssetLayout.ts`: deterministic settlements/woodland, at least 10 m centerline clearance for sampled footprint points, full footprint tunnel exclusions and conservative prop/mountain circle separation.
- `src/game/render/AlpineScenery.tsx`: supplied static instances alongside existing tunnels, mountains and snowbanks.
- `src/game/render/{Environment,TrackVisual}.tsx`, `tracks/trackCatalog.ts`: isolated forest replacement, road/lighting presentation and preview copy.
- `src/game/render/models/environmentModel.ts`: asset-scoped solid-color batching and cloned material profiles.
- `scripts/{inspect-environment,optimize-environment,modernize-environment}.mjs`: source audit, derivatives/texture caps and explicit wolf conversion.
- `src/game/tests/{frostbiteAssets,environmentScenery,sugarScenery}.test.ts`: placement/tunnel/loading/course isolation, real-model grounding, color/topology retention and material conversion regressions.

To add another GLB, preserve its source/credits; inspect real vertex bounds, axes, materials, bound skins and actual clips. Add registry and optimizer entries plus course-specific readiness. Place the full source envelope through the layout's road/tunnel/mountain/spacing checks. Run `npm run assets:environment`, inspect `/?asset-inspect` (runtime toggle for converted files), then drive a race. Decorative bounds must never resize gameplay colliders.

## Running and verification

Run `npm install && npm run dev`, then **Quick Race → Racer → Kart → Frostbite Peak → Review → Start race**. Keyboard, gamepad and phone controls remain unchanged. Development `/?race-preview&render-stats` exposes normal-input autodrive, item counters and renderer observations.

All six optimized models were visually inspected. Source byte comparisons, `npm run assets:environment`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` and **55 focused tests** passed. The complete `npm run test` suite passed: **479 tests across 40 files**, 195.03 seconds, run alone under `caffeinate` with loopback permission for existing Socket.IO tests. The app chunk is 273.95 kB / 88.91 kB gzip; no dependencies changed. Real prepared-buffer tests check source immutability, grounding/size and color/topology preservation.

Local in-app browser: normal menus selected Frostbite Peak, the complete model readiness barrier settled before countdown, and development autodrive/item actions fed the existing normalized input path. Completed three laps **first of four in 2:40.268**, with **zero recoveries and all twelve ordered gates per lap**. Rivals reached lap three; unfinished rival times correctly remain absent. Item counters recorded 12 pickups, three shots, three traps, two guards and five hits. Both tunnel passages remained open to the chase camera; source scenery left the road clear. Pause/resume and Race again worked. All six model previews and the actual course rendered without browser errors/missing-model warnings. An existing Three Clock deprecation warning remains.

Proof: [Glacier Gate woodland](design-qa/frostbite-assets/woodland-drive.png), [cabin clearing](design-qa/frostbite-assets/cabin-bend.png), [snowman and Summit Pass](design-qa/frostbite-assets/snowman-pass.png), [classified race results](design-qa/frostbite-assets/race-results.png).

Representative moving samples: 83 calls / 374,030 triangles / 59 textures, median 17.4 ms and p95 26.7 ms; a second view showed 117 calls / 432,012 triangles, median 17.0 ms and p95 25.8 ms. Counts include the whole race and shadow passes, vary with view and background activity, and are not a sustained 60 FPS or cross-device performance guarantee. Physical phone/gamepad and other-browser checks were not repeated for this scenery-only pass.

Remaining work: human art/handling feedback, target-device/browser profiling, public-release attribution/rights review and authored wildlife animation if desired. This scenery pass does not add ice grip, new jumps or moving animals. More terrain detail can be considered after reviewing this composition.
