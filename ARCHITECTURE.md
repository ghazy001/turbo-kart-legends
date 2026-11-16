# Turbo Kart Legends — Technical Architecture
Version 1.0

## Architecture principles
1. The authoritative **local simulation** is a pure TypeScript module independent of React and Three.js scene components. Rendering reads snapshots, inputs are submitted to the simulation.
2. Separate *simulation position/velocity/heading* from mesh pose and cosmetic animations.
3. Run simulation with fixed delta (`1/60`) and render with interpolation. Clamp elapsed frame time and max catch-up ticks to avoid spiral-of-death after tab suspension.
4. Centralize numeric tuning values in `src/game/config/kartConfig.ts` and track data in `src/game/tracks/`.
5. Inputs are normalized `KartInput` (`throttle`, `brake`, `steer`, `drift`, `useItem`) and are generated identically by human/AI/network adapters in later milestones.
6. Avoid UI state writes per simulation tick. React/Zustand handles screen-level state; fast-changing simulation state remains mutable in the game loop.
7. Reproducibility: deterministic-like fixed-step behavior for basic planar driving, but don't claim strict bitwise determinism across browser physics backends. Multiplayer uses server authority and reconciliation.

## Suggested stack
- Vite + React + TypeScript, strict mode
- Three.js and `@react-three/fiber` stable compatible versions (React 19 pairs with R3F v9; check peer dependencies before installation)
- `@react-three/drei` for selected helpers only
- Zustand for menu/UI state
- `@react-three/rapier` + Rapier for colliders/queries where useful; driving behavior remains a custom controller
- Vitest + React Testing Library for unit/UI testing
- Playwright for smoke tests once configured
- ESLint and Prettier
- Future: Colyseus authoritative Node.js service, database only when profiles and online results require it

## High-level boundaries
```
Browser UI (React, Zustand)
    ├── Menu / HUD / settings
    ├── InputAdapter (keyboard; later gamepad/touch)
    └── GameScene (React Three Fiber)
         ├── Renderers (KartVisual, TrackVisual, Environment, Camera)
         ├── GameLoop -> Simulation.step(fixedDt, KartInput)
         └── World collision adapter (Rapier static colliders/queries)

Core Game Simulation (headless TS)
    ├── KartState + KartController
    ├── TrackData + path sampling + safety/reset logic
    ├── RaceProgress (M3)
    ├── AIController (M3)
    └── Items (M4)

Future Network Adapter (M6+) -> Colyseus Room -> authoritative simulation
```

## Data structures
```ts
export interface KartInput {
  throttle: number; // 0..1
  brake: number; // 0..1
  steer: number; // -1..1
  drift: boolean;
  useItem: boolean;
}
export interface KartState {
  x: number;
  z: number;
  y: number;
  heading: number; // radians, consistent forward convention
  forwardSpeed: number; // signed
  lateralSpeed: number;
  yawRate: number;
}
export interface TrackPoint { x: number; y: number; z: number; width?: number; }
export interface TrackDefinition {
  id: string;
  name: string;
  closed: true;
  points: TrackPoint[];
  defaultRoadWidth: number;
  spawn: {x: number; y: number; z: number; heading: number};
}
```
Do not overbuild the state schema in M1. Prefer small typed interfaces; add versioning when persistence arrives.

## Fixed timestep outline
```
frameDelta = min(clockDelta, 0.1)
accumulator += frameDelta
while accumulator >= 1/60 and ticks < MAX_TICKS:
    input = inputAdapter.sample()
    simulation.step(1/60, input)
    accumulator -= 1/60
alpha = accumulator / (1/60)
renderer.interpolate(previousState, currentState, alpha)
```
Do not run both an independent Rapier step and a conflicting manual position integrator. Choose one owner for kart movement and use Rapier for nonconflicting collision interactions/queries.

## Track geometry and collisions
- Define a closed Catmull-Rom-like centerline or custom sampled spline.
- Sample centerline along approximately equal arc-length intervals.
- Compute stable local tangent and lateral normal in the XZ plane.
- Generate the road strip using sample left/right edges, with vertex normals and UVs.
- Road strips need valid triangle winding. Use a simple flat prototype to reduce terrain complexity.
- Use the same samples to place barriers and detect out-of-bounds; barrier visual and collision coordinates must match.
- Prototype can resolve kart against nearest sampled road segment/edge boundary in a deterministic 2D collision solver. Alternatively use Rapier solid static barriers. Do not rely on a collider-less visual wall.
- Cart should be prevented from driving through track barriers and maintain stable position after impact.
- Place a safe spawn and use `R` to reset upright, on-road, with motion cleared.

## Movement model
Kart controller should expose pure `stepKart(state, input, dt, config, track)` or similar with no dependency on component life cycle. Update signed forward speed from throttle/braking/drag; modulate yaw by speed and steering; damp lateral slip; integrate XZ; resolve constraints against road boundaries and obstacles; update vertical pose from flat road baseline. Make steering at zero speed limited to avoid spinning in place. Include forward/reverse transitions. Add drift state only in M2.

