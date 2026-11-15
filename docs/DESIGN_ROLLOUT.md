# Design rollout — dark showroom / warm yellow

The user chose a dark showroom with warm yellow accents on 2026-11-14 and requested a screen-by-screen design pass. This document tracks that visual direction separately from gameplay milestones.

## Sequence

| Pass | Focus | Status |
| --- | --- | --- |
| 1 | Home Menu, visual foundation, mode hierarchy and kart showroom | Implemented; verification below |
| 2 | Racer and Kart Select: match the new shell, refine cards, previews and naming | Implemented; coastal selection verification below |
| 3 | Track Select, cup itinerary, race options and final review | Implemented; verification below |
| 4 | In-race HUD, item/drift feedback and pause/settings readability | Next visual pass |
| 5 | Results, podium, loading/error states and consistent transitions | Planned |
| 6 | Environment/art direction, lighting and final cross-screen/device QA | Planned |

These are visual passes. Existing modes, settings, selections, controls, racing systems, records and phone pairing remain the functional foundation. This delivery updates Home only; setup and settings panels retain their previous visual theme until their own pass.

## Pass 1 initial decisions (superseded by the refinement below)

- Charcoal backdrop and restrained translucent surfaces replace Home's washed-out blurred landscape.
- One title, a clearly selected vertical mode list and one Continue action establish hierarchy. The selected mode's actual description and race details live next to its preview.
- The current racer and kart are shown by name below an enlarged, independently cloned 3D assembly. Lighting is specific to Home; the other selection screens retain their existing camera/light presentation.
- Warm yellow identifies selection and primary actions. Keyboard focus has a separate light outline; selection is also shown with an arrow and a side marker, not color alone.
- Compact sound/controller/phone buttons retain their actual actions and accessible names. All five Home entries and existing keyboard/gamepad navigation are retained.
- Subtle turntable and short text transitions reuse the existing demand-rendered shared View canvas. Reduced-motion styling and the existing reduced-motion turntable guard remain. No extra renderer, HDR image, texture, shadow pass, font download, dependency or model was added.
- Desktop keeps the two-column presentation. Narrow windows use a vertical layout with scrollable content and a footer that occupies real layout space. The default browser viewport is restored after responsive tests.

### Home tokens

`src/styles/home.css` defines local tokens for later rollout: background `#111318`, surface `#1b1e25`, text `#f5f4f0`, muted text `#a0a5af`, accent `#ffcb55`, subtle white borders, 20 px outer panels and 10–13 px controls. They currently apply under `.flow-home`, keeping the remainder of the game stable while each screen is reviewed. System fonts and existing original SVG icons are reused.

## Files

- `src/game/ui/menu/MainMenuScreen.tsx`: revised mode list, showroom header/details, profile pairing and simpler Home copy.
- `src/styles/home.css`: scoped palette, composition, states, responsive rules and reduced-motion treatment.
- `src/styles/menus.css`: removes superseded Home base rules; setup/settings styles remain.
- `src/game/ui/menu/RaceFlowShell.tsx`: compact Home wordmark; shared footer/navigation intact.
- `src/game/ui/selection/SelectionPreview.tsx`, `SelectionModel.tsx`: opt-in showroom presentation. Default selection presentation is preserved.
- `src/game/tests/phoneRelay.test.ts`: corrects an existing flaky fixture to await the connected notification instead of an earlier queued waiting status. No relay implementation or assertion was removed.
- Root instructions/README/roadmap/architecture and this document record the chosen direction and incremental scope.

## Verification

Typecheck, lint (zero warnings) and production build pass. The final full regression run passed **382 tests across 32 files in 241.88 seconds**, using the existing two-worker npm script with process-scoped macOS idle-sleep prevention and loopback access for phone tests. An earlier run passed 381/382 and exposed the queued-status race in the phone fixture; its event wait is corrected and the focused seven-test relay suite was rerun separately. No timeout or assertion was weakened. Vite built 759 modules in 935 ms after TypeScript validation; App JS is 230.49 kB / 73.53 kB gzip and App CSS is 60.16 kB / 13.22 kB gzip. `git diff --check` passes. No simulation, handling, AI, item, checkpoint, camera, race-state or phone-server code changed.

