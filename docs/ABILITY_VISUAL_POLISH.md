# Ability visual polish — 2026-11-17

## Implemented

- **Bubble Guard:** original texture-free Fresnel shader, fine hexagonal energy lattice, soft traveling scan and three luminous partial orbit arcs. The center stays transparent enough to read the driver/road. The shell follows each racer's interpolated position, heading and jump height. Late-life color shifts toward violet without flashing. Activation has an expanding energy pulse; a protected hit emits larger crystalline shards; natural expiry dissolves more gently.
- **Spark Bolt:** the supplied ball remains intact, now surrounded by three rotating electric arcs and three tapered, segmented cyan/white filaments. Muzzle, rail impact, blocked contact and damaging hit have distinct event-sized pulses/fragments. Projectile physics and its actual 0.22 m radius are unchanged; the trail has no collision ownership.
- **Banana Trap:** the supplied model remains at its existing size. A tight amber ground halo gently settles as arming completes; placement emits a small pulse, and an actual hit uses the shared impact feedback. Recovery and slowdown remain distinguishable via the existing ground ring and orbiting shards.
- **Turbo / drift:** tapered wheel sparks, soft shader-driven tier-colored outer jets with pale cores, bright exhaust collars, a brief boost-start ring and restrained rearward speed ribbons. The existing three charge-tier colors are retained. Turbo Charge and track pads automatically use these effects through the existing boost state; no duplicate activation or movement logic was added.

All four racers use the same bounded presentation paths. Ability effects add no UI buttons, screen shake, camera changes, GLBs, textures, lights, shadows, bloom or dependencies. No gameplay, AI, controls, timers, damage, collider, reward, course or race logic was edited.

## Ownership / files

- `config/abilityVisualConfig.ts`: cosmetic palette, dimensions and pool sizes only; not imported by simulation.
- `render/BubbleGuardVisuals.tsx` and `render/effects/guardShader.ts`: two instanced shield draws, shared uniforms and independently colored shells.
- `render/CombatEffects.tsx`: bounded bolt filaments/arcs, trap/recovery halos and slowdown shards. Extracted from `ItemVisuals` to keep model loading separate from effects.
- `render/AbilityBursts.tsx` and `render/effects/abilityBursts.ts`: reusable fixed-capacity event sampler and two instanced burst draws. Every existing ItemEvent kind has a finite cosmetic envelope.
- `render/KartEffects.tsx` and `render/effects/jetShader.ts`: four instanced draws per kart, replacing the former separate cone meshes.
- `render/ItemVisuals.tsx`: composition only; original imported models, preparation, fallback and item gating remain intact.
- `tests/abilityEffects.test.ts`: expiration, bounded newest-event sampling, object reuse, invalid/future events, restart/rewind, pause, render-rate independence, source positions and reduced-motion phase behavior.

The item event pool is sampled from its authoritative simulation time. Pausing freezes it; empty/restarted lists cannot replay old bursts. Kart effects retain their pause-aware local presentation clock and reset on Simulation.revision, without touching simulation. Active shield/boost visibility comes directly from current ability state, so contact cancellation/recovery removes it immediately. All geometry/material creation happens at mount; each frame only updates existing transforms/colors/uniforms. R3F owns disposal on unmount.

`prefers-reduced-motion: reduce` is read live: shell scanning/pulsing/orbits stop, electric strands reduce from three to one, burst particles reduce to three with fixed spread, drift sparks reduce from 24 to eight, and turbo wake/start-ring travel is removed. Static active-state cues, countdowns and hits remain readable. No sensor or media-query listeners were added.

## Rendering budget

- At most **eight world-effect draws**, equal to the previous five combat + three guard pools: now four combat + two burst + two guard pools.
- At most **four draws per active kart**, previously five. No new shadow passes or texture memory for this pass.
- Fixed world capacities: four shells / 12 shield arcs; 108 bolt segments / 36 bolt arcs; 16 ground halos / 16 slowdown shards; 16 event rings / 80 fragments. Newest eight live events take priority; effects expire in at most 0.65 s.
- Per kart: 24 drift streaks, four layered jet instances, 12 wake streaks and at most three collars/start rings. Inactive pools have count zero.
- The higher-detail shield sphere is 40 × 24 segments and renders only while protected. Alpha depth writes are disabled and normal depth testing is retained; the shield uses its front face to limit overdraw. Small additive arcs/fragments provide brightness without full-screen effects.

