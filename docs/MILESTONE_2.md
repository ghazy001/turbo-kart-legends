# Milestone 2 — Driving mastery

Date: 2026-11-05. The user's request to continue after M1/steering repair authorizes this phase. Historical M1 manual verification gaps remain in MILESTONE_1.md; they are not marked passed here.

## Implemented

- Required `drift` input shared by keyboard and standard gamepad adapters. Space is suppressed as a browser scroll key during driving, while focused UI buttons retain keyboard activation.
- Drift starts on a fresh Space press above 7.5 m/s with steering. A direction is locked for the slide; steering into it tightens the turn and countersteering widens it. Grip and lateral slip differ from normal driving without changing normal A/D/arrow direction.
- Three data-driven charge tiers: Spark (0.65 s), Surge (1.50 s), Flare (2.60 s). Releasing Space applies a capped timed boost; holding throttle accelerates toward the tier cap. Excess speed settles back to normal after expiry.
- Speed, steering, grounded contact, braking, rail impacts, pause and cooldown gates prevent stationary/wall farming or boost refresh spam. Reset restores all charge, boost, hop and event state.
- A ballistic drift-entry hop and landing compression/cue. Charge is suspended during the hop. The planar road corridor remains solid while airborne; no track ramp system was added.
- A 10 Hz charge/status HUD, tier-colored pooled sparks, exhaust flares, body slide pose and jump-aware camera. Geometry/material creation remains outside the frame loop.
- Original Web Audio skid, hop, landing and boost cues, unlocked by a UI gesture, with a Sound toggle. Gain changes are scheduled only when targets change, and finished one-shot nodes disconnect.
- Standard gamepad support: stick/D-pad, triggers, A/RB drift, Menu pause, View reset; deadzone, edge-triggered actions, neutral gating after pause/reset/connection, and pause on disconnect. Unknown layouts are ignored.
- Scope, README and in-game help updated. No dependencies, external assets, AI, race rules or backend were added.

## Automated checks

- Typecheck: passed.
- ESLint: passed with zero warnings.
- Vitest: 54 tests in 8 files passed. New cases cover all three boost tiers and limits, no stationary/reverse charge, a fresh-press requirement, hop/landing, grounded-only charge, countersteering, charge/boost cancellation, no recharge during an active boost, airborne barriers, pause/reset, and identical results at 30/60/144 render FPS. Gamepad and audio lifecycle tests use injected snapshots/mocks.
- Production build: passed again after disk space was restored, with no chunk-size warnings. `git diff --check` passed.
- Development startup/cache recovery: a fresh `npm run dev` on 127.0.0.1:5173 loaded the updated menu and controls in the browser after the disk cleanup. Temporary QA servers were stopped at delivery; normal startup is unchanged.
- Earlier M1 steering/track traversal tests remain passing.

The Mac's disk filled during work. A new test could not be created, and a rebuild later failed with `ENOSPC` while copying a user-supplied public GLB. Only the generated Vite dependency cache was removed to recover working space. The user freed disk space; final validation is rerun afterward. User assets are preserved.

## Browser checks

Executed in the in-app browser against an isolated local QA server:

- Play, existing acceleration and reset controls worked after integrating drift input.
- At forward speed, Space + D entered a drift/hop. The HUD showed BUILDING CHARGE with zero charge while airborne, then SPARK TURBO on release with its remaining duration.
- Menu exposes Space; the HUD explains the 27 km/h entry speed and all three tiers.
- The rebuilt production preview passed the same hop/charge/Spark release sequence, with both tier-colored exhaust flares captured in the screenshot below.
- Sound on/off toggled in both gameplay and pause. Tab from the last pause control wrapped to Resume. Reset in pause and resume returned to zero speed and zero charge.
- Narrow and 1280 × 800 desktop layouts were inspected; the charge HUD stays clear of the kart. The production console showed no errors; only the existing upstream Clock deprecation warning remained.

![Production Spark mini-turbo](milestone-2-gameplay.jpg)

## Manual verification still needed

- Human tuning of longer drifts and tiers 2/3 around the actual circuit. These tiers pass pure-controller tests; no full human drift circuit or full browser tier-3 demonstration is claimed.
- Physical gamepad, audio listening/volume balance, real OS focus-loss behavior, and the Chrome/Firefox/Safari performance matrix.
- The upstream R3F/Three.js Clock deprecation warning remains unsuppressed.

Next: finish the manual checks, tune grip/charge thresholds, then proceed to M3 checkpoints/laps/racing/AI.

## Acceleration engine audio follow-up

Date: 2026-11-20. The user requested audible car acceleration. This sound-only addition preserves all completed gameplay milestones.

