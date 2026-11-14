# Volcano Sprint — fourth original circuit

Implemented 2026-11-14 following the user's accepted fourth-track / expanded-cup recommendation.

## Play

Run `npm install && npm run dev`, then Quick Race / Time Trial / VS → Racer → Kart → **Volcano Sprint** → review → Start race. Grand Prix now runs **Sunshine Circuit → Sugar Rush Valley → Frostbite Peak → Volcano Sprint**. Three laps and Normal CPU remain the cup rules. Each round still awards 10 / 7 / 4 / 1 points, so a four-win champion earns **40 points**. Cup progress remains session-only.

Controls remain WASD/arrows to drive, Space for hop/drift/release turbo, E/Shift for an item, R for recovery and Escape for pause. Existing gamepad and optional phone controls use the same normalized input. Time Trial and Free Drive stay item-free.

## Content

- Original ~756 m continuous closed loop, 11 m-wide, using 14 spline control points. A launch straight leads into an east-side kink and linked western caldera bends. An early too-tight control point was opened after the road-edge test caught a fold; the revised complete ribbon passes nonintersection and traversal checks.
- Original procedural dusk scenery: muted purple ground/sky, clearly contrasting pale road, amber rails, hexagonal basalt columns, ten faceted crater peaks, glowing crater disks/seams and three lava fields.
- Lava, cliffs and columns remain **outside** the road/rail corridor. Their shared layout rejects placements using conservative nearest-road envelopes. Scenic lava is not a damaging hazard, ice/surface modifier or new collider. The road remains flat, with unchanged handling, grip, boost/drift and camera behavior.
- The existing catalog automatically supplies road, solid rails, twelve ordered gates, starts, course minimap, pickup positions, CPU navigation, VS options and per-track Time Trial record/ghost compatibility.
- Track preview reuses the sampled road and actual lava-pool positions. Course/round counts, maximum points, setup review and results use existing central definitions. Four-course menus have compact thumbnails, a sticky action footer and clipped backdrop overflow; keyboard hints now contrast with their footer.
- The gameplay brand switches to light text over the darker volcanic scene. No new source GLB, downloaded asset, dependency or backend was introduced.

## Files

New:

- `src/game/tracks/volcanoSprint.ts` — source circuit.
- `src/game/tracks/volcanoScenery.ts` — bounded deterministic crater/pool/column layouts and clearance constants.
- `src/game/render/VolcanicScenery.tsx` — instanced volcanic scenery.
- `src/game/render/volcanoGeometry.ts` — slender lava seams on the actual nine-sided frustum faces.
- `src/game/tests/volcano.test.ts` — selection/persistence, scenic clearance and geometry-budget checks.

Updated: track catalog, Environment, App's development reload list and track label attribute, Home/course previews, menu/Time Trial/game CSS, index metadata, cup/results/Frostbite content fixtures and root docs.

No core movement, drift/boost, collision solver, collider dimensions, AI navigation/pace, item logic, race/checkpoint/scoring, record eligibility or chase-camera implementation was changed. The existing cup definition gained its fourth course; generic fixtures now finish the entire configured itinerary. Fixed three-round score examples retain an explicit three-course fixture rather than silently changing the scoring assertion.

## Rendering budget

- Three batched lava-field layers; three batched peak/rim/crater meshes; one merged seam mesh; one basalt-column mesh. **Eight scenery draw batches**, plus the nearby columns' existing shadow pass.
- Ten crater peaks, at most 72 columns, three scenic pools. No particle weather, bloom, new light, point-light shadows, per-frame geometry/material allocation or scenery React timers.
- The seam mesh has 420 vertices / 360 triangles. Other meshes use small shared primitive geometries. All placement is memoized; generated seam geometry is disposed on course unmount.
- Existing game DPR ≤1.5 and 1024² shadow map remain. Distant peaks and lava do not cast shadows. Lava uses original flat colors without a texture or postprocessing pass.

