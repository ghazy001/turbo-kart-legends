# Turbo Kart Legends — Implementation Roadmap
Targets are ordered by dependencies rather than fixed calendar dates. Finish and test each phase before expanding scope.

## Milestone 0 — Foundation (part of initial kickoff)
Deliver: Vite React TS scaffold, lint/format, strict TS, folder boundaries, documentation, VCS ignore, reproducible development commands.
Exit: project launches and builds from a clean install.

## Milestone 1 — Fun-to-drive prototype (first Codex task)
Goal: In a browser, drive one cartoon kart around one coherent closed circuit.
Stories:
- Start screen with Play and concise controls.
- Bright cartoon 3D circuit with recognizable road edges, grass, scenery and starting area.
- Original kart primitive model with correctly oriented wheels and shadow.
- WASD/arrows accelerate, brake/reverse, steer; speed is readable.
- Camera follows smoothly without clipping through the kart.
- Kart collides with road boundaries and cannot escape indefinitely.
- Press R or Reset to return to safe spawn.
- Escape pauses; tab blur neutralizes input and pauses safely.
- Code has separated simulation, track, camera, controls, and UI.
- At least unit tests for movement and reset; README includes controls and dev commands.
Acceptance:
1. `npm install`, `npm run dev`, `npm run build`, `npm run lint` and `npm run test` pass after dependencies are installed.
2. Kart starts on a visible, connected closed road; can complete a loop in either direction.
3. Keyboard steering/acceleration/braking/reverse all work and do not depend on render FPS.
4. Kart cannot tunnel through outer barriers at typical top speed; minor impacts do not permanently wedge it.
5. R resets position, orientation, velocity and camera follow without residual drift.
6. Camera remains stable during sharp turns; pausing and returning from a hidden tab do not produce huge position jumps.
7. A tester can identify race direction and find the next corner by camera/road design.
Explicitly excluded: drift boosts, bots, items, lap scoring, multiplayer, accounts and backend.

## Milestone 2 — Driving mastery
Add hold-to-drift, steer-dependent slide, 3 charge tiers, release mini-turbos, boost VFX/audio, jumps/landing and optional gamepad. Extend automated tuning tests.
Exit: drift mechanics reward skilled cornering; boosts cannot be spammed at zero speed or chained infinitely.

Implementation status (2026-11-05): drift/turbo, drift-entry hops and landing, effects/audio, and standard gamepad support are implemented. See `docs/MILESTONE_2.md` for verified checks and remaining manual handling, hardware and browser validation. Historical M1 manual checks remain open.

## Milestone 3 — Real race and AI
Add checkpoints/laps, countdown, finish line, split times and ranking; 3–5 waypoint-based AI karts; obstacle behavior, catch-up logic with limits, reset/recovery; Quick Race and Time Trial.
Exit: 3-lap races work; no skipped-checkpoint exploits; AI completes races without chronic wall collisions.

Implementation status (2026-11-05): Quick Race with three AI rivals, Time Trial, retained Free Drive, countdown, 12 ordered gates, three laps, timing/splits/standings/results and checkpoint recovery are implemented. All 78 automated tests and quality gates pass; a full browser Quick Race reached validated results. See `docs/MILESTONE_3.md` for evidence and remaining human, controller and browser tuning.

## Milestone 3.5 — Asset integration and cosmetic selection

Five supplied racers and four karts share typed registry definitions, independent GLB instances, configurable seat anchors and a two-step fullscreen Racer Select → Kart Select flow with shared 3D previews, keyboard/gamepad navigation and local persistence (see docs/SELECTION_FLOW.md). AI uses distinct cosmetics. Sonic replaces Aang: four racers use static vertex fits, Sonic uses its real skeleton in a fitted static seated pose, and no animation clips are invented. See docs/SONIC_INTEGRATION.md. A duplicate, complex legacy-material kart and oversized high-detail kart are documented outside gameplay. All M1–M3 mechanics remain unchanged. See `docs/MILESTONE_3_5.md` for validation, credits, performance limits and asset authoring instructions.

## Milestone 3.6 — Wireless phone controller

Implemented: local Socket.IO input relay, short-lived single-use QR pairing, one active phone, reconnect/expiry/rate/sequence checks, desktop status/revoke UI, mobile touch and optional calibrated tilt steering, tunable transmission/sensitivity/dead zone/smoothing/inversion, stale-input neutralization/pause, and explicit HTTPS/LAN certificate workflow. Existing M1–M3/3.5 gameplay and art selection remain. See `docs/PHONE_CONTROLLER.md` for verified automated checks and remaining physical iPhone/Android/Wi-Fi validation.

## Milestone 3.7 — Second original course and real Grand Prix

