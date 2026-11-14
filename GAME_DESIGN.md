# Turbo Kart Legends — Game Design Document
Version: 1.0 | Status: Preproduction | Target: Desktop browser, mobile later

## 1. Elevator pitch
Turbo Kart Legends is an original, colorful 3D arcade kart racer. Players race expressive drivers through whimsical worlds, master drifting and mini-turbo, exploit clever shortcuts, and use original power-ups. Its short sessions and competitive lap times encourage immediate replays.

## 2. Audience and product goals
- Audience: Casual arcade-racing players ages 10+, friends, and time-trial enthusiasts.
- Platform: Desktop WebGL first; touch/gamepad support later.
- Session: Approximately 3–5 minutes per race on short tracks, subject to playtesting.
- Primary success signal: Players voluntarily replay a race to improve their performance.
- Non-goal: Realistic vehicle simulation, open-world driving, licensed franchise characters or tracks.

## 3. Creative direction
- Visual: High-quality original cartoon arcade look with saturated warm colors, large clean silhouettes, playful props, chunky readable track borders, expressive characters, and strong lighting.
- Camera: Over-the-shoulder/chase view at a low-to-medium angle; smoothly follows the car and reveals the next corner.
- Style rules: Original assets and naming only. Do not recreate Mario, Nintendo logos, famous tracks, music, or branded items.
- Tone: Cheerful, competitive, slapstick, all-ages.
- Audio: Playful original music, motor pitch following speed, satisfying boost and lap stingers.

## 4. Core experience
### Core loop
Choose a racer and kart -> choose track/mode -> launch into countdown -> drive, drift, take shortcuts and use items -> finish -> view position/time/rewards -> retry, improve, or unlock cosmetic content.

### Controls (desktop target)
- W / Up: Accelerate
- S / Down: Brake / reverse when nearly stopped
- A / Left: Steer left
- D / Right: Steer right
- Space: Hold to drift (introduced Milestone 2)
- Shift / E: Use item (introduced Milestone 4)
- R: Reset kart to nearest safe track position
- Escape: Pause/resume
- C: Cycle camera (future)
Default controls are rebindable in a later milestone.

### Kart handling
The driving model is intentionally arcade-oriented rather than physically realistic. Speed and yaw responsiveness depend on speed, drift state and traction. The implementation uses a planar simulation state and physics queries/colliders for environment interactions. Tune acceleration, deceleration, steering curve, drag, lateral slip and collision response in a shared config.

Initial tuning targets (starting points, not final balancing):
- Simulation tick: 60 Hz
- Flat-road top speed: 20 game units/second
- 0–top speed: approximately 4 seconds
- Reverse max speed: 6 game units/second
- Track road width: 11 game units
- Lap: roughly 40–70 seconds after tuning
- Minor impacts reduce speed, not instantly stop the car

### Drift and boost system (Milestone 2)
Press/hold drift while steering and moving above a minimum speed. Kart slides more, yaw tightens, and a drift charge meter accumulates while the player maintains controlled steering. Releasing after charge triggers a timed mini-turbo. Three tiers have increasing charge thresholds and boost durations; values are data-driven. No drift reward if stationary or repeatedly spamming input.

### Race rules (Milestone 3)
Countdown 3-2-1-GO, three-lap default (VS optionally 1/3/5 laps with Easy/Normal/Hard CPU pace), ordered checkpoint gates, correct lap validation, live position ranking, best lap, race results and reset-on-stuck logic. Progress is checkpoint-based and tracks arc-length distance, preventing skipped checkpoints or reverse-driving exploits. AI competitors begin with fair spacing and distinct skill profiles.

### Power-ups (Milestone 4)
Six original examples: Spark Bolt (straight projectile), Bubble Guard (temporary shield), Sticky Blob (track trap), Turbo Canister (speed burst), Magnet Pulse (short-range slowdown), Cloud Puff (temporary obscuring visual effect). Each item has duration, cooldown, hit rules and counterplay. Avoid directly copying another franchise's distinctive iconography or behavior tuning.

