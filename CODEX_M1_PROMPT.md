# Master Codex Prompt — Turbo Kart Legends Milestone 1

Act as a senior Three.js game engineer, frontend architect and product-focused technical lead. Build the complete first playable milestone of **Turbo Kart Legends**, an **original**, visually charming, high-quality **cartoon-arcade kart racing game** for a desktop browser.

## Grounding
Before writing code, inspect the repo and READ `AGENTS.md`, `GAME_DESIGN.md`, `ARCHITECTURE.md` and `ROADMAP.md` (supplied in the project root). Do not use external franchise characters, recognizable tracks, copied visual assets, branded UI, copyrighted soundtracks or proprietary game code. If the repo is empty, scaffold it. If initialized, preserve working user code and adapt rather than overwrite blindly.

## Outcome — MUST be a working game, not a mockup
The user should run `npm install && npm run dev`, open the localhost URL, click **Play**, and drive a cheerful 3D kart around a clearly readable, continuous closed road with keyboard controls, responsive handling, smooth chase camera, reliable boundaries, reset and pause. The visual quality should look like a polished colorful racing prototype rather than disconnected cube placeholders. Prioritize working gameplay over elaborate cosmetics.

## Stack
Use Vite + React + TypeScript (strict), Three.js, stable compatible React Three Fiber (React 19 + R3F v9 if choosing React 19), Drei only when useful, Zustand for menu/UI state if needed, and Vitest for tests. Use Rapier for collision/queries only if it improves reliability without creating conflicting simulation ownership. Install compatible current stable versions and verify peer dependencies instead of assuming versions. Avoid over-engineering or mandatory backend.

## Detailed implementation requirements
### A. Game scene
- Create a sunny cartoon environment: sky/background color, grass terrain, gentle lighting, shadows if affordable, procedural trees, rocks, banners and a distinctive start area.
- Build an original **closed curving loop** track, not a single flat rectangle. Create smooth road geometry from a sampled path; clear road/grass contrast, edge markings, and physical boundary rails or reliable boundary collision. Track width ~11 units as an initial tuning point; make scale consistent.
- Define source track data once. Generate the road and edge collision from it; prevent visible gaps and geometric self-intersections. Spawn the kart on the road, aligned with tangent.
- Build a recognizable cartoon kart from procedural primitives: colored body/chassis, four wheels, simple driver seat and a small original driver figure; rotate wheels as it moves, steer front wheels, and make the visual rig sit on the road.

### B. Real playable movement
- W/Up throttle, S/Down brake then reverse, A/Left and D/Right steer; R returns to safe initial spawn with zero speed and heading correctly restored; Escape toggles pause.
- Implement an intentionally responsive arcade movement controller in pure TypeScript: acceleration, coast drag, braking, capped forward/reverse speeds, speed-sensitive turn rate and damped lateral slip. Kart must not pivot excessively at zero speed; turning should feel predictable and immediate.
- Use a 60Hz fixed-step game loop, cap catch-up steps, and interpolate visual pose if needed. Do not make movement speed change with FPS. Clear pressed keys on blur/visibility loss.
- Implement actual track boundary response: prevent traveling through the outside edge, reposition safely from a contact, reduce speed appropriately, and slide along an edge where sensible. Visually decorative walls are NOT sufficient. Include a reset fallback for edge-case stuck states.
- Do not create drift/boost/items/AI/race-lap logic yet.

### C. Camera and HUD
- Responsive third-person chase camera follows behind and above the kart with smoothly damped movement, stable look-ahead target, appropriate FOV and no extreme jerks during turns or reset. Use delta-aware damping rather than raw frame-based lerp constants.
- Add an attractive lightweight start overlay with title and Play button, an in-game speed display (game units or km/h clearly labeled), controls hint, pause/resume overlay and reset button. Keyboard accessibility and visible focus styles matter.
- Ensure resizing, browser focus loss, and pause/resume behave gracefully without stuck acceleration or physics time spikes.

### D. Code organization
Use this shape unless repo conventions suggest equally clean alternatives:
```
src/
  app/App.tsx
  game/config/kartConfig.ts
  game/core/{types,simulation,fixedStep}.ts
  game/controls/keyboard.ts
  game/kart/{kartController,kartCollision}.ts
  game/tracks/{sunshineCircuit,trackSampling}.ts
  game/render/{GameCanvas,KartVisual,TrackVisual,Environment,ChaseCamera}.tsx
  game/ui/{StartMenu,HUD,PauseMenu}.tsx
  game/tests/*.test.ts
  styles/
```
Build no more abstractions than needed; each module owns one responsibility. Use a normalized `KartInput` shape that future AI controllers can produce. Keep game simulation independent of React, Zustand and scene objects.

### E. Quality gates
- Add scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `test` (adapt build script to run TS validation if appropriate).
- Add unit tests for throttle/coasting/brake/reverse, speed limits, zero-speed steering, consistent results under different frame render intervals, reset, and track boundary constraints.
- Add a concise README with exact setup commands, controls, design decisions, limits and next milestones.
- Run all available quality scripts and fix problems. Inspect browser gameplay if environment supports it; otherwise explicitly report that manual gameplay validation remains required.

## Suggested task order
1. Inspect + scaffold + dependencies.
2. Define state/input/config and fixed step.
3. Implement centerline geometry and collision-safe road edges.
4. Build kart/controller and test pure movement.
5. Wire input + rendering + camera.
6. Add start/pause/HUD/reset.
7. Add purposeful visual polish.
8. Test, fix, and document.

## Acceptance checklist — no shortcuts
- [ ] `npm install` succeeds (or report genuine external blocker).
- [ ] `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` pass.
- [ ] Play opens a usable 3D kart game, not a static illustration.
- [ ] Kart on a closed, continuous, visually clear road; can drive around it.
- [ ] W/S/A/D and arrow keys respond reliably; reverse works.
- [ ] Steering and movement are reasonably FPS-independent.
- [ ] Kart cannot simply cross visible road barriers.
- [ ] Smooth camera follows kart through bends.
- [ ] Reset works after collisions and at speed.
- [ ] Pause and tab-focus behavior prevent simulation jumps/stuck input.
- [ ] No unrelated future milestone systems or copycat franchise assets.
- [ ] README accurately describes how to use the implementation.

## Your final response after implementation
Explain what you actually built, list important files, how to run it, which commands/tests passed (or failed), known limitations, and recommended next steps. Be specific and do not claim success without verification. Work autonomously through the entire first milestone; avoid stopping after planning or scaffolding.
