# Racer cockpit fitting — 2026-11-17

## Problem and corrections

The old kart seat markers were approximate pelvis positions. They did not represent the actual cushions, and the same root placement was used for bodies with different hip/body shapes. This left some drivers above the seat and others intersecting its padding. Generic leg folds also left feet floating or below the footwell. Static arm fitting targeted wrist references rather than palm centers. Crash's broad arm filter could deform connected face vertices, and two nearly overlapping source shells were rendered together. The supplied Boat Kart has a seat and windshield but no usable visible steering wheel at its old hand targets.

The shared visual assembly now resolves every racer against measured cockpit data:

| Kart | Cushion height / forward position | Footwell height |
| --- | --- | --- |
| Practice | 0.453 / −0.28 m | 0.190 m |
| Go Kart 64 | 0.635 / 0.07 m | 0.500 m |
| DS | 0.207 / 0.035 m | 0.100 m |
| Boat | 0.661 / −0.31 m | 0.355 m |

These are decorative assembly coordinates, derived by inspecting source geometry/seat surfaces. They are **never collider or handling dimensions**. Kart source transforms, wheel radii, collider shapes and road contact remain unchanged.

- **Mario:** body-mounted clearance above each cushion and footwell fitting; existing source-specific sleeve/glove fit is retained and recomputed for the corrected mount.
- **Sonic:** existing skeleton fitted per cockpit, smaller seated gloves (0.72) and shoes (0.76), static finger curl and grounded feet. Head/body/quills retain the shared seated proportions. Independent bones remain independent across actors.
- **Arnold:** pelvis rests against the cushion; source head/neck/headphone islands remain protected, while arms fit palm targets and legs settle to the footwell.
- **SpongeBob:** actual pants geometry rests just above each cushion (tested within 12 mm); only the named limbs are fitted. Face/clothing/UVs remain intact. Shoes settle together without flattening each mesh separately.
- **Crash:** arm deformation now uses a source-space start/depth mask to protect the face. The expanded finger-height region avoids leaving fingertips in their old positions. Only the overlapping `CRASH001_Material_0` outline shell is omitted from seated clones; the supplied source and standing portraits remain intact. The crown reference uses the actual remaining visible surface.
- **Boat Kart:** a small original procedural steering wheel now gives the fitted palms a visible contact surface behind the windshield. It is cosmetic, with no input or collision ownership.

All twenty combinations retain the same source-forward orientation and normalized crown proportions. The correction resolves placement and extremity proportions; it does not remodel the source art.

## Animation and attachment facts

Inspection confirms **zero animation clips in all five racer files**. Sonic has one skin / 56 joints; the other four are unrigged. These are fitted static driving poses, including a static joint/finger fit for Sonic, **not authored driving, leaning or victory animations**. The existing explicit clip-mapping pipeline remains intact for future compatible exports.

KartAssembly's wheel/body/seat/driver stay under the same existing visual motion parent. Heading, body bank, drift yaw, road pitch, jump height and landing compression therefore carry the complete fitted assembly together. Boosting does not introduce a separate driver transform. No per-frame mesh deformation, IK solve, React state writes or new simulation clock was added. Preparation, palm fitting and foot support are computed once for immutable cached templates; instances receive separate objects/bones.

Exact finger wrapping on the four unrigged sources, cloth deformation and authored seated/steering/leaning clips still require artist rigging/export work. A clean reviewed fit is not a promise of triangle-perfect intersections at every possible viewing angle. Source silhouettes, large quills and deliberately open palms can require further artistic cleanup.

## Files and tuning

- `config/visualAssets.ts`: measured cockpit cushion/footwell, original Boat wheel, body-specific cushion clearances, palm reach, seated rig extremity scales and Crash masks.
- `config/racerStyle.ts`: visible seated Crash crown measurement; standing portrait normalization remains independent.
- `render/models/driverFit.ts`: `resolveDriverMount` and hand/foot target conversion through the complete actual seat/mount matrices.
- `render/models/staticCockpitFit.ts`: one-time two-pass static fitting; all shoes share one foot-support correction, with a smooth leg blend and rigid shoe translation.
- `render/models/{staticPose,rigSeatPose,prepareModel}.ts`: safe source-region masks, existing-joint grip and foot support; source GLBs/geometry are never overwritten.
- `render/KartAssembly.tsx`: resolved driver mount, visible Boat wheel, actual cushion/palm development markers. Player, AI, Home, Kart Select and podiums share this component.
- `dev/AssetPreview.tsx`: resolved transforms, bare-cockpit visibility and labeled static bank/jump/landing attachment checks. Preview edits do not affect saved profiles or live racing.
- `tests/{assetRegistry,visualPolish}.test.ts`: real-model footwell contacts across twenty combinations, actual pants support, palm reference checks, source face preservation, rig independence and static capability checks.
- `scripts/inspect-cockpits.mjs`: repeatable geometry-only GLB inspection, real seat ray scans, mesh/bone metadata and actual prepared bounds; writes `docs/cockpit-qa/inspection.json`. Textures are omitted only in this Node inspection, not in the game.

