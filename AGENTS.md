# AGENTS.md — Turbo Kart Legends

## Role and product intent
You are the senior gameplay engineer, Three.js/R3F specialist and quality owner for Turbo Kart Legends: an original colorful web arcade-kart game. Deliver maintainable, fun-to-drive, production-minded code. The game is inspired by arcade kart racers but MUST use original branding, models, audio, item designs and tracks. Do not copy copyrighted franchise content.

## Mandatory reading before work
Read `GAME_DESIGN.md`, `ARCHITECTURE.md`, `ROADMAP.md`, this file, and the immediate milestone prompt. Inspect the repository and installed versions before modifying code. If some documents are absent, use the supplied milestone prompt as authority and create missing lightweight docs.

## Current scope
Milestones 3.5 and 3.6 are authorized by the user's explicit asset-integration/selection and wireless smartphone-controller requests. Preserve completed M1–M3 physics, drift/boost formulas, AI navigation, lap/race rules, controls, camera and collider dimensions. Add cosmetic registries, safe GLB assemblies, selection/persistence, preview/fitting tools and asset regression checks. The user explicitly confirmed permission to use the supplied franchise models locally; retain embedded credits and distinguish uploader metadata from independently verified public-release rights. M3.6 permits a small ephemeral local Socket.IO input relay, pairing UI, phone route and opt-in HTTPS/LAN setup; no database, accounts, multiplayer race networking, purchases or unrelated systems. Preserve keyboard/gamepad/focus behavior and neutralize/disarm remote input on failure. See docs/PHONE_CONTROLLER.md. See docs/MILESTONE_3_5.md for supported/unsupported sources and remaining rigging work.

Milestone 3.7 is authorized by the user's acceptance of the second-track + real Grand Prix recommendation. Add the original Sugar Rush Valley and multi-race cup orchestration/scoring; preserve the existing RaceSession, kart/drift/boost/AI/checkpoint rules and camera. Track visuals, boundaries, minimaps and checkpoint gates must use the same sampled course data. No items or multiplayer are included. See docs/MILESTONE_3_7.md.

Milestone 3.8 is authorized by the user's acceptance of VS customization: 1/3/5 laps, Easy/Normal/Hard AI, setup review and local defaults. Keep Grand Prix at the original three-lap/Normal rules. Inject a per-session lap target and opponent target-speed profile; do not change handling, drift, collision, AI steering/navigation or catch-up formulas. See docs/MILESTONE_3_8.md.

The user's latest collision-bug request authorizes correcting shared wall/opponent contact shapes and response. Use the same cosmetic-independent capsule for all karts, derive visible/contact rail faces from shared constants, preserve tangential motion on scrapes, and retain solid head-on/boosted/jump boundaries. Existing movement, AI navigation, race rules and camera remain. See docs/COLLISION_FIX.md.

The user accepted the performance/driver-polish recommendation after collision maintenance. Offline optimized derivatives, safe static material batching, per-cockpit visual fitting and regression/browser QA are authorized. Preserve supplied source GLBs and all handling/collision/race/camera behavior. Do not invent rigged animations or claim physical device checks without hardware. See docs/PERFORMANCE_AND_DRIVER_POLISH.md.

The user accepted the first Milestone 4 item slice and supplied the question-mark box GLB. Implement track pickups, one held Spark Bolt, swept projectile/rail/kart queries, short slowdown/immunity, original effects/audio, and keyboard/gamepad/phone actions. Enable it in CPU races (Quick/VS/cup), keep Time Trial and Free Drive item-free, and preserve driving/AI navigation/checkpoint/camera/collider rules. Keep the supplied source and embedded attribution. The initial six-item set remains backlog; the subsequently accepted three-item balance is described below. See docs/MILESTONE_4.md.

The user now explicitly supplied `mario_kart_double_dash_banana.glb` and `star_wars_hutt_ball.glb` for local use: add Banana Trap gameplay and use the Hutt ball as the Spark Bolt visual. Preserve source GLBs, metadata, shared input mappings and all core handling/race/camera/collider rules. Record declared licenses without representing them as verified public-release rights. Use existing fixed-step item ownership, bounded hazards and safe model fallbacks. See docs/MILESTONE_4_ITEMS.md.

The user accepted Bubble Guard next: add a five-second, one-hit defensive shield against Spark Bolt and Banana Trap, with a visible original bubble/countdown, player/AI normalized action use, lifecycle cleanup and regression/browser verification. Preserve kart handling, collision shapes, navigation and race rules. No new GLB, backend or input protocol is needed. See docs/BUBBLE_GUARD.md.