Browser checks on the localhost development server:

- Keyboard Down selects the next mode; Up/Down wrap from first to last and back. Enter opens the existing Quick Race Racer Select; Escape returns Home. Racer/kart choices remain Arnold / Boat Kart.
- Controller/input settings opens and Escape returns Home with focus restored. Sound and phone controls retain their existing accessible names and implementations; physical controllers/sensors were not tested.
- Actual 1280 × 720 CSS viewport: content is 1280 × 720; footer bottom is 720 px and the whole Home fits without horizontal or vertical overflow.
- Actual 390 × 844 CSS viewport: content width remains 390 px; stacked content scrolls, the complete showroom and action footer remain reachable. This caught and fixed a flex-shrink overlap during the pass. At the bottom, showroom bottom was 676 px and footer bottom 844 px.
- Default-window capture confirms the side-by-side layout, model framing, readable selected state, active mode description and profile names. No model clipping was observed in the displayed Boat Kart / Arnold assembly.
- Existing preview loading/error fallbacks are retained through the same boundary. Broader artist review, other model combinations on small screens, live OS reduced-motion changes and physical gamepad/browser/device QA remain manual.

Captures: [before](design-qa/home/before.png), [Home after](design-qa/home/after.png), [desktop breakpoint](design-qa/home/desktop-720.png), [narrow showroom](design-qa/home/narrow-showroom.png).


## Home refinement — 2026-11-15

The user requested fewer buttons, less visual weight and removal of the tutorial footer. Home now has only the four mode entries and Settings. Clicking a mode enters its existing setup directly; the duplicate Continue button and sound/controller/phone shortcuts are removed from Home. Their functionality remains in Settings. Keyboard and gamepad navigation remain active.

The mode list uses plain text rows with a subtle amber selection marker and a separate keyboard focus outline. Removed numbered cards, icons, solid yellow fills, catalog counters, secondary headings, session badge, watermark, stage caption and the framed hero panel. The current racer/kart and one short mode description accompany the existing live preview. No new assets, dependencies, lighting passes or gameplay changes were introduced.

Home has no footer. Shared race setup footers keep Back/Confirm actions, without keyboard/gamepad tutorial text. Settings panel footers keep their Back action without the tutorial text; complete gameplay controls remain available in Controller & input.

Changed: `MainMenuScreen.tsx`, `App.tsx`, `RaceFlowShell.tsx`, `SettingsScreen.tsx`, `home.css`, `menus.css`, README and the design guidance in AGENTS. No state shape, physics, camera, input mapping or race rules changed.

Browser verification: Down moves from Quick Race to Grand Prix; Enter on Quick Race opens Racer Select; Escape returns Home. Settings exposes sound, controller/input and phone pairing. The setup action footer remains available without tutorial hints. At 1280 × 720 CSS pixels, Home scroll dimensions are exactly 1280 × 720. At 390 × 844 CSS pixels there is no horizontal overflow, with exactly five Home buttons and no Home footer. The default browser viewport was restored. Physical gamepad/phone tests were not performed.

Capture: [simplified Home](design-qa/home/simplified-home.png).

Final refinement checks: `npm run typecheck`, `npm run lint` (zero warnings), `npm run test` (**382/382 tests, 32 files, 282.86 seconds**) and `npm run build` all pass. The regression suite used process-scoped idle-sleep prevention and loopback access for the existing phone tests. Browser error log was empty. App CSS is 54.67 kB / 12.15 kB gzip and App JS is 228.04 kB / 72.80 kB gzip; compared with the initial Home pass, both bundles are smaller. `git diff --check` passes.


## Coastal starting line — 2026-11-15

