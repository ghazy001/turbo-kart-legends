# Competitive AI — fair racing decisions

Implemented 2026-11-17. This user-requested gameplay pass supersedes the older milestone restriction on changing opponent navigation. Player handling, collision capsules, camera, controls, lap/checkpoint rules, cup scoring and Time Trial record fingerprints are unchanged.

## What changed

The old opponents cruised at 15.7–17.1 m/s, used a broad bend-angle speed penalty, never drifted and could brake immediately after earning a turbo. Passing sides were recomputed every tick, with no commitment or swept lane clearance. A player-gap adjustment added up to 1.2 m/s behind the player and removed up to 0.6 m/s ahead.

- **Racing lines:** a cached, smoothed outside-entry / inside-apex / open-exit offset derives from the actual sampled road. Each profile retains a small line preference.
- **Cornering/braking:** the planner reads 60 m ahead, estimates legal corner speed from the existing steering model, accounts for an inside passing lane's tighter radius and constructs a braking envelope. It accelerates out of bends and slows before tight ones. Extra edge caution and shorter wide-line lookahead help a passing kart follow tight bends and recover its line before contacting rails.
- **Pace:** Medium cruise targets are 18.8 / 19.1 / 19.4 m/s. Easy subtracts 2.8; Hard adds 0.6 with an explicit **20 m/s shared normal-speed cap**. All use ordinary acceleration/braking, steering, slip and collisions.
- **Battles:** bounded local scans choose a clear passing side and commit for 1.35 s. Lane motion is rate limited. Checks cover the swept lateral path, approaching traffic and return to the racing line. Squeezed karts can move apart instead of deadlocking. A blocked kart follows/brakes rather than driving through traffic.
- **Defense:** Medium/Hard may make one inside-line move against a faster rear rival, with a 3.5 s cooldown. They yield lateral clearance once another kart is alongside; no repeated reactive blocking across both sides.
- **Drift turbos:** Medium aims for a short charge, Hard for a longer one, only in suitable bends with room. Steering accounts for the actual drift model; traffic, braking, tightening corners or approaching track features cause release. A four-second retry budget prevents repeated hop attempts. These are real drift inputs, hops and earned boosts, not timer-based speed grants.
- **Track features:** the ideal line centers on actual nearby turbo/jump gates. Active boosts may run above cruise pace using the normal 24/26/28 m/s tier limits; the corner/following safety envelope still wins. The existing Sunshine pads and raised ramp trigger normally. The current courses have **no branched shortcuts**; AI neither invents one nor bypasses rails/checkpoints.
- **Fairness:** the player-gap adjustment is removed. No position injection, extra grip/acceleration, private boost award, collision exemption or forced close-finish adjustment exists. Attacks, shields, traps and Turbo Charge still use the existing shared item system.

## Difficulty and state

Choose **Easy / Medium / Hard** in **VS Race → Race Options**. Quick Race and Grand Prix use Medium. The saved `normal` ID remains unchanged and displays **Medium**, so existing local defaults load without migration. Time Trial and Free Drive remain solo.

Difficulty changes cruise target, corner margin, comfortable braking plan, tactical decision interval, passing range/lane-change rate, defense and drift-charge ambition. It does not change kart physics. CPU identities remain Breeze, Nova and Moss; changing traffic, their profile preferences and seeded item interactions produce different battles without random steering jitter.

Each opponent owns an independent `AIDriverState`: current/target lane, tactical timer/commitment, maneuver/rival, defense cooldown and drift retry cooldown. RaceSession advances this memory only on the existing 60 Hz fixed steps, resets it on race start/recovery and freezes it while paused. The pure driving function returns only `KartInput`. Demo/test callers without a context retain the same normalized-input interface and do not gain autonomous drift.

## Important files

- `src/game/config/aiConfig.ts`: skill profiles, line/traffic/drift budgets and safety tuning.
- `src/game/ai/racingLine.ts`: weakly cached curvature/line tables and predictive speed envelope.
- `src/game/ai/trafficPlanner.ts`: independent decision state and committed passing/defense/following.
- `src/game/ai/waypointController.ts`: ordinary steering/throttle/brake/drift outputs and feature awareness.
- `src/game/config/{raceConfig,raceOptions}.ts`: competitive cruise targets and compatible difficulty names.
- `src/game/race/RaceSession.ts`: fixed-step context and start/recovery memory lifecycle.
- `src/game/ui/menu/RaceSetupScreen.tsx`: accurate default Medium label.
- `src/game/tests/{aiRacecraft,ai,raceOptions}.test.ts`: new behavior/fairness regressions and existing full races.
- `scripts/benchmark-ai.mjs`, `docs/ai-qa/{baseline,all-pace}.json`: reproducible measurements and preserved before/after results.

