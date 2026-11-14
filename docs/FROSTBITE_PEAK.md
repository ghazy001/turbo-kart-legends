# Frostbite Peak — third original circuit

Implemented 2026-11-08 following the user's accepted third-track / expanded-cup recommendation.

## Play

`npm install && npm run dev`, then Home → Quick Race / Time Trial / VS → Racer → Kart → **Frostbite Peak** → review → Start race. Grand Prix → Sunshine Cup now runs **Sunshine Circuit → Sugar Rush Valley → Frostbite Peak**. Each round still awards 10 / 7 / 4 / 1 points; the winner can earn 30 across three rounds. Cup progress remains session-only.

Controls are unchanged: WASD/arrows drive, Space hops/drifts/releases turbo, E/Shift uses an item, R recovers and Escape pauses. Standard gamepad and optional phone input use the same existing normalized input. Time Trial and Free Drive remain item-free.

## Content and integration

- Original ~853 m continuous, 11 m-wide alpine loop with 14 spline control points, broad sweepers and flowing esses. The road stays flat with **unchanged grip, handling and collider dimensions**. There are no ice patches, ramps or new surface rules.
- Snow-covered pines, low-poly mountains, snowbanks, cool lighting and a blue road/rail palette. Original procedural art only; no external models, textures or dependencies added.
- Two road-following open tunnels: **Glacier Gate**, 32 m, and **Summit Pass**, 28 m. Shells use the same sampled centerline as the road. Interior half-width 12.8 m, roof height 11 m at center. Existing rails remain the collision authority; tunnel walls and portal markers sit outside them.
- A single catalog entry automatically supplies the existing road mesh, rails, 12 ordered gates, starts, minimap, pickups, CPU navigation, VS options and Time Trial recording/ghost compatibility.
- Cup itinerary, course/round labels, preview routes and maximum points now derive from the central definitions. Three-course selection fits the existing scrolling/responsive menu shell.
- Previous course definitions, physics/drift/boost, collision response, AI steering, checkpoint/race rules and chase camera were not edited for this extension.

## Files

New:

- `src/game/tracks/frostbitePeak.ts` — source loop.
- `src/game/tracks/frostbiteScenery.ts` — shared tunnel profile/placement, mountain clearance and snowbank constants.
- `src/game/render/alpineGeometry.ts` — continuous open-portal shell geometry.
- `src/game/render/AlpineScenery.tsx` — tunnels, signs and instanced mountains/snowbanks.
- `src/game/tests/frostbite.test.ts` — selection and scenery regression checks.

Updated: `trackCatalog.ts`, `Environment.tsx`, App's development reload list, menu mode/home/review/course components, menu/Time Trial layout styles, index metadata, cup/item/VS regression fixtures and root docs. Existing course-parameterized tests automatically exercise Frostbite. Full three-race cup integration retains all checkpoint/boundary/scoring assertions; its wall-clock timeout is 180 s. Frostbite's exhaustive combat/VS fixtures allow 120 s on busy hosts; shorter existing budgets remain for the old circuits.

## Rendering budget

Mountains use two instanced meshes, snowbanks one, snowy tree caps one. Each tunnel is one memoized geometry/material plus portal signage/markers. The longest shell uses 510 vertices / 1,016 triangles. No per-frame geometry allocation, particle weather, new shadow light or downloaded texture. A browser center-lane snapshot reported 95 draw calls / 406,678 triangles (view dependent), with roughly 17 ms median and 27 ms p95 frame intervals while the exhaustive suite was running. These are informal local observations, not an isolated benchmark or device guarantee. Existing DPR cap and 1024² shadow map remain. Tunnels cast shadows; distant mountains and tree caps do not. Forest props are excluded from tunnel envelopes.

## Verification

`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` and `git diff --check` passed. The production build transformed 745 modules and completed successfully in 2.24 s after TypeScript validation. The full Vitest run passed **339 tests in 29 files**, taking 340.70 s with two workers on this host.

Browser QA used the development normal-input autodrive (no teleporting/checkpoint injection): Frostbite Quick Race completed all three laps in **2:39.916**, first of four, **zero player recoveries**, laps 54.504 / 52.702 / 52.710 s. All rivals were on lap three at player finish. Combat counters: 15 pickups, 7 shots, 2 traps, 3 guards, 6 hits. The existing focus-loss pause appeared during countdown and resumed without a time jump. Restart returned to a fresh countdown. Browser snapshots showed readable road/rails, snowy scenery and a clear chase view at the tunnel portal/exit; extreme manual drift near tunnel walls remains unverified. Captured browser error log was empty.

Evidence: [three-race cup](frostbite-qa/three-race-cup.png), [alpine gameplay](frostbite-qa/alpine-race.png), [tunnel exit](frostbite-qa/tunnel-race.png), [validated results](frostbite-qa/race-results.png). Full cup progression/scoring and all CPUs finishing are automated checks; a full three-round browser championship was not run.

Targeted normal-input headless runs already reached:

- Frostbite three-lap combat race, seed 8243: 162.7 simulated seconds, player first, **zero recoveries for all four racers**; 16 pickups, 7 shots, 3 traps, 3 guards and 8 hits.
- Frostbite clean three-lap Time Trial: 160.129 s, laps 54.574 / 52.775 / 52.781 s; reloaded ghost 1,603 frames, 88,591 JSON characters.
- All 21 shared track geometry/constraint/traversal tests passed across the three courses, including reverse traversal and road-edge nonintersection.
- Six new scenery/selection checks passed, including both tunnels' finite/nondegenerate geometry and conservative normal chase-camera clearance at ±3.6 m lanes.

Early exhaustive cup/combat runs reached their assertions but exceeded the old 60 s wall-clock budget after adding the third/longer course. Only those long-running fixture budgets were expanded; assertions and simulation ticks were retained.

## Limits and next checks

This is a scenic alpine circuit on the existing planar simulation, not an elevated mountain/ice physics update. The tunnels are short open archways rather than terrain excavation; hemisphere illumination keeps the interior readable. The conservative sampled camera-clearance test does not replace human extreme-drift/near-wall camera inspection. Real iPhone/Android, physical gamepad, audio listening and cross-browser/GPU measurements remain manual. No claim of release-art licensing changes or a universal 60 FPS guarantee is made. Recommended next work is human course/combat/AI tuning and original seated driver art before another content expansion.