## Rendering
- R3F Canvas with WebGL output, adaptive DPR cap, ambient/hemisphere + directional key lighting, tone mapping controlled by renderer defaults, soft shadows if affordable.
- Components: `GameCanvas`, `TrackMesh`, `KartMesh`, `Decorations`, `ChaseCamera`, `HUD`.
- Create geometry/materials with memoization; dispose on unmount. Do not construct materials in `useFrame`.
- Low-poly/polished blockout: pastel track asphalt, painted edge stripes, bright kart with animated wheels, trees, flags, balloons, grandstand-like start scene.
- Chase camera computes world-space behind-position from heading, smooths using delta-adjusted exponential damping, targets a point ahead of the kart, preserves sensible near-clip and FOV.

## Input/UX
- Keyboard keydown/keyup with listeners cleaned on unmount.
- Prevent scrolling for bound arrow/space keys when focused in game.
- Clear input on blur to prevent stuck throttle.
- Pause during overlay; resumed game should not jump due to accumulated time.
- UI with title, speed, WASD/arrow help, reset button, pause toggle and mute toggle later.

## Testing strategy
Unit tests: clamp behavior, accelerate/decelerate, reversing, steering, dt dependence, reset, road boundary constraints, track loop sample continuity. UI tests: menu/help/pause. Smoke: app loads, visible kart and track, keyboard input moves kart, reset returns to spawn; build and lint succeed. Use deterministic test inputs and tolerances rather than asserting raw floating-point equality.

## Security / future networking
- Online authoritative simulation: Colyseus room owns canonical race rules, checkpoints, item impacts and leaderboard. Validate player commands, sequence numbers and rates. Clients submit inputs, predict locally, reconcile on server snapshots, interpolate remote racers.
- Define protocol deliberately later; no network layer or login in M1.

## Performance budgets (initial goals)
- 60 FPS on a representative midrange laptop, not a guarantee.
- Target under ~150 draw calls for prototype where practical.
- Avoid high-poly assets, costly postprocessing, and unnecessary physics bodies on decor.
- Measure actual frame time before optimizing prematurely.

## Milestone 3 race ownership

`RaceSession` owns the race phase, ordered checkpoint progress, grid, standings and all racer simulations. One fixed 60 Hz clock advances the player and three AI simulations together. `Simulation.step` still calls the existing kart/drift/jump/road-boundary controller; `Simulation.interpolate` renders those snapshots. The original standalone `Simulation.advance` remains available and tested. No second physics engine or rendering-driven movement was introduced.

`trackProgress.ts` interpolates the sampled road, including the closing segment; the track definition's `startDistance` anchors both the painted finish and validation gate. Swept crossings must be forward, within road width, short enough to be a physical tick and in the expected order. `raceProgress.ts` owns lap/split times and validated arc-distance ranking. Recovery rewinds to the last validated gate with zero motion and does not reset the clock or award checkpoints.

`waypointController.ts` produces the same normalized `KartInput` as the player, with look-ahead steering, curvature-aware speeds, traffic lane changes/following and bounded target-speed catch-up. `racerCollision.ts` resolves planar kart contacts after the shared controller step and reapplies the existing road constraint. AI recovery uses the same last-valid-gate path. Finished opponents leave the active track and contact set; their recorded finish times remain in standings. The race freezes when the player finishes, with trailing racers explicitly labeled on track in results.

Race HUD snapshots update at 10 Hz; countdown/results transitions are screen state. Imported player meshes, driver anchor, handling constants and chase camera behavior remain in their existing modules. `/?race-preview` exposes an explicit development-only normal-input autodrive checkbox for browser QA; it is not a production driving assist or state injection API.


## Milestone 3.5 — Cosmetic asset layer

`config/visualAssets.ts` owns racer/kart IDs, visual transforms, seat mounts, wheel definitions, static fitting and optional explicit animation maps. `visualSelection.ts` validates/persists cosmetics and allocates distinct AI appearances. Selection has no speed/handling/collider fields and never enters the core, AI or race modules.

`KartVisual` reads the existing interpolated simulation pose; its body parent holds `KartAssembly` (kart + seat + driver). `prepareModel` clones scenes, preserves skins and bakes only static fitting/wheel geometry. `modelInstances` caches bounded immutable templates, caps textures and merges static siblings, then clones independent object/bone/pivot instances. `driverAnimation` owns one mixer per authored instance and only plays configured clips. Empty clip lists remain static fits.

`CharacterKartSelectScreen` uses a typed menu-only external store for the racer → kart draft, per-step indices and keyboard/gamepad navigation; App applies the final selection to the render runtime and localStorage without recreating RaceSession or Simulation. The start/pause menus open the same garage. While the garage is open the paused/menu scene renders no frames; its separate preview canvas renders on demand. DOM loading/error UI stays outside Canvas; gameplay keeps the original procedural fallback. Dev-only fitting, raw inventory and renderer counters do not change simulation ownership. Source assets and all M1–M3 gameplay/camera files remain intact.


## Milestone 3.6 — Remote human input

`src/phone/protocol.ts` defines bounded normalized inputs and pairing/link/game-state messages. `server/phoneRelay.ts` owns ephemeral credentials, single-phone ownership, origin/rate/sequence validation, revocation and stale-stream checks; `phonePlugin.ts` attaches it to the existing Vite HTTP(S)/preview server and cleans it up on shutdown. The relay never owns simulation or race logic.