Implemented Sugar Rush Valley with its own pastel/candy palette, sampled road, existing boundaries and ordered gates. Both courses are selectable for Quick Race, Time Trial and VS. Sunshine Cup runs Sunshine Circuit then Sugar Rush Valley with 10/7/4/1 points, safe round transitions, cumulative/countback standings and final cup results. Pause restart preserves earlier round scores; duplicate finishes cannot award points twice. Existing handling, AI and race rules remain unchanged. Cup progress is session-only. See `docs/MILESTONE_3_7.md` for verification and remaining manual checks.

## Milestone 3.8 — VS Race customization

Implemented VS-only Race Options → review with 1/3/5 laps and Easy/Normal/Hard CPU pace, draft/back/commit behavior, validated versioned local defaults and immutable per-session options. HUD/results/restarts follow the chosen lap target. Grand Prix remains three laps with original Normal profiles. AI difficulty changes target pace only; handling, pursuit, catch-up and collision formulas are preserved. See `docs/MILESTONE_3_8.md` for verification and tuning limits.

## Collision maintenance

Fixed premature wall/opponent contacts using a shared kart-shaped capsule, aligned contact/visible rail faces, and removed repeated tangential speed damping during wall scrapes. Solid impacts, reverse recovery and ability cancellation remain; gameplay/race rules are preserved. See `docs/COLLISION_FIX.md` for verification.

## Milestone 4 — Items, combat and balance
First playable slice implemented: nine supplied-model pickups on each course, one held Spark Bolt or Banana Trap, swept rail/kart hit detection, short slowdown/immunity, AI usage, pooled effects, HUD and keyboard/gamepad/phone input. Time Trial and Free Drive are item-free. See docs/MILESTONE_4.md. The supplied banana is integrated as a dropped hazard and the Hutt ball as the Spark Bolt mesh; see docs/MILESTONE_4_ITEMS.md. Bubble Guard is now implemented as a five-second one-hit defense; see docs/BUBBLE_GUARD.md. Position-weighted rewards, predictive item AI and repeated-hit recovery are now implemented for these three items; see docs/ITEM_BALANCE.md. The broader six-item set remains future work:

Add 6 original power-ups, item pickup boxes, weighted distributions by race position, projectile/area interactions, cooldowns, shields and VFX.
Exit: item effects have visible telegraphing, counterplay and reliable hit detection.

## Milestone 5 — Content and polish
Build four themed circuits, six original karts/characters, custom UI flow, original sound, audio settings, accessibility options, cosmetics, performance improvements and browser QA.
Exit: v1.0 single-player content is playable end-to-end across target desktop browsers.

## Milestone 6 — Post-v1.0 multiplayer
Set up Colyseus server and matchmaking; input protocol, authoritative race state, client prediction/reconciliation, remote interpolation, race rooms, disconnect/reconnect handling, anti-cheat validation, latency simulations and observability.
Exit: 2–8 players can reliably finish races under simulated reasonable network jitter/latency, with server-validated placements.

## Suggested issues for Milestone 1
M1-01 Scaffold/quality gates; M1-02 deterministic-ish fixed-step update; M1-03 track geometry and edges; M1-04 kart movement controller; M1-05 collision/resets; M1-06 chase camera; M1-07 UI/inputs/pause; M1-08 visual blockout; M1-09 unit and smoke tests; M1-10 README and QA pass.

## Change control
When a feature is requested, classify it as in-scope for current milestone, a bug, or future backlog. Prioritize working controls and testable driving over asset complexity. Record design decisions in `docs/decisions/` if they materially affect later AI or networking.

## Frontend flow redesign

Implemented Home → mode → optional Cup → Racer → Kart → Track → review/start, shared menu shell and previews, settings/input/phone icons and panels, persistent sound/last mode, and real remote phone tuning requests. Grand Prix runs the real Sunshine Cup (expanded from two to four courses with Frostbite Peak and Volcano Sprint); VS currently uses CPU opposition. VS lap/difficulty options are implemented in M3.8. More original courses, local multiplayer and rebinding remain future work. See docs/FRONTEND_FLOW.md.

## Performance and driver maintenance

Implemented nine offline optimized GLB derivatives, compatible solid-color batching, unused template-buffer cleanup, per-kart static hand targets, corrected Boat Kart seat alignment and connected head/neck protection. All 20 combinations load and have review captures. Static drivers still need production rigging/finger poses; real phone/gamepad/human QA remains manual. See docs/PERFORMANCE_AND_DRIVER_POLISH.md for measured budgets and regression results. The first M4 slice is now implemented; human combat balance testing and original release art remain next.


## Time Trial records and ghost follow-up

