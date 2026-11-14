# Home and mode-based race setup

## Milestone 3.8 update

VS Race now inserts Race Options after Track Select, with 1/3/5 laps and Easy/Normal/Hard CPU pace. Review and RaceLaunch include the immutable `options` snapshot. Defaults save on VS launch in a separate versioned preference; other modes and cup rounds keep the original settings. See [M3.8](MILESTONE_3_8.md).

## Milestone 3.7 update

Grand Prix is now a real two-race Sunshine Cup. Sunshine Circuit and Sugar Rush Valley are available in single-race track selection; GP uses a fixed itinerary. The launch descriptor now contains `cupId: 'sunshine-cup' | null` instead of `cupPreview`. App installs the selected track's RaceSession or starts CupSession. See [M3.7](MILESTONE_3_7.md) for current scoring, scene transition ownership, verification and limits. The original frontend delivery record below describes the earlier single-course state.

## Delivered flow

Home is now a fullscreen mode menu with original glass/teal/amber styling, an original blurred SVG landscape, a gently animated seated kart hero, mode descriptions and minimal sound/input/phone icon buttons. Reduced-motion preferences disable the turntable and background animation.

- **Quick Race / Time Trial / VS Race:** Home mode → Racer → Kart → Track → lineup review → Start race.
- **Grand Prix:** Home mode → Cup → Racer → Kart → Track → lineup review → Start cup preview.
- **Settings:** sound toggle, controller/input guide, phone pairing/tuning and retained Free Drive practice.
- **Pause customization:** the same race shell with Racer → Kart → Save lineup, without starting/recovering/replacing the race.

Quick Race uses the existing three-CPU race. Time Trial uses the existing solo timed race. VS Race currently means one local human against those CPU opponents, using the same proven race rules. Grand Prix is explicitly a **one-course Sunshine Cup preview**, as permitted by the task: it starts the existing AI race and does not claim championship points, a series of races or extra tracks. Only the implemented Sunshine Circuit is selectable. No courses, racers or animations were invented.

## Files and responsibilities

Added under `src/game/ui/menu/`:

- `MainMenuScreen.tsx`: HomeMenuList and HomeMenuHero with selection-aware preview and descriptions.
- `RaceFlowShell.tsx`: shared fullscreen shell, StepHeader, StepFooter and a single scissored R3F canvas for all visible asset views.
- `RaceSetupScreen.tsx`: RacerSelectScreen, KartSelectScreen and final lineup review; reuses the existing SelectionGrid/Card/Preview and GLB cloning/seat fitting.
- `TrackSelectScreen.tsx`: selectable course/cup card, PreviewPanel and original SVG CourseMap generated from the actual sampled road/start distance.
- `menuCatalog.ts`: typed mode-to-RaceKind mapping, course/cup definitions and setup-step order.
- `raceFlowStore.ts`: typed frontend-only external store, draft/commit/back behavior and versioned preference validation/persistence.
- `useMenuNavigation.ts`: shared keyboard, focus, panel and standard-gamepad lifecycle, reusing the existing pure menu command mapper and gamepad repeat/neutral gate.
- `MenuIcons.tsx`: original inline SVG icons, AudioToggleButton and MenuTools.
- `SettingsScreen.tsx`: SettingsScreen, reusable modal MenuPanel and ControllerSettingsPanel with detected standard gamepads and the actual control mappings.
- `PhoneControllerPanel.tsx`: existing QR/status/revoke panel plus actual touch/motion preference, sensitivity and calibration request controls.

Other additions/changes:

- `src/app/App.tsx`: integrates the new store and screens with the existing runtime, selection save, audio, pause, race start, results and phone availability gates.
- `selection/CanvasFrames.tsx`: extracted shared demand-render/layout invalidation; `SelectionModel`/`SelectionPreview` add an optional reduced-motion-aware visual turntable and improve compact DS-kart framing. Gameplay meshes and physics stay separate.
- `selection/CharacterKartSelectScreen.tsx`: compatibility adapter to the shared flow, replacing its duplicate layout.
- `src/styles/menus.css`, `public/assets/ui/sunshine-backdrop.svg`: original responsive presentation. No branded UI artwork or new third-party UI dependencies.
- `src/phone/{protocol,RemoteHost,PhoneConnection,PhoneController,PairingPanel}` and `server/phoneRelay.ts`: additive, bounded, authenticated host-to-phone tuning commands; existing QR pairing, input transport, timeouts, origin checks and reconnect behavior remain.
- `src/game/tests/raceFlow.test.ts`, `phoneRelay.test.ts`: flow/persistence and authorized configuration regression coverage.
- `package.json`: limits Vitest to two workers for more predictable CPU/memory use alongside real GLB fixtures and a running browser.
- `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`: current launch/menu instructions and known scope.

