# Milestone 4 — pickups and Spark Bolt (first slice)

Historical first-slice record. Banana Trap and the supplied Hutt ball were added afterward; see [current item follow-up](MILESTONE_4_ITEMS.md).

## Delivered scope

Quick Race, VS Race and every Sunshine Cup round now support track pickups and one held **Spark Bolt**. Time Trial and Free Drive remain item-free. This is the first playable M4 slice, not the full six-item combat milestone: shields, traps, roulette/position weighting and broader balancing are deferred.

Three rows at 12%, 44% and 76% of each sampled course contain three boxes at lateral offsets −3 / 0 / +3 m. Boxes disappear after collection and respawn after seven simulation seconds. A full inventory leaves the box for another racer. Swept collection chooses the earliest contact when racers contest a box. Inventory is per racer; finished racers cannot collect or be hit.

Spark Bolt fires straight ahead, never homes, inherits 35% of positive kart speed on top of 38 m/s and expires after 2.2 seconds. It uses swept tests against the existing kart capsule, target motion and vertical bounds. A subdivided sweep uses the same visible rail face as kart contacts. The nearest kart/rail consumes the shot; the owner is excluded. A hit retains 55% speed, cancels drift/boost and caps signed forward speed at 12 m/s for 0.8 s. A 1.6 s immunity interval absorbs later bolts without stacking another slowdown. Steering and position remain controlled by the existing simulation. AI uses the same item action when a target is ahead, within 34 m, aligned and unobstructed; waypoint navigation and pace formulas are unchanged.

Pause freezes pickup, projectile, effect and slowdown timers and disarms held use. Player recovery clears its held item, slowdown and outgoing shots, grants a short recovery immunity and preserves other world items. Restart or cup-round start clears all world items and inventories. Limits are 12 simultaneous bolts, 24 recent events, eight impact rings and 16 slowdown shards. Tunings live in `itemConfig.ts`.

## Controls and input compatibility

| Device | Use held item |
| --- | --- |
| Keyboard | E or either Shift key |
| Standard gamepad | X / square (button 2) |
| HUD | Click the held Spark Bolt card |
| Phone | ITEM beside DRIFT |

Release and press again for each use. Holding a use action through a pickup does not automatically fire it. Short keyboard/touch/HUD taps are buffered until a fixed tick. Existing throttle, brake, steering, drift, reset and pause mappings are unchanged. Phone protocol v1 accepts older clients that omit `useItem`; supplied values must be booleans. Relay whitelisting, neutral arming, blur/visibility cleanup and timeout safety include the new action. Host state enables the phone button only in an active CPU race.

## Supplied asset and rendering

The original Downloads file is preserved as `public/assets/items/question-mark-item-box.glb`. Its embedded metadata identifies **Question_mark_item_box**, aeti2016, Sketchfab source and CC BY 4.0. See `public/ASSET_CREDITS.md`; metadata is recorded rather than treated as independently verified release rights.

Inspection found seven static meshes, no skins, no animation clips, PBR cyan/gold materials, one transparent cube and one embedded 512 × 512 PNG. Source whole-object bounds including sparkles are approximately 2.795 × 2.397 × 2.520 units. Exporter transforms are retained; the runtime recenters the cube core and scales its largest side to 1.15 m. Rotation/bob is procedural, not an authored clip.

| Budget | Supplied source | Runtime derivative |
| --- | ---: | ---: |
| File bytes | 2,542,908 | 912,060 |
| Triangles | 83,288 | 25,156 |
| Meshes | 7 | 7 |
| Skeletons / clips | 0 / 0 | 0 / 0 |

`node scripts/optimize-item-box.mjs` regenerates the derivative with a 0.005 relative simplification-error budget. Source SHA and actual error (0.004988) are in `docs/assets/item-box-audit.json`. Materials, image bytes, UV/normal tuples, nodes and embedded credits are preserved and covered by derivative regression checks. `npm run assets:optimize` runs both existing racer/kart and new item pipelines; `npm run assets:audit` scans the source item too.

The GLB loads through Drei/useGLTF and the existing loader/template cache. Seven instanced part draws serve up to nine boxes, sharing template geometry/materials with manual frustum culling. Boxes do not cast shadows. Effects use instanced pools and simple unlit materials; no bloom, extra lights or per-frame geometry allocation. A procedural cyan pickup remains usable during load or if the GLB fails. HUD updates at 10 Hz and procedural pickup/fire/hit audio respects mute/pause and does not replay old events.

## Files and architecture