### Race modes
- Free Drive: Untimed learning environment.
- Time Trial: Solo, no items; local personal-best lap/race and optional best-run ghost.
- Quick Race: One race versus AI.
- Grand Prix: Multi-track championship with standings.
- Online Rooms: Post-v1.0 update.

## 5. Tracks
1. **Sunshine Circuit** — tropical beginner track, wide curves, clear grass/road contrast, one tunnel and a short bridge. Prototype track in Milestone 1 is a simplified Sunshine Circuit.
2. **Sugar Rush Valley** — dessert-colored hills, giant sweets, gentle jumps and colorful shortcuts.
3. **Frostbite Peak** — implemented as a flat alpine loop with snowbanks, snow pines, distant peaks, two open glacier tunnels and flowing bends. It uses the same grip/handling as the other courses; lower-grip ice and elevated roads remain future ideas.
4. **Volcano Sprint** — implemented as a flat caldera loop with linked bends, basalt columns, dusk lighting and glowing scenic lava pools/crater seams. Lava stays beyond the solid rails and does not apply damage; no new surface or hazard rules.
Every course uses the same centerline + width + checkpoints + spawn markers track schema; no hard-coded scene-specific race rules.

## 6. Characters and karts
Start with an original neutral driver and one compact kart. Later expand to six distinct original drivers and six kart models, with visual identity separated from balanced stats. Proposed stat dimensions: speed, acceleration, handling, drift and recovery. No paid upgrades in initial scope.

## 7. AI competitors
Milestone 3 bots follow a sampled centerline with look-ahead steering, target speed by curvature, obstacle avoidance, overtaking offsets, rubber-banding constrained within fair limits, and stuck recovery. AI uses the same kart movement API as the player; it submits virtual controller inputs, not teleports.

## 8. HUD and accessibility
Milestone 1: speed readout, instructions, reset control, optional debug toggle. Later: place, lap, race timer, item slot, drift indicator, minimap, countdown, results. Design for keyboard users and readable contrast. Provide reduced camera shake and reduced particle effects options. Avoid relying on color alone for critical race signals.

## 9. Progression and persistence
LocalStorage for player settings and best laps initially; explicit versioned schema and fallback for bad data. Never store authoritative online race results in client storage when multiplayer is added. Cosmetic unlocks via play, subject to balancing.

## 10. Performance and quality targets
- Aim for smooth 60 FPS on a midrange desktop; degrade gracefully on weaker machines.
- Runtime scene should avoid allocations and React state updates on every physics tick.
- Use instancing and merged low-poly geometry where appropriate, limited shadow-casting lights, compressed textures and optimized GLB assets.
- Support reasonable browser window resizes and lost-focus pause behavior.
- Test Chrome and Firefox (and Safari where available).

## 11. Milestone 1 scope lock
**Included:** Vite/React/TypeScript project, 3D environment, one original primitive-based kart, closed road mesh, track-boundary collision, acceleration/braking/reverse/steering, smooth camera, reset, speed HUD, pause/help UI, config, tests, build and README.
**Excluded:** AI opponents, drifting boosts, weapons, countdown, lap scoring, persistence, networking, auth, database, mobile controls, asset marketplace imports.

## 12. Risks / mitigations
- Driving feels slippery: use custom movement controller with lateral damping and adjustable grip.
- Track mesh/collision mismatch: build both road visuals and boundary information from the same centerline samples.
- Camera nausea: damp position and rotation independently; cap FOV changes, no excessive roll.
- Scope creep: do not begin M2 until M1 acceptance criteria pass.
- Multiplayer rewrite: preserve renderer-independent simulation state and virtual input interface from day one.

## 13. IP and asset guidelines
Create original world/characters/sounds. Do not ship ripped Mario Kart assets, replicated recognizable tracks, Nintendo characters, logos or soundtrack. Track author/license info for third-party assets and fonts.


## Implemented M4 slice

