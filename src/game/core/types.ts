import type { RoadRise, TrackFeature } from '../tracks/trackSurface';

export interface Vec2 { x: number; z: number }

/** Positive steer turns right. Forward is +Z at heading zero.
 * `drift` is a retired v1 wire field: adapters emit false and simulation ignores it. */
export interface KartInput { throttle: number; brake: number; steer: number; drift: boolean; useItem?: boolean }
export const NEUTRAL_INPUT: Readonly<KartInput> = { throttle: 0, brake: 0, steer: 0, drift: false, useItem: false };
export type ChargeTier = 0 | 1 | 2 | 3;
export type DriftDirection = -1 | 0 | 1;

export interface KartState extends Vec2 {
  heading: number;
  forwardSpeed: number;
  lateralSpeed: number;
  yawRate: number;
  wheelSpin: number;
  steering: number;
  /** Retired snapshot fields; always cleared before movement, never used for handling. */
  driftDirection: DriftDirection;
  driftCharge: number;
  driftGrace: number;
  driftHeld: boolean;
  actionCooldown: number;
  boostRemaining: number;
  boostTier: ChargeTier;
  boostSerial: number;
  y: number;
  verticalSpeed: number;
  landingCompression: number;
  jumpSerial: number;
  landingSerial: number;
}

export interface TrackDefinition {
  id: string;
  name: string;
  closed: true;
  roadWidth: number;
  startDistance?: number;
  points: readonly Vec2[];
  rises?: readonly RoadRise[];
  features?: readonly TrackFeature[];
}

export interface TrackSample extends Vec2 { tx: number; tz: number; distance: number }
export interface SampledTrack {
  definition: TrackDefinition;
  samples: readonly TrackSample[];
  length: number;
  spawn: Vec2 & { heading: number };
}

export type GameMode = 'menu' | 'playing' | 'paused' | 'results';
