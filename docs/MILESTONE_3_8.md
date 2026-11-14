# Milestone 3.8 — VS Race customization

## Delivered flow

**Home → VS Race → Racer → Kart → Track → Race Options → Review → Start race.**

- Race length: **1, 3 or 5 laps**.
- CPU difficulty: **Easy, Normal or Hard**, with the same three opponents and unchanged steering, traffic avoidance and physical limits.
- Review lists the actual course, racer, kart, lap count and CPU difficulty. The HUD, countdown wording and results follow the launched session's settings.
- Arrow/WASD or standard-gamepad directions: Up/Down switches option rows; Left/Right cycles values with wrap. Enter/Space confirms to review; Escape/Backspace returns to the prior step. Mouse/touch can select each radio card; Tab retains normal accessible focus navigation.
- Back retains choices within setup. Leaving setup cancels drafts. Starting saves VS defaults locally; a reload restores them. Race Again and Pause → Restart session retain the launched configuration. Cosmetic editing during pause cannot change race options.
- Quick Race, Time Trial, Free Drive and each Grand Prix round retain default **3 laps / Normal**; VS defaults cannot leak into those modes.

## Files and state

Added:

- `src/game/config/raceOptions.ts`: typed lap/difficulty choices, labels, validation and default configuration.
- `src/game/config/vsPreferences.ts`: safe versioned browser-local defaults.
- `src/game/ui/menu/RaceOptionsScreen.tsx`: shared-shell options screen, two accessible radio groups, course preview and explanatory text.
- `src/game/tests/raceOptions.test.ts`: settings, storage, flow, session, timing, full-race and CPU coverage.

Changed:

- `config/raceConfig.ts`: widens the opponent profile target-speed type to support per-session pace.
- `race/RaceSession.ts`: copies/freezes the validated options at construction, creates independent difficulty profiles and passes the configured lap target to the existing progress function.
- `race/raceProgress.ts`: explicitly types its already-existing lap-target parameter as a number. Validation and progress algorithms are unchanged.
- `ui/menu/{menuCatalog,raceFlowStore,RaceSetupScreen,TrackSelectScreen}`: VS-only options step, draft/commit/reset behavior, summaries, track lap labels and independent launch snapshot.
- `app/App.tsx`: passes final options to the selected RaceSession, saves VS defaults on start, adds difficulty to the session label and reloads development state when menu-store/options modules change.
- `ui/{RaceHUD,ResultsMenu}`, `styles/menus.css`: active lap target, CPU label, singular/plural text and responsive option cards.
- `tests/raceFlow.test.ts`: includes default options in the launch contract.
- Root documentation and this report.

State additions:

```ts
RaceOptions = { laps: 1 | 3 | 5; difficulty: 'easy' | 'normal' | 'hard' }
RaceFlowState += { vsOptions: Readonly<RaceOptions>; optionsIndex: 0 | 1 }
RaceLaunch += { options: Readonly<RaceOptions> }
RaceSession += { readonly options: Readonly<RaceOptions> }
```

The existing external UI store is reused; no Zustand or other dependencies were added. `optionsIndex` is only menu focus/navigation state. Race options are immutable session configuration, not editable high-frequency simulation state.

## Difficulty and persistence decisions

Difficulty changes **opponent target pace only**: Easy −3 m/s, Normal unchanged, Hard +1.5 m/s relative to each existing profile. The AI controller still applies its original curvature, traffic and bounded catch-up rules; it submits normal KartInput to the shared simulation. No new acceleration, grip, boost, shortcut or teleport advantages are introduced. These presets are initial tuning, not human playtest balance claims.

`turbo-kart-legends.vs-options.v1` stores `{ version: 1, laps, difficulty }` separately from existing cosmetic/menu preferences. Unsupported versions, bad JSON, invalid fields and denied reads use safe defaults. Fields validate independently, without coercion. Writes happen on VS launch; denied writes retain in-memory defaults and show the existing storage notice. Draft clicks never overwrite saved defaults.

