import { kartConfig } from '../config/kartConfig';
import { driftConfig } from '../config/driftConfig';
import { constrainKart } from '../kart/kartCollision';
import { moveKart, wrapAngle } from '../kart/kartController';
import { cancelDrift } from '../kart/driftController';
import { nearestRoadPoint } from '../tracks/trackSampling';
import { FixedStepClock } from './fixedStep';
import type { KartInput, KartState, SampledTrack } from './types';

export function createKart(track: SampledTrack): KartState {
  return { ...track.spawn, forwardSpeed: 0, lateralSpeed: 0, yawRate: 0, wheelSpin: 0, steering: 0,
    driftDirection: 0, driftCharge: 0, driftGrace: 0, driftHeld: false, actionCooldown: 0,
    boostRemaining: 0, boostTier: 0, boostSerial: 0,
    y: 0, verticalSpeed: 0, landingCompression: 0, jumpSerial: 0, landingSerial: 0,
  };
}

export function stepKart(state: KartState, input: KartInput, dt: number, track: SampledTrack): KartState {
  if (!Number.isFinite(state.x + state.z + state.heading + state.forwardSpeed + state.lateralSpeed + state.y + state.verticalSpeed)
    || nearestRoadPoint(track, state).distance > kartConfig.recoveryDistance) return createKart(track);
  const moved = moveKart(state, input, dt);
  const constrained = constrainKart(moved, track);
  return constrained === moved ? moved : {
    ...cancelDrift(constrained), boostRemaining: 0, boostTier: 0, actionCooldown: driftConfig.boostRecovery,
  };
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

  reset(spawn: Pick<KartState, 'x' | 'z' | 'heading'> = this.track.spawn): void {
    this.current = { ...createKart(this.track), ...spawn };
    this.previous = { ...this.current };
    Object.assign(this.pose, this.current);
    this.clock.reset();
    this.revision++;
  }

  cancelCharging(): void {
    this.current = { ...cancelDrift(this.current), driftHeld: false };
    this.previous = { ...this.current };
    Object.assign(this.pose, this.current);
  }

  step(dt: number, input: KartInput): void {
    this.previous = this.current;
    this.current = stepKart(this.current, input, dt, this.track);
  }

  advance(delta: number, input: KartInput, playing: boolean): void {
    if (!playing) { this.clock.reset(); return; }
    const alpha = this.clock.advance(delta, dt => this.step(dt, input));
    this.interpolate(alpha);
  }

  interpolate(alpha: number): void {
    const a = this.previous;
    const b = this.current;
    Object.assign(this.pose, b, {
      x: a.x + (b.x - a.x) * alpha, z: a.z + (b.z - a.z) * alpha,
      heading: a.heading + wrapAngle(b.heading - a.heading) * alpha,
      y: a.y + (b.y - a.y) * alpha,
      wheelSpin: a.wheelSpin + (b.wheelSpin - a.wheelSpin) * alpha,
    });
  }
}
