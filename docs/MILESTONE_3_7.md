# Milestone 3.7 — Coast to Candy / Sunshine Cup

## Delivered

- **Sugar Rush Valley**: a second original closed course, a broad starting straight and an east-side chicane, 11 m road, candy groves, sherbet hills, purple road/rails and a lavender sky. All scenery is procedural and stays clear of the driving corridor. The course is flat; existing drift-entry hops remain the only jumps.
- Typed `tracks/trackCatalog.ts`: shared sampled tracks, IDs, names, descriptions, difficulty, visual palettes and the Sunshine Cup itinerary. Selection maps, minimap bounds, scenery, signs and HUD use the active course.
- Quick Race, Time Trial and VS can launch either course. Draft/committed track IDs and grid indices restore correctly across menus and existing local preference loading. VS remains a local human against three CPU rivals.
- **Sunshine Cup**: Sunshine Circuit → Sugar Rush Valley, three laps each, the existing player + Breeze/Nova/Moss lineup, **10/7/4/1** points per race. A round result is committed once, cannot be farmed, and snapshots finish times independently from mutable race state.
- Round results show awards, cumulative standings, timing, the next course and championship progress. The final screen adds both rounds' points, the winner and a full-cup restart action. Original inline trophy artwork and shared keyboard/gamepad/focus handling.
- Ties use most wins, then second/third/fourth places, then the latest finishing order. Stable racer ID is a final deterministic fallback.
- Pause → Restart session retries the unscored current round and keeps previous scores. Returning to Home abandons the cup. Full-cup restart creates a fresh championship. Reload does not resume an active cup; cosmetic/sound/mode/last-track preferences still persist.
- As in existing Quick Race, the field freezes when the player finishes. Unfinished opponents are classified by validated progress and keep a null finish time. No AI finishing times are invented.

## Ownership and files

Added:

- `src/game/tracks/sugarRushValley.ts`: original path data, sampled by the existing algorithm.
- `src/game/tracks/trackCatalog.ts`: typed course metadata/themes and cup definition.
- `src/game/race/CupSession.ts`: pure championship bookkeeping and guarded round transitions.
- `src/game/ui/CupResultsMenu.tsx`, `src/styles/cup.css`: championship results.
- `src/game/tests/cup.test.ts`: scoring/idempotency/snapshots/ties/restarts and a full two-round normal-input integration run.

Updated:

- `src/app/App.tsx`: launch the actual selected track; own cup lifecycle; swap the scene fragment/HUD at a round transition, retaining the WebGL canvas and existing input/audio/phone services.
- `ui/menu/{menuCatalog,raceFlowStore,RaceSetupScreen,TrackSelectScreen,MainMenuScreen}` and `styles/menus.css`: two courses, real cup itinerary, readiness/review and correct launch descriptors.
- `render/{Environment,TrackVisual,GameCanvas}`: course palettes and signs; direct scene sky/fog attachment; keyed scene fragment with independent camera/opponent bindings.
- `ui/{HUD,RaceHUD,ResultsMenu}`: active-track labels, dynamically fitted course map, countdown and regular results.
- `tests/{track,ai,raceFlow}.test.ts`: both road corridors and CPU completion, selection/persistence and fixed cup route.
- Root documentation and page metadata.

`RaceLaunch` is now `{ kind, mode, trackId, selection, cupId }`. `CupSession` exposes the active `race`, zero-based `round`, completed `rounds`, `complete`, `recordFinish`, `nextRound`, `restartRound` and cumulative `standings`. It never advances movement itself.

**Unmodified gameplay modules:** core simulation/fixed step, kart steering/collision/drift/boost/jump formulas, AI pursuit, RaceSession, lap/checkpoint validation, racer collision, race configuration and ChaseCamera. No dependencies, collider dimensions, phone protocol or backend rules changed.

## Adding another course or cup