These are bounded costs, not a cross-device FPS guarantee. Source scenery/driver meshes remain the larger rendering workload.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed, zero warnings.
- `npm run build`: passed after both final shaders were added; 801 modules, Vite 1.71 s after TypeScript validation. App chunk 289.82 kB / 94.03 kB gzip. No dependency changes.
- Focused ability/item regression run: **63 tests / four files passed** (including six new visual-sampling cases).
- Full regression suite: **497 / 497 tests across 42 files passed in 179.62 s**, using `/usr/bin/caffeinate -i npm run test` with the existing two-worker script and loopback permission for phone-relay fixtures. All existing assertions/timeouts remained unchanged. Coverage retains driving/drift/boost, wall/opponent contacts, four-course combat/AI/laps, cup/VS/Time Trial, input/phone, models and menu persistence.
- `git diff --check`: passed.

### Browser checks

An isolated in-app-browser tab used normal Home → Quick Race → Racer → Kart → Track → review/start navigation on Sunshine Circuit. The existing labeled `?race-preview&item-preview&item-reward=<id>&render-stats` fixture changes only rewards from actual collected boxes. Existing autodrive submitted normal KartInput; no inventory, poses, clock, progress or ability timers were injected.

- **Guard:** activated with keyboard E; the translucent lattice, independent arcs and HUD countdown were visible while driving. After Escape, race time remained **1:23.583** and protection **3.8 s** over separate observations. Capture: [active guard](ability-vfx-qa/guard-in-race.png).
- **Bolt:** actual player firing and AI attacks ran; the field reached **seven shots / seven damaging hits** at 0:49.367, with the normal slowdown/recovery indicators. The saved image shows impact feedback rather than a frozen projectile: [bolt impact](ability-vfx-qa/spark-in-race.png).
- **Turbo:** keyboard activation consumed the held item, displayed the original 1.5 s Flare/Turbo countdown, layered flowing jets/collars and thin rear wake; speed reached **101 km/h** through the existing controller. AI had used the same turbo/boost visuals. Capture: [active turbo](ability-vfx-qa/turbo-in-race.png).
- **Trap:** disabled autodrive and braked normally, then used the HUD action to place a real banana behind the stopped kart. The supplied mesh and tight amber halo appeared, inventory emptied and “Trap placed” confirmed. Field trap/hit counters continued advancing. Recovery with R returned the player to **0 km/h**, zero boost/jump serials and the existing temporary hit-protection state. Capture: [trap placement](ability-vfx-qa/trap-in-race.png).
- **Errors:** browser error logs were empty after guard, bolt, turbo and trap checks. Both custom shaders rendered successfully. The temporary QA tab was closed.

These were targeted partial-race visual checks, not a new full browser race or a physical controller test. Guard shatter/expiry envelopes are unit-tested; a new shield-block screenshot and reduced-motion browser emulation are not claimed. Existing automated races cover rules/AI/combat on all four courses.

### Observed rendering

The guard run included a moving sample at **139 calls / 699,869 triangles / 293 geometries / 65 textures, median 16.7 ms / p95 17.9 ms**. Later turbo/trap views varied roughly 20–32 ms median, with heavier source scenery/traffic, background work and browser scheduling. No controlled before/after GPU comparison was performed, and paused/loading/HMR measurements are not performance results. Texture count stayed at 65 across these loaded race views; the new effects themselves create **zero textures**. The pool/draw limits above are code-level budgets, not a guarantee of 60 FPS on every device.

## Future art work

A full bloom/postprocessing pipeline, authored particle textures, new ability models, new weapons and audio redesign are outside this pass. Physical mobile/gamepad checks, Firefox/Safari and lower-power GPU performance still need manual validation. Source-art licensing/rigging limitations in the existing asset reports remain unchanged.