- Added an original continuous synthesized kart motor: quiet idle, immediate throttle load, speed-dependent revs/brightness, softer coasting/braking, reverse acceleration and a bounded boost lift. No external audio assets or new dependencies.
- `engineAudioConfig.ts` owns sound tuning; `render/audio/engineSound.ts` owns the seamless waveform and pure target calculation; `KartEngineSound.ts` owns two shared-buffer loop voices with smoothed Web Audio playback/filter/gain parameters.
- `GameCanvas.tsx` passes its already-resolved normalized input to `DrivingAudio`; there is no new input or movement owner. Keyboard, gamepad and phone use that same input. Only the player's motor is synthesized, keeping opponent counts from multiplying audio cost.
- Engine and skid loops are explicitly stopped/disconnected on disposal. Mute, pause, reset, focus loss, loading and results use the existing lifecycle. Sound remains gesture-unlocked and saved sound preferences remain authoritative. Enable **Settings → Game sound → ON** if previously muted.
- One 1,024-sample mono cycle is shared by two engine loops (about 4 KB of sample data). Targets sample at most 30 Hz using the audio clock; unchanged targets schedule nothing. No motor nodes are created per frame and no audio network request is added.

Verification: focused synthesis/lifecycle tests cover waveform continuity/headroom, throttle/speed/coast/reverse/boost response, malformed input clamping, unchanged simulation data, unlock, mute/pause/reset/focus silence, suspended contexts, bounded automation, steady targets and idempotent cleanup. Existing one-shot/celebration tests remain included.

- `npm run typecheck`: passed.
- `npm run lint`: passed, zero warnings.
- Focused audio tests: 16 passed in two files.
- `npm run test` (with caffeinate/local relay access): **538 tests in 47 files passed**, 147.10 seconds. Existing simulation/AI/item/race/phone regressions remain passing. Upstream Three.js CommonJS deprecation/Node experimental warnings remain visible, unsuppressed.
- `npm run build`: passed, 822 modules. App chunk is 67.51 KB gzip (previous branding build: 66.46 KB); initial entry remains 2.79 KB gzip. No new dependency or audio download.
- `git diff --check`: passed.

Manual limitation: the available browser service reports `Trusted RPC service is not configured: browser`; live browser playback and speaker/headphone volume/timbre were not verified. Listen on a real browser with sound enabled: accelerate with W/Up, release to coast, brake/reverse with S/Down, drift/boost, pause/resume, switch tabs, reset and return Home. Confirm a smooth motor response, no lingering sound and readable item/result cues. Physical phone/gamepad and cross-browser audio behavior still need device checks.

## Gameplay music follow-up

Date: 2026-11-20. The user's request for a gameplay song adds an original bright arcade instrumental, preserving every simulation, input, camera and race rule.

- Sixteen bars at 132 BPM (about 29.09 seconds), with an original lead melody, chords, bass, kick, snare and hats. The melody/arrangement is code-authored, with deterministic synthesized percussion; no external recording, copied soundtrack or new dependency.
- `raceMusicConfig.ts` owns tempo/sample rate/mix; `raceMusicScore.ts` owns the score; `renderRaceMusic.ts` renders native Web Audio instruments once into a mono 22,050 Hz buffer (about 2.45 MiB). There is no audio download, live note scheduler, timer or per-frame node allocation. Offline graph construction/preparation is one-time; target-hardware timing remains unmeasured.
- `RaceMusic.ts` owns one cached buffer, one active source/gain and at most one short retiring fade. It starts at GO or active Free Drive, stays silent through preparation/countdown/menu/results, resumes its musical position after pause/mute, and restarts after race restart/recovery. App's existing lifecycle gates loading/focus/context interruptions. Results stingers remain separate.
- The existing **Settings → Game sound** toggle controls music, engine and effects; the new settings description makes that explicit. The saved preference remains authoritative. No extra buttons, movement tuning or simulation hooks.
- Asynchronous completion checks active/disposed state before playing. Unsupported offline audio or preparation failure leaves the existing engine/effects working. Sources/gains disconnect on fade completion or disposal, including rapid pause/resume and late preparation.

Focused checks: 26 tests in three audio files passed. Added cases cover score bounds/determinism/rests, offline graph scheduling/envelope endpoints, unavailable API, no autoplay, async completion after pause/disposal, single-source steady playback, paused offsets/loop wrap, reset, suspended contexts, bounded retiring voices, cleanup and integration with DrivingAudio mute/results behavior. These are score/graph/lifecycle tests, not a claim of measured acoustic quality.

- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run build`: passed, 826 modules. App chunk is 68.82 KB gzip (engine-only build: 67.51 KB); the initial entry remains 2.79 KB gzip.
- `npm run test` (with caffeinate/local relay access): **548 tests in 48 files passed**, 157.12 seconds. Existing physics/AI/items/race/phone regressions remain passing; upstream Three.js CommonJS/Node experimental warnings remain visible and unsuppressed.
- `git diff --check`: passed.

Manual verification: a fresh browser runtime check again returned `Trusted RPC service is not configured: browser`. Live browser playback, acoustic balance, perceived loop seam and iPhone/Android/speaker/headphone behavior remain unverified. With Game sound ON, start a race, wait for GO, drive with the motor/effects, pause/resume, mute/unmute, switch tabs, recover, restart and finish; confirm music follows those transitions and leaves result cues readable. The same instrumental currently plays on all four courses; course-specific arrangements and separate music/effects volume controls are possible later refinements.

### Engine mix correction — 2026-11-20

The user reported that sustained revs overwhelmed other sounds. All four engine gain contributions (idle, speed, throttle and boost) now use 30% of their previous amplitude, about **−10.5 dB**. This changes only `engineAudioConfig.ts`; music/effect levels, engine pitch response, mute/pause behavior and gameplay remain unchanged. Typecheck, lint, production build, `git diff --check` and the existing 26 focused audio tests pass. The full gameplay suite was not repeated for this constant-only adjustment. Speaker/headphone listening remains required to assess the perceived balance; no new acoustic measurement is claimed.

## Drift removal follow-up — 2026-11-20

The user explicitly removed drifting from gameplay and the phone controller. This supersedes the original M2 feature: there is no drift steering/grip mode, charge accumulation, release mini-turbo, manual hop, AI drift decision, wheel spark draw or looping skid voice. Space and A/RB no longer produce driving actions; menu confirmation retains its separate ownership. Pause/help/settings no longer advertise drifting. The phone cockpit contains steering, one centered Item action and the two pedals, with no hidden or empty Drift target.

`boostConfig.ts` separates the unchanged three external boost profiles and ramp gravity/landing constants from the deleted drift tuning. `boostController.ts` only advances existing externally granted timers, applies original brake/expiry recovery and clears legacy drift snapshots without payout. Ordinary steering, grip, acceleration and collision dimensions remain unchanged. AI keeps its speed/braking/racing line and traffic planning, but cannot request drift or countersteer a drift. Pad/item boost durations, speed caps, ramp entry/flight/landing, item hits/guard, audio engine/music, cameras, lap/cup rules and timing ownership retain their existing implementations.

The normalized v1 `drift` boolean and old snapshot fields remain as inert compatibility data, explicitly documented in types. Current adapters emit false, human input mixing discards it, old remote packets are neutral-gated using only current controls and sampled with drift false, and every movement step clears old charging/direction fields before steering. There is no path to a release payout. This avoids a pairing protocol migration and keeps old stored payloads safe. The changed handling fingerprint deliberately makes all pre-removal Time Trial records/ghosts incompatible; storage is not deleted, but only current-rule runs may compare or replace them.

Relevant files: core `types`/`simulation`, `kartController`/`boostController`/`jumpController`, shared boost tuning, AI controller/config/traffic memory, input adapters, remote/touch input, `PhoneControlDeck`/controller CSS, turbo HUD, kart effects/rigs/driver animator, driving audio and user-facing instructions. `drift.test.ts` is replaced by behavioral `driftRemoval.test.ts`: ignored held/released/toggled old input, stale charged state, unchanged ordinary handling, external boost caps/expiry/braking, airborne solid rails, pause/reset, render-rate consistency and no AI drift requests. Existing input, phone, audio, item and Sunshine tests now assert the requested behavior rather than the removed feature.

Browser evidence is in `docs/design-qa/drift-removal/`: the real local relay sends only false for the retired field, three driving action targets remain, pedal/steering multitouch and cancellation work, pause/settings/focus/disconnect gating remains safe, Tilt calibration/touch fallback remain accessible, and four phone viewports fit. No physical-device check is claimed.

Verification: typecheck, zero-warning lint, browser/server production build and `git diff --check` passed. Focused movement/input/phone/audio/item/AI/Sunshine checks: **87 tests in 10 files passed**. Full suite: **567 tests in 51 files passed**, 178.67 seconds, including existing race completion, AI, item, records and cup regressions. The count changed because tests for the removed feature were replaced with removal/retained-boost regressions. Existing upstream Three.js CommonJS deprecation warnings remain unsuppressed. The build processed 833 modules.

Isolated Chrome 157 passed 14 phone checks against the real relay (159 packets, zero page errors), including the removed Drift target and false legacy wire value. A separate browser smoke traversed Home → racer → kart → track → review → rendered Quick Race, held/released W and the retired Space key, verified the turbo-only HUD and opened pause help without obsolete instructions; zero page errors. These are automated local checks, not a physical handset, real listening or production deployment claim. Gameplay and phone screenshots/reports are saved under `docs/design-qa/drift-removal/`. Push the local commit and reload both computer and phone pages after deployment.
