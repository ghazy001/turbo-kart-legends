# Latest SpongeBob replacement — 2026-11-16

The user supplied `the_spongebob_squarepants.glb` and explicitly superseded the earlier pending `spongebob_squarepants.glb`. Only the latest model is selectable. The persistent `spongebob` ID, player/AI allocation, input, physics, colliders, camera, races, items and records are unchanged.

## Inspected source and runtime derivative

- Preserved source: `public/assets/characters/the_spongebob_squarepants.glb`, **43,380,292 bytes**, SHA-256 `b6809dc40918a8c87b5f7308e31b27a983878e43cc4e91ff38634587ad7286fc`.
- Embedded title **The SpongeBob Squarepants**, uploader **Pixel**, declared **CC-BY-4.0**. Full embedded links are retained in [credits](../public/ASSET_CREDITS.md). This records uploader metadata and the user's local-use request, not independently verified franchise/public-release rights.
- **25 static meshes, 29,835 triangles, 0 skins, 0 animation clips**, two supplied PBR materials. Separate arm/sleeve, shoe/sock/leg, clothing and face parts are available. The supplied expression is retained.
- Exporter transforms produce a roughly **355 × 316 × 160-unit** source. An enclosing **0.01 scene scale** normalizes runtime units without changing original nodes or vertex attributes. After normalization the crown is 3.156794 and the seated pelvis reference is 0.82; shared crown height 0.94 yields scale **0.4022605**. Portraits use the same **2.3-unit** height as the roster.
- All nine original embedded images are **4096²**. The runtime derivative caps them to **1024²**, retaining image formats, materials, UVs and credits. All geometry is retained. Runtime GLB: **5,187,328 bytes**, about **88% smaller** than the supplied source. Source-image pixel count is reduced 16×; actual browser/GPU memory was not profiled.
- The former Nickelodeon racer source/derivative remain unchanged. The earlier 99,824-byte supplied candidate is archived as a source only; its uncommitted preview captures and inactive generated derivative were removed so they cannot be confused with this result. The Boat Kart is unchanged.

## Fitting and style

`visualAssets.ts` points the existing `spongebob` ID to the latest source/runtime paths. No selection migration is needed: stored SpongeBob IDs automatically load the new model. Live thumbnails, menus, player, AI and podiums use the same registry/assembly.

The static pose first centers the source with `origin`. Only the inspected arm/sleeve and leg/sock/shoe meshes are bent. Face, eyes, teeth, tongue, torso, belt, tie, shirt and main shorts remain intact. Arm rotations/stretching use the actual angled rest directions instead of assuming a horizontal T-pose. Existing per-kart wheel targets guide both wrists; knee/hip bending keeps shoes above the road. Original source scenes, geometry attributes and UVs remain immutable.

The shared matte profile preserves paint/alpha/UVs, uses 0.85 roughness with zero metalness/clearcoat, reduces normal strength/reflections and disables emissive glow/maps. Fitted indexed meshes refresh normals and tangents so the new normal maps follow the posed geometry. Compatible static parts batch from 25 source meshes into **two material meshes** per seated driver. Fitting and batching happen once in the bounded cache, with independent actor transforms and shared immutable buffers/materials.

## Files and regeneration

- `src/game/config/{visualAssets,racerStyle}.ts`: latest asset definition, pose masks, measurements and scale.
- `src/game/render/models/{staticPose,prepareModel,racerPresentation}.ts`: source centering, optional limb masks, rest-direction fitting, tangent refresh and shared finish.
- `scripts/optimize-assets.mjs`, `scripts/glb-textures.mjs`: offline scene normalization and embedded-image resizing. `npm run assets:optimize` regenerates committed derivatives; this new texture step uses **macOS `/usr/bin/sips`**. Normal installation, development, tests and production builds use the checked-in derivative and do not need sips. On another OS, use an equivalent offline image tool before regenerating this asset.
- `docs/assets/{asset-audit,optimization-report}.json`, `public/ASSET_CREDITS.md`: source inspection, hashes, image sizes and preserved credits.
- `src/game/tests/{assetRegistry,visualPolish}.test.ts`, `scripts/optimize-assets.test.mjs`: source/pose/UV, tangent, material and derivative checks.

## Verification

- `npm run typecheck`, `npm run lint` (zero warnings) and `npm run build`: **passed**. Production build completed in 1.32 seconds; the app chunk is 235.41 kB / 75.85 kB gzip. This is bundle size, not a measured gameplay FPS result.
- Final `npm run test`: **395 tests / 33 files passed**, 207.07 seconds. This includes model fitting/batching/materials, offline derivatives, movement/collision, drift/boost, AI/race/checkpoints, items, selection flow and phone-input regression checks. The local relay tests ran with loopback permission. Earlier focused asset/material/derivative checks also passed: 73 tests / 3 files, then 59 tests / 2 files after tangent/emission refinements.
- `node scripts/audit-assets.mjs`, `node scripts/optimize-assets.mjs`, source byte-for-byte comparison against the latest supplied file and `git diff --check`: **passed**. Existing unrelated derivatives were preserved.
- Browser workshop: latest model loaded with all textures in Practice, Go Kart 64, DS and Boat. Side and quarter views checked body orientation, seated height, shoes, hands and intact clothing. Captures: [Practice](design-qa/new-spongebob/practice.png), [Go64](design-qa/new-spongebob/go64.png), [DS](design-qa/new-spongebob/ds-side.png), [Boat](design-qa/new-spongebob/boat-side.png).
- Normal flow: Quick Race → Racer Select displayed the latest portrait at common roster height; confirming reached Kart Select with “Driven by SpongeBob.” [Roster capture](design-qa/new-spongebob/roster.png). Existing Sonic / Boat Kart remained the saved profile; no new combo was committed.
- Workshop console error log was empty. Browser control subsequently timed out and its connection closed while capturing the normal kart preview; the final live race/grid/drift check remains **unverified**, not passed. A completed race or hardware/device test is not claimed.
- All 20 racer/kart assemblies retain common crown height, positive foot clearance, parent-motion attachment and source immutability in the real-model tests. The latest SpongeBob-specific check preserves over 5,000 non-limb vertices per fit, actually moves arms/legs, retains index/UV data, verifies finite orthogonal tangents and checks the two-mesh batch.

## Limits

This is an approximate **static mesh pose**. The supplied file has no bones or clips; seated driving/leaning/victory animations are not invented. Exact finger closure and tiny cockpit/seat intersections can still need Blender work, especially with the Boat Kart's limited visible steering geometry. Matching materials and proportions does not remodel every source character into identical topology or art. No triangle-perfect zero-clipping or measured FPS claim is made.
