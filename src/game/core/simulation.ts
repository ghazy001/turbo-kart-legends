import { kartConfig } from '../config/kartConfig';
import { constrainKart } from '../kart/kartCollision';
import { moveKart, wrapAngle } from '../kart/kartController';
import { nearestRoadPoint } from '../tracks/trackSampling';
import { FixedStepClock } from './fixedStep';
import type { KartInput, KartState, SampledTrack } from './types';

export function createKart(track: SampledTrack): KartState {
  return { ...track.spawn, forwardSpeed: 0, lateralSpeed: 0, yawRate: 0, wheelSpin: 0, steering: 0 };
}

export function stepKart(state: KartState, input: KartInput, dt: number, track: SampledTrack): KartState {
  if (!Number.isFinite(state.x + state.z + state.heading + state.forwardSpeed + state.lateralSpeed)
    || nearestRoadPoint(track, state).distance > kartConfig.recoveryDistance) return createKart(track);
  return constrainKart(moveKart(state, input, dt), track);
}

export class Simulation {
  current: KartState;
  previous: KartState;
  readonly pose: KartState;
  readonly clock = new FixedStepClock();
  revision = 0;

  constructor(readonly track: SampledTrack) {
    this.current = createKart(track);
    this.previous = { ...this.current };
    this.pose = { ...this.current };
  }

  reset(): void {
    this.current = createKart(this.track);
    this.previous = { ...this.current };
    Object.assign(this.pose, this.current);
    this.clock.reset();
    this.revision++;
  }

  advance(delta: number, input: KartInput, playing: boolean): void {
    if (!playing) { this.clock.reset(); return; }
    const alpha = this.clock.advance(delta, dt => {
      this.previous = this.current;
      this.current = stepKart(this.current, input, dt, this.track);
    });
    const a = this.previous;
    const b = this.current;
    Object.assign(this.pose, b, {
      x: a.x + (b.x - a.x) * alpha, z: a.z + (b.z - a.z) * alpha,
      heading: a.heading + wrapAngle(b.heading - a.heading) * alpha,
      wheelSpin: a.wheelSpin + (b.wheelSpin - a.wheelSpin) * alpha,
    });
  }
}
