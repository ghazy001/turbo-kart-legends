import { NEUTRAL_INPUT, type KartInput } from '../core/types';
import { combineInputs } from './gamepad';
export interface InputSource { sample(): KartInput; clear(): void }
/** Keyboard steering wins, then gamepad, then phone. Brake remains available from every source. */
export function mixHumanInputs(keyboard: KartInput = NEUTRAL_INPUT, gamepad: KartInput = NEUTRAL_INPUT, phone: KartInput = NEUTRAL_INPUT, ui: KartInput = NEUTRAL_INPUT): KartInput {
  return combineInputs(combineInputs(combineInputs(keyboard, gamepad), phone), ui);
}
