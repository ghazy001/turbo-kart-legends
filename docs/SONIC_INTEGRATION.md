# Sonic replaces Aang — local prototype

Implemented at the user's request, 2026-11-16. Gameplay, collisions, drift/boost, camera, AI identities/navigation, race rules and records are unchanged.

## Source inspection

- Preserved `public/assets/characters/movie_sonic_sonic_rumble.glb` from the supplied download, SHA-256 `5abdaa76812df5cedadbce12af60c5fe03842d3ef67dbf6914c1750a7236d0c8` (see the generated audit for the authoritative hash).
- Embedded title: **Movie Sonic (Sonic Rumble)**. Uploader: **Guilherme Navarro**. Embedded declaration: **CC-BY-4.0**. Source and author links remain in [credits](../public/ASSET_CREDITS.md). Uploader declarations are retained, not independently verified public-release/franchise rights.
- **22,149 triangles**, **6 skinned meshes**, **1 skin / 56 joints**, **0 animation clips**. Named arm, hand/finger, pelvis, leg and foot joints are usable. Y-up, +Z-facing after exporter transforms.
- Original scene bounds: approximately **0.01036 × 0.01009 × 0.00659** units. The offline derivative adds a **100× enclosing scene wrapper** to correct export units. Existing nodes, joint indices, inverse binds, geometry attributes, embedded images, UVs, materials and metadata remain intact. No geometry decimation is needed for this modest skinned model.
- Six embedded PNGs: one 1024² and five 512², an estimated **12 MiB RGBA including mipmaps** before browser/driver-specific allocation. The existing texture caps and shared cache remain in use.

## Fit and integration

- Registry ID `sonic` replaces selectable `aang` in the same roster position. The racer name, color, description, live thumbnail, preview and model paths come from the central registry. AI allocation and cosmetic podiums use this registry automatically.
- Version-1 saved `aang` selections migrate to `sonic` while retaining the kart. The complete migrated pair is validated; corrupt versions, unknown/prototype kart IDs and storage denial still use safe defaults. Retired Aang source/optimized files and credits remain untouched.
- Portraits retain Sonic's supplied standing pose at the shared **2.3-unit height**. Seated crown-to-pelvis height is **0.94 units** before existing kart seat scaling; Sonic's normalized scale is approximately **1.489**. Rear quills retain their original shape.
- `RigSeatDefinition` configures named joints, pelvis origin, glove-palm offset, elbow fit and knee/ankle targets. `driverFitOptions` transforms each kart's existing steering grip into driver space. `rigSeatPose.ts` adjusts cloned joints once into a static seated stance, turns gloves forward, bends legs and grounds the complete skin/mesh hierarchy at the pelvis. Bounds are refreshed after posing.
- The same immutable per-fit template cache and SkeletonUtils cloning provide independent bones for every actor. Portraits and other karts do not inherit another instance's pose. No per-frame IK, geometry deformation, material creation or pose solver is added.
- The shared racer-matte profile uses zero metalness/clearcoat, 0.85 roughness and reduced normal/reflection strength. Sonic keeps the supplied albedo, fur detail, face, proportions and UVs; this matches material response and scale rather than remodelling all source art identically.
- Existing KartAssembly seat parenting carries the racer through movement, bank, turns, drift and jumps. Visual fitting has no collider or simulation ownership.
- The workshop now identifies rigged/static capability accurately, recomputes hand targets after seat/driver edits, and normalizes raw racer comparisons by height instead of assuming source units.

## Verification

- Browser workshop: all four Sonic/kart combinations loaded with embedded textures. Side/quarter views checked the seated body, hands, head/quills and road clearance. Saved captures: [Practice](design-qa/sonic/practice-side.png), [Go Kart 64](design-qa/sonic/go64-side.png), [DS](design-qa/sonic/ds-side.png), [Boat](design-qa/sonic/boat.png).
- Normal UI: Sonic replaces Aang in the five-entry grid; the portrait uses common framing. Confirming Sonic reaches Kart Select with “Driven by Sonic,” then review/start. [Roster](design-qa/sonic/roster.png), [selected kart](design-qa/sonic/selection.png).
- Quick Race loaded the complete GLB lineup before countdown; Sonic was visible attached to the Boat Kart while W moved it and CPU opponents drove ahead. Focus-loss pause/resume remained functional. Additional manual drift/hop checks were not completed; automated parent-motion checks cover rotation, elevation and bank without changing the rig.
- Workshop error log was empty. Physical device tests and a newly completed full race were not performed for this cosmetic integration.
- Focused registry/menu/flow checks passed **64 tests / 3 files** before the final full run. New behavior tests cover all four glove targets, independent bones, unchanged source joints, road clearance and validated legacy-selection migration. Portrait tests now refresh attached skin matrices as the renderer does. Offline derivative tests explicitly validate the enclosing normalization wrapper while preserving every original node and binding.

`npm run typecheck`, `npm run lint` (zero warnings), `npm run build` and `git diff --check` pass. The first full run passed 393/394 checks; its sole failure came from changing an existing Boat Kart node comparison to strict numeric equality, exposing JSON's equivalent `-0`/`0` serialization. The original JSON-safe comparison was restored; neither kart geometry nor bindings changed. The final full rerun passed **394/394 tests across 33 files in 165.80 seconds**, including existing localhost phone-relay tests. Four obsolete Aang static-vertex target cases were replaced by the new four-cockpit real-joint test, legacy-selection migration test and Sonic derivative checks. App JS: **234.80 kB / 75.66 kB gzip**. No dependencies were added.

## Remaining artist work

This is a fitted **static skeleton pose**, not a seated driving animation. The source contains no clips. Fingers remain open rather than fully wrapped around the wheel; the Boat Kart has limited visible steering geometry, so its existing grip anchors guide the pose. Tiny glove/cockpit or quill/backrest intersections can still need artist refinement. No claim of triangle-perfect contact is made. Production polish would add authored seated/steering/lean/victory clips and per-cockpit finger poses. Source-model remodelling/retexturing is a separate art task.

For another rigged racer: audit first; normalize units in an offline derivative if necessary; configure its own joint names/fit values and crown/pelvis measurements; use `pose: 'rig-seat'` only for static joint fits. Use `authored` and explicit clip mappings only when compatible clips actually exist. Inspect all four cockpits, retain source credits, and extend the real-asset/independent-instance tests.
