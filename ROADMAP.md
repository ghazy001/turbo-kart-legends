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

## Milestone 3 — Real race and AI
Add checkpoints/laps, countdown, finish line, split times and ranking; 3–5 waypoint-based AI karts; obstacle behavior, catch-up logic with limits, reset/recovery; Quick Race and Time Trial.
Exit: 3-lap races work; no skipped-checkpoint exploits; AI completes races without chronic wall collisions.

## Milestone 4 — Items, combat and balance
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
