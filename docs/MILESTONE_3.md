# Milestone 3 — Real race and AI

Date: 2026-11-05. Authorized by the user's explicit request to implement the proposed race milestone. Builds on M1/M2 and the supplied-GLB visual integration; no scaffold replacement or driving-controller rewrite.

## Implemented

- Quick Race against three original procedural rivals (Breeze/teal, Nova/amber, Moss/lime), Time Trial without traffic and retained Free Drive.
- A two-row starting grid, locked 3–2–1 countdown and GO cue. The race clock starts at GO; the initial line crossing arms validation and does not count a lap. The first lap includes grid-to-line launch time.
- Twelve gates derived from the existing sampled road. The track's `startDistance: 10` aligns the logical finish to the painted finish. Gate crossings use the swept player/AI center, positive direction, road width and a two-meter maximum per-tick sweep. Only the next gate can count. Every full lap requires all gates; stationary/reverse/out-of-order/outside-road/teleport crossings do not score.
- Three validated laps, race/current/best-lap time, cumulative checkpoint splits for the current lap, checkpoint hint, wrong-way warning, live position/order and colored map markers.
- Results dialog with actual total time, three lap times, best lap and finish position. Unfinished rivals are labeled **On track**, with their lap, rather than assigned fabricated times. Race again / Restart session starts from a fresh grid/countdown; Back to menu allows mode changes.
- Race recovery returns to the last validated gate, facing forward, with zero speed/drift/boost/jump state. Recovery never awards gates/laps or clears elapsed time. Before crossing the initial line it returns to the assigned grid slot. Free Drive retains its original spawn reset.
- Every racer shares one bounded 60 Hz clock. Pause/visibility handling freezes the countdown, all opponents, race timing and active boosts; charging drifts cancel as before. Resume is explicit. Results freeze the completed run.
- AI pursuit follows arc-length look-ahead points using normalized `KartInput`, with curvature speed control, three speed/lane profiles, traffic-aware passing/following, contact response and last-valid-gate stuck recovery. Catch-up adjusts only the target speed (at most +1.2 / −0.6 m/s); the normal controller and physical speed limits still own motion. No hidden teleports or stat changes occur in ordinary driving.
- Planar kart contacts separate chassis circles, exchange closing velocity and reapply the existing rail boundary. Finished bots leave the active track/contact set so they cannot block following finishers. This remains an approximate arcade contact shape, not mesh collision.
- The imported player GLBs and seated visual anchor remain intact. The pure kart/drift/jump/rail controllers, their tuning and chase camera remain unchanged; Simulation gained shared-step/interpolation entry points around that same controller. No dependency was added.

## Main files

- `src/game/race/RaceSession.ts`: shared-clock phase orchestration, racers, recovery and standings.
- `src/game/race/{trackProgress,raceProgress,racerCollision}.ts`: road/gate lookup, validation/timing and kart contacts.
- `src/game/ai/waypointController.ts`, `src/game/config/raceConfig.ts`: normal-input AI and race tuning.
- `src/game/ui/{StartMenu,RaceHUD,ResultsMenu,PauseMenu,HUD}.tsx`: mode selection, timing/countdown/standings, results, restart and minimap.
- `src/game/render/{GameCanvas,OpponentVisuals,RaceTrackVisual}.tsx`: race loop, colored rivals and checkpoint/grid art.
- `src/game/tests/{race,ai}.test.ts`: validation, timing, shared-step consistency, race completion and traffic/recovery.

## Verification

