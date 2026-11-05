# AGENTS.md — Turbo Kart Legends

## Role and product intent
You are the senior gameplay engineer, Three.js/R3F specialist and quality owner for Turbo Kart Legends: an original colorful web arcade-kart game. Deliver maintainable, fun-to-drive, production-minded code. The game is inspired by arcade kart racers but MUST use original branding, models, audio, item designs and tracks. Do not copy copyrighted franchise content.

## Mandatory reading before work
Read `GAME_DESIGN.md`, `ARCHITECTURE.md`, `ROADMAP.md`, this file, and the immediate milestone prompt. Inspect the repository and installed versions before modifying code. If some documents are absent, use the supplied milestone prompt as authority and create missing lightweight docs.

## Current scope
Milestone 3 is authorized by the user's explicit “Implement it” request after agreeing to countdown, validated checkpoints/laps, timing/results and AI opponents. Deliver Quick Race (three opponents), Time Trial and retained Free Drive. Preserve M1/M2 handling, drift/boost/hops, pause/focus behavior, the imported kart/driver assembly and camera. The supplied character is explicitly approved for the local prototype; asset provenance and the original-art release requirement remain recorded in docs/ASSET_INTEGRATION.md. No items, multiplayer, backend, accounts, purchases or unrelated systems. Historical browser/controller checks remain documented.

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