The user authorized supplied item meshes as local prototype visuals. Spark Bolt is a straight projectile and Banana Trap is a dropped ground hazard. Hits briefly slow and cancel abilities, and immunity prevents repeated stacking. Bubble Guard now provides five seconds of one-hit item protection. Position-weighted rewards are now implemented for these three items; no homing is implemented. Only CPU race modes use items. See docs/MILESTONE_4.md for exact tuning, asset provenance and validation.


## M4 supplied-model follow-up

Banana Trap is now implemented as a ground hazard using the user's supplied mesh. All nine boxes now roll Spark Bolt (rendered with the supplied Hutt ball), Banana Trap or Bubble Guard from position weights at collection. Arming, owner grace, expiry, shared brief slowdown/immunity and hop counterplay keep combat inside the existing fixed-step item subsystem. This local prototype uses supplied franchise art with recorded metadata/permission; original release artwork remains future work. See docs/MILESTONE_4_ITEMS.md.


## Bubble Guard follow-up

The user's accepted defense item is now a five-second, one-hit guard. It absorbs one bolt or trap without canceling driving abilities and has a visible bubble/countdown. It is a consumable defense, not wall/contact immunity or a healing effect. Pickups now use the three-item position weights in docs/ITEM_BALANCE.md; human balance tuning remains open. See docs/BUBBLE_GUARD.md.


## Three-item balance follow-up

First-place rewards favor defense, last-place rewards favor straight bolts, and middle places retain a balanced mix. Every implemented item remains possible in every position. A 0.3 s AI reaction delay, predictive attacks and delayed pack defense improve timing without changing navigation. Standard item-hit immunity is 2.2 s; damaging hits within six seconds have milder slowdown and 3 s immunity. Ignored contacts do not extend protection. Gold rings and a HUD countdown make recovery readable. See docs/ITEM_BALANCE.md for exact weights, seed behavior and validation. This completes the accepted three-item balance slice, not the planned six-item set.


## Time Trial personal records

Clean completed Time Trials save per-track best race and best lap in this browser. The fastest complete run supplies a translucent original kart ghost on the next attempt. A signed live time comparison uses matching validated course progress: negative means ahead, positive means behind. The ghost has no contact or gameplay effects and can be hidden while comparison continues. Pause freezes replay; recovery makes the attempt practice-only and hides its ghost/comparison until restart. A full run must finish without recovery or recording interruption to replace records. The recorder caps at 15 minutes; longer races still finish as practice. No backend or online authority is implied. See docs/TIME_TRIAL_RECORDS.md.


## Third-course follow-up

Frostbite Peak introduced the third cup round (coast → candy valley → snowcap summit), and remains selectable for Quick Race, Time Trial and VS. The same 12 ordered checkpoints, boundaries, item pickups, AI and local Time Trial records work on its sampled road. Scenery stays outside the driving corridor and both tunnels leave room for the unchanged chase camera. No new surface physics, ramps or track-specific race rules were introduced. See docs/FROSTBITE_PEAK.md.


## Race-finish polish

Results now show the classified top three with their actual cosmetic kart/driver choices, a short stage reveal and original trophy/confetti for victories and championship finals. Time Trial has a solo finish stage and badges/cues for eligible personal bests; recovered attempts stay practice-only. Cup round results show the existing cumulative points and next-race action; the final podium uses championship totals/countback, even when the champion did not win the last round. Animation is procedural stage motion, not an authored character victory pose. Enter/Space confirms the focused action, arrows/WASD or gamepad navigate and Escape/Backspace returns Home. Reduced motion removes stage/confetti animation.


## Fourth-course follow-up

Volcano Sprint completes the first four-course set and extends Sunshine Cup to four races (coast → candy valley → snowcap summit → ember caldera). All courses share the same handling, grip, camera, ordered gates, CPU/item rules and Time Trial record system. Scenery envelopes keep lava, basalt and crater peaks clear of the driving corridor. See docs/VOLCANO_SPRINT.md.
