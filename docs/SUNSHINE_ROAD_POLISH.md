# Sunshine Circuit — varied scenery and road presentation

## Result

Sunshine now mixes **10 supplied Stylized Houses and four Viking Houses**, replacing the previous 14 repeated towers. Existing placement anchors retain varied setbacks, size and slight facade angles, with full source-envelope road/lagoon/prop clearance. There are 33 supplied trees, 58 cacti, three spectator groups and 37 tire-wall segments after these reservations.

The western service area at fraction 0.61 now uses the complete supplied **Lowpoly Gas Station**, with its actual shop, canopy, pumps, sign and transparent windows. Canonical height is 5.8 m, with an approximately 17.74 × 11.21 m footprint, a 23 m setback and a 22 × 15 m paved apron. The eastern vintage dispenser remains at fraction 0.085 on its smaller apron. The full station’s inspected shop/pumps open along source +X; its 180° relative yaw faces them toward the road. Both assets and paving derive from `sunshineServiceAreas`; a second copy of the full station is deliberately avoided.

## Road markings / turbo / jump

The previous plane/Euler center dashes mirrored their direction on many headings, and flat separate pad strokes did not conform to the raised ribbon. The new `surfacePaint` builder uses course distance and lateral offsets, interpolating the actual rendered road's edge vertices and sampled heights. Strip subdivisions include road vertices and the closed seam. There is no per-frame geometry creation, custom camera or second surface/collision authority.

- Center dashes follow the curves in one opaque material batch, with consistent 2.7 m strokes and approximately 9 m spacing. Overlapping spawn-local decorative arrows are removed on Sunshine. Center paint leaves clear gaps at the start, turbo pads and jump approach.
- Turbo strips are continuous dark teal panels with fine mint borders, three stronger forward-facing chevrons and a pale entry stripe on the actual swept activation plane. They keep the existing width, length, location and boost state/kick.
- The **existing raised roller** now has a 12 m dark approach, amber edge hatching, three forward chevrons and a launch stripe at its existing crest trigger. Paint stays 0.65 m inside the road edge so it does not cover the curbs; physical trigger widths remain unchanged. Paint follows the road incline rather than floating as horizontal tiles. This is a presentation redesign, not a new physical ramp or jump formula.
- Framed directional roadside signs replace blank feature boards. Accent pulses are subtle, delta-aware, pause with activity and honor the current reduced-motion media setting.

Handling, physics, colliders/rails, track surface, AI navigation, feature activation, laps, race rules, item formulas, records and camera are unchanged. Other tracks retain their existing presentation. No time-trial fingerprint change is needed for cosmetic paint/scenery.

## Supplied files and budgets

Both untouched sources were inspected for world bounds, materials, UV textures, origins, exporter transforms, skinning, clips and embedded credits, and viewed in the browser source inspector. Both are static with zero skeletons/clips.

| Preserved source | Runtime ID | Source triangles | Runtime triangles | Runtime bytes | Material batches |
| --- | --- | ---: | ---: | ---: | ---: |
| `stilized_house.glb` → `assets/environment/stylized-house.glb` | `stylized-house` | 15,944 | 12,754 | 4,791,108 | 1 |
| `lowpoly_gas_station.glb` → `assets/environment/lowpoly-gas-station.glb` | `lowpoly-gas-station` | 31,370 | 27,786 | 3,661,660 | 5 |

Texture sides are capped at 1,024 px offline. The house retains three real base-color/ORM/normal images; the station retains its palette/sign images and specular extension. Cloned runtime house materials use low metalness for wood/stone and restrained AO. Station glass keeps authored transparency/roughness; opaque service surfaces use the shared matte treatment. Source textures/UVs and metadata remain intact. All copies share per-material instanced buffers and distance/frustum culling, rather than duplicating meshes/materials for every building. Nine scenery readiness slots derive automatically from the eight-asset registry (tree has two LODs).