`RemoteHost` is a lazy desktop Socket.IO connection; `RemoteInput` owns receipt-time staleness and neutral arming. `game/controls/inputSources.ts` composes keyboard → gamepad → phone steering priority using the existing normalized input behavior. `GameLoop` reads that composed input once per render; the existing fixed-step RaceSession remains authoritative. App clears/disarms phone input with existing pause/reset transitions and broadcasts input availability. Connection loss requests the existing pause action. Pairing opens from an active race by pausing it.

`/controller` lazy-loads the mobile UI without mounting the Three.js game. `PhoneConnection` transmits the latest normalized state at a chosen bounded rate, with session-scoped reconnect credentials and end-to-end acknowledgement RTT. `TouchInput` tracks independent pointer holds; `TiltSteering` reads screen-relative gravity, explicit neutral calibration and delta-aware damping. Sensor listeners do not transmit. Phone blur/visibility/orientation changes neutralize input. Motion permission occurs only in the button gesture. `.certs` is ignored and explicitly denied by the development file server; no trust-store changes are automated.

## Two-step pre-race selection

Play retains the requested RaceKind while Racer Select and Kart Select share one fullscreen shell. Final confirm commits the existing VisualSelection profile and invokes the existing race start callback; pause-menu customization only changes visuals. Source-pose portraits, isolated kart thumbnails and the seated assembly use independent GLB clones in a single scissored, demand-rendered Drei View canvas. The underlying scene is suspended and background UI is inert. See docs/SELECTION_FLOW.md for state, components, navigation and verified integration checks.

## Home and integrated mode setup

`ui/menu/raceFlowStore` owns frontend screen/mode/step, draft cosmetics and track, audio and nested panels. `RaceFlowShell` shares header/footer and one preview renderer across Home and all setup stages. Mode descriptors map to existing RaceKind values: VS is CPU racing; Grand Prix now wraps the same race kind in a catalog-driven four-round CupSession (M3.7 plus Frostbite Peak and Volcano Sprint). Final review commits the existing cosmetic profile and calls the existing race start; pause cosmetic editing has a two-step save-only intent. Track artwork derives from the sampled road. An additive authenticated host-to-phone configuration event forwards bounded steering preferences/calibration requests; sensor permission stays on the handset. See docs/FRONTEND_FLOW.md for the complete state and verification.


## Milestone 3.7 — Track registry and championship

`tracks/trackCatalog.ts` owns typed course IDs, sampled circuits, lightweight scene palettes and the ordered Sunshine Cup definition. Sugar Rush Valley is a new original, flat 11 m ribbon with a flowing chicane. The existing sampler, boundary controller, 12 gates and pursuit AI consume it unchanged. Rendering, course-selection SVGs, minimap bounds, finish sign and HUD labels derive from the active course. Decorative candy groves share the same instanced scene layout and stay clear of the road.

`race/CupSession.ts` owns only round index, the active RaceSession and immutable-by-contract result snapshots. It does not tick physics. A valid finish is accepted once only for its current race; `nextRound()` is guarded until results exist. New rounds create independent RaceSession/Simulation instances with the same stable racer identities and clear timing/abilities. Restart is allowed only before scoring the active round and preserves previous rounds. Totals sort by points, finishing-place countback and last-race place. As in Quick Race, trailing AI is classified by validated distance when the player finishes; no finish time is invented.

`App` installs the selected race at final review and keys the Canvas scene fragment and HUD by a scene generation while keeping the WebGL renderer alive. This disposes course geometry/textures/camera/opponent bindings at a track transition. Sky and fog attach directly to the scene, not a group. Keyboard, gamepad, audio and the existing phone host remain owned by App; held inputs are cleared/disarmed through the existing mode transition. Pause customization only swaps cosmetics; it never creates a race. Cup progress is session-only, while the existing versioned cosmetic/sound/mode/last-track preferences remain persistent. `CupResultsMenu` uses the existing keyboard/gamepad/focus lifecycle and displays per-round awards and championship totals.


## Milestone 3.8 — VS session options

`config/raceOptions.ts` owns `RaceOptions { laps: 1 | 3 | 5; difficulty: 'easy' | 'normal' | 'hard' }`, validation, labels and difficulty data. RaceSession copies/freezes an options snapshot at construction. It supplies the lap target to the existing `advanceRaceProgress` parameter and creates independent opponent profiles with target-speed offsets (Easy −3 m/s, Normal 0, Hard +1.5 m/s). The pursuit controller's curvature/traffic caps, catch-up limits, simulation and collider rules are untouched. Default construction has exactly the original Normal target speeds and three-lap finish rule; CupSession continues to use that default on every round.

VS setup adds `options` between track and ready. `raceFlowStore` owns draft `vsOptions`, the active options row and committed VS defaults; other mode launches always use default options. Arrow/WASD/controller directions switch rows vertically and values horizontally; Enter confirms to review. Native radio buttons expose both groups and selected values. Final review passes an independent options snapshot in RaceLaunch to the new RaceSession. Cosmetic-only pause editing cannot configure or replace an active race.