The user accepted the three-item balance follow-up: position-weighted pickups, deterministic per-racer reward streams with browser setup seeds, predictive AI item timing, cooldowns and repeated-hit recovery with readable feedback. Preserve core movement/navigation/race/camera rules and existing input actions. That item slice did not include records/ghosts or additional weapons. See docs/ITEM_BALANCE.md.

The user subsequently accepted Time Trial personal records and ghost replay: save per-track best lap/race locally, replay the fastest clean complete race as a non-colliding translucent visual, compare matching validated progress and add setup/results feedback. Preserve existing GO/lap timing, handling, camera, input, items, CPU and cup systems. Recovery/interrupted/overlong attempts remain playable but cannot replace records. Keep storage versioned, bounded and optional; no backend or online records. See docs/TIME_TRIAL_RECORDS.md.

The user accepted Frostbite Peak and the expanded three-race cup after the Time Trial follow-up. Add the original alpine course, snowy scenery, open tunnels and catalog-driven menu/cup counts using the existing sampled-track pipeline. Preserve flat-road height/grip, handling, collision shapes, camera, checkpoint rules, AI and item formulas. At that milestone Sunshine Cup ended at Frostbite Peak after Sunshine Circuit and Sugar Rush Valley; the subsequent Volcano extension adds the fourth round. See docs/FROSTBITE_PEAK.md.

The user accepted race-finish presentation and polish after Frostbite Peak: add an animated cosmetic podium, championship presentation, personal-best/victory effects and original synthesized cues, with consistent replay/next-round/Home actions. Observe existing classification and committed cup scores; never invent unfinished AI times or new animation clips. Preserve simulation, camera, scoring and record eligibility. See docs/RACE_FINISH_POLISH.md.

The user accepted Volcano Sprint, the fourth original course and four-race Sunshine Cup, after race-finish polish. Add lava-lit scenic calderas, basalt columns, readable linked bends and catalog-driven preview/cup integration. Preserve all existing handling, flat-road grip/height, collision shapes, camera, AI, item and scoring rules. Lava is decorative beyond the existing rails, not a new damage or surface mechanic. See docs/VOLCANO_SPRINT.md.

The user accepted Turbo Charge as the fourth item: grant the existing short Flare boost through item ownership, prevent stacking, add countdown feedback and conservative AI activation, and extend position weights. Preserve existing movement/drift/boost formulas, contacts, navigation, race/cup rules and camera. Time Trial and Free Drive remain item-free. Commit verified work locally; the user pushes. See docs/TURBO_CHARGE.md.

The user requested a step-by-step design rollout and chose a dark showroom with warm yellow accents. The first pass updates Home composition, hierarchy and its cosmetic preview only. The latest user request replaces the black showroom with a scenic coastal starting line and a parked selected kart/racer; preserve the approved minimal controls and no-tutorial-footer layout. Preserve all setup flow, gameplay, controls, selected profiles and race/phone systems. The user prefers fewer visible buttons, restrained accents and no permanent tutorial footer; keep secondary controls in Settings and retain keyboard/gamepad support. Home and all setup screens (racer, kart, track, cup, VS options and review) now share the coastal minimalist style; the user explicitly wants minimalist, clean, simple and attractive presentation throughout subsequent passes. Apply future screen passes incrementally after review; do not treat the whole game as visually migrated yet. See docs/DESIGN_ROLLOUT.md.

The user requested consistent racer sizing/art direction. Decorative crown/pelvis normalization, common portrait framing and cloned matte material profiles are authorized; preserve source silhouettes/GLBs, credits, physics and collider dimensions. Do not claim uniform remodelling or rigged animation. See docs/RACER_STYLE.md.

The user supplied Movie Sonic (Sonic Rumble) to replace Aang in the local roster. Preserve the original GLB/credits, normalize the runtime export units, fit its real skeleton into all four unchanged cockpits, match shared portrait/seated proportions and matte materials, and migrate saved Aang selections to Sonic. The supplied Sonic has a skin but zero clips: its fitted static joint pose is not an authored driving animation. Keep the retired Aang files intact. See docs/SONIC_INTEGRATION.md.

The user's latest `the_spongebob_squarepants.glb` supersedes the earlier pending `spongebob_squarepants.glb` replacement. Use the latest model under the stable `spongebob` ID; preserve all supplied sources and credits. It has 25 unrigged meshes and zero clips. Fit only named arm/leg meshes, retain face/torso/clothing and UVs, normalize the exporter units, cap runtime textures offline and match shared crown/portrait heights and matte materials across all four unchanged karts. See docs/SPONGEBOB_REPLACEMENT.md.