## State and handoff

`RaceFlowState` contains:

```ts
{
  currentScreen: 'home' | 'setup';
  currentMode: 'quick-race' | 'grand-prix' | 'time-trial' | 'vs-race';
  currentStep: 'cup' | 'racer' | 'kart' | 'track' | 'ready';
  selectedRacer: RacerId; selectedKart: KartId; selectedTrack: TrackId; selectedCup: 'sunshine-cup';
  homeIndex: number; racerIndex: number; kartIndex: number; trackIndex: number;
  audioEnabled: boolean;
  panel: 'none' | 'settings' | 'controller' | 'phone';
  panelReturn: MenuPanel;
  intent: 'race' | 'cosmetic';
}
```

React consumes this store with `useSyncExternalStore`; no new Zustand dependency was added. State changes are menu actions, not simulation ticks. Back retains earlier draft choices within setup. Leaving its first step restores the last committed lineup. Nested panels maintain their return history and the underlying setup step.

Final confirmation produces `{ mode, kind, trackId, selection, cupPreview }`. The available track is the existing Sunshine Circuit already bound to RaceSession; App commits the validated cosmetic profile and invokes the existing `race.start(kind)` callback. The race object, formulas, physics, AI and camera are not replaced. Cosmetic edits during pause only update `runtime.selection`.

The existing `turbo-kart-legends.selection.v1` schema still owns racer/kart persistence. `turbo-kart-legends.menu.v1` stores validated sound, last mode and track preferences. Invalid/denied storage falls back safely to memory/defaults. RemoteHost separately owns the current phone preference state; it sends changed preferences over the paired host connection, including on a later phone connection.

## Controls

- Home: Up/Down or W/S navigate; Enter/Space confirm. Left/Right and A/D also move the current item.
- Asset grids: arrows/WASD move; Enter/Space confirm; Escape/Backspace back.
- Standard gamepad: stick/D-pad navigate; A/cross confirm; B/circle back. Held confirm cannot skip multiple screens. Neutral/repeat/blur/disconnect gating is retained.
- Tab/Shift+Tab move through icon buttons, footer actions and settings controls. Native range/select/checkbox keyboard behavior is preserved. Background UI is inert while a panel is open.
- Driving mappings remain unchanged; the input panel lists them.

Phone tuning changes clear held input. Sensitivity is validated to 10–50 degrees for full lock; touch/motion and calibration are bounded booleans. Only the authenticated paired host can forward commands to its phone. Selecting motion on the computer requests the mode; **permission still requires the phone's Motion steering button gesture**. Calibration succeeds only with a real enabled sensor reading; otherwise the handset tells the player to enable motion there. Touch fallback remains available.

## Verification

- Typecheck, lint, tests and production build passed. **145 tests / 16 files**, including all previous gameplay/GLB/phone tests and new mode/draft/back/preference/host-configuration tests.
- An initial parallel run hit the pre-existing 5-second FPS-consistency test timeout during build contention. A subsequent complete run passed without assertion changes; the final default test command now uses two workers and passed again.
- SHA-256 verification matched all core, kart, race, AI and chase-camera files against the baseline taken before this frontend change.
- Browser: Home mode navigation and descriptions; Grand Prix cup/back sequence; Time Trial Racer → Kart → Track → review → race; W driving reached 33 km/h, gate progression advanced, and pause worked.
- Browser: controller mappings/device status, phone icon entry, actual QR browser-handset pairing, desktop motion request and sensitivity change to 26 degrees reaching the handset, honest no-sensor calibration guidance, touch fallback and disconnect/revoke.
- The existing local Vite server was restarted after detecting its stale server-side relay module; final phone command checks used the updated handler.
- Browser: narrow track layout at 711 CSS pixels had no horizontal overflow. Console contained only the existing upstream Three.Clock deprecation warning.
- Screenshots are in `docs/frontend-qa/`. No full manual cup/championship, physical phone-sensor/gamepad or cross-browser pass is claimed.

## Limits and next improvements

One circuit is available. Grand Prix needs additional authored courses, cup scoring and series progression; VS is currently CPU opposition. Supplied racers remain unrigged/static; portraits use the supplied source poses and kart previews use the existing static seated fits. Authored menu/idle/victory animation requires an art pass. Controller rebinding is not implemented. Physical iPhone/Android motion, Wi-Fi latency and additional GPU/browser testing remain manual. Menu preferences do not introduce accounts, cloud sync or multiplayer.