Implemented per-track local best lap/race, a bounded 10 Hz visual replay of the fastest clean complete race, signed matching-progress comparison, ghost visibility control, track/review summaries and personal-best results. Recovery/practice attempts cannot overwrite records. Versioned validation, compatibility fingerprints and quota/denial fallbacks preserve playability. Driving, items, CPU/cup/checkpoint rules and camera remain unchanged. See docs/TIME_TRIAL_RECORDS.md for verification and limits.


## Frostbite Peak and three-race cup follow-up

Implemented the third original circuit: an approximately 853 m alpine loop with snowy forest, instanced peaks/snowbanks, two road-following open tunnels and shared road/rail/checkpoint/map data. Quick Race, VS, Time Trial records/ghost and Sunshine Cup use it through the existing catalog. The cup now follows Sunshine → Sugar → Frostbite with unchanged 10/7/4/1 scoring and a 30-point maximum. Handling, grip, AI, items and camera formulas remain unchanged. See docs/FROSTBITE_PEAK.md for checks and remaining device/human QA.


## Race-finish presentation follow-up

Implemented a shared results shell with a cosmetic top-three 3D podium, solo Time Trial stage, original trophy/confetti, championship points presentation, short original synthesized result cues and consistent Race again / Next cup race / Race cup again / Home actions. Reduced motion, bounded demand rendering, model fallbacks, keyboard/gamepad focus and audio cleanup are included. Existing simulation, race/cup/record rules are preserved. See docs/RACE_FINISH_POLISH.md for verification and remaining human/audio/device QA.


## Volcano Sprint and four-race cup follow-up

Implemented the fourth original circuit: a ~756 m caldera loop with linked bends, lava pools, basalt columns, crater peaks, warm dusk lighting and shared road/rail/map/checkpoint data. Quick Race, VS, Time Trial records/ghost and Sunshine Cup use the existing catalog. The cup now ends at Volcano Sprint with unchanged 10/7/4/1 scoring and a 40-point maximum. No handling, AI, camera, collision, item or surface-rule changes. The original four-course set is present; release art, authored seated/victory animation and human/device/browser quality checks remain before declaring v1.0 complete. See docs/VOLCANO_SPRINT.md.


## Turbo Charge and four-item follow-up

Implemented the fourth pickup using the existing 1.5-second Flare boost, with one-slot edge-triggered consumption, no stacking, forward/brake/slowdown guards, normal collision cancellation, Bubble Guard compatibility and a separate HUD countdown. AI waits for a clear predicted straight; position-weighted odds favor Turbo Charge toward the back. No movement, navigation, camera, collider or race-rule formulas change. The four-course/four-item playable set is present; the broader six-item roadmap and human balance/device/release-art QA remain open. See docs/TURBO_CHARGE.md.


## Step-by-step design rollout

The user selected a dark showroom / warm yellow direction. Pass 1 implements a cleaner Home Menu and cosmetic showroom while preserving mode/state/input/race ownership. The coastal minimalist Racer and Kart Select pass is now implemented. The track/cup/options/review pass is also implemented. Next: HUD/pause/settings, then results/loading and environment polish. The remaining screens retain their existing styling until reviewed individually. See docs/DESIGN_ROLLOUT.md.

## Sunshine Circuit gameplay and environment pass

The user's track-specific enhancement request adds the original coastal venue, asphalt/edge treatment, refined loop, a continuous raised roller, two turbo strips and crest jump, with shared surface queries and ordinary AI/player fixed-step inputs. Other tracks and core handling/race systems remain. Branched shortcuts and moving collision hazards remain future work; validate this simpler course before expanding topology. See docs/SUNSHINE_CIRCUIT_UPGRADE.md for verification and limits.

## Sunshine supplied-model scenery pass

The supplied tree replaces primitive palms, with curated groves and source-derived LODs. Supplied static spectators populate three viewing lawns, two supplied fuel dispensers form a harbor pit stop, and supplied tire runs back the existing collision rails. Shared instancing, static material merging, distance/frustum culling and model readiness preserve the race flow. Handling, camera, items/jumps/boosts and other courses remain unchanged. See docs/SUNSHINE_ENVIRONMENT_ASSETS.md for asset provenance, budgets, checks and remaining release/device limits.


## Sunshine settlement follow-up

Replaced primitive buildings with 14 supplied timber tower houses, added 62 supplied cacti in spaced gardens/verges and relocated both fuel dispensers onto two shared-definition paved service areas. All six source models retain credits and checked-in optimized derivatives. Existing races, controls, physics/camera and other courses are preserved. See docs/SUNSHINE_ENVIRONMENT_ASSETS.md.
