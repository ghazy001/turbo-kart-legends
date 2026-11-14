> The two-step race-entry flow below is historical. Current Home/mode/track integration is documented in [FRONTEND_FLOW.md](FRONTEND_FLOW.md). Pause cosmetics still use two steps.

# Two-step race selection

Play → Racer Select → Kart Select → selected race mode. The start-screen lineup button opens the same flow with **Save lineup** instead of starting a race. Pause → Change racer & kart applies cosmetics while keeping the existing paused RaceSession and Simulation. Back from Kart Select preserves both draft choices and grid indices; Back from Racer Select discards the draft and returns to the originating menu.

## Implementation and state

- `src/game/ui/selection/CharacterKartSelectScreen.tsx`: fullscreen shared shell, focus/input lifecycle, one demand-rendered R3F canvas with Drei scissored views.
- `SelectionHeader`, `SelectionGrid`, `SelectionCard`, `SelectionPreview`, `SelectionFooter`: reusable shared presentation. Both steps have the same layout, button placement and control hints.
- `SelectionModel`: independent cloned source-pose racer portraits, isolated kart thumbnails, and the existing seated KartAssembly for the large kart preview. Cached source scenes are never moved or modified.
- `selectionStore.ts`: a small typed external store consumed with React `useSyncExternalStore`; no new state dependency. Shape: `{ currentStep: 'racer' | 'kart', selectedRacer: RacerId, selectedKart: KartId, racerIndex: number, kartIndex: number }`. Each opening starts at Racer Select using the saved lineup. Drafts remain in memory until final confirmation.
- `menuInput.ts`: pure keyboard mapping and menu-only standard-gamepad edge/repeat/neutral gating, separate from driving input and callbacks.
- `src/game/config/visualAssets.ts`: existing centralized IDs, names, GLB URLs and transforms, plus `thumbnail: { kind: 'model', yaw: number }` and optional `locked` / `lockReason`. The actual five racers and four karts are shown; no extra assets or locked entries were invented.
- `App.tsx`: retains the requested RaceKind while selecting, commits `{ racerId, kartId }` to `runtime.selection` and existing validated version-1 localStorage, then calls the existing start callback only when entering a new race. During pause customization, no start/recover/reset callback runs.
- `useDialogFocus.ts`: optional initial focus selector, roving-card-aware Tab trapping, and restoration after inert overlays are removed.
- `src/styles/selection.css`: original teal/glass/amber styling, blurred existing circuit, corner brackets, card hover/selected/focus states, step/name transitions, responsive layout and reduced-motion handling. `garage.css` retains only still-used entry/status/diagnostic styles. `RacerSelection.tsx` retains a compatibility export.

## Controls

| Action | Keyboard | Standard gamepad |
| --- | --- | --- |
| Move | Arrows / WASD | Left stick / D-pad |
| Confirm | Enter / Space | Bottom face button (A / cross) |
| Back | Escape / Backspace | Right face button (B / circle) |
| Focus buttons | Tab / Shift+Tab | Navigate selection, then confirm/back |

Click selects a card; the footer confirms or goes back. Horizontal movement wraps through the roster; vertical movement retains the column and wraps through existing entries, including incomplete rows. Confirm/back ignore held keyboard repeats. Gamepad input requires neutral on connection/focus loss, uses a 0.55 axis threshold, a 330 ms initial repeat delay and 125 ms repeats. Held A/B cannot confirm both steps at once. Background UI is hidden/inert; gameplay input is cleared and the existing phone availability gate remains in effect.

## Rendering and extension

One menu WebGL context renders every thumbnail and the large preview. Geometry/material/texture caches remain shared, Object3D instances remain independent, textures retain the existing 1024 px cap and DPR is capped at 1.5. Graphics render on demand while assets, selection, hover, scrolling or resizing settle; the underlying scene stays suspended. DOM loading/error states and retry remain usable. Gameplay retains its existing procedural missing-model fallback.

Add a supported GLB to the central kart/driver definition with its audited transforms/seat fit and `thumbnail: { kind: 'model', yaw: -0.3 }`. The roster, names, previews and typed IDs derive from that registry. No separate thumbnail artwork is required. To add locks later set `locked` and `lockReason`; selection actions already reject locked entries. Entitlement/unlock persistence is deliberately outside this cosmetic menu.

## Verification (2026-11-06)

- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`: passed; **132 tests / 15 files**. Ten new tests cover draft/confirm/back/persistence handoff, navigation, keyboard mappings, registry portraits, controller edges/repeats/dead zones and reconnect/focus neutral gating. Existing real-GLB combination, race/lap/AI, drift/boost, controller and phone relay tests remain passing.
- Browser: saved Aang/Boat lineup opened correctly; ArrowRight and D selected Arnold; Enter and Space advanced; Backspace returned to the retained racer; Escape canceled without saving. Shift+Tab wrapped from the selected card to the confirm button; cancellation restored focus to the opening lineup button. Pointer selection and narrow-screen scroll-to-selection also passed without horizontal overflow.
- Browser: final confirmation started Quick Race with three AI opponents. Holding W produced 48 km/h; standings updated and the next checkpoint advanced to Gate 1. Pause customization saved Aang/Boat while race time stayed **0:07.383**, lap **1/3**, position **2/4**, and the session remained paused. Reload persistence and narrow-layout checks are recorded with the QA screenshots.
- Core/kart/race/AI/chase-camera files match the SHA-256 baseline taken before this change. Routes, racing formulas, colliders, lap rules and phone transport were not changed.
- Browser console: no application errors during the flow; the existing upstream Three.Clock deprecation warning remains.

## Remaining limits

All supplied racers have no authored animation clips. Racer portraits honestly display the supplied static source poses (including T-poses); kart previews use the already-existing static seated fits. Authored idle/selection/victory poses need an artist/rigging pass. No new animation is claimed. Physical-gamepad testing and additional browser/GPU testing remain recommended; controller menu behavior was tested with deterministic snapshots. No full manual race or phone-hardware pass was repeated for this menu-only change. Small screens stack preview and roster and allow scrolling rather than squeezing the desktop split layout.