The user approved the simplified menu and requested a more attractive backdrop, suggesting the selected kart/racer on a road. Home now replaces the black showroom with an original procedural sunset coast: a winding asphalt road, edge stripes/center dashes, ocean, distant faceted islands, palms, rocks and a warm sun/sky. A soft teal scrim protects menu contrast. The same five choices remain; no tutorial footer, extra controls or labels were added.

`HomeScene.tsx` owns the menu-only camera, model loading/retry and the selected independently cloned assembly. Its bounds align to the road without modifying gameplay models or colliders. `HomeScenery.tsx` owns a decorative sampled ribbon road and procedural scenery; it is not a new playable track. `MainMenuScreen.tsx` swaps its showroom preview for that scene; `RaceFlowShell.tsx` uses the same single shared renderer, with shadows enabled on Home only. `home.css` layers scenery behind the readable menu and uses an inline close-up on narrow screens. README, architecture and design instructions record the new direction.

The scene uses demand rendering, DPR capped at 1.5, one 1024 × 1024 directional shadow map, a bounded low-poly scene, no additional renderer, external textures, downloads, animation loop or dependencies. Road buffers are memoized and disposed. Menu navigation/state, setup previews, simulation, AI, handling, items, cameras during racing and phone systems retain their existing ownership.

Checks: full regression suite **382 tests across 32 files passed in 181.16 seconds**, with loopback access for the existing phone tests. Browser checks confirm keyboard mode navigation, Enter opening Racer Select and Escape returning Home. At 1280 × 720 CSS pixels, content dimensions equal the viewport; at 390 × 844 there is no horizontal overflow, exactly five buttons and no Home footer. The default viewport was restored. The displayed Arnold / Boat Kart assembly remains attached and sits on the road with visible shadows. Other combinations retain the shared assembly/fitting layer; this pass did not repeat a full artist review of all combinations or physical device testing. No FPS benchmark is claimed.

Capture: [coastal Home](design-qa/home/coastal-home.png).

Final coastal checks: `npm run typecheck`, `npm run lint` (zero warnings), the full test suite above, `npm run build` and `git diff --check` pass. Production build: 761 modules, App CSS 55.13 kB / 12.26 kB gzip and App JS 234.59 kB / 75.11 kB gzip. A clean final reload produced no new browser errors; a transient React hook-order message during hot replacement of the developing preview was cleared by reloading and did not recur on startup. No simulation or gameplay source changed.


## Pass 2 — Minimal coastal Racer / Kart Select

The user approved the coastal Home and asked to continue with a minimalist, clean, simple and attractive style. This pass covers Racer Select and Kart Select only. Track/cup/options/review, settings, HUD and results remain for later individual passes.

Both screens now use the same sunset coast, quiet glass cards, understated amber border/check selection, separate keyboard focus outline, compact title/progress text and two essential Back/Confirm actions. Removed visible roster slogans, numbers, oversized corner brackets, tutorial hints, duplicate context labels and header shortcut buttons from these two screens. Settings remains accessible from Home; later setup screens retain their existing shortcuts until their own pass. The three-column layout is deliberately retained so visual rows match the existing keyboard/gamepad grid rules.

`CoastalSelectionPreview.tsx` reuses the existing independently cloned portrait or seated kart assembly through `HomeScene`, rather than adding a renderer. Racer previews show the supplied static/source pose; they are not new seated/idle animations. Kart preview includes the selected seated driver. Existing transforms, fitting, profile persistence, selection store, race handoff, controls and simulation remain authoritative.

`coastalSelection.css` scopes the new presentation to those steps. `RaceFlowShell` adds an opt-in coastal skin/shadow flag and quiet header without changing other screens. `HomeScene` accepts a subject and a scene-only readability tint; drawing the tint inside the background view keeps thumbnail views clear. Fade-only section transitions avoid creating a transformed containing block around the fixed scenic view. `SelectionModel` exports its existing portrait renderer and SelectionGrid exposes its kind for styling/extensions. No new textures, GLBs, dependencies or animation loops were added.