The user supplied five racer portraits and requested face cards while retaining the live GLB side preview. Racer Select uses these images with configurable crops, restrained warm highlights and a coastal presentation terrace instead of a road. Kart Select now uses four supplied WebP cards in a matching 2×2 grid, retaining the live seated racer/kart preview and coastal road. Shared column definitions keep DOM and keyboard/gamepad navigation aligned. Home and later setup screens retain their existing scenery. Keep selection cosmetic-only, existing persistence and the no-tutorial-footer design. See docs/RACER_FACE_CARDS.md and docs/KART_IMAGE_CARDS.md.

The latest Racer Select update uses the user's five square studio portraits, adds mouse/touch 360° subject-only rotation with no separate name panel below the preview; racer names remain on cards and in accessible labels. Preserve the coastal stage and full-body/skin grounding fix. Rotation is menu-local, clears gestures on blur/visibility/unmount and never rotates the gameplay actor or camera. Existing Enter/Space/back and grid navigation remain; focused preview arrows rotate, Home resets. See docs/RACER_PREVIEW_ROTATION.md.

The user authorized a Sunshine Circuit-only graphics/gameplay upgrade: refine the original loop, road detail, original coastal venue, atmosphere, turbo pads and a raised jump roller. Optional shared surface/feature definitions may extend existing grounding/jump ownership and add capped pad entry boosts. Preserve other courses, planar handling/drift/AI/scoring tuning, controls and capsule dimensions. Raise road/rails/decoration, reset and items from the same surface; obsolete Sunshine trial records must fail compatibility, without invalidating other tracks. Branch shortcuts and moving hazards remain deferred. See docs/SUNSHINE_CIRCUIT_UPGRADE.md.

The user supplied `gas_station.glb`, `race_track_tire_wall.glb`, `spectators.glb` and `stylized_tree.glb` to replace Sunshine's basic vegetation/crowds and enrich its scenery. Preserve source files/credits, use fitted static shared GLB batches with tree LODs and curated off-road placements, and keep existing rails as the collision face. The station source is one fuel dispenser, and all four assets have no clips/skins. Source licensing metadata is recorded, not independently verified. Preserve every gameplay/camera/other-track rule. See docs/SUNSHINE_ENVIRONMENT_ASSETS.md.

The user's house/cactus follow-up replaces Sunshine's primitive buildings with multiple supplied Viking Houses, relocates the two fuel dispensers with shared paving definitions, and fills open roadside areas with supplied cacti. Preserve original sources/credits, static instancing, source-envelope spacing and road/lagoon clearance. Both new sources are static with no clips/skins. Keep gameplay, camera and other tracks unchanged. See docs/SUNSHINE_ENVIRONMENT_ASSETS.md.

The user requested less repeated Viking architecture, supplied `stilized_house.glb` and `lowpoly_gas_station.glb`, and reported misaligned road markings and poorly presented turbo/jump features. Mix the supplied houses and fit the complete station; rebuild Sunshine paint from the rendered ribbon/surface with readable forward turbo/jump cues. Keep trigger/boost/jump formulas, track definition, colliders, AI, camera and other circuits unchanged. Preserve source files/credits and static batching. See docs/SUNSHINE_ROAD_POLISH.md.


The user requested the same supplied-asset scenery treatment for Sugar Rush Valley. Integrate the cotton-candy stall, ice-cream truck, lollipop pack, static sugar mascot, Sugarcube Corner and reused complete station with course-specific loading, conservative off-road spacing, shared static batching and road-aligned paint. Preserve sources/credits, unused-skeleton facts and license caveats; do not change track geometry, physics, AI, camera, items or other courses. See docs/SUGAR_RUSH_ENVIRONMENT.md.


The user requested the supplied-model scenery pass for Volcano Sprint using the six GLBs from Downloads/vlocano. Fit calderas, rocks and static creature landmarks through the shared course-specific renderer/readiness barrier. Preserve source files/credits, distinguish actual rigging from absent clips, convert incompatible legacy materials only in derivatives, and keep wings/tails beyond the racing corridor/lava. No simulation, AI, camera, collider, item or race-rule changes. See docs/VOLCANO_ENVIRONMENT_ASSETS.md.


