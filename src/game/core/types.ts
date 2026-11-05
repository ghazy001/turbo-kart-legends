export interface Vec2 { x: number; z: number }

/** Positive steer turns right. Forward is +Z at heading zero. */
export interface KartInput { throttle: number; brake: number; steer: number }
export const NEUTRAL_INPUT: Readonly<KartInput> = { throttle: 0, brake: 0, steer: 0 };

export interface KartState extends Vec2 {
  heading: number;
  forwardSpeed: number;
  lateralSpeed: number;
  yawRate: number;
  wheelSpin: number;
  steering: number;
}

export interface TrackDefinition {
  id: string;
  name: string;
  closed: true;
  roadWidth: number;
  points: readonly Vec2[];
}

export interface TrackSample extends Vec2 { tx: number; tz: number; distance: number }
export interface SampledTrack {
  definition: TrackDefinition;
  samples: readonly TrackSample[];
  length: number;
  spawn: Vec2 & { heading: number };
}

export type GameMode = 'menu' | 'playing' | 'paused';
