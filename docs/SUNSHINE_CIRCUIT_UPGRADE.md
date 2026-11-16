# Sunshine Circuit — coastal venue and track features

## Delivered scope

Sunshine alone gets a smoother asymmetric 743 m loop, the existing 11 m driving width, a 38 m long / 1.4 m high continuous coastal roller, two directional turbo strips and a crest launch. There are no missing road sections: slow/reverse racers can drive across the roller normally. Steering, drift charge thresholds, gravity, existing boost tiers, input mappings, AI pursuit, lap gates, scoring and kart capsules retain their existing tuning. Other courses retain their flat surfaces, themes and cameras.

The venue uses original procedural scenery: palm-lined verges, a sheltered lagoon and lighthouse landmark, harbor garages/clubhouse, spectator terraces, flowers, stone clusters and reflector posts. Instanced scenery stays outside the road. The lighthouse wind vane and gentle water/material/boost-pad pulse animate while playing; these decorations do not create invisible obstacles. Existing starting arch/flags remain.

Asphalt uses deterministic, original 128×128 color/bump textures, repeat/mip filtering and anisotropy. Continuous sampled shoulders, coral/cream curbs, edge stripes and barriers follow the raised road. Center dashes and scenery are instanced. Sunshine has a larger local shadow map, slightly softer ambient fill and longer haze; no heavy postprocessing or external texture downloads. A restrained speed/boost FOV increase and terrain-relative chase-camera height preserve camera damping/reset behavior. Reduced-motion preference disables the added FOV effect. The visual kart body follows the road slope and existing hop/landing squash/audio remains active.

## Ownership and configuration

- `src/game/tracks/sunshineCircuit.ts`: course points, roller and feature definitions. The lip fraction derives from the roller crest and actual sampled length.
- `src/game/tracks/trackSurface.ts`: pure height queries, directional swept feature entry and capped pad kick; visual slope helper. `TrackDefinition` adds optional `rises`/`features`, absent on other courses. These definitions participate in the existing record fingerprint.
- `src/game/core/simulation.ts`, `kart/{kartController,driftController,jumpController}.ts`: optional ground height, surface-relative grounded checks, ballistic landing and reset to the actual surface. Planar steering/traction/speed integration and contact dimensions are unchanged. The default flat-ground path remains.
- `src/game/render/TrackVisual.tsx`, `roadTexture.ts`, `TrackFeaturesVisual.tsx`: height-aware road/rails/paint and pad/launch markings, all based on the same samples. `RaceTrackVisual` raises checkpoint decorations to match, without changing validation.
- `src/game/tracks/sunshineScenery.ts`, `render/SunshineScenery.tsx`, `Environment.tsx`: bounded original coastal decoration and track-specific atmosphere. Four static instance batches, a single dash batch; no shadow-casting flowers or per-frame geometry/material allocation.
- `render/{ChaseCamera,KartVisual,ProceduralKartVisual,KartEffects,DrivingAudio}.tsx/ts`: terrain-aware visual follow, pitch and grounded effects/audio; camera speed effect is Sunshine-only.
- `items/{ItemSystem,itemAI}.ts`, `render/{ItemVisuals,CombatModels}.tsx`: pickups/traps and their hit/defense queries respect surface height. Existing projectile trajectories remain straight world-space shots. Flat fixtures retain ground zero.
- `timeTrial/trialRules.ts`: feature tuning joins the compatibility hash only for tracks with features. Sunshine's obsolete best-run ghosts are ignored; other courses' fingerprints retain the same inputs/order. Stored files are not deleted.
- `dev/RaceDiagnostics.tsx`: development-only per-racer boost/jump/landing/air-height output under `?race-preview`. Movement is still ordinary normalized pursuit input, not teleports.
- `tests/sunshineUpgrade.test.ts`: surface/mesh/reset, pad direction/overlap/braking/reverse/airborne/teleport guards, boost stacking/caps, grounded launch, complete jump/landing, airborne rail containment, reverse traversal, drift entry on elevation, FPS consistency, raised trap hits/clearance, course isolation, scenery bounds and record compatibility.

## Feature rules / testing controls

Drive normally with the existing keyboard/gamepad/phone controls. No extra action is required: cross a mint turbo strip forwards at ≥5 units/s to get a +4 units/s kick (capped at existing Surge speed) and 0.85 seconds of Surge. An active boost is never downgraded/stacked, braking suppresses activation, and parked/reversing/airborne racers cannot repeatedly trigger it. Collision still cancels the boost. Both humans and bots share this path.

The gold crest marking launches grounded forward racers at ≥11 units/s with 5.8 units/s upward speed. Drift hops keep their original impulse/ownership; an already airborne racer gets no extra launch. Existing gravity, landing compression and sound handle the descent. Rails stay solid during jumps. Pausing freezes the fixed simulation and cosmetic animation; reset clears motion and places the kart on the local road surface.

For development inspection open `/?race-preview&render-stats`, start Quick Race on Sunshine and enable “Autodrive with normal inputs.” “Auto-use collected items” exercises the same item action as the player. Diagnostics do not ship in the production menu.

## Deliberate limits

This pass does not add branched shortcuts, moving collision hazards, a new physics engine, water gameplay, off-road driving, a complete terrain mesh or authored driver animations. The lagoon is scenery behind existing boundaries. Opponent collision is still the existing planar capsule response even while airborne. These are explicit limits, not completed features. Physical controller/phone and cross-browser/device performance checks remain manual. Visual quality is the game's restrained procedural coastal style; no claim of AAA art parity or photorealism is made.

## Verification

- Typecheck, lint (zero warnings), production build and `git diff --check` passed. Build: 1.16 seconds; application chunk 253.73 kB / 81.50 kB gzip. No dependency changes/install was needed.
- Focused Sunshine tests: **13 passed**, including elevated trap contact/air clearance and 30/60/144 FPS feature consistency. Full `npm run test`: **416 tests / 35 files passed in 191.93 seconds**, including model/selection, all-course geometry/collision/AI completion, cup, drift, Time Trial, items and phone regressions. Local phone-relay tests ran with loopback permission.
- Desktop browser Quick Race, driven through ordinary normalized pursuit inputs, finished three validated laps in **2:15.899**, with **0 recoveries**, 12 ordered gates per lap, and lap times 46.934 / 44.478 / 44.487 seconds. Player: six pad boosts, three launches, three landings. Every AI also recorded three launches/landings. Opponents still racing at the player's finish were correctly classified with no invented finish time.
- Browser items remained active: 12 pickups, five shots, two guards, one Turbo Charge, one block and two hits in the final seeded run. Raised banana drop/hit/air clearance was checked in automated tests, not claimed as manually observed in this run. Pause and restart UI worked; the captured browser error log was empty.
- Observed development frames varied with view/traffic (examples: 78–216 draw calls, roughly 246–692k triangles; median about 16–19 ms and p95 about 18–31 ms). These are local browser scheduling/frame samples, not isolated GPU timings, guaranteed FPS or a measured before/after improvement. Four static scenery batches and one dash batch keep the added decoration bounded; supplied racer models still dominate close traffic geometry.
- Clean browser keyboard check: holding W accelerated the kart; a rail impact contained it, holding S backed away (REV shown), R restored zero speed, and Escape paused the race clock at 1:10.417 without advancing on the later observation. An actual focus-loss pause was also observed during asset readiness; all models appeared before gameplay. No browser errors were captured. Physical keyboard feel/gamepad/phone hardware testing is still not claimed.
- Screenshots: [clean gameplay](design-qa/sunshine-upgrade/gameplay.png), [validated race results](design-qa/sunshine-upgrade/results.png).
