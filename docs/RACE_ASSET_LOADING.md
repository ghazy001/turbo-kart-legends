# Race grid loading fix

Previously, each `KartVisual` used the original procedural kart as its Suspense loading fallback. Player and AI GLBs resolved independently while the race countdown continued, producing visible kart transformations.

The loading fallback is now empty. `GameCanvas` builds a per-lineup `RaceAssetLoading` barrier for the player and the actual CPU racers (solo modes wait only for the player). It preloads each kart/driver pair with the same combined `useGLTF` cache key used by `KartAssembly`. It hides the race Canvas behind a minimal full-screen loading screen until every assembly has committed or explicitly failed. The same Canvas/context is retained; fitted geometry and independent instances still use the existing caches.

`GameLoop` holds the existing clock, audio and input while waiting and discards the first ready frame's loading delta. Keyboard/gamepad driving and reset are disabled until readiness; focus-loss and pause behavior remain available. Physics, AI, colliders, checkpoint rules, item formulas and camera tuning are unchanged. No model, texture or dependency was added.

Readiness is isolated per race/selection. Stable status reporters update a small external store only when status changes; old callbacks cannot unlock a new grid. A real model error settles its slot through the existing procedural error fallback and shows a failure notice. Pending models never display that fallback. Reload remains the retry action; there is no fabricated asset or change to the Time Trial hologram.

## Verification

- Five new loading-state regressions cover out-of-order player/CPU readiness, solo races, explicit errors versus pending requests, stable snapshots/subscription cleanup, and late previous-grid callbacks.
- Focused loading + real-model suite: **43 tests passed**. Typecheck, lint and production build passed. Final build: 766 modules; App JS 235.51 kB / 75.55 kB gzip.
- The first full run overlapped browser/build work: **393 passed, 2 timed out** at the unchanged 60-second limits (Volcano CPU endurance and Sugar Rush 5-lap Hard VS). Neither reported a gameplay assertion failure. With browser QA closed and builds finished, the standard full rerun passed **395 tests / 33 files in 169.45 seconds**. No timeout or simulation code was relaxed. `git diff --check` passed.
- Browser: Quick Race on Volcano Sprint displayed the loading screen at **1 of 4 ready**, with the countdown still at **3** and race time **0:00.000**. Once ready, the loaded Arnold/Boat Kart and supplied AI assemblies appeared on the grid. Resume preserved the countdown. Normal-input autodrive completed a validated lap (0:58.773), advanced into lap two, and showed working CPU standings, pickups, traps, bolts and turbo activity. Escape paused; keyboard activation of Restart session returned to lap one/time zero with cached models intact. No new browser errors were recorded.
- The temporary QA tab was closed; the original user tab was preserved. No artificial network throttling, forced model failure or physical phone/gamepad test was performed. Error-state transitions are covered by unit tests and retain the existing renderer error boundary.

Capture: [GLB grid during countdown](design-qa/grid-loading/ready-grid.png).
