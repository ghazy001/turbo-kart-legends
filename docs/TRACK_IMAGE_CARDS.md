# Track Select — illustrated circuit collection

Implemented 2026-11-16 to match the approved minimalist Racer Select and Kart Select screens.

## Delivered presentation

- Four rounded image cards in a **2×2 grid**, using the existing artwork-card classes, warm yellow selected border/check, hover lift and visible keyboard focus.
- A larger selected illustration, region label, actual sampled-course map inset, track name, length, lap count and short description. The name and image fade on selection changes; reduced-motion preferences disable animation.
- The same coastal menu shell, header, step indicator and Back / Review lineup actions. No permanent tutorial footer or extra card buttons.
- Four original generated illustrations: Sunshine's harbor/lighthouse; Sugar's candy market; Frostbite's cabins/glacier arch; Volcano's caldera/rock gardens. These are **theme illustrations, not gameplay screenshots or literal circuit layouts**. The inset map remains derived from the playable sampled road.
- Smaller dedicated card JPEGs avoid loading every full-size illustration just to draw the roster. Normal track cards and the selected image are DOM assets, adding no model instances or WebGL draw calls. The existing background scene remains.
- Image failures fall back to the existing actual-course SVG. No new dependency, route, persisted schema, simulation field or race rule was added.

## Files and ownership

- `src/game/ui/menu/trackArtwork.ts`: typed artwork metadata keyed by existing `TrackId`, URLs, crop positions and `trackGridColumns = 2`.
- `src/game/ui/menu/TrackSelectScreen.tsx`: TrackArtwork, TrackSelectionGrid and TrackPreview; retains exported CourseMap / PreviewPanel for cup and VS options.
- `src/styles/trackCards.css` and the import in `RaceSetupScreen.tsx`: matching responsive artwork treatment. Short desktop windows cap hero height; Time Trial cards leave room for records.
- `src/game/ui/menu/raceFlowStore.ts`: uses the same column count as the grid. All existing draft/commit/back/launch behavior remains.
- `src/game/tests/raceFlow.test.ts`: two-axis navigation, wrap, review/back and committed-track regression. `frostbite.test.ts` now reaches the bottom-left course with one Down, matching the visible grid.
- `public/assets/track-cards/{sunshine-circuit,sugar-rush-valley,frostbite-peak,volcano-sprint}.jpg` plus `-thumb.jpg`: project-local artwork, 1536×1024 and 768×512. Eight files total **3,043,490 bytes**; four thumbnails total **662,948 bytes**. Only the selected full-size image is mounted.
- `docs/assets/track-artwork-prompts.json`: full prompt set and final paths. Generated with the **built-in image_gen tool**, without supplied franchise references. Original PNGs remain in the local generation archive; JPEG conversion/resizing used macOS sips. Provenance is recorded separately in `public/ASSET_CREDITS.md`.
- README, architecture and roadmap link this pass; browser captures are under `docs/design-qa/track-select/`.

To update a track image, replace its two named JPEGs and adjust `trackArtwork[id]` crop/alt text if needed. To add a course, first register its actual sampled track through the existing catalog, then add its typed artwork entry and files. Keep the grid column constant shared with navigation; artwork must never become the source of road geometry or race rules.

## State, controls and integration

No additional state store is needed. Existing RaceFlowState keeps `currentMode`, `currentStep`, `selectedTrack` and `trackIndex`; selected racer/kart, VS options and panel state are unchanged. Existing local menu preferences and final RaceLaunch carry the committed track into gameplay. Grand Prix still uses its fixed four-round itinerary, not a single chosen course.

Arrows/WASD navigate. Starting at Sunshine: Right → Sugar, Down → Frostbite; Sugar → Down selects Volcano. Vertical navigation wraps within a column; horizontal navigation wraps the collection. Enter/Space confirms to review (VS goes through Race Options); Escape/Backspace or Back returns to Kart Select with the draft retained. Existing gamepad stick/D-pad, A/cross and B/circle use the same menu command handler.

Time Trial records still follow the selected course. VS lap count still comes from its existing options. Race setup, stored IDs, cup order/scoring, player/AI spawning, handling, collision, items, road geometry and camera ownership are unchanged.

## Verification

- Browser, 1422×800: all four thumbnails and all four selected illustrations displayed correctly. Checked Up/Right/Down navigation, selection focus/check states, Enter into review, Escape back with Volcano retained, then pointer selection of Sunshine. Review showed Volcano Sprint with Sonic / Boat Kart, confirming existing setup handoff.
- Time Trial retained its per-track record summary. After reserving space for that panel, the dialog's scroll height and viewport were both **800 px**, and the action footer fit the viewport. Grand Prix still displayed all four ordered cup routes and unchanged points.
- No browser console errors observed. Existing Three.js Clock / PCFSoftShadowMap deprecation warnings still appear; this pass does not alter renderer or dependency compatibility.
- `npm run typecheck`, `npm run lint` (zero warnings) and `npm run build` passed. Final production build: **1.60 s**, App JS **275.89 kB / 89.49 kB gzip**. `git diff --check` passed.
- First full test run: **475/480 passed**. One old Frostbite menu assertion assumed a one-column list and was corrected to the new two-column navigation. Four existing long simulation checks timed out; no timeout limits or simulation assertions were weakened. The final isolated `npm run test` rerun passed **480/480 tests across 40 files in 190.28 seconds**, including full AI races, four-round cup, VS options, collision, item, asset and local relay regressions.

Remaining manual QA: physical gamepads, touch devices, narrow viewport/device/browser combinations and deliberately missing image requests. No new complete browser-driven race or FPS/GPU-memory benchmark is claimed for this menu-only pass. Generated scenic compositions are intentionally illustrative; the playable route shown by the inset is authoritative.