`config/vsPreferences.ts` stores only validated version-1 values under `turbo-kart-legends.vs-options.v1`, separate from existing menu/cosmetic schemas. App persists on VS start, never on draft navigation; storage denial retains committed defaults for the session with the existing notice. HUD/results use `race.options`, not editable menu values. Restart resets race progress while retaining options. Development HMR reloads on race-option/menu-store changes so stale store/runtime instances cannot survive a schema update.


## Wall/opponent collision maintenance

The wall scrape bug had two causes: a circular side clearance substantially wider than the kart, and a multiplicative 0.82 speed retention on every contact tick. Opponent circles also applied diagonal closing impulses during visibly clear side overtakes.

`kart/kartFootprint.ts` now defines one longitudinal capsule (1.2 m radius, 0.35 m center-segment half-length; total 2.4 × 3.1 m) for every kart, independent of cosmetic selections. The 1.8 m outer radius remains a conservative broad-phase/art envelope. Exact closest points between capsule segments supply opponent normals/depths, including parallel/crossing/coincident cases. The existing equal-mass impulse, hard-hit ability cancellation and bounded contact iterations remain.

`constrainKart` uses capsule support along the nearest road normal and resolves against the visible inner rail face. `sceneConfig.railCenterOffset` and `railWidth` generate both visual rail surfaces and the collision limit, including the existing 4 cm skin. Outward normal velocity is removed; tangential velocity is preserved. It no longer multiplies the whole velocity by a retention factor each scrape. Real wall projection still cancels charge/boost, and the planar constraint still applies during hops. Source road sampling, handling, AI pursuit, race/checkpoint rules and camera remain unchanged.

Regression tests independently sample disks along the complete capsule to verify rail containment on both tracks. A development-only collision-preview line selector feeds offsets into the existing pursuit-input QA fixture; it never changes positions or race state directly. HMR reloads collision/config modules to avoid retaining older controllers during development.

## Model performance and per-cockpit fitting

The registry distinguishes generated runtime `url` from preserved `sourceUrl`. `scripts/optimize-assets.mjs` performs bounded topology reduction/vertex compaction offline and records source hashes plus triangle/error budgets. Runtime still uses the same cached GLB loader and independent scene/skeleton clones. `paletteBatch` converts only compatible opaque untextured static parts to shared PBR materials with linear vertex colors; template preparation releases replaced intermediate geometry after merging. Skins, maps, morphs and transparent parts remain outside that batching path.

`driverFitOptions` converts each kart's decorative steering-grip target into the driver's existing seat coordinates and configures its static fitting. `poseRegions` can protect complete connected islands (welded across position-identical UV seams) from deformation, preventing Arnold's head/neck/headphone parts from being stretched by an arm-region mask. No high-frequency geometry changes, simulation ownership, new animation clips, physics shapes or camera changes are involved. See docs/PERFORMANCE_AND_DRIVER_POLISH.md.


## First Milestone 4 item slice

`config/itemConfig.ts` centralizes pickup rows/lanes, respawn, bolt, stun/immunity and pool budgets. `items/ItemSystem.ts` owns pure fixed-step inventory, timers, projectiles, bounded events and AI firing decisions. `items/itemCollision.ts` performs swept circle/capsule and sampled-rail queries against existing track/collider data. RaceSession owns one ItemSystem, buffers human item edges until a fixed tick, passes the same normalized action for AI, and ticks items after existing movement, contact and progress processing. Hits change speed and cancel abilities at this orchestration layer; kart movement, AI navigation, lap gates, camera and collider sizes remain unchanged. Finished racers cannot collect or be hit. Pause disarms held use and freezes item time. Reset/recovery clears the appropriate scope.

`KartInput.useItem` is optional for older fixtures/phone clients; current adapters emit booleans. Keyboard and phone touch taps latch until sampled, the HUD uses ActionInput, and RaceSession retains sub-tick pulses. One rising edge consumes one item. Phone protocol v1 accepts an omitted legacy field, validates supplied booleans, whitelists the new action through the relay and includes it in neutral arming/watchdog behavior. Host game state advertises itemsEnabled so the phone enables ITEM only in an active CPU race.

`render/ItemVisuals.tsx` loads the preserved-credit optimized GLB through the existing loader/cache. Seven instanced parts share immutable template buffers across nine boxes, normalized around the core to 1.15 m. Frustum checks skip off-camera pickups; no pickup shadows or per-frame geometry/material allocation. Suspense/error fallback remains a procedural pickup. Bolt/trail/ring/slowdown effects use bounded instanced pools. ItemHUD takes small snapshots at 10 Hz and synthesized audio consumes bounded events once, respecting mute/pause. Simulation never depends on imported model bounds or renderer state. See docs/MILESTONE_4.md.


## Banana Trap and supplied projectile visuals

The two-item registry configures per-box rewards and decorative models separately from simulation shapes. ItemSystem adds bounded ground traps, safe backward placement, arming, owner grace, expiration, swept capsule contact and shared slowdown/immunity. Its existing shouldFire action chooses forward targets for bolts and trailing targets for traps; RaceSession and AI navigation do not need another input path. Three boxes give traps and six give bolts per course, using deterministic row/column data.

