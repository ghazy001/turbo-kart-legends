# Milestone 4 follow-up — Banana Trap and Hutt ball

Historical implementation record. Current pickup weights, recovery tuning and AI timing supersede the original fixed-box distribution below; see [Item balance](ITEM_BALANCE.md).

Historical two-item record. [Bubble Guard](BUBBLE_GUARD.md) was added afterward, including the current three-of-each pickup mix.

## Implementation

The supplied banana is now a real dropped trap. The supplied Hutt ball replaces the Spark Bolt projectile core; forward firing, speed, lifetime, hit shape and existing slowdown are unchanged. New cosmetics never resize kart colliders or take simulation ownership.

The nine pickup boxes on each course now have typed rewards: three Banana Traps and six Spark Bolts, configured deterministically by row/column. A box keeps its reward after respawn. This is a simple repeatable distribution, not a random or position-weighted roulette. Time Trial and Free Drive remain item-free. Quick Race, VS and cup races share the same item subsystem.

Use **E / either Shift**, standard gamepad **X / square**, the HUD card, or phone **ITEM**. Spark Bolt fires forward; Banana Trap drops behind. Each requires release and a new press. The HUD displays the actual held item, an original trap icon, drop/fire action and success/hit notices. The phone protocol and existing touch/keyboard buffering remain unchanged. AI chooses forward targets for bolts and trailing targets for traps without changing navigation.

## Trap rules

- Drops 2.4 m behind the kart center, using the current heading. No airborne drops above 0.2 m, no placement through a rail and no drops beyond the existing road boundary.
- 0.65 s arming interval, with a pulsing ground ring; 2 s owner grace. After grace, driving back into your own armed trap can trigger it.
- Ground hazard radius 0.55 m. Swept capsule tests catch fast crossings and choose the earliest contacting kart. Finished racers are excluded. Contact with an immune racer consumes the trap without stacking another slowdown.
- A grounded contact uses the same brief hit response as Spark Bolt: 55% retained speed, drift/boost cancellation, 0.8 s speed cap and 1.6 s immunity. No forced steering, teleport or new spin physics.
- A kart whose lower bound is above the 0.4 m ground hazard can hop over it. This is a ground-contact query, not a full mesh collider; decorative upper peel geometry does not change physics.
- Traps expire after 18 simulation seconds, with at most 12 live traps. Invalid/full-pool drops retain the item for a release/retry. Pause freezes timers and disarms use. Recovery removes that racer's outgoing projectiles and traps; restart/cup-round start clears the world.

All tuning is centralized in `src/game/config/itemConfig.ts`. RaceSession, fixed stepping, kart handling, AI navigation, checkpoint/lap/cup rules and camera retain their existing ownership.

## Model inspection and preparation

| Model | Source geometry / size | Runtime treatment |
| --- | --- | --- |
| Banana | 164 triangles, two identical mesh copies; ~66.662 × 46.412 × 56.794 source units | One 82-triangle mesh; duplicate `Object_4` hidden in a prepared instance. Center X/Z, bottom Y=0, 1.1 m maximum extent. Original preserved. |
| Hutt ball | 10,106 triangles; ~196.338 × 199.228 × 196.338 source units | 4,174-triangle derivative; 0.44 m centered diameter. Exporter hierarchy/axes incorporated into per-part transforms. Procedural rotation. |

Both have **zero skeletons and zero animation clips**. No rigging or authored animation is claimed. Banana uses a 64 × 128 PNG and double-sided PBR material. Ball has four embedded color/emissive/PBR/normal maps; source image bytes and material definitions are retained. Existing shared material preparation caps rendering textures to 1024 px, including correct GLTFLoader color-space settings. Ball still has a relatively large download (~7 MB), mostly embedded images; a future offline texture-compression export would reduce that further.

`combatModelParts` creates independent immutable transform matrices from the cached prepared scene, with shared template buffers/materials. `CombatModels` draws bounded, frustum-filtered instanced pools: one mesh draw per model. Models cast no extra shadows. The cyan bolt trail remains for readability and trap arming rings use a bounded pool. Each model has independent loading/error boundaries and a procedural fallback; a missing cosmetic cannot disable item collision.

Source copies: `public/assets/items/banana-trap.glb`, `public/assets/items/hutt-ball.glb`. Generated ball: `public/assets/optimized/items/hutt-ball.glb`. `node scripts/optimize-combat-items.mjs` or `npm run assets:optimize` regenerates the ball with a 0.006 simplification-error limit, preserving credits/images/attributes. Audit: `docs/assets/combat-item-audit.json`; full source inspection: `docs/assets/asset-audit.json`. No new dependencies are needed.

