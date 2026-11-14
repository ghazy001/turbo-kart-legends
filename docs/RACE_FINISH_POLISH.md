# Race-finish presentation and polish

Accepted after Frostbite Peak; implemented 2026-11-08.

## Behavior

- Quick Race and VS show the top three **existing classified racers**, in their actual cosmetic kart/driver combinations. If the player finishes fourth, the three rivals occupy the podium. Unfinished rivals retain “On track” labels and null finish times. No extra race time is simulated and no finish times are invented.
- Cup round results use the committed round snapshot. The next action is **Next cup race**. Championship totals/countback determine the final podium and champion, even when someone else wins the final round. Per-round awards and full final points remain visible. **Race cup again** creates the existing fresh championship.
- Time Trial has a solo finish stage and retains lap times, best race/lap, signed previous-best comparison, storage notices, recovery/practice exclusions and the existing ghost/retry behavior. Eligible first benchmarks, race records and lap records receive a special cue and celebration; practice and ordinary completions receive the normal finish cue.
- Race, cup and Time Trial share one results shell, focus trap and bottom action row. Arrows/WASD or gamepad stick/D-pad navigate; Enter/Space/A confirms; Escape/Backspace/B returns Home. Tab/Shift+Tab remain available. Navigation is disabled beneath controller/phone/settings panels.
- Podium rise, gentle whole-kart turn and bounded gold confetti form a short procedural stage reveal. An original modeled trophy accompanies victories/finals/records. **Drivers remain the supplied unrigged static fits, with zero authored victory clips.** The assembly can use an explicitly mapped compatible victory clip in future.
- Four short original synthesized motifs distinguish completion, victory, personal best and player cup champion. Existing sound preferences apply. Cues use a separate quiet bus and are triggered once after score/record commit; normal driving silence does not immediately mute them. Mute, blur/visibility loss, restart/Home and disposal stop scheduled celebration voices. Unmuting does not replay a cue. No downloaded music/audio was added.

## Files and ownership

New:

- `src/game/ui/results/resultsPresentation.ts`: typed read-only presentation projections, identity/cosmetic mapping and cue/badge selection.
- `src/game/ui/results/ResultsShell.tsx`: shared dialog, classification labels, model loading/fallback notice and actions.
- `src/game/ui/results/usePresentationMotion.ts`: live reduced-motion and document visibility subscriptions with cleanup.
- `src/game/render/PodiumScene.tsx`: independent cosmetic assemblies, original plinths/trophy, instanced confetti and responsive presentation camera.
- `src/game/config/podiumConfig.ts`: bounded stage timing, layout and rendering budget.
- `src/game/config/resultCues.ts`: original synthesized note schedules.
- `src/game/dev/ResultsPreview.tsx`: explicitly labeled development fixtures, no running race or record writes.
- `src/styles/results.css`: shared responsive stage/results styling, selected/focus states, transitions and reduced-motion treatment.
- `src/game/tests/resultsPresentation.test.ts`: classification, snapshots, fourth place, cup totals and record eligibility checks.

Updated: `ResultsMenu.tsx`, `CupResultsMenu.tsx`, `App.tsx`, `KartAssembly.tsx`, `DrivingAudio.ts`, `main.tsx`, audio tests, one exhaustive collision-test time allowance, and root docs. RaceSession, CupSession, checkpoint/scoring/record implementations, physics, collision response, AI, items, driving input and chase camera are unchanged.

The stage receives only cosmetic result entries, never a Simulation. It uses the same `opponentSelections` mapping as gameplay and the existing safe independent-instance model cache. Per-model failure displays an original small procedural kart; a failed canvas still leaves classification and action controls available. No source GLBs or credits were modified.

## Performance and accessibility

The gameplay renderer switches to `frameloop="never"` while results are visible. The separately lazy-loaded stage renders on demand at DPR ≤1.25, without shadow maps or an environment texture. Plinth/turn/confetti updates settle after 5.5 seconds; 42 confetti pieces share one instanced mesh. No per-frame React state or geometry allocations are used. Driver/kart buffers and materials are shared through the existing cache while scene transforms and skeletons remain independent. Stage camera fitting reacts to panel aspect ratio, with no changes to the gameplay camera.

Reduced motion immediately shows settled plinths and removes confetti/turn animation; hidden documents stop frame invalidation. Readable DOM labels expose the same ordered classification independently of WebGL. Footer actions remain available while long cup/Time Trial details scroll. Actual cross-GPU 60 FPS and physical-controller/listening checks remain manual; these budget controls are not a universal performance guarantee.

## Development preview

Open `/?results-preview` in development. The banner explicitly states **fixture data**, not a completed race. Scenarios cover race victory, fourth place, personal best, practice Time Trial, cup round, player cup champion and opponent cup champion. Next/restart actions navigate sample presentations only. **Play result cue** unlocks audio by user gesture for manual listening. Nothing is stored. This route is excluded from the production entry path.

## Verification

Targeted presentation/audio checks passed: **14 tests in two files**. The final full regression run passed **348 tests in 30 files** in **140.83 s**, including full three-track racing, cup progression/scoring, combat, Time Trial recording/ghost, phone relay, input, fixed-step, drift/boost and collision checks. `npm run typecheck`, `npm run lint` and `git diff --check` passed. `npm run build` passed after TypeScript validation: 752 modules transformed in 3.11 s; the podium is a separate **7.26 kB / 2.68 kB gzip** lazy chunk. No dependencies were changed.

An initial full run passed 347/348 tests: Frostbite's exhaustive complete-capsule boundary fixture completed without an assertion failure but exceeded its default five-second budget by 22 ms (5.022 s) while sharing workers with full races. Its per-test timeout is now 15 seconds; every geometry sample and assertion is retained. No collision code was changed.

A real normal-input browser VS race (Sunshine, one lap, Normal CPU) completed in **46.080 s**, first of four, **zero recoveries** and all 12 gates validated. Counters: 7 pickups, 1 shot, 2 traps, 3 guards and 3 hits. The results podium matched the actual classification (You → Nova → Breeze; unfinished rivals labeled On track). Pressing Enter on Race again returned to a fresh countdown at 0:00.000 with empty inventory and zero item counters. The replay also completed at 46.080 s with zero recoveries and the same seeded item counters. Left-arrow focused Home, and Enter returned to the normal Home menu. Browser error log was empty. The existing focus-loss pause during countdown resumed normally. See [real race result](results-qa/live-vs-finish.png).

Visual fixtures verified correct top-three opponents for a fourth-place player, personal-best versus practice badges/details, a 30-point player champion, and Enter advancing cup round one to round two. Escape returned Home. These fixture checks validate presentation, not actual race completion or saved records. [Championship fixture capture](results-qa/champion-fixture.png) is explicitly labeled as sample data. Full cup races and Time Trial record/retry rules also pass their unchanged automated integrations; a full browser championship or new saved browser Time Trial was not run for this presentation change.

## Remaining work

Human audio listening/volume tuning, actual OS reduced-motion toggling, narrow-device/cross-browser GPU checks and physical gamepad/phone testing remain required. The source driver models need Blender cleanup, skinning and authored victory/driving clips for expressive character animation. Original release artwork and human course/combat/AI tuning remain the next product priorities. Championships remain session-only, as before.
