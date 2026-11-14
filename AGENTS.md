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
