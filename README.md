# Turbo Kart Legends

A desktop-browser arcade kart racer. **Milestone 4** adds track pickups, a held-item HUD, Spark Bolt, Banana Trap, Bubble Guard and Turbo Charge, alongside VS Race customization (1/3/5 laps and Easy/Normal/Hard CPU pace), alongside four original circuits, the four-race Sunshine Cup and optional wireless phone controller. The fullscreen Home and mode-based racer/kart/track setup flow provides five supplied racers, four supplied karts, live 3D previews and browser-local cosmetic selection. Player and AI use the same independent-instance GLB assembly. Quick Race, Time Trial, Free Drive, drifting, turbo, hops, lap validation, standings, race management, controls and camera behavior remain intact.

The supplied franchise models are enabled for this **local prototype with the user's confirmed permission**. Embedded uploader credits are preserved in [model credits](public/ASSET_CREDITS.md); public-release rights have not been independently verified. Track, scenery, HUD icons, effects and synthesized audio remain original/procedural; item meshes include the supplied local-use models. No account, database or remote model service is required. The optional phone relay runs inside the local Vite/Node server.

## Run

Use Node **20.19+ within the 20.x line**, or **22.13+**, and npm.

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite (normally http://127.0.0.1:5173), then choose a Home mode and complete racer, kart and track setup to start. Use a desktop browser with WebGL and hardware acceleration. Changes to simulation, keyboard or track modules force a full development-page reload so React Fast Refresh cannot retain an older controller. If an already-open tab has reversed steering, reload it once to start a fresh simulation.

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
```

`npm ci` reproduces the checked-in lockfile. `preview` serves the production build, normally on port 4173. Both servers bind to loopback only.

## Wireless smartphone controller

Click **Connect Phone** for pairing status, a short-lived QR code and disconnect controls. For a real phone on the same Wi-Fi:

```sh
npm run phone:cert
# Manually trust .certs/turbo-kart-ca.pem on both test devices.
npm run dev:phone
```

Open the printed HTTPS Network URL on the PC, scan its QR on the phone, then start/resume the game and release phone controls to arm. Touch steering, GO, BRAKE/reverse, DRIFT, ITEM and pause are available. Optional gesture-permission motion steering adds calibration, sensitivity, dead zone, smoothing and inversion. Disconnect/stale input neutralizes controls and pauses; keyboard/gamepad remain available.

The certificate generator changes no device trust settings. Follow the exact trust, Wi-Fi, firewall and browser instructions in [the phone-controller guide](docs/PHONE_CONTROLLER.md). Normal `npm run dev` uses loopback and supports computer-only pairing tests. `npm run build && npm run preview:phone` serves the built app with the local relay; static hosting alone cannot provide wireless control. Physical iPhone/Android sensor and Wi-Fi tests remain manual.

## Home and race setup

The fullscreen Home menu offers **Quick Race**, **Grand Prix**, **Time Trial**, **VS Race** and **Settings**. Pick a mode, confirm a racer, confirm a kart, select Sunshine Circuit, Sugar Rush Valley, Frostbite Peak or Volcano Sprint, review the lineup and choose **Start race**. Grand Prix adds Cup Select and a fixed four-course itinerary: **Sunshine Circuit → Sugar Rush Valley → Frostbite Peak → Volcano Sprint**, followed by round standings and a championship final. Each race awards **10 / 7 / 4 / 1 points**. Ties use most wins, then seconds/thirds, then the final race. An unfinished round can be restarted from Pause without losing earlier points; finished rounds are committed once. The cup lives in memory and does not resume after a reload. VS Race adds a **Race Options** step after Track Select: choose **1, 3 or 5 laps** and **Easy, Normal or Hard CPU**. Up/Down chooses a row; Left/Right (or WASD / controller directions) changes its value; Enter/Space opens review. Starting saves your defaults locally; backing out of setup discards drafts. Race Again and Pause → Restart session retain the active settings. Grand Prix, Quick Race and Time Trial keep three laps and the original Normal profiles. Settings retains Free Drive practice.

Arrows/WASD navigate, Enter/Space confirm and Escape/Backspace go back; standard gamepads use stick/D-pad, A/cross and B/circle. Icon buttons open sound, controller/input and phone setup. Phone setup includes the existing real QR pairing plus touch/motion preference, sensitivity and calibration requests; motion permission must be granted on the phone itself. Sound and last-mode preferences persist locally.

**Pause → Change racer & kart** uses the same shell to save cosmetics without resetting the race. Back preserves draft choices within setup; leaving the first step discards them. See [frontend architecture, file list and verification](docs/FRONTEND_FLOW.md).

Selections use versioned localStorage with validation and safe defaults. Storage denial still permits session-only selection. AI gets three distinct racer/kart combinations, separate from the player's appearance; Breeze, Nova and Moss retain their existing racing identities and skill profiles. All kart choices have identical handling and collision dimensions.

The registry in `src/game/config/visualAssets.ts` defines URLs, unique IDs, scale, axes, seat anchors, static fits and explicit future clip mappings. `KartAssembly` attaches each driver beneath the seat, under the existing motion/bank/drift/jump parent. SkeletonUtils clones isolate transforms, bones and animation mixers; immutable fitted geometry, materials and textures are shared. Four wheel pivots spin/steer, including compound wheels and the DS kart's joined tire pairs. The boat's chassis skeleton is preserved.

All five supplied racers are **unrigged, with zero animation clips**. Current seated appearances are approximate static vertex fits, not seated animations. Source expressions, the SpongeBob bubble wand, open hands and some seat/grip details need Blender cleanup, skinning and authored driving clips. The animation adapter accepts explicitly named compatible idle, steering, leaning, drifting and victory clips; none is claimed to exist in these GLBs.

Textures retain GLTFLoader color-space settings and are capped at 1024 px for GPU use. Static compatible mesh siblings are merged; shadow resolution and DPR remain bounded. Setup previews render on demand; Home adds a reduced-motion-aware turntable. Menus suspend the underlying scene. Visible menu thumbnails and selected/gameplay assets load through the shared cache; unsupported heavy/legacy sources are excluded. Failed gameplay loads fall back to the original procedural kart with a visible notice; reload retries. The garage has loading/error/retry states.

Development tools:

- `/?asset-preview`: choose any supported combination; adjust seat and driver position, rotation and scale; compare raw/static poses; show anchors; use side/front/top views; copy JSON into the registry. Changes are preview-only.
- `/?asset-inspect`: recursively audited source inventory, normalized raw models, bounds, skeletons and clip data. The complex legacy kart reports a conversion error instead of displaying incorrect materials.
- `/?race-preview&collision-preview`: normal-input autodrive with a center or ±4 m near-rail line for collision QA; no position injection.
- `/?race-preview&item-preview&item-reward=turbo-charge`: labeled development-only fixed pickup rewards in Quick / VS for reproducible item HUD checks. It still requires collecting and using a real box; omit `item-reward` for normal weights.
- `/?render-stats`: renderer counts and rolling median/p95 frame intervals. Combine with `?race-preview&render-stats` for normal-input race QA.
- `npm run assets:audit`: regenerate `docs/assets/asset-audit.json` without altering GLBs.

See [M3.5 changelog, complete model list, adding assets, limitations and verification](docs/MILESTONE_3_5.md). Earlier [asset-integration notes](docs/ASSET_INTEGRATION.md) remain as a historical record.

## Race modes

Choose a mode on Home, complete racer/kart/track setup, then start the race:

- **Quick Race:** three laps against Breeze, Nova and Moss. Karts wait through 3–2–1; hold throttle to launch at GO. Rivals have distinct colors, target speeds, traffic avoidance and limited catch-up through normal inputs.
- **Time Trial:** the same validated three-lap run without opponents. Race time, current/best lap and checkpoint splits appear in the HUD. Clean completed runs save per-course best lap/race and a best-run ghost locally.
- **Free Drive:** untimed M2 driving, with no opponents or lap validation.

Cross all 12 gates in order and in the forward direction. Green road-edge chevrons indicate the next required gate; poles/flags mark checkpoints. The finish line is checkpoint zero, aligned with the painted stripe. A reverse crossing, skipped gate, crossing outside the road or an implausible teleport cannot award a lap. A sustained wrong-way warning gives recovery guidance.

During a race, **R / Reset** returns to the last validated checkpoint with zero speed; time continues and no gate/lap is awarded. Before the first start crossing it returns to your grid slot. In Free Drive it retains the original spawn reset. Pause freezes the countdown, every racer, boosts and timing. **Pause → Restart session** starts a fresh countdown; **Race again** on results does the same. Results show the configured number of lap times, best lap, total time, CPU difficulty and final position. Rivals still driving when you finish are labeled **On track**, with no invented finish times. Finished AI leaves the active circuit so it cannot obstruct the finish.

## Controls

| Key | Action |
| --- | --- |
| W / ↑ | Accelerate |
| S / ↓ | Brake; continue holding to reverse |
| A / ← | Steer left |
| D / → | Steer right |
| Space | At speed, hop; hold with steering to drift; release to trigger a charged mini-turbo |
| R | Recover to the last validated gate in a race; reset to spawn in Free Drive |
| Escape | Pause / resume |

Reset and pause/help buttons are also available. Tab navigates buttons, Enter/Space activates them, and the pause dialog contains keyboard focus. The game requests pause and clears held keys on window blur or document visibility loss; resume is explicit. After a head-on impact, reverse away or reset. Race recovery returns to the last validated gate; Free Drive reset returns to the initial spawn.

Use the sound icon or Settings to mute or enable synthesized driving cues. Audio unlocks when starting a race or toggling sound.

The HUD reports **km/h**, using one world unit as one meter (normal top speed: 72 km/h). The course map shows the player and active rivals. Race modes also show validated laps, position and timing.

## Drift and mini-turbo

1. Reach at least **27 km/h**. Start steering, then press and hold Space to hop into a drift.
2. Charge builds after landing while you keep steering. Steer into the drift to tighten it; countersteer to widen it. The drift stays in its original direction until released.
3. Release Space when a tier is ready. Keep W/↑ held to accelerate through the boost.

| Tier | Grounded charge | Boost duration | Speed cap |
| --- | --- | --- | --- |
| 1 · Spark | 0.65 s | 0.65 s | 86.4 km/h |
| 2 · Surge | 1.50 s | 1.05 s | 93.6 km/h |
| 3 · Flare | 2.60 s | 1.50 s | 100.8 km/h |

These are caps, not an instant speed jump. The HUD, sparks and exhaust color show the tier. Braking, rail contact, insufficient speed, or stopping steering cancel charge. Pause clears a charging drift without paying out; an already-active boost freezes with the simulation. Reset clears everything. Boosts cannot be refreshed by holding Space: finish the boost/recovery interval and make a new drift press. Hops never bypass the road barriers.

## Gamepad (optional)

Connect a standard-mapped controller, press a controller button if your browser requires it, and choose a mode on Home. Left stick/D-pad steers; RT accelerates; LT brakes/reverses; bottom face button (A/cross) or RB drifts; Menu/Start pauses; View/Select resets; X/square fires the held item. Release held triggers/buttons after connection, pause or reset before driving again. Keyboard steering takes priority if both devices are used. Disconnection requests pause. Physical-controller testing remains required; normalization, deadzone, action edges and neutral gating are unit-tested.

## Implementation

- React 19.3 / stable R3F 9.8, Drei 10.7.9, Three.js 0.187, Vite 8, strict TypeScript, ESLint and Vitest. Versions and peers were checked against npm. Vitest 4 and TypeScript 5.9 keep Node 20 and the lint toolchain compatible. A minimatch override patches the development-tool glob advisory; the lockfile audit is clean.
- Pure simulation in `src/game/core/` and `src/game/kart/`, independent of React and Three.js. One normalized `KartInput` owns throttle, brake, steering, drift and useItem for keyboard/gamepad/phone adapters. No separate physics engine competes for movement ownership.
- Fixed 60 Hz ticks, at most six catch-up steps / 100 ms, interpolated render poses, and cleared accumulation during pause/reset. Steering is speed-sensitive, with damped lateral slip and signed reverse speed.
- `sunshineCircuit.ts`, `sugarRushValley.ts`, `frostbitePeak.ts` and `volcanoSprint.ts` define the four original courses; `trackCatalog.ts` centralizes course IDs, themes and the cup itinerary. `trackSampling.ts` builds an arc-length-resampled closed spline; rendering derives road/curbs/rails from those same samples. A shared 2.4 m × 3.1 m rounded kart footprint resolves against the visible rail face; the 1.8 m circle is only a conservative broad-phase/art envelope. Side and nose clearance differ with heading, and wall scrapes remove outward velocity without repeatedly damping forward travel. Opponents use the same capsule, so close side-by-side overtakes do not hit an oversized circle. Invalid or distant states recover to spawn.
- Separate kart, track, environment and camera components. Wheels spin and front wheels steer. Scenery is instanced; DPR is capped at 1.5, and one filtered shadow light follows the kart. Camera position/look-ahead use delta-aware damping and reset together with the kart.
- React handles screen-level state. Simulation stays outside React state; HUD/map update at 10 Hz. Listeners, timers, procedural geometries and textures are cleaned up.
- `driftConfig.ts` centralizes thresholds, caps, boost durations and hop tuning. `driftController.ts` owns charge/release/recovery and `jumpController.ts` owns ballistic vertical movement. `KartEffects.tsx` uses pooled sparks and lightweight exhaust geometry; `DrivingAudio.ts` synthesizes original cues and releases one-shot audio nodes. No new dependencies were needed for M2.

Championship orchestration: `src/game/race/CupSession.ts` wraps unchanged RaceSession instances; `src/game/ui/CupResultsMenu.tsx` shows round points and final totals. Track changes remount the course scene and HUD while keeping audio/input/phone services alive. See [M3.7 verification and extension guide](docs/MILESTONE_3_7.md).

VS configuration: `src/game/config/raceOptions.ts` defines validated session options and CPU pace offsets; `vsPreferences.ts` owns versioned defaults. The existing race accepts an immutable options snapshot, using the existing lap-target parameter and AI target-speed inputs. No steering/handling/catch-up formulas change. See [M3.8 report](docs/MILESTONE_3_8.md).

Race entry points: `src/game/race/RaceSession.ts`, `raceProgress.ts`, `trackProgress.ts`, `racerCollision.ts`, `src/game/ai/waypointController.ts`, `src/game/config/raceConfig.ts`, and `src/game/ui/{RaceHUD,ResultsMenu}.tsx`. Development-only `/?race-preview` adds normal-input autodrive for end-to-end browser checks. It does not teleport or skip validation and is excluded from production.

Important entry points: `src/app/App.tsx`, `src/game/config/kartConfig.ts`, `src/game/core/simulation.ts`, `src/game/kart/kartController.ts`, `src/game/kart/kartCollision.ts`, `src/game/tracks/`, `src/game/render/`, and `src/game/tests/`.

## Verification and limits

See [M3.5 verification](docs/MILESTONE_3_5.md), [M3 verification](docs/MILESTONE_3.md), [GLB integration verification](docs/ASSET_INTEGRATION.md), [M2 verification](docs/MILESTONE_2.md) and the [historical M1 record](docs/MILESTONE_1.md). Tests cover movement, steering direction, drift tiers, boost limits/recovery, hop/landing, pause/reset cancellation, keyboard/gamepad input, audio lifecycle, fixed-step consistency, track continuity/non-intersection, rail impacts/sliding and full-circuit traversal through player inputs.

This is a flat-road racing prototype with drift-entry hops; it has no ramps or terrain jumps. Spark Bolt, Banana Trap, Bubble Guard and Turbo Charge use position-weighted pickups and repeated-hit recovery. Time Trial personal records and best-run ghosts are now local to this browser. Online racing and reload-resumable championships remain future work. Phone input uses the existing optional local relay. Full three-lap Time Trials, Quick Races with traffic and all three opponents finishing are exercised headlessly. Browser verification and remaining device/manual checks are recorded in the M3 notes. Higher-tier human drift tuning, listening checks and Chrome/Firefox/Safari performance testing remain manual. Real OS focus-loss behavior also needs manual confirmation outside the automation browser. Local render measurements are recorded in the M3.5 notes; they are not a cross-device 60 FPS guarantee.

R3F 9 currently constructs Three.js `Clock`, which Three.js 0.187 warns is deprecated. This is an upstream renderer warning; the kart's fixed-step simulation does not use that clock for integration. It is recorded, not suppressed.

Next: human playtesting and the manual browser/controller/listening matrix, followed by original seated driver art, performance cleanup and combat balance tuning. The original design and roadmap documents remain in the project root.

Collision maintenance: see [wall/opponent fix and regression evidence](docs/COLLISION_FIX.md). Wall geometry and contact reference the same rail-face offset; cosmetic kart choices retain identical physics.

### Model performance and cockpit fitting

Runtime models now use generated lower-detail GLBs; original files remain in place for inspection. `npm run assets:optimize` regenerates all kart/driver and item derivatives without adding runtime simplification. Per-kart grip targets and protected driver mesh regions improve static cockpit fitting; the workshop at `/?asset-preview` displays those targets. All drivers are still unrigged static meshes. See [performance, fitting, verification and authoring notes](docs/PERFORMANCE_AND_DRIVER_POLISH.md) for measured budgets, the 20-combination gallery and remaining artist/device work.


## Pickups and items

Quick Race, VS and Sunshine Cup have three rows of three respawning pickup boxes per course. Drive through one with an empty slot, then press **E / either Shift**, gamepad **X / square**, the HUD item button, or the phone’s **ITEM** button to use the held item. Every box rolls a position-weighted reward at collection. Spark Bolt is a straight, non-homing projectile that stops at the rail or the nearest kart. Banana Trap: use the same action to drop it behind the kart. It arms after 0.65 s, expires after 18 s and can be cleared with a hop. Bubble Guard: activate for five seconds of protection against one bolt or trap hit. A hit without protection cancels drift/boost and briefly slows the kart; a visible 2.2 s immunity window prevents stacked hits. Another damaging hit within six seconds has a milder slowdown and 3 s protection. Release and press again for another use. Pause freezes all item timers; recovery clears your held item, shield, effects and outgoing shots/traps; restart clears the world. Time Trial and Free Drive remain item-free.

The supplied box is preserved under `public/assets/items/`; the runtime loads a smaller offline derivative. `npm run assets:optimize` rebuilds both kart/driver and item derivatives. See [M4 implementation and verification](docs/MILESTONE_4.md) and [asset attribution](public/ASSET_CREDITS.md). No new dependencies or servers are required. The phone action uses the existing local relay.


### Banana and Hutt ball follow-up

The supplied banana is the actual **Banana Trap** model; the Hutt ball is now Spark Bolt's projectile mesh. The runtime recenters/scales both, removes the banana's duplicate mesh from the prepared instance and simplifies the ball to 4,174 triangles. No authored animations exist. Both retain independent procedural fallbacks. Details, credits, rules and verification: [item follow-up](docs/MILESTONE_4_ITEMS.md). Controls remain E / Shift, X / square, HUD or phone ITEM. Bubble Guard is now implemented; the original three-item balance is documented in [item balance](docs/ITEM_BALANCE.md), superseded by the [four-item Turbo Charge update](docs/TURBO_CHARGE.md).


### Bubble Guard

Collect Bubble Guard and use the same item button to activate a **five-second, one-hit shield**. A visible cyan bubble follows the kart; the HUD shows remaining time even when the inventory slot is empty or contains another item. One Spark Bolt or armed Banana Trap consumes the guard and the attack, preserving speed, drift and boost. It does not protect against walls or kart contact, heal an earlier slowdown, or refresh an active guard. AI activates it for predicted incoming threats or prepares it after three seconds in a moving pack. Pause freezes it; recovery/restart clears it. See [Bubble Guard implementation and verification](docs/BUBBLE_GUARD.md).


### Position-weighted item balance

All nine boxes can grant any implemented item. First place rolls **15% Spark Bolt / 25% Banana Trap / 50% Bubble Guard / 10% Turbo Charge**; middle places **35 / 20 / 25 / 20%**; last place **40 / 10 / 20 / 30%**. Rewards use validated standings at collection, with independent seeded streams for each racer. New setup starts get a new seed; restarting keeps it (the same collections and standings reproduce rewards). AI waits 0.3 s before use and predicts straight-shot/pursuer contacts; every consumption has a 1.1 s cooldown. The HUD and a gold ground ring show item-hit protection. See [balance tuning, checks and limits](docs/ITEM_BALANCE.md). Human balance and physical-device playtesting remain required.


### Time Trial records and ghost

Choose **Time Trial → Racer → Kart → Track → Review → Start race**. A clean completed three-lap attempt saves your best race and best lap separately for that course. Race again to chase a cyan hologram of your fastest complete run. **VS BEST RUN** shows time at matching validated course progress: negative is ahead, positive is behind. The **Show best-run ghost** checkbox hides its visual while timing comparison and recording continue. Controls are unchanged.

Pause freezes both clocks. Using **R / Recover kart** makes the attempt practice-only; finish or restart normally, with existing records retained. Records require a clean completed run, so abandoned partial laps are not saved. The recorder has a 15-minute budget. Times/ghosts persist only in this browser and may be cleared by browser data cleanup. Storage denial keeps records in memory for the session; quota may save times without the ghost. Track/handling changes invalidate incompatible references. The ghost is a lightweight original hologram rather than a duplicate of your cosmetic GLB. See [implementation, tests and limits](docs/TIME_TRIAL_RECORDS.md).


### Frostbite Peak and the expanded cup

The third original course is an approximately **853 m**, 11 m-wide alpine loop with snowy pines, distant peaks, snowbanks and two open glacier tunnels. Select it in Quick Race, Time Trial or VS, or reach it in Sunshine Cup round three. Road, rails, checkpoints, minimap, pickups and Time Trial compatibility all use the existing sampled-track pipeline. The road remains flat with the same grip and handling as the other courses. Cup order and menu counts come from the central catalog. See [implementation and verification](docs/FROSTBITE_PEAK.md).


### Finish stage and championship celebration

Quick/VS race results show the classified top three in their actual karts; Time Trial uses a solo finish stage with the existing personal-best/practice result. Sunshine Cup rounds show scored standings and **Next cup race**; the final stage follows championship totals and offers **Race cup again**. Short original synthesized finish/victory/personal-best/champion cues respect sound settings and stop on focus loss or leaving results. Arrows/WASD or gamepad navigate; Enter/Space/A confirms; Escape/Backspace/B returns **Home**.

Stage motion and confetti settle after 5.5 seconds, honor system reduced motion, and pause rendering in hidden tabs. The background circuit is suspended while results are open. These are procedural stage effects around static supplied drivers, not authored victory animations. `/?results-preview` is a development-only visual fixture gallery (no races run or records saved). See [files, checks and limitations](docs/RACE_FINISH_POLISH.md).


### Volcano Sprint and the four-race cup

The fourth original circuit is an approximately **756 m**, 11 m-wide caldera loop with linked bends, dusk lighting, basalt columns and glowing lava pools/crater seams. Choose **Volcano Sprint** in Quick Race, Time Trial or VS; Sunshine Cup now ends here in round four, with a maximum of **40 points**. The same sampled course generates road, solid rails, gates, starts, minimap, pickups and ghost compatibility. Lava and cliffs are decorative and remain outside the driving corridor. The road stays flat with the same grip, handling and camera as the other tracks. See [files, verification and limits](docs/VOLCANO_SPRINT.md).


### Turbo Charge

Collect **Turbo Charge**, drive forward at least **4 m/s** and use the usual **E / Shift**, **X / square**, HUD or phone **ITEM** action. It grants the existing **1.5-second Flare boost** (28 m/s ceiling); keep accelerating to gain speed. Wait out an active boost or item slowdown and release the brake first. A rejected press preserves the item; release and press again. Activation ends charging drift without a second payout, and durations never stack. Normal braking and collision cancellation still apply. Bubble Guard protects it from one item hit. The orange HUD meter counts down independently of inventory. AI uses it on predicted clear road. Pause freezes it; recovery/restart clears it. Time Trial and Free Drive remain item-free. See [implementation, four-item weights and verification](docs/TURBO_CHARGE.md).


### Design rollout: Home Menu

The first design pass introduces a charcoal showroom, warm yellow selection states, a larger live kart preview and clearer mode/profile details on Home. The existing mode setup and racing behavior remain. Keyboard arrows/WASD navigate; Enter/Space confirms. Open Settings for sound, controller mappings and phone pairing. Home uses five quiet text choices without duplicate shortcut buttons or a tutorial footer; setup keeps its Back/Confirm actions without permanent control hints. Other screens will receive their own visual passes next. See [design direction, files, QA and next screens](docs/DESIGN_ROLLOUT.md).