- Installed dependency versions were inspected; no dependency change was needed.
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`: **all passed after the final changes**.
- 78 tests across 11 files, including the 59 existing M1/M2/asset tests and 19 race/AI cases. Coverage includes countdown lock and pause, skipped/reverse/outside/teleport gates, repeated finish oscillation, three complete laps, final-sector recovery abuse, restart state, rankings, 30/60/144 FPS equality, contacts, stalled AI recovery, a complete Time Trial, a complete Quick Race with player pursuit and all three rivals finishing while the player waits. AI tests bound wall contacts and recoveries, cover squeezing against rails and ability cancellation, and ensure invisible finished rivals do not affect traffic. Pause tests freeze all racing karts and active boost time together.
- SHA-256 comparison confirms the existing kart/drift/jump/rail controller modules, ChaseCamera and both supplied GLBs are unchanged from the start of M3 work.
- The pre-existing user development server on port 5173 was reused. Temporary QA browser tabs are separate from the user's tabs.

### Browser checks

A development-only `/?race-preview` adds an explicit **Autodrive with normal inputs** checkbox. It calls the same pursuit input adapter and shared race loop as headless tests; no positions, checkpoints, clocks or results are injected. It is excluded from production. Verified in the in-app browser:

- Quick Race grid stays at zero speed/time while throttle is pressed during the countdown.
- A complete three-lap Quick Race, through normal-input autodrive with all AI/contact/gate rules active, reached results: **2:14.670 total**, laps **0:46.069 / 0:44.305 / 0:44.296**, **1 of 4**, **zero recoveries**. The times sum to the recorded total. Best lap and splits updated during the run. Trailing rivals were correctly labeled on track, lap 3.
- Race again resets lap/best/split/time to a fresh grid/countdown. Pausing freezes that countdown and time while W is held; it remained at zero in a later observation.
- Time Trial starts without live standings/opponents, uses the same countdown/validation and retains elapsed time after R. Reversing across the line produced the wrong-way warning without awarding a lap; recovery cleared the warning, restored forward heading and zero speed, and retained the expected next gate and elapsed race time.
- The only captured browser warning during this full race was the existing upstream Three.Clock deprecation. No console errors were observed.

Evidence: [countdown/grid](milestone-3-countdown.jpg), [complete race results](milestone-3-results.jpg). Additional final checks:

- Time Trial's paused clock remained at **0:19.667** in a later observation. The expected gate/lap remained unchanged after reversing and recovering.
- Free Drive: normal keyboard acceleration reached 48 km/h, Space+steer entered a hop/charging drift, release produced Spark Turbo and exhaust effects, and pause froze the active boost. [Free Drive evidence](milestone-3-free-drive.jpg).
- Final production build: Quick Race menu, countdown, imported models, normal keyboard launch, AI movement and first valid start crossing all worked. The HUD reached 45 km/h, lap 1, position 1/4 and next gate 1. No console errors were captured; only the known upstream Clock warning. [Production race evidence](milestone-3-production.jpg).
- The production build contains neither the race diagnostics/autodrive UI nor the asset workshop, even when the development query parameter is supplied. HTTP readiness and shipped asset responses were checked.


## Known limits and next work

- One flat track, three laps and three rivals; no ramps, items, ghosts, multiplayer or persistence. Time Trial best lap is for the current run, with no saved personal record.
- AI does not drift or use turbo. It avoids traffic and varies target speed, but it is a waypoint controller with simple passing rather than a tactical racing planner. More human playtesting is needed for difficulty and fairness; no claim of zero contacts for every possible player maneuver.
- Bots that finish leave the active circuit. The run stops when the player finishes; rivals still behind have progress/place but no finish time. No simulated post-finish results are invented.
- The driver still has the documented approximate static mesh pose, with no seated animation; proper original art/rigging remains a separate Blender task.
- Browser/controller/listening coverage gaps from prior milestones remain: physical controller, real OS focus switching, Chrome/Firefox/Safari matrix and measured frame-time/performance validation. One automated in-app-browser run does not establish human handling balance or a 60 FPS guarantee.
- Existing upstream Three.Clock deprecation warning remains recorded and unsuppressed.

Next: complete human race/controller/browser tuning and original seated character work, then Milestone 4's original items/combat. No M4 system is included here.
