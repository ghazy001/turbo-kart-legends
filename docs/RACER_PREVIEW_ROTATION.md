# Racer Select — studio portraits, 360° interaction and nameplate

Implemented 2026-11-16. This is menu presentation/interaction only: existing racer IDs, selected GLBs, seated fitting, camera-follow, simulation, AI, race/phone/item systems, colliders and profile commit remain unchanged.

## Changes

- Five latest supplied square portraits are copied into `public/assets/portraits/studio/`, with registry paths and gentler CSS crops. Earlier portrait files remain preserved. New URLs avoid reusing a browser-cached image path. Source images are not edited; authorship/release rights are not invented. See `public/ASSET_CREDITS.md`.
- Racer cards retain the three-column layout, checked state, hover/focus behavior and GLB image-error fallback. A pale gradient and dark labels complement the supplied white backgrounds; Kart Select's four image cards are unchanged.
- A horizontal mouse/touch drag over the racer rotates the **independent subject group**, with a complete gesture-surface width corresponding to 360°. There are no angle limits, vertical tumbling, camera orbit, gameplay changes or perpetual animation. Wrapped angles remain bounded numerically.
- Primary pointer capture keeps a drag working beyond the surface edge. Secondary fingers are ignored; release/cancel/lost capture, blur, visibility loss and unmount end the gesture. Vertical touch scrolling/pinch zoom remain permitted by CSS. A new racer/step gets fresh rotation state.
- A small `360°` badge and grab cursor expose the interaction. The surface is an accessible horizontal slider: Left/Right turns 15°, Home resets the front; a visible badge outline identifies keyboard focus. Existing Enter/Space confirmation and Escape/Backspace remain. Directional keys outside this surface still navigate the roster. Existing gamepad menu navigation is unchanged.
- A compact translucent cream nameplate sits below the preview, with a quiet caption, dark readable racer name and short description. Its position clears the feet/plinth; long SpongeBob text was inspected. No tutorial footer or extra reset button was added.

## Ownership and files

- `ui/selection/previewRotation.ts`: independent menu-only gesture/angle state, validation and subscriptions.
- `ui/selection/RacerRotationSurface.tsx`: DOM pointer capture, cleanup and keyboard/ARIA behavior. It subscribes only the small rotation control to angle updates.
- `ui/menu/CoastalSelectionPreview.tsx`: owns the per-preview rotation and racer nameplate.
- `ui/menu/HomeScene.tsx`: optional rotation subscribes to canvas invalidation and changes only the cloned subject's yaw in `useFrame`. Demand rendering stops when interaction settles; no geometry/materials are allocated per drag frame.
- `ui/menu/useMenuNavigation.ts`: directional commands yield to a focused rotation surface, while confirm/back keep the existing flow. No store/persistence schema change.
- `config/visualAssets.ts`, `styles/racerCards.css`: current artwork paths/crops, white-image treatment, hit area, focus cue and nameplate. Motion is directly user-controlled; no inertia is added and existing reduced-motion rules remain.
- `tests/previewRotation.test.ts`: full-turn/reverse direction, primary-pointer ownership, cancellation/reset, wrapped keyboard increments, invalid-input handling, independent instances and unsubscribe checks.

Paths above are relative to `src/game/` except `styles/`, which is under `src/`.

## Verification

- Focused rotation/selection/flow tests: **31 tests / 3 files passed**. Typecheck, lint (zero warnings), production build and `git diff --check` passed. Build: 976 ms; app JS 240.88 kB / 77.48 kB gzip.
- Actual desktop browser mouse drag turned Sonic approximately 170° to show his back. A complete surface-width drag performed another 360° and returned to the same angle; Home reset to 0°. Six keyboard Right presses produced 90° while Sonic's radio selection stayed checked. Both full legs/shoes remained visible.
- Enter from the focused preview advanced to Kart Select with “Driven by Sonic.” Escape returned with Sonic retained and angle reset. Selecting SpongeBob created a fresh 0° preview; its longer name fit the panel. All five studio images decoded. Kart image cards and shared flow remained intact. Captured console error log was empty; no race/profile was committed during this menu QA.
- Screenshots: [finished screen](design-qa/racer-preview-update/desktop.png), [rotated subject](design-qa/racer-preview-update/rotated.png).
- Real physical touch hardware, iPhone/Android and additional viewport/browser sizes were not tested. Touch uses the same Pointer Events path; automated tests cover gesture state/multiple-pointer cancellation. No authored character animation, completed-race or measured FPS claim is made.
- Final `npm run test`: **403 tests / 34 files passed in 153.68 seconds**, including all new rotation cases and existing model, menu, movement/collision, AI/race, item and phone regressions. Local relay tests ran with loopback permission. The full run started after browser/build work finished; no timeout increase or assertion removal was needed.