Embedded licenses differ: banana says **SKETCHFAB Standard**, ball says **CC BY 4.0**. Author/source links and modification notes are in `public/ASSET_CREDITS.md`. They are enabled for the user's requested local prototype; public-release rights are not independently verified.

## Changed modules

- `config/itemConfig.ts`: typed two-item registry, model definitions and hazard tuning.
- `items/ItemSystem.ts`: typed rewards, bounded traps, safe placement, arming/expiry, swept contacts, shared hit response and AI decisions.
- New `render/CombatModels.tsx`, `render/models/itemModel.ts`: reusable supplied-model pools and tested pivot/scale normalization.
- `render/ItemVisuals.tsx`: actual ball/banana visuals and arming rings; original trails/hit effects retained.
- `ui/ItemHUD.tsx`, pause help, phone controller: held-item-specific actions, icon and text. Existing normalized input adapters/transport unchanged.
- `render/DrivingAudio.ts`: original drop cue with existing event/mute/pause lifecycle.
- Asset scripts/reports/credits, source GLBs, derivative and asset optimization regression.
- Item, audio and real-GLB fitting tests. Development-only item preview adds a normal-input banana pickup lane and trap counters; it does not teleport the kart or inject race state.

## Validation

Verified 2026-11-07:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings |
| `npm run test` | Passed: **271 tests / 24 files**, 124.47 s |
| `npm run build` | Passed: 727 modules; Vite 1.25 s after TS validation |
| `npm run assets:audit` | Passed; both new supplied files inspected |
| `node scripts/optimize-combat-items.mjs` | Passed; ball 10,106 → 4,174 triangles, max relative error 0.005991 |
| `git diff --check` | Passed |

New tests cover both-course reward distribution, drop direction/fresh presses, arming, swept/contested contact, jump/finisher exclusion, owner grace, immunity, safe/invalid placement, pool cap, expiry, AI target direction, pause/recovery/restart and 30/60/144 Hz consistency. Real GLBs are parsed for normalization/pivot/source immutability checks; banana has one prepared part and its original duplicate remains untouched. Ball derivative tests preserve source SHA, materials, images, nodes and vertex tuples. The drop cue is included in once-only/mute/pause audio tests. Existing driving, drift, boost, collision, AI navigation, lap, cup, VS, keyboard/gamepad/phone/relay suites all pass.

Browser QA used ordinary game controls plus the development normal-input pursuit fixture (no direct simulation injection):

- Three-lap Sunshine Quick Race finished first of four in **2:13.026**, best lap **0:43.852**, **zero recoveries**. Field counters: **13 pickups / 7 shots / 2 traps / 3 hits**.
- Collected Banana Trap and used the HUD button twice: slot consumed and TRAP PLACED confirmed. The subsequent hit counter rose after the first drop, with no additional bolt fired in that interval. The trap ground/owner timing and hits are also independently unit-tested.
- Restart returned to countdown with an empty inventory and zero counters. On the following run, keyboard **E** consumed Spark Bolt and the actual red textured Hutt ball plus cyan trail was captured in flight.
- Pause disabled item use and kept race time fixed. Both source models reached Model ready in the existing `/?asset-inspect` workshop; textures, upright banana and centered ball were inspected. Inspection logged no errors. The final game log check reported no errors or combat model load fallback warnings. The previously documented upstream Three.Clock deprecation remains a known dependency limitation.
- Both-track placement/sweeps and regression simulations pass. A new Sugar Rush full browser race, full cup browser run, physical phone/gamepad input and listening checks were not performed in this follow-up.

Saved evidence: `docs/milestone-4/items/{banana-drop,hutt-ball-flight,mixed-items-results,banana-source-inspection,hutt-source-inspection}.png`. The game is restored to normal Home with the debug route and autodrive removed.

Representative local gameplay sample with both new assets loaded: **123 draws / 545,540 triangles / 217 geometries / 35 textures**, median **33.4 ms**, p95 **36.2 ms**. Those values include the existing imported racers, environment, shadows and QA; they are not a controlled performance comparison or target-device FPS guarantee. Instancing adds one part draw per combat model and one trap-ring pool, with no extra lights/shadow maps. Ball image download remains 7,360,676 bytes after topology reduction; texture compression is still an optimization opportunity.

## Limits and next work

Only the requested Banana Trap and existing Spark Bolt are implemented. No shield, homing, explosions, shield counters, online networking or six-item weighted distribution was added. The model's franchise styling is supplied local art, not original release artwork. Trap balance, visibility during crowded races, audio listening, actual mobile/gamepad ergonomics and cross-device performance still need human playtesting. Physical devices have not been tested in this pass.
