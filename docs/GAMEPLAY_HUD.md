# Gameplay HUD — open road

## Design

The user asked for an in-game presentation similar to their supplied kart-racing screenshot, with a minimal, creative treatment. The reference informs placement and hierarchy; its images, logos and branded UI were not imported. This pass implements the HUD and pause presentation. Track scenery, models, lighting and camera remain as they were.

- Top-left: a slightly tilted translucent held-item tile with original SVG symbols, its name and the existing E action hint. Empty slots use a neutral diamond. Guard/turbo/protection durations and short relevant notices appear as needed.
- Top-center: a small race timer. Time Trial adds the existing signed comparison, or FIRST RUN / PRACTICE RUN as appropriate.
- Top-right: one accessible pause icon. The former permanent brand/utility toolbar is removed during racing.
- Right edge: a floating course outline and player/CPU markers derived from the existing sampled track and live poses.
- Bottom-left: compact speed (km/h / REV) and lap chips using the actual session lap target.
- Bottom-right: a large warm-gold position and actual field size in CPU races.
- Bottom-center: a slim charge/boost ribbon only while drifting or boosting. Countdown and wrong-way feedback remain transient.
- Pause: Resume, collapsed timing/standings, collapsed controls/driving tips, customization, recovery, restart and Home. Existing sound, controller and phone setup entries are retained here. Time Trial's full records and ghost visibility control remain in the timing disclosure.

Keyboard recovery (R), pause (Escape), normalized item actions, gamepad/phone adapters and focus-loss disarming retain their original behavior. Buttons retain visible focus; decorative icons are hidden from assistive technology. Short layouts stack lap/speed and reduce the map/item footprint; active gameplay uses the available viewport height. No dependency, texture, font download or GLB was added.

## Files

| File | Responsibility |
| --- | --- |
| `src/game/ui/HUD.tsx` | Floating minimap, speed, conditional drift ribbon, pause entry |
| `src/game/ui/RaceHUD.tsx` | Timer/lap/position/countdown/wrong-way and paused RaceDetails |
| `src/game/ui/TimeTrialHUD.tsx` | Compact comparison variant; full record controls preserved |
| `src/game/ui/ItemHUD.tsx` | Held tile, original symbols, shortened status text; existing input action |
| `src/game/ui/PauseMenu.tsx` | Disclosures and existing utility/action handlers |
| `src/app/App.tsx` | Places utilities inside Pause and removes the permanent race toolbar |
| `src/styles/hud.css` | Shared floating layout, corner typography, responsive and pause styles |
| `src/styles/items.css` | Small item tile, active timers, focus/pressed/reduced-motion states |

HUD reads stay at 10 Hz, with effect cleanup and DOM refs for speed/map/drift. This presentation does not own physics or racing state.

## Browser verification

Tested in an isolated in-app browser tab against the local development server:

- Normal Home → Quick Race → Arnold / Boat Kart → Sunshine → Review → Start. The existing all-model loading barrier preserved the starting countdown. Supplied GLB karts appeared before driving.
- W moved the kart; speed and opponent positions changed in the new layout. Escape paused; Resume returned to driving. Switching focus during loading safely paused the game as before.
- Existing development-only normal-input autodrive collected real randomly distributed items, advanced from lap 1 to 2 to 3 and updated CPU standings. No pose injection or fabricated race result was used.
- Enter on the held Turbo Charge action consumed it through the existing input path. Its active countdown/progress, Flare duration and higher speed appeared. This check also observed AI pickups, trap, shield, turbo and hit events in the existing QA counters; it does not claim a new full combat-balance validation.
- Pause → Timing & standings displayed actual elapsed/lap/best/split/checkpoint values and all four standings. The normal pause screen preserves recovery, restart, cosmetics, Home and sound/controller/phone entries.
- Time Trial starts with a compact FIRST RUN comparison and no item/CPU-position HUD. Pause exposes the full record information. No saved ghost existed in this browser, so a recorded ghost's visibility toggle was verified in code, not exercised against a saved run.
- At 390 × 844 CSS pixels, the HUD bounds matched the viewport and corner elements stayed within it. At 1280 × 720, document scroll bounds equaled the viewport. The default viewport was restored afterward.
- Isolated browser error log: empty. Temporary QA tab closed; the user's original tab remains open.

Captures: [normal gameplay](design-qa/hud/gameplay.png), [pause](design-qa/hud/pause.png).

## Verification and limits

`npm run typecheck`, `npm run lint` (zero warnings), `npm run build` and `git diff --check` pass. Focused menu/results checks: **32 tests / 3 files passed**. Full `npm run test`: **395 tests / 33 files passed in 221.15 seconds**, with localhost access for the existing phone relay tests. App CSS: **76.64 kB / 16.09 kB gzip**; App JS: **233.15 kB / 74.97 kB gzip**. No new simulation or implementation-mirroring tests are introduced for this reversible UI pass. Existing regression coverage is retained.

Physical gamepad/phone checks, a fresh completed championship, and a newly recorded Time Trial ghost were not performed. This is a HUD/pause pass, not a replacement of source-model art or a claim of matching the reference's environment fidelity. Recommended next: results/podium presentation, then course materials, scenery and lighting as a separate visual pass.