CombatModels batches each supplied model with the existing loader/material cache; combatModelParts derives normalization and exporter transforms into per-part matrices. Independent matrices share immutable buffers/materials. Banana removes one exact duplicate node only from the prepared clone and aligns its bottom at ground level. Hutt ball centers at the unchanged 0.44 m projectile envelope. Each has a separate Suspense/error fallback. Trap rings and existing trails/effects remain bounded instance pools; item timers freeze with the existing fixed race clock. See docs/MILESTONE_4_ITEMS.md.


## Bubble Guard

ItemSlot adds shieldRemaining on the same fixed item clock. Activation consumes the held item, sets five seconds and emits a bounded guard event. Existing immunity is checked first in the shared hit path; otherwise an active guard absorbs exactly one bolt/trap and emits guard-break without mutating kart state or granting extra immunity. Expiry emits once. Recovery/reset creates an empty slot, and pause uses existing disarming/clock behavior. Guard protection and held inventory are independent; an active guard cannot be refreshed by a second held guard. At the guard milestone pickups provided three rewards of each type; the balance follow-up below supersedes that assignment.

ItemSystem's defensive AI query predicts a short relative projectile sweep or a ground trap contact along current kart velocity. It submits the same useItem action as before, without steering or changing speed targets. CombatModelId now distinguishes supplied model IDs from all ItemIds; Bubble Guard is original procedural geometry, not an invented GLB. BubbleGuardVisuals reads interpolated poses into bounded instanced bubble/rim/pop pools. HUD snapshots show protection/countdown separately from the held item. Audio consumes guard activation/break/expiry events through the existing mute/pause cursor. No protocol, physics/collider, camera or race rule changes. See docs/BUBBLE_GUARD.md.


## Position-weighted items and recovery balance

`config/itemBalance.ts` centralizes item-only weights, use/reaction delays and repeat-hit tuning. `items/itemRewards.ts` chooses from validated standings at the instant of collection using independent seeded per-racer xorshift streams. Boxes own location/respawn only; they no longer have assigned rewards. New browser setup creates a crypto seed outside simulation; RaceSession accepts optional ItemSystemOptions, and CupSession derives each round from one seed. Restart reinitializes the same seed; individual recovery clears inventory/history without rewinding its reward stream.

`items/itemAI.ts` evaluates the actual straight bolt trajectory against projected moving capsules and rails, predicts trap contact after arming, and predicts defensive threats. Delayed moving-pack guard preparation prevents an all-guard opening from keeping every inventory occupied. It produces only the existing useItem boolean. No navigation, steering, pace or homing changes are involved.

ItemSlot tracks a six-second damaging-hit window, mild repeat slowdown limits, inventory cooldown and heldSince. Immunity is checked before guard/damage; ignored attacks never refresh protection. HUD snapshots expose the recovery countdown at 10 Hz; four pooled gold ground rings follow interpolated poses with no new collider, shadow or light. See docs/ITEM_BALANCE.md.


## Time Trial records and visual replay

`timeTrial/TrialRun` is a pure observer owned by RaceSession. Start initializes a sample at GO time zero; fixed ticks observe existing poses and validated progress after race bookkeeping. It stores 10 Hz quantized poses and an exact fractional-finish sample, bounded to 15 minutes. Recovery, non-finite/teleported observations and recording overflow invalidate record eligibility without altering race behavior. It never writes movement/progress. Existing timing includes the grid-to-start interval in the first lap and remains unchanged.

`trialRules` fingerprints sampled track/width/start, lap count, current handling/drift/boost settings, fixed step, checkpoint/sweep/grid and rail-face tuning plus a policy version. `TrialRecords` is a browser adapter outside the fixed loop, with one versioned localStorage record per track. It validates timing metadata and bounded finite monotonic samples, discards incompatible records, salvages valid times if a replay is corrupt and falls back to timing-only or session memory on quota/denial. Best lap and full-race records update independently on a clean completed attempt; only a new race best replaces the ghost. Setup freezes the previous reference for that attempt; finish commits once; retry uses the latest record.

`ghostPlayback` binary-searches time for pose interpolation, wrapping heading across its seam. It compares validated multi-lap distance to the ghost's first arrival at matching progress; delta is player time minus reference time, so negative is ahead. Reverse/stationary segments keep monotonic furthest-progress samples. `TimeTrialGhost` reads interpolated render time and owns only a small original cyan hologram with one shared translucent material, no collider, simulation, GLB clone, shadow, audio or item effects. Near-player opacity is reduced. The HUD updates at 10 Hz and its ghost visibility checkbox does not disable comparison or recording. Records appear in Time Trial track/review screens and the existing results/retry flow. See docs/TIME_TRIAL_RECORDS.md.


## Frostbite Peak content extension

`tracks/frostbitePeak.ts` supplies the third original loop to the existing sampler. Its catalog theme selects winter rendering; no simulation or camera changes are required. `frostbiteScenery.ts` centralizes tunnel outlines/locations, mountain clearance and snowbank layout. `render/alpineGeometry.ts` builds open, closed-shell tunnel meshes from the same road samples. `AlpineScenery.tsx` renders those meshes, signs and instanced mountains/snowbanks. Forest prop exclusion prevents trees intersecting the tunnels. These meshes are cosmetic; the existing shared road rail boundaries remain the collision authority.

