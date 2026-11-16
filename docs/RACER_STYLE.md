# Racer consistency pass

Roster update (2026-11-16): Sonic now replaces Aang, retaining the same 2.3 portrait / 0.94 seated crown standards and matte finish. Sonic has a real skin but no clips; the other four selectable racers remain unrigged. The original measurements and QA below describe the earlier Aang roster. See [current Sonic fitting and verification](SONIC_INTEGRATION.md).

Portrait fitting previously used height and arm span, making wide or outstretched characters appear shorter. Seated drivers also used unrelated hand-tuned scales. Portraits now share a 2.3-unit height; seated drivers share a 0.94-unit crown height above the pelvis/seat before each kart's existing seat transform. Uniform scaling preserves silhouettes: broad heads and slim bodies still differ naturally.

## Implementation

- `racerStyle.ts` records inspected source crown/pelvis heights and shared decorative proportions/material values. `visualAssets.ts` derives driver scale from those measurements.
- `racerPresentation.ts` grounds/centers full-height portraits and applies a matte finish: zero metalness/clearcoat, 0.85 roughness, reduced normal strength and environment reflections. Albedo textures, colors, alpha and UVs remain intact.
- `modelInstances.ts` caches separate source/matte material clones. Immutable buffers/materials stay shared; transforms remain independent. No source GLB changes or per-frame fitting/material allocations.
- `driverFit.ts` applies the same finish to the existing seated assembly used by player, AI, menus and podiums. Existing per-kart hand targets remain authoritative. Portrait thumbnails use a slightly wider field of view to accommodate extended arms without shrinking individual bodies.

| Racer | Previous seated scale | New seated scale |
| --- | ---: | ---: |
| Mario | 0.240 | 0.227 |
| Aang | 0.650 | 0.737 |
| Arnold | 0.620 | 0.582 |
| SpongeBob | 0.750 | 0.836 |
| Crash | 0.850 | 0.969 |

The crown-to-seat distance previously ranged from about 0.825 to 1.002 units. All five now measure 0.94 in the same seat space. Kart seat scales remain unchanged. Physics, colliders, handling, AI, race rules, inputs and gameplay camera were not edited.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run build` and `git diff --check`: passed.
- Focused asset/material suite: **60 tests in 2 files passed**. Full regression suite: **389 tests in 32 files passed**, 210.39 seconds. Existing phone tests used loopback access; standard test timeouts were unchanged.
- All **20 racer/kart combinations** pass real-model finite-bounds, positive foot-height, common seated crown height, parent-motion attachment and source-immutability checks. Existing wrist-target checks cover 16 generic static-pose combinations; Mario retains its prior approximate glove fit.
- All five seated racers were visually reviewed in the same Boat Kart workshop. Menu portraits and a seated Aang preview were also inspected. This is comparative presentation QA, not an artist-certified no-intersection result for every mesh pair. Source T-poses, expressions/accessories and approximate hand/body intersections remain on some models.
- Build: 765 modules; App JS 233.56 kB / 74.87 kB gzip, CSS 68.44 kB / 14.25 kB gzip. No new dependencies, downloaded textures or geometry assets.

## Extending and limitations

For a new driver, inspect Y-up source bounds and the pose's pelvis reference, add both measurements to `racerStyle.ts`, and derive its registry scale with `seatedRacerScale`. Configure the existing static pose/seat targets, inspect every cockpit in `/?asset-preview`, and extend real-model tests. Do not normalize using full arm span or change collider dimensions to suit a mesh.

This unifies proportions, framing and surface response; it does not rebuild the supplied models into an identical art style. All five sources remain unrigged with zero animation clips. Matching facial proportions, topology, clothing, textures, accessory removal and authored driving poses requires Blender/artist work. Original files and embedded credits remain preserved; local-use permission does not establish independently verified public-release rights.

Captures: [Racer Select roster](design-qa/racer-style/roster.png), [Aang in the Boat Kart fitting workshop](design-qa/racer-style/aang-boat.png). The isolated QA tab reported no browser errors and was closed; the user's original tab was preserved.

## SpongeBob clothing correction

The earlier `hideWhileDriving: ['Object_2']` entry incorrectly treated that entire node as a prop. Inspection found pants-bottom and waistband cap faces in the same node as bubble-wand details. Removing it opened the clothing; the consistency pass also exposed that omission in portraits. The registry now retains the complete node in all presentations. No original/optimized GLB, racer scale, pose formula, material or gameplay system changed. The wand remains until an artist separates it safely from clothing.

The real-model regression checks more than 200 clothing-cap vertices against their original positions (apart from the existing seated pelvis translation) for the portrait and all four cockpit fits. Existing generic hidden-node behavior remains independently tested. Browser inspection checked the restored portrait and Boat Kart front-quarter/side views; captures: [portrait](design-qa/spongebob-fix/portrait.png), [seated side view](design-qa/spongebob-fix/seated.png). No browser errors were recorded. Focused asset tests: **61 passed**; typecheck, lint and production build passed.

Full regression run: **390 tests / 32 files passed in 244.44 seconds**, with loopback access for existing phone tests. `git diff --check` passed. The temporary browser QA tab was closed; original source assets and the user's tab were preserved.
