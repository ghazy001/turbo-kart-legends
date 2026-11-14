# Design rollout — dark showroom / warm yellow

The user chose a dark showroom with warm yellow accents on 2026-11-14 and requested a screen-by-screen design pass. This document tracks that visual direction separately from gameplay milestones.

## Sequence

| Pass | Focus | Status |
| --- | --- | --- |
| 1 | Home Menu, visual foundation, mode hierarchy and kart showroom | Implemented; verification below |
| 2 | Racer and Kart Select: match the new shell, refine cards, previews and naming | Next review / implementation |
| 3 | Track Select, cup itinerary, race options and final review | Planned |
| 4 | In-race HUD, item/drift feedback and pause/settings readability | Planned |
| 5 | Results, podium, loading/error states and consistent transitions | Planned |
| 6 | Environment/art direction, lighting and final cross-screen/device QA | Planned |

These are visual passes. Existing modes, settings, selections, controls, racing systems, records and phone pairing remain the functional foundation. This delivery updates Home only; setup and settings panels retain their previous visual theme until their own pass.

## Pass 1 decisions

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