Menu course/round counts and cup maximum points derive from `trackCatalog`, `sunshineCup.tracks` and `cupPoints`. CupSession still wraps the same RaceSession instances; its definition now lists Sunshine → Sugar → Frostbite. The existing parameterized track/collision/race/options/item/Time Trial tests automatically exercise the added course. Frostbite-specific tests cover menu selection, geometry budgets and tunnel camera/rail clearance. See docs/FROSTBITE_PEAK.md.


## Race-finish presentation

`ui/results/resultsPresentation.ts` projects existing RaceSession standings or CupSession snapshots/totals into immutable cosmetic podium entries. AI appearance uses the same opponentSelections mapping as gameplay. Unfinished AI retains null finish time; fourth-place players do not displace a rival on the podium. Time Trial record badges/cues use the already committed eligible TrialOutcome. No simulation, classification, scoring or persistence rules change.

`ResultsShell` shares the dialog, responsive two-column layout, podium labels and replay/next-round/Home controls across ResultsMenu and CupResultsMenu. It reuses keyboard/gamepad navigation and focus trapping and disables navigation while another panel is open. PodiumScene is lazy-loaded, independently clones the existing assemblies and never receives a Simulation. The background game renderer is suspended during results. Podium rise/turntable/confetti settle after 5.5 seconds in a demand-rendered canvas (DPR ≤1.25, no shadow pass). Reduced-motion users get a static stage and hidden tabs stop invalidation. Source drivers remain static/unrigged; only explicitly mapped compatible future victory clips may play. Per-model and canvas fallbacks keep the result actions usable.

DrivingAudio owns a separate quiet celebration bus with short original scheduled motifs. App triggers it once after records/scores commit and the existing results transition silences driving audio. Natural completion, mute, blur/visibility loss, restart/Home and dispose disconnect celebration nodes; unmute never replays a cue. Development-only results-preview uses explicitly marked fixtures and writes no records. See docs/RACE_FINISH_POLISH.md.


## Volcano Sprint content extension

`tracks/volcanoSprint.ts` feeds a fourth original loop into the unchanged sampler. Its catalog theme enables the volcanic environment. `volcanoScenery.ts` owns deterministic, bounded lava-pool, crater-peak and basalt-column layouts, using conservative envelopes against nearest sampled road segments. `VolcanicScenery.tsx` renders those layouts in instanced batches; `volcanoGeometry.ts` builds slender lava seams on the actual nine-sided cliff faces. There is no new scenery collider, light, downloaded texture or surface/damage simulation. The original road rails remain authoritative. Course-map ellipses reuse the same lava-pool positions.

The cup definition now appends Volcano Sprint. Existing CupSession scoring, round transitions and results/podium countback are unchanged; maximum points and all four-course menu labels derive from the registry. Catalog-parameterized geometry, collision, CPU/VS, combat, Time Trial ghost and full-cup integrations cover the added course. Content-specific tests verify selection/persistence, visible lava/cliff clearance, finite geometry and fixed rendering budgets. See docs/VOLCANO_SPRINT.md.


## Turbo Charge item integration

`items/turboCharge.ts` supplies activation eligibility and a pure state grant using the existing `boostTiers` Flare entry. ItemSystem consumes the normal rising-edge item action, cancels charging without payout, grants the configured tier/duration and increments `boostSerial`. Movement, expiry, braking, contact cancellation, exhaust VFX and synthesized sound remain owned by the original kart/drift/render paths. No second speed integration or additional collider is introduced. `ItemSlot.turboRemaining` only observes the granted duration and current boost; it never drives movement or reinstates canceled boosts. It freezes with the existing item clock, clears immediately on damage/observed cancellation/finish, and resets with inventory/recovery. Shield time remains independent.

The fourth reward uses the existing per-racer seeded weighted picker. Conservative AI timing rejects drift/hop/sharp turns, any active boost, an intersecting projected rail envelope and projected kart traffic. It submits only the existing `useItem` boolean; human activation applies the same minimum forward speed, brake, slowdown and stacking checks. UI adds a vector canister/chevron icon and 10 Hz countdown without new textures, geometry pools, lights or socket events. `stats.turbos` and reward totals extend existing diagnostics. See docs/TURBO_CHARGE.md.


## Home showroom design pass

`MainMenuScreen` retains raceFlowStore and the navigation hook. Home now uses `HomeScene` / `HomeScenery`: a fullscreen scissored view in the existing demand-rendered menu Canvas, with an independent selected KartAssembly parked on an original decorative coastal road. The scene has no runtime, collider or race ownership. An assembly-bounds fit places its lowest visible point on the road without changing registry/gameplay transforms. A narrow-screen media-query subscription selects a closer camera and an inline view; it cleans up on unmount. The shared Canvas enables one 1024-square shadow map on Home only. Model loading/error/retry stays isolated from scenery; road geometry is memoized and disposed. Existing SelectionPreview/SelectionModel remain available for setup, unchanged by the coastal pass. Home's palette/layout are scoped in home.css. Setup, settings, HUD and results styling migrate separately. See docs/DESIGN_ROLLOUT.md.


## Coastal selection visual pass