Existing core movement, drift/boost/jump formulas, kart and racer collision, AI pursuit/catch-up formulas, course geometry, checkpoint rules, camera, asset assembly and phone protocol are untouched. Grand Prix creates default-configured RaceSession instances for both rounds. New runtime objects are still installed only when starting a race/round, using the existing canvas-preserving scene transition.

## Automated verification

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test`: **178 tests / 18 files passed** (94.51 s in the final full run).
- `npm run build`: passed (714 modules, no new dependencies).
- `git diff --check`: passed.
- The focused options/flow run passed **31 tests**, including the new **17 options tests**.
- The options validator accepts all nine lap/difficulty pairs and rejects invalid data. Storage tests cover persistence, unsupported versions, corruption and denied access.
- Tests cover row/value wrapping, back/cancel/commit, independent launch snapshots, loaded defaults, cosmetic-only editing and isolation from Quick Race/Time Trial/Grand Prix, including both cup rounds.
- Normal profile values exactly match the existing AI defaults. Session snapshots resist caller mutation; restarts clear progress while retaining settings. Custom 5-lap/Hard race state matches at 30/60/144 render FPS, and pause/recovery retain options.
- Both tracks complete full normal-input player races with traffic for **1-lap Easy, 3-lap Normal and 5-lap Hard**, with the exact requested lap count, ordered checkpoints, zero player recoveries and bounded road positions. Every Easy/Hard CPU independently completes a one-lap race on each track without chronic recovery; existing Normal CPU completion tests also pass.
- Existing movement, steering direction, drift/boost, lap validation, full two-race cup, assets, input, audio and local phone relay regressions pass.

## Browser verification

- Confirmed the VS-only five-step setup, two option rows, keyboard selection, wrap, preview text, review and back-retained drafts in the current narrow in-app browser layout.
- Completed **one-lap Hard on Sugar Rush Valley** through the explicit development normal-input autodrive fixture: **0:48.374**, one recorded lap, zero recoveries. HUD showed `1 / 1` and `Hard CPU`; results showed `1 LAP · HARD CPU` and labeled unfinished rivals honestly.
- Race Again retained the same one-lap/Hard settings with a fresh countdown and zero timing.
- Reloaded the browser and re-entered VS: **1 lap / Hard** restored from storage. Switched track to Sunshine Circuit, selected **5 laps / Easy**, confirmed review and returned Back with both values intact.
- During development, a stale hot-reloaded menu store initially lacked the new field; the final HMR reload boundary and a fresh-load pass fixed that development-only issue. A browser-automation focus timeout also exercised the existing safety pause; resume continued normally. These were not treated as passing checks until the fresh UI and race were verified.

- Completed **one-lap Easy on Sunshine Circuit** in the browser: **0:46.060**, one recorded lap, zero recoveries and the correct Easy results label.
- After saving custom VS defaults, launched Grand Prix and verified **1 / 3 laps**, **Normal CPU**, the unchanged two-course itinerary and no VS Options step. Returning to VS retained its separate one-lap/Easy defaults.
- Restored the original **3 laps / Normal** VS defaults after QA and returned to the normal Home URL with VS highlighted. No development autodrive remains on the normal route.

Screenshots: `docs/milestone-3-8/options.png`, `sugar-hard-result.png`, `sunshine-easy-result.png`, `grand-prix-defaults.png`.

## Remaining limits / next work

VS is still one local human against three CPUs. AI presets adjust pace rather than adding authored aggression, drifting skill or a new difficulty algorithm. Physical gamepad, real phone sensors/Wi-Fi, additional browser/GPU checks and human race-balance testing remain manual. Existing high-detail supplied models and static driver fitting still need optimization and an art pass. No multiplayer, records, items or new assets were added.

Recommended next work: optimize dense kart GLBs and shadows based on measured frame times, improve seated driver/grip poses in Blender, then complete physical-device and human handling checks before items/combat.
