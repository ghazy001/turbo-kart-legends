# Wall and opponent collision fix

## Problem and cause

The old wall collider reserved a 1.8 m circle around the kart center, while visible rails started another 0.22 m beyond the road edge. This left excessive side clearance. Every outward wall-contact tick also multiplied the **entire** remaining velocity by 0.82. Repeated light scrapes could therefore drain nearly all forward speed. Opponents used a separate 1.55 m circle, which could react to diagonal closing speed during visually clear side overtakes.

## Change

- One shared, cosmetic-independent **longitudinal capsule**, **2.4 m wide × 3.1 m long**, now handles both walls and opponents. It has a 1.2 m end radius and a 0.35 m center-segment half-length. The original 1.8 m radius remains only a conservative broad-phase/art envelope.
- Side clearance now reflects the narrower kart profile; longitudinal contact reach remains the former opponent circle's 1.55 m. Every kart/driver selection has identical collision behavior.
- The wall limit uses capsule support in the road-normal direction. Both rendering and collision read the same rail center/width constants, resolving against the visible inner rail face with the existing 4 cm skin.
- Wall contact removes outward velocity while preserving tangential velocity. There is no repeated 18% whole-velocity loss.
- Opponent contact uses exact closest points between the two capsule axes. A clear side gap produces no contact or braking. Actual side contacts mainly alter lateral motion; real rear-end impacts still exchange closing speed.
- Existing bounded solver iterations, equal-mass impulse response, rail projection, hard-hit drift/boost cancellation, solid airborne/boosted boundaries and reverse recovery remain. Handling, AI navigation, lap/cup/VS rules, camera and source GLBs are unchanged.

This is deliberately a shared arcade collision proxy, not per-triangle/model-dependent physics. Decorative wheel/driver overhang and the different supplied silhouettes need not match it pixel-for-pixel. Cosmetic swaps provide no physical size advantage.

## Files

- `src/game/kart/kartFootprint.ts`: shared capsule axes, directional wall support and exact closest-segment contacts, including parallel/crossing/coincident cases.
- `src/game/kart/kartCollision.ts`: visible-face wall constraint and normal-only velocity removal.
- `src/game/race/racerCollision.ts`: shared capsule contacts; existing response/ability rules retained.
- `src/game/config/{kartConfig,raceConfig}.ts`: shared footprint, rail position and numerical separation margin; removes obsolete wall-retention/opponent-circle settings.
- `src/game/render/TrackVisual.tsx`: visual rail geometry uses those same constants.
- `src/app/App.tsx`: development reload boundary for collision/config changes, so older controller instances cannot survive HMR.
- `src/game/tests/collision.test.ts`, `tests/helpers/roadBounds.ts`: 17 new behavior/geometry checks and an independent full-footprint rail-envelope assertion.
- Existing track/drift/AI tests now validate the oriented footprint rather than the obsolete circle. Existing AI line/recovery limits remain and pass.
- `src/game/dev/RaceDiagnostics.tsx`, `render/{GameCanvas,runtime}`: optional development pursuit-line selection for browser collision QA. Only normal KartInput is generated; positions, clocks, checkpoints and race state are never injected.
- README, architecture, roadmap and scope notes document the correction.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test`: **195 tests / 19 files passed**, including the full cup, custom VS races, AI, drift/boost, input/phone and asset regressions (74.85 s final full run).
- `npm run build`: passed; no dependencies added.
- `git diff --check`: passed.

New regression coverage:

- Clear near-wall travel on both sides preserves speed/turbo and does not trigger collision.
- Two seconds of one-degree wall scraping keeps speed above 17 m/s and advances over 34 m, while staying contained.
- Repeated positional correction does not drain parallel velocity.
- Boosted head-on contact remains blocked, cancels boost, and allows reversing away.
- Both rails of both courses contain disks sampled along the complete capsule, across track bends and headings.
- Close staggered overtakes with a real side gap leave both karts unchanged.
- Side contacts separate without killing forward speed; rear-end impacts still exchange speed/cancel boost.
- Rotated/parallel/crossing/coincident contacts are finite, symmetric where defined and resolve without escape.

The full normal-input AI/race/cup/VS suite passes with unchanged navigation, recovery and checkpoint rules. Existing strict CPU line/wall-contact limits also pass.

## Browser QA

Use `/?race-preview&collision-preview`, choose a race, enable **Autodrive with normal inputs**, and select **Center**, **Near rail (+4 m)** or **Near rail (−4 m)**. The selector affects only the existing pursuit input fixture and is unavailable on the normal production route. Debug controls are not player settings.

- Sunshine Circuit, one-lap Normal VS with CPU traffic, +4 m outer line: completed in **0:47.726**, zero recoveries. Observed **61 km/h** alongside the visible rail while still advancing checkpoints.
- Sunshine Circuit, −4 m inner line: completed in **0:44.584**, zero recoveries. Both near-rail races ran with the normal controller, checkpoint validation and CPU traffic.
- Restored the original 3-lap/Normal VS defaults and returned to the normal Home URL. Development autodrive/line selection is not left active.
- A browser-automation focus timeout during setup was inspected before continuing; the action had already advanced to Kart Select. No focus-safety behavior was disabled for testing.

Screenshots are saved in `docs/collision-qa/`. Cross-device human handling and visual art-fit checks remain manual; automated geometry and gameplay checks are not a claim of per-triangle mesh collision.
