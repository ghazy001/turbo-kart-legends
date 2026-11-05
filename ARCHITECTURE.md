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