Browser QA used an isolated tab after the initial preview. Quick Race → Racer → Kart → Track works; Escape returns to Kart and Racer with Arnold / Boat Kart retained. Right from Boat wraps to Practice Kart; Down returns to Boat in the same column. All five portrait and four kart thumbnails loaded; the Arnold / Boat Kart hero was visually checked. At 1280 × 720 CSS pixels, content scroll dimensions equal the viewport. At 390 × 844 CSS pixels, content width remains 390, the stacked screen is 925 px high, and scrolling reaches both action buttons without overlap. No permanent menu-control hint block remains. Temporary viewport overrides were reset. The isolated browser error log was empty. Physical gamepad/phone checks and a renewed artist review of every combination were not performed.

The full regression run passed **382 tests across 32 files in 219.41 seconds**, using the standard two-worker script with loopback access for phone tests and process-scoped idle-sleep prevention. No core, input, racing, checkpoint, item, physics, collider, AI or gameplay camera source changed.

Captures: [Racer Select](design-qa/selection/racer-coastal.png), [Kart Select](design-qa/selection/kart-coastal.png).

Final Pass 2 checks: `npm run typecheck`, `npm run lint` (zero warnings), `npm run test` (382/382 above), `npm run build` and `git diff --check` pass. Production build: 763 modules; App CSS 61.07 kB / 13.21 kB gzip and App JS 235.85 kB / 75.34 kB gzip. The temporary QA tab was closed; the user's original tab remains available.


## Pass 3 — Coastal tracks, cup, VS options and race review

The user accepted the next design pass. All setup steps now use the approved minimalist coastal shell: compact headers/progress, readable translucent surfaces, restrained amber selection and essential Back/Confirm actions. Settings/input/phone shortcuts remain available from Home Settings and during gameplay; they no longer compete with setup selections.

Track Select presents four compact, keyboard-selectable course rows and a larger flat SVG map/name/description. Maps still derive from actual sampled course data. Grand Prix uses a four-tile ordered route preview instead of repeating the itinerary in two lists; three laps/CPU count, scoring and tie information remain visible. VS keeps all existing 1/3/5 lap and Easy/Normal/Hard choices, with quieter buttons and no control-tutorial text. Final review now leads with the actual track/cup, a short racer/kart/length/rivals summary and the seated cosmetic preview. Time Trial retains the existing per-track personal-best panel and explicitly shows solo/no items in review. No gameplay or persistence rules changed.

Files: `RaceSetupScreen.tsx`, `TrackSelectScreen.tsx`, `RaceOptionsScreen.tsx`, `HomeScene.tsx`, `App.tsx` and `coastalSetup.css`, plus the project/design documentation. `HomeScene` can render scenery without loading a preview model behind maps; the same shared demand-rendered Canvas remains in use. Narrow fullscreen scenery gets a uniform contrast tint, while inline model previews retain clear lighting. No new asset, texture, dependency, backend or renderer was added. The mode store, launch descriptor and race-start callback remain unchanged. Cup point labels read the existing `cupPoints` values.

Verification:

- Full regression suite: **382 tests / 32 files passed in 194.12 seconds**, using the standard two-worker command with loopback access for existing phone tests and process-scoped idle-sleep prevention.
- Quick Race: keyboard Down wraps Volcano → Sunshine; the map updates. Review shows the selected track, Arnold / Boat Kart, three laps and Normal CPU. Back returns with the selected track retained.
- VS: keyboard changed 1 → 3 laps and Normal → Hard; review showed `3 laps` and `3 CPU · Hard`. Leaving setup discarded the draft through the existing store; no race was started and saved defaults were not overwritten during QA.
- Grand Prix: Cup Select displays all four tracks in order; review shows four races, three laps each, Normal CPU, 10/7/4/1 points and Start cup.
- Time Trial: the empty personal-best state remains on track/review; review shows Solo and no items. Existing record persistence/validation remains covered by core tests; a populated record panel was not newly captured.
- At 1280 × 720 CSS pixels, normal Track Select and Time Trial Track Select have scroll dimensions equal to the viewport. At 390 × 844, track content width remains 390 and scrolls to its map/actions; the longer Time Trial review also scrolls to both actions without overlap. A bright mobile background was caught and corrected with the scene-only tint. Temporary viewport overrides were reset.
- Browser QA was isolated from the user's original tab. This pass verified setup through its final start actions; it did not play a new race or test physical phones/gamepads. Simulation, AI/navigation, driving/boost/drift, collisions, checkpoint/cup/record rules and gameplay camera source were not changed.