1. Add a unique original `TrackDefinition` and call the existing `sampleTrack`. Keep the road wide and nonintersecting; use generous corner radii and enough clearance between different sections.
2. Register its literal ID, sampled track, display metadata and scene palette in `trackCatalog`. Selection and minimaps derive artwork directly from samples; no screenshot asset is required.
3. Add the ID to a cup's ordered `tracks` array. CupSession creates the existing RaceSession for each course. Additional selectable cups would also need a Cup Select registry/list; the current UI intentionally offers one cup.
4. Run the parameterized track/AI suites, and add normal-input full-race coverage for the new course. Validate spawn/grid/gates, rail impacts, both traversal directions and AI recoveries before release.
5. Add any new scenery as bounded instanced decorations outside the road. Visual props must not change colliders or introduce unsupported terrain jumps.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`: passed. **161 tests / 17 files**.
- Both courses pass continuous/uniform closed sampling, tangent-aligned spawn, no crossing road edges, both-side impacts, non-tunneling/reverse, edge sliding and complete traversal in both directions.
- All three opponents complete three validated laps on both courses with bounded wall contacts and no chronic recovery. A normal-input player completes the entire two-race cup with AI traffic, zero player recoveries and all four karts constrained inside the road.
- Cup unit checks cover early/foreign/stale/duplicate finish rejection, independent result snapshots, round restart, clean next-round state/abilities, totals, countback/final-round ties, and honest unfinished classifications.
- Existing movement, drift/boost, frame consistency, lap validation, GLB instances, keyboard/gamepad and phone transport suites pass.
- `git diff` confirms no changes to the existing core/kart/AI/race/checkpoint/collision/camera source modules listed above. `git diff --check` passes. No new packages.

Browser evidence and remaining manual checks follow.

### Browser run (local in-app browser)

- Completed the full Grand Prix using the explicit development **Autodrive with normal inputs** checkbox; it drives the existing controller and crosses every gate, without teleporting or skipping laps.
- Sunshine Circuit: **2:14.534**, best lap **0:44.278**. Round-one awards were You 10, Nova 7, Breeze 4, Moss 1.
- Next race loaded the correct Sugar Rush Valley road, scenery, sign, map, grid, fresh countdown and lap/timing state. A pause/focus event was handled by the normal pause overlay during the initial canvas-remount implementation. The final implementation retains the WebGL canvas and replaces only scene children; a later full-cup restart ran immediately without that extra pause.
- Restarted round two from Pause. After completing Sugar Rush Valley (**2:21.683**, best **0:46.633**), the final table retained round one and showed **20 / 14 / 8 / 2**, with separate R1/R2 awards and the cup winner. Full-cup restart returned to Sunshine Circuit, fresh countdown and lap one.
- Returned Home, launched Time Trial, navigated to Sugar Rush Valley with ArrowDown, confirmed review and verified the actual selected track with solo HUD/no CPU standings. Keyboard W reached **42 km/h**; D steering was exercised; R returned speed to **0**, kept the running clock/checkpoint state, and Escape opened Pause. The clock remained at **0:34.950** while paused across subsequent verification work.
- Narrow track selection rendered both cards, selected state, preview/name and footer without horizontal clipping. Screenshots include the selected course, live scenery, first-round standings and final championship.
- No application console errors were observed; the existing upstream Three.Clock deprecation warning remains.
- Sampled two-second renderer windows during this automated local session varied with visible rivals, camera, startup and concurrent verification: Sugar Rush Valley approximately **80–218 draw calls**, **355k–892k triangles**, **16.6–30.5 ms median** and **20.4–79.2 ms p95**. These are browser frame intervals, not isolated GPU timing or a 60 FPS guarantee. The dense supplied kart models remain the main art/performance constraint; the initial 150-call target is exceeded in some views. No new downloaded textures/models or postprocessing were added.

Evidence: `milestone-3-7/round-one.png`, `sugar-rush-valley.png`, `track-selection.png`, `cup-final.png`.

## Remaining limits / next steps

- One fixed two-course cup; no cup progress save, unlocks, records, split-screen or human multiplayer.
- Flat roads; no terrain ramps, shortcuts, additional physical obstacles, items or changed race rules.
- Physical gamepad and phone motion/Wi-Fi checks, human drift/chicane tuning, listening, and a Chrome/Firefox/Safari/GPU matrix remain manual. Existing unrigged driver fits still need artist cleanup and authored animation.
- Suggested next work: VS setup options (lap count/opponent difficulty) with isolated configuration, then original driver/vehicle art and measured performance cleanup before items/combat.