Credits and uploader-declared CC BY 4.0 licenses are recorded in `public/ASSET_CREDITS.md`. They are supplied metadata, not independently verified public-release rights. Rebuild derivatives with `npm run assets:environment`; normal play uses checked-in GLBs.

## Files / maintenance

- `config/environmentAssets.ts`, `tracks/sunshineAssetLayout.ts`: new source-relative definitions, mixed house distribution and static prop clearance.
- `tracks/sunshineServiceAreas.ts`, `sunshineScenery.ts`: one service-layout definition, matching model orientation and pavement dimensions.
- `render/models/environmentModel.ts`: cloned house/service material treatment, preserving station glass.
- `render/surfacePaint.ts`, `featurePaint.ts`: pure static road-space paint generation.
- `render/TrackVisual.tsx`, `TrackFeaturesVisual.tsx`: merged dashes, turbo/roller treatment and signs.
- `scripts/inspect-environment.mjs`, `optimize-environment.mjs`, `docs/assets/environment-*.json`: reproducible inspection/derivatives with source hashes.
- `tests/environmentScenery.test.ts`, `surfacePaint.test.ts`: real model fitting/batching, mixed roster/placement, pavement alignment/clearance, all-heading dash direction, upward triangle winding, sampled slope/seam continuity, painted trigger location and forward chevrons.

For more scenery, retain the source and metadata, inspect real bounds/materials, add the typed definition and offline job, then compose placements using the existing clearance checks. For additional paint, use course-space strips/chevrons; do not manually rotate long planes over a curved/elevated surface. Decorative meshes never define collision dimensions.

## Verification

- `npm run assets:environment` regenerated all eight source audits and nine checked-in runtime derivatives. The two new archived GLBs match the supplied Downloads originals byte-for-byte. Source bounds/materials/credits and both real models were inspected in the browser source viewer.
- Focused environment / paint / Sunshine / loading suites: **42 tests passed**. After the final station-facing and paint-inset corrections, the 24 environment/paint cases were repeated successfully. Typecheck, lint, production build and `git diff --check` passed; the final build result and full-suite result are recorded below.
- A browser Quick Race completed three validated laps in **2:15.191**, first of four, with **zero recoveries**. Every racer recorded three jumps and landings. Player counters reported six boosts; item counters reported 13 pickups, seven guard activations and three Turbo Charges in that seed. Another completed run (2:31.092, second place, zero recoveries) exercised three shots, four traps and six hits. The initial lap of that run includes a stationary period; neither run is a handling benchmark.
- Restart, final road-following dashes, turbo chevrons, inset roller approach and station facade/pumps facing the track were inspected in browser driving views. Screenshots: [turbo and houses](design-qa/sunshine-road-polish/turbo-and-houses.png), [jump approach](design-qa/sunshine-road-polish/jump-approach.png), [complete station](design-qa/sunshine-road-polish/gas-station.png), [validated results](design-qa/sunshine-road-polish/results.png).
- Observed development frames ranged around **107–224 calls / 600–922k triangles**, median **16.6–26.7 ms**, p95 **17.6–45.8 ms**. These include different viewpoints, warm-up, browser scheduling and occasional concurrent checks; they are not isolated GPU timings or a before/after performance claim. No model-loading or WebGL errors were logged; the existing Three.Clock deprecation remains. Physical-device/cross-browser and release-rights checks remain open.
- No simulation, course definition/surface, AI, collision, item, race, record or camera-source modules changed. All added geometry is decorative, behind existing rail boundaries or inset within the rendered road.

Final production build: **1.14 s**, app chunk **264.95 kB / 85.69 kB gzip**. Run with `npm install && npm run dev` (no new dependencies); existing keyboard/gamepad/phone controls remain unchanged.

Next visual pass: refine ground transitions and landscaped areas around the village/service aprons, then profile shadows/textures on representative devices. No additional handling systems are required for that work.

Full regression: **440 tests / 37 files passed in 144.06 s** using `npm run test`, with loopback permission for the existing phone relay cases. The browser QA tab was closed before this run.