Captures: [Track Select](design-qa/setup/track-select.png), [Race review](design-qa/setup/race-review.png), [VS options](design-qa/setup/vs-options.png), [Cup itinerary](design-qa/setup/cup-itinerary.png).


Final Pass 3 checks: `npm run typecheck`, `npm run lint` (zero warnings), `npm run test` (382/382 above), `npm run build` and `git diff --check` pass. Build: 763 modules; App CSS 68.44 kB / 14.25 kB gzip and App JS 232.68 kB / 74.54 kB gzip. The isolated browser error log was empty; the temporary QA tab was closed after viewport restoration. The original tab and saved race preferences were preserved. Next visual pass: HUD/item/drift readability and pause/settings.

## Racer consistency follow-up

Before HUD polish, the user requested more consistent racer sizes and style. Portrait fitting now uses common height instead of penalizing extended arms; seated scale derives from inspected crown/pelvis measurements. A shared matte profile keeps original paint/alpha while reducing metallic/glossy differences. No source GLB, game rule or collider changed. Full verification: 389 tests / 32 files plus typecheck, lint and build passed. See [measurements, browser observations and remaining artist work](RACER_STYLE.md). This is a presentation pass, not a full source-model art remake. HUD/pause polish remains the next design step.

## Arcade button pass

The user requested prettier game-style buttons and removal of the arrows inside them. Home modes now use restrained raised teal faces, a warm gold selected face, stronger labels and subtle pressed depth. Shared `GameButton.tsx` / `buttons.css` provides gold, quiet teal and light-surface variants for setup confirm/back, pause, race toolbar, results, settings and desktop phone-pairing actions. Hover, focus, pressed, disabled and reduced-motion states share that treatment. Existing handlers, native semantics, ARIA attributes and menu navigation markers are forwarded. No extra buttons or permanent tutorial hints were added.

Decorative action arrows were removed from Home, current/legacy setup, settings, pause, results, pairing and calibration controls. Branding and actual directional-control instructions remain. Racer/kart/track cards and the phone's touch-driving pads keep their existing layouts and input behavior. The scene, models, loading barrier, race state, physics, camera and input formulas are unchanged; no dependency, font download, texture or audio was added.

Browser QA: Home → Racer → Kart and Back retain Arnold/Boat Kart; Enter activates the same actions. At 390 × 844 CSS pixels, the selection content width is 390, both footer buttons remain within the viewport and measure approximately 48 px high. The viewport override was reset. Settings rows have no trailing arrows; the phone panel retains its disabled calibration action while unpaired. In the explicitly fabricated results preview, Enter on Race again emits the expected restart-preview notice; no completed race or record is implied. No browser errors were captured. The temporary QA tab was closed and the user's original tab/persistent choices were preserved. Physical controller/phone tests and a new full race were not performed for this cosmetic pass.

`npm run typecheck`, `npm run lint`, `npm run build` and `git diff --check` pass. Existing focused menu/results tests: **32 passed / 3 files**. Full regression suite: **395 tests / 33 files passed in 152.55 seconds**, with loopback access for existing phone tests. Build: 768 modules; App CSS 71.02 kB / 14.91 kB gzip, App JS 235.23 kB / 75.54 kB gzip.

Captures: [Home buttons](design-qa/buttons/home.png), [selection actions](design-qa/buttons/selection.png).