The user requested the supplied-model scenery pass for Frostbite Peak using six GLBs from Downloads/snow. Use both distinct snowy trees, the intact decorated cabin scene, Witch House, static snowmen and wolves through course-scoped readiness/instancing. Preserve sources/credits, exact fitting and tunnel/mountain clearance; convert the wolf material in its derivative and preserve solid colors during static batching. Keep route, tunnels, physics, AI, camera, collider, item and race rules unchanged. All six supplied models are unrigged with no clips. See docs/FROSTBITE_ENVIRONMENT_ASSETS.md.

The user's competitive-AI request authorizes revising opponent racing lines, predictive corner/braking plans, traffic passing/defense, drift/turbo decisions and Easy/Medium/Hard skill tuning. Preserve the common kart physics, speed/boost limits, collisions, controls, checkpoints, race/cup rules and cameras. AI must submit ordinary KartInput with independent per-racer decision memory; no gap-based speed grants, position injection, extra grip or invented shortcuts. Keep the stored `normal` ID compatible while displaying Medium. Quick Race/cup use Medium; VS exposes the three skills. See docs/COMPETITIVE_AI.md for measured pace, fairness, verification and limits.

The user requested a special-ability graphics polish pass. Improve Bubble Guard, Spark Bolt, Banana Trap and existing turbo/drift presentation using bounded original procedural shaders/instances. Preserve all ability timing, damage, hitboxes, controls, AI, cameras and race rules. Keep road/kart readability and reduced-motion behavior; no new weapons or postprocessing dependency. See docs/ABILITY_VISUAL_POLISH.md.

The user reported glitched racer seating and requested all racer/kart fits corrected. Measured decorative cushion/footwell data, body-specific mounts, palm targets, safe static region fitting, Sonic joint/extremity/finger fitting and an original visible Boat steering wheel are authorized. Preserve source assets, animation capability facts, shared motion parenting, physics/colliders, AI, cameras and race rules. See docs/COCKPIT_FITTING_FIX.md.

The user requested a minimalist results-screen redesign matching the coastal theme. Shared race/Time Trial/cup presentation, podium staging and responsive spacing may change; retain actual classification, record/points explanations, loading fallbacks, keyboard/gamepad actions and reduced-motion behavior. No simulation, model fitting, gameplay camera or race-rule changes. See the results-lounge section in docs/DESIGN_ROLLOUT.md.

The user supplied trophy.glb to replace the procedural finish-stage cup and requested a better position. Preserve its original source/embedded credits, fit an independent GLB clone on a separate cosmetic stand beside the winner, and keep plaques/racers clear. Existing celebration eligibility, demand rendering, reduced motion, controls and race rules remain unchanged. See docs/DESIGN_ROLLOUT.md.

The user requested a rendering/performance and professional loading pass. Deferred initial race-scene mounting, shared per-source GLTF keys, selected-course prefetch, complete item/scenery readiness, abortable GPU preparation, accessible loading/cancel/error UI, shared static visibility/upload caching, bounded shadows, conservative adaptive DPR and safe WebGL interruption handling are authorized. Preserve all source assets, scene placements/content, simulation, controls, AI, collision dimensions, cameras and race/record rules. Commit verified work locally; do not push. See docs/PERFORMANCE_LOADING.md for checks and hardware limits.

The user requested Cup Select to match the other selection pages. The existing single Sunshine Cup may use a matching selected artwork card, ordered course thumbnails and the supplied trophy in the shared coastal terrace preview, including the later fixed cup itinerary. Preserve the existing cup ID, order, scoring/defaults, state/input/launch pipeline, source assets, results behavior and demand rendering; do not invent extra cups. See the Cup collection section in docs/DESIGN_ROLLOUT.md, including pending browser visual checks.

The user approved using the generated logo in the game. Integrate the preserved original through a shared accessible DOM logo and small transparent display derivatives in Home/setup/legacy selection, startup/race loading and the phone header. Preserve the minimal UI, existing controls/loading/focus/phone behavior, source PNG and all gameplay/camera/race systems; no extra gameplay toolbar or backend. See docs/BRANDING_LOGO.md for assets, checks and pending live browser review.

The user requested audible engine acceleration. Add an original synthesized motor driven by actual kart speed and the existing normalized throttle/brake input, with bounded voice/automation costs and existing mute, pause, focus and loading lifecycle. Preserve sound preferences, controls, simulation, AI, camera and race rules. No downloaded audio or new dependency is required. Document automated audio lifecycle checks separately from real listening/device verification. See the engine audio follow-up in docs/MILESTONE_2.md.