Racer/Kart steps opt into `RaceFlowShell`'s coastal skin and quiet header. `CoastalSelectionPreview` shares HomeScene's background view, independent source-pose portrait or seated assembly, road fit and model loading/retry path. Its background view renders before the unchanged thumbnail views in the same demand-rendered Canvas. A scene-only tint protects menu contrast without darkening thumbnails; CSS layers card borders/names and action buttons above it. Fade-only section transitions preserve the fullscreen fixed view's containing block. The existing three-column grid and raceFlowStore still own navigation/drafts/back/confirm/persistence; no simulation or race state is introduced. The remaining setup steps now share this skin as described below. See docs/DESIGN_ROLLOUT.md.


## Coastal track/options/review pass

All RaceSetupScreen steps opt into the same coastal shell and quiet header. Track, cup and options render HomeScene with `showSubject=false` behind DOM maps, avoiding an unnecessary GLB assembly. Its narrow fullscreen background uses a uniform readability tint; inline racer/kart previews keep their clear lighting. CourseMap still consumes sampled track geometry, and ordered cup tiles consume sunshineCup.tracks. The review projects existing draft values without creating new state; the existing launch/commit callback is unchanged. Existing Time Trial record summaries and VS row navigation remain. `coastalSetup.css` scopes the presentation and allows long content to scroll with actions in normal layout flow. No simulation/race/camera logic changed.

## Racer presentation consistency

`racerStyle.ts` owns inspected crown/pelvis references, common portrait/seated heights and matte surface constants. Registry scales derive uniformly from those references. `racerPresentation.ts` fits portrait bounds and modifies only runtime material clones. `modelInstances` caches source/matte variants independently; `driverFitOptions` opts seated assemblies into that profile. Player/AI/menu/podium assemblies retain the same parent transforms and hand targets. No cosmetic measurement feeds a collider or simulation value. See docs/RACER_STYLE.md for verification and artist-work limits.

## Race grid asset barrier

`GameCanvas` owns a `RaceAssetLoading` store for its actual player/CPU lineup. Committed KartVisual assemblies report ready; loading draws no kart, and only actual errors use the procedural fallback. A hidden Canvas plus a DOM loading portal prevents partial grids from becoming visible. GameLoop holds the existing clock/inputs/audio until settlement and drops the first ready delta; `runtime.assetsReady` gates human driving/reset. Paired preloading uses KartAssembly's exact useGLTF key. No simulation rule or camera tuning changes. See docs/RACE_ASSET_LOADING.md.

### Minimal gameplay HUD

`HUD.tsx`, `RaceHUD.tsx` and `ItemHUD.tsx` read existing runtime snapshots at 10 Hz; DOM refs handle speed, minimap markers and the conditional drift ribbon. All intervals clean up on unmount. `styles/hud.css` owns the floating corner layout and responsive spacing; `styles/items.css` styles the single held-item tile and active duration/status feedback. The minimap still uses the simulation's sampled course. `RaceDetails` displays a paused snapshot, including complete Time Trial records/ghost controls, while the active Time Trial view uses its compact comparison variant. App supplies the existing sound/controller/phone actions to PauseMenu instead of a permanent in-race toolbar. Item clicks still submit ActionInput, and Pause/recovery retain their existing handlers. This layer has no simulation, collider, camera or asset-loading ownership. See docs/GAMEPLAY_HUD.md.

### Rigged static racer fitting

Sonic occupies the retired Aang registry slot with its own `sonic` ID. `loadSelection` migrates version-1 `aang` selections before validating the complete kart/racer pair. The preserved source's 0.01-unit export is normalized in the offline derivative using an enclosing 100× scene wrapper; existing nodes, skin indices, inverse binds and images are retained. `RigSeatDefinition` stores inspected joints and fit targets. `driverFitOptions` maps each kart's existing wheel grip into driver space; `rigSeatPose.ts` sets a static seated pose on cloned joints, shifts the full skin/mesh assembly to the pelvis mount, then refreshes bounds. Templates remain per-fit and immutable; each actor receives independent bones via SkeletonUtils. Portraits retain the original standing pose, shared height and matte profile. There are zero supplied Sonic clips and no runtime IK/animation claim. Preview transform edits recompute grip targets; raw racer inspection normalizes portrait height. No physics or collider is derived from this rig. See docs/SONIC_INTEGRATION.md.

The latest SpongeBob retains the `spongebob` ID and uses 25 unrigged meshes. Its derivative adds a 0.01 unit wrapper and caps embedded images to 1024 pixels; source nodes, materials, UVs and geometry remain. `scripts/glb-textures.mjs` uses macOS sips only during offline regeneration; normal builds use checked-in derivatives. `StaticPoseDefinition.origin` centers the source, with explicit `armMeshes` / `legMeshes` leaving face/torso/clothing fixed. Static arm fitting uses inspected rest directions, supporting the supplied angled pose; posed indexed meshes refresh tangents for correct normal-map shading. The shared matte profile disables emissive glow. `driverFitOptions` still derives per-kart wrist targets, and the same immutable-template/independent-object assembly serves menus, player, AI and podiums. All supplied SpongeBob sources remain archived in place; the Boat Kart and gameplay rules are unchanged. See docs/SPONGEBOB_REPLACEMENT.md.

## Racer face-card presentation

