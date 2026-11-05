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
Countdown 3-2-1-GO, three-lap default, ordered checkpoint gates, correct lap validation, live position ranking, best lap, race results and reset-on-stuck logic. Progress is checkpoint-based and tracks arc-length distance, preventing skipped checkpoints or reverse-driving exploits. AI competitors begin with fair spacing and distinct skill profiles.

### Power-ups (Milestone 4)
Six original examples: Spark Bolt (straight projectile), Bubble Guard (temporary shield), Sticky Blob (track trap), Turbo Canister (speed burst), Magnet Pulse (short-range slowdown), Cloud Puff (temporary obscuring visual effect). Each item has duration, cooldown, hit rules and counterplay. Avoid directly copying another franchise's distinctive iconography or behavior tuning.

### Race modes
- Free Drive: Untimed learning environment.
- Time Trial: Solo, no random items, personal best and optional ghost later.
- Quick Race: One race versus AI.
- Grand Prix: Multi-track championship with standings.
- Online Rooms: Post-v1.0 update.

## 5. Tracks
1. **Sunshine Circuit** — tropical beginner track, wide curves, clear grass/road contrast, one tunnel and a short bridge. Prototype track in Milestone 1 is a simplified Sunshine Circuit.
2. **Sugar Rush Valley** — dessert-colored hills, giant sweets, gentle jumps and colorful shortcuts.
3. **Frostbite Peak** — snow banks, icy corners with lower grip and looping mountain roads.
4. **Volcano Sprint** — lava-lit hazards, tighter turns and dramatic set pieces.
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