Curvature/line tables are calculated once per immutable sampled track and weakly cached. Speed planning interpolates those tables without rebuilding geometry. The existing road projection is shared with traffic decisions. No new render geometry, textures, listeners, backend or dependencies were added. Full browser/device FPS and GPU-memory profiling are not claimed.

## Measured pace

These are **single, item-free solo laps from a standing start**, averaged across the same three profiles on the unchanged sampled tracks. The old Medium/default implementation at commit `e5f6ba9` was measured before edits. The new implementation uses real movement, actual track pads/jumps, all 12 ordered checkpoints and legal drift inputs. This isolates driving quality; these figures are not promises about player win rate or traffic/item race times.

| Circuit | Before default | Easy | Medium | Hard | Medium lap-time reduction |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sunshine Circuit | 48.53 s | 45.33 s | 39.47 s | 38.53 s | 18.7% |
| Sugar Rush Valley | 50.07 s | 46.42 s | 39.95 s | 38.33 s | 20.2% |
| Frostbite Peak | 56.77 s | 53.23 s | 45.76 s | 44.19 s | 19.4% |
| Volcano Sprint | 52.73 s | 49.32 s | 42.70 s | 41.22 s | 19.0% |

All **36** new measured laps completed; Hard was faster than Medium and Medium faster than Easy on every course/profile. None recorded a centerline distance above the benchmark's conservative 3.5 m near-edge threshold. The JSON field `scrapes` counts those near-edge ticks, not physical contact callbacks. Speeds above 20 m/s in this report follow ordinary earned boosts/overspeed decay.

Re-run from the project root with `node scripts/benchmark-ai.mjs` (all skills), or append `easy`, `normal` or `hard`. It uses the installed Vite TS loader in middleware mode with HTTP/HMR/WebSockets disabled and writes its selected JSON report. A missing finish returns a nonzero exit status. The baseline JSON is archival and is not regenerated by this command.

## Verification and limits

- New unit scenarios cover the corner-speed envelope, continuous line/seam, center-lane passing and side commitment, blocked-pack braking, swept lane-change safety, squeeze escape, single-move defense, player-gap independence, ordinary-simulation equivalence, independent memory/reset/pause and saved `normal` compatibility.
- Existing regression checks exercise full three-lap CPU races, 1/3/5-lap VS across all courses/skills, four-round cups, 30/60/144 FPS equality, solid boundaries, items, records and input lifecycles. During tuning, wide-lane cornering and squeeze deadlocks were found and fixed; the original safety assertions and timeout limits were retained.
- Browser: completed a **one-lap Hard Sunshine VS** race using the explicitly enabled development normal-input QA driver at its usual 18.2 m/s pace, with automatic player item use off. Breeze finished in **39.088 s**, Moss in **40.249 s**, the player in **40.426 s** (3rd, **0.177 s** behind 2nd); Nova was still on track. Zero player recoveries, 12 validated gates, real CPU boosts/jumps and item interactions. No console errors were captured. This verifies a working race, not expert-human difficulty balance. Capture: `docs/ai-qa/browser-hard-finish.png`.
- `npm run typecheck`, `npm run lint` (zero warnings), `npm run build` and `git diff --check` passed. Final production build: **1.58 s**, App JS **281.46 kB / 91.41 kB gzip** (about 5.57 kB more uncompressed than the prior track-menu build); no new runtime dependencies or render assets.
- Final isolated `npm run test`: **491/491 tests across 41 files passed in 120.28 s**, including the real four-round cup, all configured CPU/VS races, FPS consistency, solid boundaries, items, records, supplied model checks and local relay/input regressions. The first full run passed 490/491 and exposed one wide-line cup corner exceeding the original conservative road-margin assertion; shorter wide-line pursuit fixed it. The complete cup then passed in isolation and the full suite passed with that original assertion unchanged.

Remaining work is human balance testing across driving skill levels, hardware/browser performance checks and future route-graph support if actual shortcuts are authored. Close finishes arise from driving/traffic/items; they are not guaranteed or scripted. Lane planning is local, not an exhaustive long-horizon optimizer, so racing contact and an occasional existing stuck recovery can still occur.