Racer Select additionally reads optional `DriverAssetDefinition.portrait` artwork/crop settings. `SelectionCard` renders the supplied JPEG as decorative DOM artwork inside the existing radio button, falling back to its model thumbnail on image failure. Normal racer cards add no Drei Views; the selected live GLB still uses the shared renderer. `RaceFlowShell.data-flow-step` scopes `racerCards.css` to the racer step. `CoastalSelectionPreview` chooses `HomeScene.scenery='terrace'` only for racers: the same coast/lights surround a raised display plinth with a separate menu camera framing. Default road scenery and gameplay camera/physics remain unchanged. Race-flow state, indices, input and final profile commit are unchanged. See docs/RACER_FACE_CARDS.md.

Menu subject placement uses `placePreviewOnFloor` after skin-aware matrix synchronization. `updateWorldMatrix` alone leaves attached-skin inverse bind matrices stale, so it must not be used to measure a skinned portrait before its first render. Portrait normalization likewise refreshes the cloned hierarchy with `updateMatrixWorld(true)`. This prevents Sonic's feet from being grounded using pre-render bounds, without changing source geometry, rig poses, or gameplay transforms. The real-asset floor/idempotence regression and fresh-load browser capture are recorded in docs/RACER_FACE_CARDS.md.

Kart Select reuses the artwork-card path through `KartAssetDefinition.artwork` and the shared `SelectionArtwork` type. `SelectionCard` selects driver portraits or kart artwork, with the same GLB fallback. Generic `data-artwork` / `--artwork-*` styling preserves Racer Select; `kartCards.css` frames full kart silhouettes over teal glass. `selectionGridColumns` supplies three racer columns or two kart columns to both menu stores and the CSS grid variable. This changes menu navigation to match the 2×2 collection, without changing IDs, final selection commit, simulation or physics. The live seated assembly and road stay intact. See docs/KART_IMAGE_CARDS.md.

Racer preview rotation is menu-local `PreviewRotation` state, owned by the keyed `CoastalSelectionPreview`. A transparent `RacerRotationSurface` handles captured primary Pointer Events (mouse/touch), cancellation/lifecycle cleanup and an accessible keyboard slider. Only that small DOM control subscribes to its angle; the GLB subject subscribes to invalidate the demand canvas and reads yaw in `useFrame`. Camera, scenery, model cache/source rig and game simulation remain independent. The existing navigation hook yields directional keys only when the rotation control is focused, retaining global confirm/back. Studio portrait paths/crops remain registry data; racer identity stays on the cards and accessible preview labels, without a separate racer name panel. Kart Select retains its name panel. See docs/RACER_PREVIEW_ROTATION.md.

## Shared action buttons





`ui/GameButton.tsx` wraps a native button, forwarding existing handlers/ARIA/navigation attributes and defaulting to `type="button"`. `styles/buttons.css` owns accent/quiet/surface variants and tactile interaction states. Home mode choices keep their existing roving-navigation component with matching faces in home.css. Selection cards and touch-driving pads retain their own layouts. This presentation layer has no store, simulation, input or asset-loading ownership. See docs/DESIGN_ROLLOUT.md.

## Sunshine surface and track features

Optional `TrackDefinition.rises` and `features` add a shared pure height surface and swept directional track triggers, used only by Sunshine Circuit. Road/rails/checkpoint decorations, reset, grounded drift/hop checks, vertical landing, items and cosmetic kart pitch read that surface. Planar handling, capsule dimensions, navigation and race validation keep their owners. Turbo pads grant the existing Surge state plus a capped entry kick; the roller lip grants a ballistic impulse. Feature definitions/tuning invalidate obsolete Sunshine replay fingerprints without changing other courses' record inputs. Coastal scenery/dashes use static instancing and a small generated asphalt texture; additional FOV response is Sunshine-only and honors reduced motion. See docs/SUNSHINE_CIRCUIT_UPGRADE.md.

## Supplied Sunshine environment models

`environmentAssets` and `sunshineAssetLayout` own source-relative fitting, curated placements and conservative rail clearance. `environmentModel` bakes/merges immutable static buffers by material; `SunshineAssetScenery` instances them with per-view distance/frustum compaction and fixed-source-envelope tree LODs. Seven registry-derived environment slots join the existing race readiness barrier; errors omit scenery and settle independently of racer fallbacks. No scenery owns simulation or colliders. Offline derivatives/credits and quality results are in docs/SUNSHINE_ENVIRONMENT_ASSETS.md.

Sunshine house/cactus placements share the existing static material-batch pipeline. `sunshineServiceAreas` keeps both relocated pump transforms and their paved supports in agreement. Source-envelope reservations separate houses, cactus gardens, trees and viewing areas; no decorative bounds become gameplay colliders.

## Sunshine road paint and scenery variety

`surfacePaint` builds static material batches in course-distance/lateral coordinates using interpolated rendered ribbon edges/heights. `featurePaint` reads existing triggers, dresses turbo strips and the roller approach, and never writes simulation state. Dashes reserve feature/start gaps. The eight-asset registry supplies nine readiness slots; mixed houses and the complete western service station reuse static instancing/source-envelope spacing, with per-area asset/yaw/paving definitions. See docs/SUNSHINE_ROAD_POLISH.md.
