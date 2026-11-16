# Racer Select — face cards and coastal terrace

The latest studio portrait refresh, 360° mouse/touch subject rotation and removal of the separate preview name panel supersede the original card imagery/name treatment described below. Earlier sources and QA remain preserved. See [current interaction and verification](RACER_PREVIEW_ROTATION.md).

Implemented from the five user-supplied portraits on 2026-11-16. This is a presentation change; no driving, AI, race, camera-follow, item, collider or record logic changed.

## Presentation

- Three-column, two-row roster with real JPEG artwork, individual face framing, rounded edges, subtle hover lift, warm selected border and a check badge. Names remain readable over a restrained bottom gradient. There are no invented stat differences or extra tutorial controls.
- The selected **real GLB** remains visible on the right, using the existing portrait normalization, immutable model cache, lighting, loading/error handling and retry button. Source poses are retained; no new animation clips are claimed.
- Racer Select now uses a raised cream display plinth on a coastal terrace. The sunset, palms and soft palette continue the approved theme. The asphalt road is absent on this step. A front-facing menu camera centers the subject over its name, with darker text against the pale terrace.
- Home, Kart Select and later steps keep their original road presentation. Scenery defaults preserve all existing callers; gameplay does not use these menu cameras or decorative meshes.
- Cards use DOM images rather than five additional model views. The normal racer screen has one live scene view. No measured FPS improvement is claimed. All five original JPEGs are bundled unchanged (about 3.2 MB total); modern image derivatives remain an optional future optimization.

## Files and data

- `public/assets/portraits/{mario,sonic,arnold,crash,spongebob}.jpg`: supplied artwork, unchanged copies; provenance in `public/ASSET_CREDITS.md`.
- `src/game/config/visualAssets.ts`: optional `DriverAssetDefinition.portrait: { url, position, scale }`; the existing ID/model/thumbnail definitions remain. To swap artwork, add a JPEG and update this field. CSS `object-position` and a centered scale crop it without editing the source file.
- `src/game/ui/selection/SelectionCard.tsx`: decorative image within the existing accessible radio button; failed image loads revert to the existing GLB thumbnail/loading/initial fallback. Drivers without a portrait continue using their model thumbnail. Kart cards retain their model views.
- `src/game/ui/menu/{RaceFlowShell,RaceSetupScreen}.tsx`: a `data-flow-step` attribute scopes racer-only styling.
- `src/game/ui/menu/{CoastalSelectionPreview,HomeScene,HomeScenery}.tsx`: additive terrace variant, menu-only subject/framing adjustments and display plinth.
- `src/styles/racerCards.css`: face cards, preview text, selected/focused/hover states, existing narrow/short screen breakpoints and reduced-motion treatment.
- `src/game/tests/selectionMenu.test.ts`: bundled portrait-file/roster validation alongside existing menu navigation/profile tests.

## State and controls

No store/schema migration or new state ownership: `RaceFlowStore` still owns `currentStep`, `selectedRacer`, `selectedKart` and per-step indices. Draft choices flow through Kart → Track → Review and commit through the existing final-confirm callback. Back keeps the draft; returning Home cancels it. Existing stored IDs continue working.

Arrows/WASD navigate the same three-column grid. Enter/Space confirms, Escape/Backspace goes back. Pointer selection and existing standard gamepad navigation remain. Radio labels, checked state, roving focus, focus trapping and live selection announcements are preserved; artwork is decorative to screen readers. Reduced motion removes image/check transitions. No permanent tutorial footer was added.

## Verification

- Browser at the default 1422 × 800 viewport: all five images decoded successfully; each card selected the matching live-preview heading. Mario, Sonic and latest SpongeBob models were visually inspected on the terrace. No console errors were captured.
- Actual keyboard checks: ArrowDown moved Mario → SpongeBob; Enter advanced to Kart with “Driven by SpongeBob”; Escape returned with SpongeBob selected. D moved Mario → Sonic; Space advanced; Backspace returned with Sonic retained. No race/profile was committed during this menu QA.
- Screenshot: [desktop result](design-qa/racer-face-cards/desktop.png).
- Existing responsive rules were extended for face cards; additional device/browser sizes, hardware gamepads and forced image-failure paths remain manual QA. No completed race or physical-device check is claimed for this presentation task.
- `npm run typecheck`: **passed**. `npm run lint`: **passed, zero warnings**. `npm run build`: **passed**, 2.23 seconds; app JS 237.41 kB / 76.38 kB gzip.
- Final `npm run test`: **396 tests / 33 files passed**, 252.80 seconds, including the new portrait-file check and all existing gameplay/model/menu/phone regressions. Relay tests ran with local loopback permission. Focused menu checks also passed (11 tests). `git diff --check` passed.

## Next improvements

If desired, create optimized WebP/AVIF portrait derivatives with matching art-direction crops. Authored idle/selection poses would improve the GLB presentation; current models still have no supplied animation clips. Preserve the simple face-card layout and cosmetic-only selection behavior.

## Sonic floor-placement correction — 2026-11-16

On a fresh page load, Sonic's shoes could be buried in the presentation plinth. The preview measured its bounds with `updateWorldMatrix`, which does not refresh an attached `SkinnedMesh`'s inverse bind matrix. The subsequent renderer update changed those bounds after the floor offset had already been applied.

`placePreviewOnFloor` now refreshes parents, calls the skin-aware `updateMatrixWorld(true)` before measuring precise bounds, moves the independent preview to the existing floor height, then refreshes matrices again. `RacerModel` also refreshes its cloned hierarchy before calculating portrait normalization. This changes menu placement only; no source GLB, skeleton pose, camera framing, racer sizing, gameplay or collider was edited.

The real-model regression failed with the old update path, then passed with the fix. It verifies the lowest rendered point stays at the terrace floor, full portrait height is retained, and repeated placement does not move the feet. Browser verification from a fresh reload showed complete legs and red shoes; switching Mario → Sonic retained the correction, with no console errors. [Corrected preview](design-qa/sonic-floor-fix/preview.png).

`npm run typecheck`, `npm run lint` (zero warnings), `npm run build` and `git diff --check` passed. The final full suite passed **397 tests / 33 files in 263.35 seconds**, including the new real-Sonic grounding regression and existing gameplay/model/menu/phone checks. Local relay tests ran with loopback permission. Build: 3.99 seconds; app JS 237.50 kB / 76.41 kB gzip. Existing device/hardware/manual race limitations above remain unchanged.
