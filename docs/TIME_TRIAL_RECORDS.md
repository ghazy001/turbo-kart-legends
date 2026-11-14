# Time Trial personal records and ghost replay

Implemented 2026-11-08. This is a local single-player feature; it introduces no server, account, asset or dependency.

## Play flow

Choose **Time Trial → Racer → Kart → Track → Review → Start race**. Track and review screens show this course's saved best race/lap and whether a replay exists. Complete three clean ordered laps to establish a record. Results highlight a first benchmark, a new race record and/or a new lap record; **Race again** immediately loads the latest best-run reference.

The best lap and full-race records are independent. Only a faster complete race replaces the ghost. A slower race containing a faster lap updates the lap record while retaining the faster race's replay. Equal/slower attempts do not write storage. Incomplete/abandoned attempts do not save partial lap records.

A cyan hologram replays the fastest clean complete race on the same race clock. **VS BEST RUN** compares your elapsed time with when the reference first reached your matching validated multi-lap course progress. Negative means ahead; positive means behind. It is an approximate interpolated comparison, not a same-location nearest-road shortcut or a comparison against an unrelated lap. Reverse/stop sections preserve first arrival using monotonic furthest progress. Toggle **Show best-run ghost** to hide the visual while comparison and recording continue.

Pause/focus loss freezes the existing race clock and ghost. **R / Recover kart** makes this attempt practice-only and hides its ghost/comparison until a clean restart. The normal race, finish and retry controls still work; existing records are retained. A replay discontinuity, invalid pose or exceeding the 15-minute recording budget also prevents replacement. Pause itself does not invalidate a run.

Existing race timing is preserved: time starts at GO, and the first lap includes rolling from the grid to the start gate. There are no changes to acceleration, steering, drift, boost, hop, collisions, camera, gates/laps, CPU, cup scoring or item rules. Quick Race, VS, cup and Free Drive do not record Time Trial attempts. Time Trial remains solo and item-free.

## Data and lifecycle

- `timeTrialConfig.ts`: schema/policy versions, 10 Hz samples, 15-minute / 9,002-frame cap, 1.5-million-character storage cap and record tie tolerance of 0.5 ms.
- `TrialRun.ts`: pure fixed-step observer. It records an initial pose at time zero, quantized x/y/z/heading/steering/wheel angle/furthest progress every 0.1 s, and a precise fractional-finish sample. Signed zero is canonicalized for stable JSON round trips. It never writes simulation or race progress.
- `ghostPlayback.ts`: binary search and interpolation into a reusable pose; shortest-path heading interpolation across ±π. RaceSession exposes visual time aligned with its existing interpolated player pose. There is no second simulation clock.
- `trialRules.ts`: compatibility fingerprint of sampled course/width/start, lap count, handling/drift/boost config, physics step, checkpoint/sweep/grid and rail-face tuning, plus explicit rules version. A future algorithm change must bump the policy version. Cosmetic swaps do not invalidate a record because they do not change handling.
- `TrialRecords.ts`: optional browser storage adapter, read at setup and written once at finish. Keys are `turbo-kart-legends.time-trial.v1.<track-id>`, one record per supported course. Stored fields: `{version, rules, laps, bestRace, bestLap, lapTimes, ghost}`; `lapTimes` belongs to the fastest complete race, while `bestLap` may come from another clean finish.
- Each ghost frame is `[seconds, x, height, z, heading, steering, wheelAngle, furthestValidatedDistance]`. Time is strictly increasing and progress nondecreasing. Parsing bounds payload/sample sizes, finite values, chronology, coordinate ranges, timing sums, duration, rule/lap identity and finish distance. Malformed/incompatible metadata is ignored; corrupt replay frames can be discarded while valid times survive.
- Quota failure retries a small timing-only write while retaining the full replay in memory. Complete denial keeps records for this session. Results explicitly distinguish these cases. Browser data deletion/private browsing may remove records. These local values are not trusted online scores or tamper-proof records.
- The previous reference stays fixed during an attempt; finishing never turns your current run into a live self-ghost. Retry/setup reads the newest compatible record. Duplicate completion callbacks cannot write/award twice. Recovery invalidates only the current attempt; restart clears attempt buffers/status.

## Rendering and UI

`TimeTrialGhost.tsx` renders an original small kart/driver hologram with one shared translucent basic material, eight small meshes, no imported GLB clone, collider, shadow, item/audio effects or light. Wheel/steering/height/heading read the replay. Opacity decreases near the player to avoid obscuring the kart. It has no effect on physics, progress, item queries or camera targeting. The silhouette is deliberately generic; it is not a duplicate of the chosen cosmetic model. Geometry/materials are created at mount, not per frame, and the scene owns disposal.

`TimeTrialHUD.tsx` supplies record summaries, live personal-best/delta/visibility UI and results highlights. Timing snapshots update at 10 Hz, not per physics tick. Delta uses text/sign as well as color and avoids repeated live-region announcements; the visibility checkbox supports keyboard focus. Results remain scrollable on short viewports. `formatTime.ts` extracts the existing formatter; RaceHUD re-exports it for existing callers. The shared pre-race shell, routes, keyboard/gamepad navigation, phone input and results buttons remain in place.

## Changed files