To tune a future asset: inspect units/axes/bones/clips first, measure its visible pelvis/body clearance and palm references, set the kart cushion/footwell/grips, and inspect every combination at `/?asset-preview`. Driver editor values are **resolved per-combination local mounts**, not replacements to paste blindly into the global source transform. Compatible authored clips need explicit names and binding validation. Keep source files, credits and physics unchanged.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed, zero warnings.
- `npm run build`: passed, 802 modules, Vite 1.62 s after TypeScript validation. App chunk 292.99 kB / 95.09 kB gzip; no dependency changes.
- Focused registry/material/fitting run: **63 tests / two files passed**. The five existing supplied-model checks also passed in the earlier three-file run; all are included in the final full suite below. No existing gameplay assertions or timeout budgets were weakened.
- `node scripts/inspect-cockpits.mjs` and `git diff --check`: passed.
- Full suite: **500 / 500 tests across 42 files passed in 169.64 s**, using `/usr/bin/caffeinate -i npm run test` with the existing two-worker script and local loopback permission for phone-relay tests. Coverage retains driving, steering, collision, drift/boost/jump, competitive AI, four-course items/races, checkpoints/cups/VS/Time Trial, models, menus and keyboard/gamepad/phone input.

Real-model checks now require footwell contact within 5 mm across all twenty fits, instead of merely requiring feet to be somewhere above the road. Generic palms target the existing grips after source-space palm reach; Sonic uses actual independent hand joints/scaled palm offset. SpongeBob's actual pants support, Crash face/outline isolation and static Sonic finger/extremity fitting are checked alongside source/UV/bone immutability. Existing parent-motion tests retain rotated, elevated and compressed assembly checks.

### Visual review

All twenty textured assemblies loaded in the development workshop, with saved three-quarter captures in `cockpit-qa/fits/`. Side views checked Mario/Practice, Arnold/Go64, Sonic/DS and SpongeBob/Boat. Separate Boat/SpongeBob bank, airborne/pitch and landing-compression views checked attachment under a shared parent; these are explicitly visual presets, not simulated jumps. Workshop browser error log: empty.

[All combinations](cockpit-qa/contact-sheet.jpg) · [side review](cockpit-qa/side-review.jpg)

`cockpit-qa/baseline.json` preserves the pre-change geometry inspection; `inspection.json` records the final model preparation. They preserve zero-clip/rig facts and actual source bounds rather than inventing animation capabilities. The existing source credits and local-use licensing caveats remain unchanged.

### Live race

The saved Sonic / Boat Kart profile completed a normal-setup three-lap Sunshine Circuit Quick Race in the in-app browser: **1:50.381**, laps **37.917 / 36.230 / 36.234 s**, **zero recoveries**, 12 ordered gates per lap. The player recorded **15 boosts, three jumps and three landings**. All three opponents reached lap three and remained classified by the existing player-finish rule. The field recorded **19 real pickups / 19 Turbo Charge uses**.

This used the existing explicitly labeled development fixed-Turbo pickup fixture plus normal-input autodrive/item actions, without setting poses, timers, inventory or progress directly. It checks attachment and race operation under repeated boosts/jumps, not balance or human driving skill. AI's ordinary drift/hop behavior also remained active. No gameplay/AI/camera input logic was edited for this check.

Browser error log after the race: **empty**. Captures: [validated results](cockpit-qa/race-results.png), [real starting grid](cockpit-qa/live-grid.png). Browser automation briefly timed out during one live observation; the recovered tab showed the completed race, with no application render error. The temporary QA tab was closed before the full regression suite.

An observed final scene sample showed **174 calls / 488,438 triangles / 298 geometries / 65 textures, median 16.7 ms / p95 23.0 ms**. Views/loading/host scheduling differ; this is not a controlled before/after GPU benchmark or a guarantee across devices. Preparation stays outside the frame loop, Crash's duplicate seated shell is omitted, and the small original Boat wheel adds four lightweight meshes only when that kart is present.

## Remaining manual checks

Physical phones/gamepads and Safari/Firefox/low-power GPU testing remain manual. Artist-authored fingers/animation and source topology cleanup remain separate work; no new clips or remodelling are claimed. The fitting pass preserves gameplay, AI, collision, cameras, ability timing, race rules, saved selections and track records.