A representative moving browser snapshot reported **113 draw calls / 368,691 triangles / 199 geometries / 35 textures**, with 16.6 ms median / 27.2 ms p95 frame intervals. The grid snapshot was 185 calls / 594,494 triangles; counts depend on camera, visible karts, shadows and items. Busy-host snapshots reached 23 ms median / 41.6 ms p95, and 17.5 ms median / 51.9 ms p95 near a later finish. Geometry/texture counters remained at 199 / 35 after the initial loads and through the replay. These are informal local observations while the exhaustive suite was also running, not an isolated benchmark or cross-device 60 FPS guarantee. Final quality gates: `npm run typecheck`, `npm run lint`, `npm run test` and `git diff --check` passed. The regression rerun passed **371 tests in 31 files** in **264.44 s** with the normal two-worker script. `npm run build` also passed after TypeScript validation: **756 modules**, completed in **2.62 s**. The main app chunk is 225.92 kB / 72.38 kB gzip; the existing podium remains a separate 7.26 kB chunk. No dependencies changed.

## Verification

Targeted checks passed: **39 tests in five files**, including all four complete cup rounds, full three-lap combat races, Time Trial recording/playback and presentation classification. The revised shared geometry suite passed **28 tests** across all four tracks. Four new Volcano-specific tests cover course selection/persistence, complete lava-rim clearance, bounded cliff/column placement and finite nondegenerate seam geometry.

Normal-input headless results:

- Volcano combat, seed **8244**: **151.283 s**, player first, recoveries **[0, 0, 0, 0]**. Counters: 18 pickups, 6 shots, 2 traps, 7 guards, 6 hits. Rewards: 8 Spark Bolts, 3 Banana Traps, 7 Bubble Guards.
- Volcano clean Time Trial: **149.749 s**; laps **51.105 / 49.316 / 49.328 s**; reloaded ghost **1,499 frames / 82,233 JSON characters**. Playback did not mutate the finished kart state.
- The four-round cup integration traversed every gate through ordinary inputs, checked road containment, committed results once and verified total field points. Maximum winner points are 40, total field points 88. Round restart, final countback and championship podium tests remain enabled.

Browser: the four-course roster and four-race cup/40-point maximum were inspected. Evidence: [track selection](volcano-qa/track-selection.png), [cup itinerary](volcano-qa/four-race-cup.png). The subsequent full browser Quick Race used development normal-input autodrive and the same item action, without teleporting or skipping validation: **2:30.812**, first of four, **zero recoveries**, all 12 gates per lap. Laps: **51.425 / 49.878 / 49.510 s**. Rivals were on lap three at the player finish. Counters: 16 pickups, 9 shots, 1 trap, 4 guards, 1 block, 7 hits. The existing podium classified You → Nova → Breeze, with unfinished rivals marked On track. Enter on Race again returned to a fresh countdown, zero time and empty item counters. The replay completed at **2:30.789**, again first with zero recoveries; its item counters matched the seeded restart. Camera/rail readability was inspected through the east-side bends, and the brand remains readable against the darker sky. See [validated race result](volcano-qa/race-results.png) and [live caldera bends](volcano-qa/caldera-bends.png). An initial browser tab closed during QA; that interrupted attempt is not counted as a completed race. Captured browser error logs were empty.

The first full suite passed 370/371 tests. The Volcano combat fixture reached its assertions with zero recoveries but took 72.093 s against the old 60 s limit under host load. It now uses Frostbite’s existing 120 s allowance; all simulation ticks, samples and assertions are retained. No race or collision logic changed.

## Limits and next work

This completes the original four-course set as a flat-road prototype. It does not add falling-in-lava damage, ramps, moving obstacles, shortcuts or elevated terrain. Scenic crater tops are simple glowing disks, not an eruption/terrain simulation. Existing supplied driver art remains locally permitted, static and unrigged. Human drift/AI/combat tuning, physical phone/gamepad tests, audio listening and Chrome/Firefox/Safari GPU checks remain manual. A complete four-round browser championship is not claimed unless specifically recorded; automated full-cup integration supplies that regression coverage. Original release art and device playtesting remain higher priority than another content expansion or online networking.
