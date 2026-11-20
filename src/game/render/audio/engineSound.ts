import { engineAudioConfig as config } from '../../config/engineAudioConfig';
import { kartConfig } from '../../config/kartConfig';
import type { KartInput, KartState } from '../../core/types';

const unit = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
/** One seamless original combustion-like cycle with a rounded, harmonic-rich pressure pulse. */
export function engineCycleSample(phase: number): number {
  const angle = phase * Math.PI * 2;
  return Math.tanh(1.6 * (Math.sin(angle) + 0.4 * Math.sin(angle * 2 + 0.15) + 0.18 * Math.sin(angle * 3) + 0.08 * Math.sin(angle * 6))) * 0.68;
}

/** Observe real speed and normalized human input; never write simulation state. */
export function engineSoundTargets(state: KartState, input: KartInput) {
  const speed = unit(Math.abs(state.forwardSpeed) / kartConfig.maxForwardSpeed);
  const throttle = unit(input.throttle), brake = unit(input.brake);
  const load = state.forwardSpeed < -0.25 ? brake * (1 - throttle)
    : state.forwardSpeed > 0.25 ? throttle * (1 - brake) : Math.max(throttle, brake) * (1 - Math.min(throttle, brake));
  const boost = state.boostRemaining > 0 ? 1 : 0;
  return {
    frequency: config.idleHz + Math.pow(speed, 0.68) * config.speedHz + load * config.throttleHz + boost * config.boostHz,
    gain: config.idleGain + speed * config.speedGain + load * config.throttleGain + boost * config.boostGain,
    cutoff: config.idleCutoff + speed * config.speedCutoff + load * config.throttleCutoff + boost * config.boostCutoff,
  };
}