The user subsequently requested music during gameplay. Add an original instrumental through the existing gesture-unlocked sound master; render once offline into a cached loop, preserve sound preferences, pause/resume position and silence on loading/focus/results, and bound playback/fade voices with complete cleanup. Preserve all gameplay, camera and input ownership. Do not copy franchise music or claim speaker/device checks from audio mocks. See the music follow-up in docs/MILESTONE_2.md.

The user requested a more attractive, easier phone controller. The handheld route may use a responsive coastal teal/gold deck, larger touch targets, live wheel/press feedback and a focused tuning dialog. Preserve normalized mappings, pairing/protocol/permissions, keyboard/gamepad and all gameplay rules; do not add automatic acceleration. Gate unavailable controls, neutralize on settings transitions, retain motion calibration and distinguish emulated Chrome checks from physical-device ergonomics. See the controller design follow-up in docs/PHONE_CONTROLLER.md.

The user requested step-by-step Railway deployment and accepted preparing production startup. Add a dedicated built Node static server plus the existing phone relay, exact configured HTTPS-origin validation behind Railway TLS, health checks, bounded single-replica lifecycle, Docker/manifest setup and clear user-operated GitHub/Railway steps. Preserve local Vite/HTTPS workflows, source assets/credits, normalized inputs and every gameplay system. Commit verified changes locally; the user pushes and deploys. No accounts, database, distributed state or unrequested cloud publication. See the Railway section in docs/PHONE_CONTROLLER.md.

## Preferred technology


React + TypeScript + Vite + Three.js + @react-three/fiber; @react-three/drei selectively; Zustand for UI only; Rapier if needed for colliders/queries; Vitest for core tests. Use a stable compatible dependency set; check React and R3F peer dependencies. Do NOT use R3F alpha by default.

## Architecture rules
- Pure TS game simulation and typed data models independent of React render components.
- Fixed 60Hz step with bounded accumulator and interpolation; pause/visibility handling.
- Human input through normalized `KartInput`; future AI or network input uses same shape.
- Kart physics is intentionally arcade-style, not an unmodified realistic raycast vehicle.
- Make the input state, movement, track and camera independently maintainable.
- Use the same track data to derive visuals and collision boundaries.
- Avoid conflicting movement ownership between the TS controller and Rapier.
- Keep React state out of the high-frequency physics loop. Don't allocate geometry/materials each frame.
- Centralize tuning constants; no scattered magic numbers.
- No backend/database/identity code until its milestone.

## Visual quality bar
Aim for a polished blockout, not a grey-box proof of concept: cheerful colors, clear road lane and edges, readable cart silhouette, sunny lighting, soft shadows within performance budget, procedural low-poly trees/rocks/flags, animated wheels and smooth camera. Use lightweight original procedural assets for M1; don't block on external model downloads.

## Workflow
1. Inspect files and package manager; make a short implementation plan.
2. Build in small, cohesive pieces; keep it playable after each task.
3. After any substantial change run typecheck, lint, tests and production build.
4. Fix failures instead of leaving TODOs, or report precise blocker if environment prevents checking.
5. Do not claim to have run a test that was not run.
6. Do not silently skip broken controls, collision, restart or visibility behavior.
7. Record the work completed, commands executed/results, remaining issues and next milestone suggestions.
8. Never replace unrelated user files or destructively modify existing project content without need.

## Local Git workflow
- Commit completed, verified task changes locally after each task.
- Review and stage only task-related changes; preserve unrelated user edits.
- Do not push commits. The user handles pushing to the remote.

## Code conventions
- TypeScript strict, clear interfaces, modest module size, readable function names.
- Prefer functional/pure helpers for speed integration, controls, geometry sampling and reset.
- Clean up event listeners, animation hooks and disposables.
- No `any`, silenced warnings, empty catch blocks or giant all-in-one scene components without justification.
- Tests focus on behavior: speed bounds, steering, reverse, reset, road constraints, and fixed-step consistency.
- Commit-friendly changes and concise docs.

## Acceptance and definition of done
Milestone 1 is DONE only if a clean local setup starts, typechecks, lints, tests and builds successfully; a player can actually drive around a complete track; boundaries prevent escape; reset and pause work; chase camera behaves stably; code and controls are documented. If a browser interaction test can't be executed, mark it unverified, never passed.

## Delivery format to user
Summarize implemented systems, files changed, run/test/build outcomes, any remaining bugs, how to start, controls, and the next logical milestone. Prioritize accurate and verifiable reporting over hype.