- New `config/itemConfig.ts`, `items/ItemSystem.ts`, `items/itemCollision.ts`: pure rules, inventory, timers, AI item decision and swept queries.
- `race/RaceSession.ts`: owns/ticks items on the existing fixed clock; buffers use pulses and resets/disarms through existing lifecycle paths.
- New `render/ItemVisuals.tsx`, `ui/ItemHUD.tsx`, `styles/items.css`: imported pickups, pooled effects and held-item interaction/status.
- `core/types.ts`, `controls/{keyboard,gamepad,inputSources,actionInput}.ts`, `render/{GameCanvas,runtime,DrivingAudio}.ts(x)`, App: normalized action integration, cleanup and original cues.
- Phone protocol/input/connection/controller, relay, styles and PC host state: validated remote action and mobile ITEM button.
- `tests/{items,itemInput}.test.ts`, extended input/phone relay/audio/derivative tests: behavioral coverage.
- `dev/RaceDiagnostics.tsx`: development-only input-driven item QA counters/pace/line/auto-use; no teleporting or direct browser state injection.
- Asset scripts/audits, preserved source/derivative, credits and root/phone docs.

## Verification

Verified on 2026-11-06:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings |
| `npm run test` | Passed: 255 tests / 23 files (127.16 s) |
| `npm run build` | Passed: 725 modules; Vite build 1.62 s after TS validation |
| `npm run assets:audit` | Passed; source box included |
| `node scripts/optimize-item-box.mjs` | Passed; derivative and hash/error report generated |
| `git diff --check` | Passed |

The new tests cover pickup/full-slot/contested contact/respawn, rising-edge use, moving/rotated/vertical target sweeps, nearest-hit ordering, owner exclusion, rail obstruction, slowdown/immunity, bounded world storage, AI firing gates, recovery/restart/pause, item-free modes, render-interval consistency and between-tick taps. Adapter tests cover E/Shift, X/square neutral arming, multi-touch/short taps, stale remote input, legacy protocol validation and HUD mixing. A real loopback Socket.IO test verifies item-enabled host state and a validated phone item action reach the host. Existing driving/drift/boost/AI/course/lap/VS/cup/collision regressions all pass. Asset tests preserve source hashes, credits, image bytes, material definitions and vertex attribute tuples; audio tests verify one cue per event and no muted/paused replay.

Browser verification used the real game and the development normal-input pursuit fixture, with no direct state injection:

- Sunshine Circuit Quick Race: three validated laps, 2:25.300 total, 0:44.894 best, first of four and **zero recoveries**. Counters at finish: **21 pickups / 20 shots / 7 hits** across all racers.
- Sugar Rush Valley VS: one validated lap, 0:49.851, first of four and **zero recoveries**. Counters: **6 pickups / 5 shots / 3 hits**. Existing VS lap setting and course transition worked.
- Inspected the supplied rotating question-mark box on the road, empty/ready HUD states, player slowdown shards, keyboard **E** consuming a held item and the HUD button producing **SPARK AWAY!**. AI collected, fired and hit the player.
- Pause disabled fire and preserved race time, held inventory and item counters; resume continued safely. Restart returned to countdown with an empty slot and a fresh world. Follow-up **R** recovery at speed cleared the held item and restored the kart; collection remained available afterward.
- Time Trial / Free Drive exclusion and item reset are regression-tested; a new full cup or Time Trial browser run was not performed in this pass. Existing human drift/boost listening and hardware checks remain manual.

Captures: `docs/milestone-4/pickups-and-held-item.png`, `sunshine-race-results.png`, `sugar-race-results.png`. The browser is restored to the ordinary `/` Home route with QA autodrive disabled.

Representative automated-browser render samples: Sunshine 118 draws / 446,598 triangles / 30 textures, median 33.3 ms / p95 44.8 ms; Sugar Rush 151 draws / 521,258 triangles / 33 textures, median 33.4 ms / p95 34.7 ms. These are individual local samples with imported racers, shadows and QA enabled, not a before/after benchmark or a 60 FPS guarantee. Geometry cache reached 215 geometries after all selected race models loaded; effects/pickups use bounded instance pools. Actual target-device performance and combat balance need human testing.

## Remaining work

Human combat balance, audiovisual listening, physical gamepad and iPhone/Android ITEM ergonomics, real WLAN jitter and focus/background behavior remain manual. Automated relay testing is not a physical phone pass. Local automated-browser frame timings are not a performance guarantee on other hardware. The existing upstream R3F/Three.Clock deprecation warning remains unsuppressed.

Projectile heading is constant and its vertical position is fixed at launch; it does not follow terrain or home around bends. Swept target orientation uses the current fixed-tick capsule heading. The game still has flat tracks and drift-entry hops, not ramps. No shields, traps, homing, roulette or online race networking were added. Next: human playtest tuning and an original defensive shield, then a readable trap/counterplay pass.
