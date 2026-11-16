# Kart Select — supplied image cards

Implemented 2026-11-16 following the approved racer face-card pass. The four supplied WebPs replace kart thumbnails in the roster; the selected **real GLB kart with the chosen racer seated inside** remains on the right.

## Design and integration

- Balanced **2×2 grid**, matching rounded cards, subtle hover lift, warm selected border/check badge and visible keyboard focus. Teal translucent surfaces and soft image shadows fit the coastal palette. Images show the complete kart silhouette; the live-preview name clears the wheels.
- Existing coastal road, selected-racer attachment, lighting, loading/error/retry handling, input, physics/colliders, cameras, race rules and saved profile IDs are preserved. Racer Select retains its three-column portraits and corrected full-body Sonic preview. No permanent tutorial footer or extra card buttons were added.
- The reference board's illustrative performance bars were omitted because the existing karts are cosmetic. No unequal speed/handling stats or new mechanics were invented.
- `SelectionCard` now chooses either the driver's `portrait` or the kart's `artwork` through `SelectionArtwork { url, position, scale }`. Generic `data-artwork` / `--artwork-*` selectors reuse the card treatment. An image failure uses the existing model thumbnail/loading/initial fallback; the side GLB is independent.
- `selectionGridColumns = { racer: 3, kart: 2 }` drives the CSS grid and both selection stores. No persisted schema migration or extra menu state was needed. Both choices still commit through the existing final review/save action.
- Normal Kart Select no longer renders four extra GLB thumbnail views; it retains one live scene view. The supplied WebPs total about 2.5 MB. Browser memory/FPS was not profiled, and an FPS improvement is not claimed.

## Files

- `public/assets/kart-cards/{practice,go64,ds,boat}.webp`: supplied images, recorded in `public/ASSET_CREDITS.md`; the separate reference board is not shipped.
- `src/game/config/visualAssets.ts`: shared artwork type and per-kart paths/framing.
- `src/game/ui/selection/{SelectionCard,SelectionGrid,selectionStore}.tsx/.ts`: image rendering/fallback, shared grid columns and compatible standalone navigation.
- `src/game/ui/menu/{RaceSetupScreen,raceFlowStore}.tsx/.ts`: style import and matching mode-flow navigation.
- `src/styles/{selection,racerCards,kartCards}.css`: column variable, reusable artwork styling and kart-only framing/responsive rules.
- `src/game/tests/{selectionMenu,raceFlow}.test.ts`: bundled WebP/GLB validation and real two-column navigation assertions.

To add future kart art, provide a local image and set `kartAssets[id].artwork`. Keep `url` as the GLB model path; art never replaces the actual assembly. Adjust image position/scale in the registry and verify the full wheels/exhaust remain visible. Preserve original image provenance and the kart's visual/seat/collider separation.

## Controls and verification

Arrows/WASD and existing standard gamepad controls navigate the visible grid. Practice → Down selects DS; Right selects Boat; Up selects Go Kart 64. Enter/Space confirms; Escape/Backspace or Back returns with draft choices retained. Final setup/save still persists the existing racer/kart IDs.

- Focused selection/menu flow tests: **26 tests / 2 files passed** after updating the old three-column kart expectations to the new two-column layout.
- Browser at default 1422×800: all four supplied WebPs decoded, each kart selected its matching live-preview heading, and the seated Sonic remained attached. Practice and Go Kart 64/Boat previews were visually inspected. ArrowDown/Right/Up matched the grid. Enter reached Track Select, then review displayed **Sonic / Go Kart 64**; Back retained that draft. No race/profile was committed during QA.
- Returned to Racer Select: portrait cards, three-column layout and Sonic's complete legs/shoes remained intact. Captured console error log was empty. [Finished Kart Select](design-qa/kart-image-cards/desktop.png).
- Image failure, other viewport/device/browser sizes and hardware gamepads remain manual QA. No completed race or physical-device result is claimed for this UI task.
- `npm run typecheck` and `npm run lint` (zero warnings) passed. The final CSS production build passed in **2.14 seconds**, with app JS **237.89 kB / 76.50 kB gzip**. `git diff --check` passed.
- The first full run passed **397/398 tests**; the existing exhaustive SpongeBob mesh/UV/tangent test took 5.536 seconds and exceeded its 5-second limit during concurrent browser/build work. Its assertions were not weakened and its timeout was not increased. The isolated final `npm run test` rerun passed **398/398 tests across 33 files in 231.62 seconds**, including the full model-integrity check. Local relay tests ran with loopback permission.