New: `src/game/config/timeTrialConfig.ts`; `src/game/timeTrial/{types,trialRules,ghostPlayback,TrialRun,TrialRecords}.ts`; `src/game/render/TimeTrialGhost.tsx`; `src/game/ui/{TimeTrialHUD.tsx,formatTime.ts}`; `src/styles/timeTrial.css`; `src/game/tests/timeTrial.test.ts`; this report.

Integration: `RaceSession.ts` (observer/reset/recovery hooks and visual time only), `App.tsx` (load/reference/finish commit), `runtime.ts`, `GameCanvas.tsx`, `RaceHUD.tsx`, `ResultsMenu.tsx`, `RaceSetupScreen.tsx`, `TrackSelectScreen.tsx`. README, architecture, design, roadmap and AGENTS document the accepted scope.

## Verification

The focused initial run passed **14 new tests**, including clean full three-lap recordings on both courses. A further regression case compares driving/progress with and without a saved reference; the complete suite passed **315/315 tests across 28 files in 145.76 s** using the normal two-worker `npm run test` script. All earlier item, movement, drift/boost/hop, collision, CPU, lap/cup/VS, input/phone relay, asset and menu tests pass.

Behavioral checks cover fractional finish capture, 30/60/144 Hz replay equality, shortest-angle interpolation, height/steer/wheel replay, matched-progress delta signs/plateaus, invalidation/restart, independent lap/race records, no overwrite on practice/equal/slower attempts, idempotent completion, per-track/rules separation, malformed/corrupt/oversize data, quota/denial fallbacks, pause, CPU-mode exclusion and full-course save/reload/playback.

Initial Sunshine headless run: **134.745400431 s**, lap times **46.104352984 / 44.319969918 / 44.321077530 s**, **1,349 frames**, **74,089 JSON characters**. Player used normal pursuit input at an 18 m/s target and had zero recoveries. This is a deterministic integration test, not human handling validation.

`npm run typecheck`, `npm run lint` (zero warnings), `npm run build` and `git diff --check` pass. The final build transformed **741 modules** and Vite completed in **3.06 s** after TypeScript validation. No dependency versions, source GLBs or handling constants changed.

### Browser verification

Used the existing local game at `http://127.0.0.1:5173`, normal Home/Time Trial/racer/kart/track/review/start navigation, and the explicit development pursuit checkbox that submits ordinary input. No positions, progress, localStorage entries or React/Three internals were injected.

- First Sugar Rush Valley attempt completed **three ordered laps in 2:21.755**, **zero recoveries**; laps **48.457 / 46.649 / 46.649 s**. It displayed **FIRST BENCHMARK**, personal-best lap and **Best run saved**. Time Trial showed no opponents/pickups/item inventory; counters stayed zero.
- **Race again** returned to countdown with the saved race/lap and enabled ghost checkbox.
- A full page reload returned to Home. Reopening setup showed **2:21.755 / 0:46.649** and **Best-run ghost ready**, proving persistence beyond the runtime instance.
- A slower normal-input retry (14 m/s pursuit target) visibly rendered the cyan ghost ahead. The live comparison showed **+1.70 s**, then **+2.28 s** behind, with the correct saved race/lap.
- Space on the visibility checkbox toggled it off; race time and delta continued. Toggling it back on restored visibility. The existing keyboard adapter correctly leaves Space to the checkbox.
- Pause held time at **1:17.483** and comparison at **+8.38 s** across later observations. Paused recovery changed the attempt to **Practice run · recovery used**, cleared the delta and set speed zero while the saved records stayed unchanged. **Restart session** cleared practice state, returned to zero-time countdown and restored the saved reference/checkbox.
- Setup record panels were compacted after a visual check found footer crowding. Scope-specific sizing preserves the shared menu/footer and allows scrolling on smaller screens.
- The ghost adds eight small geometries/at most eight visible draws, one shared material and no textures. Sampled settled counts were **181 geometries / 13 textures** without a ghost and **189 / 13** with it; scene/view/asset-cache totals vary. Captured timings during development/parallel regression work are not a device performance benchmark.
- Error-only console inspection returned **no errors**. The existing upstream `THREE.Clock` deprecation remains visible and is not suppressed. The ordinary `/` Home route is restored and QA autodrive is removed. The clean pursuit benchmark remains in Sugar Rush Valley local records so its demonstration ghost is immediately available; it is a QA run, not a human personal best.

Captures: [first record](time-trial-qa/first-record.png), [reloaded records](time-trial-qa/reloaded-records.png), [ghost run](time-trial-qa/ghost-run.png). The first complete browser run and the subsequent partial replay/control check are distinct; a second complete browser finish is not claimed. Physical-device/human balance checks remain manual.

## Limits / next improvements

Replay is visual and sampled, with centimeter-scale path approximation on curves and approximate live time deltas. It does not reproduce the original cosmetic model, tire slip/lean/suspension VFX or authored driver animation. Reference ghosts disappear after their recorded finish. Best laps save only with a completed eligible race; separate partial-lap records and lap ghosts are not implemented. Fifteen minutes is the recording limit, not a new race timeout. Only this browser/device stores records; no export/import, cloud sync, leaderboard or anti-cheat is included. Physical phone/gamepad and cross-browser performance/playtesting remain manual.
