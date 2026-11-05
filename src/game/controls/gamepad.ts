import { NEUTRAL_INPUT, type KartInput } from '../core/types';

export interface PadSnapshot {
  id: string; index: number; connected: boolean; mapping: string;
  axes: readonly number[];
  buttons: readonly { value: number; pressed: boolean }[];
}
const deadzone = 0.18;
const button = (pad: PadSnapshot, index: number) => Math.max(0, Math.min(1, pad.buttons[index]?.value ?? 0));
const down = (pad: PadSnapshot, index: number) => pad.buttons[index]?.pressed ?? false;

export function sampleGamepad(pad: PadSnapshot | null): KartInput {
  if (!pad?.connected || pad.mapping !== 'standard') return { ...NEUTRAL_INPUT };
  const axis = Math.max(-1, Math.min(1, pad.axes[0] ?? 0));
  const steer = Math.abs(axis) <= deadzone ? 0 : Math.sign(axis) * (Math.abs(axis) - deadzone) / (1 - deadzone);
  return { throttle: button(pad, 7), brake: button(pad, 6),
    steer: steer || Number(down(pad, 15)) - Number(down(pad, 14)),
    drift: down(pad, 0) || down(pad, 5) };
}

export function combineInputs(keyboard: KartInput, gamepad: KartInput): KartInput {
  return { throttle: Math.max(keyboard.throttle, gamepad.throttle), brake: Math.max(keyboard.brake, gamepad.brake),
    steer: keyboard.steer || gamepad.steer, drift: keyboard.drift || gamepad.drift };
}

/** Only standard-mapped controllers are accepted. Held inputs must go neutral after pause/reset. */
export class GamepadController {
  connected = false;
  private identity = '';
  private pauseHeld = false;
  private resetHeld = false;
  private requireNeutral = true;
  private unavailable = false;

  constructor(private readonly read: () => readonly (PadSnapshot | null)[], private readonly options: {
    enabled: () => boolean; onPause: () => void; onReset: () => void; onDisconnect: () => void;
  }) {}

  clear(): void { this.requireNeutral = true; }

  poll(): KartInput {
    if (this.unavailable) return { ...NEUTRAL_INPUT };
    let pads: readonly (PadSnapshot | null)[];
    try { pads = this.read(); }
    catch (error) {
      this.unavailable = true;
      console.warn('Gamepad access is unavailable in this browser context.', error);
      return { ...NEUTRAL_INPUT };
    }
    const pad = pads.find(candidate => candidate?.connected && candidate.mapping === 'standard') ?? null;
    if (!pad) {
      if (this.connected) this.options.onDisconnect();
      this.connected = false; this.identity = ''; this.clear();
      this.pauseHeld = false; this.resetHeld = false;
      return { ...NEUTRAL_INPUT };
    }
    this.connected = true;
    const identity = `${pad.index}:${pad.id}`;
    if (this.identity !== identity) { this.identity = identity; this.clear(); }
    const pause = down(pad, 9);
    const reset = down(pad, 8);
    const newPause = pause && !this.pauseHeld;
    const newReset = reset && !this.resetHeld;
    this.pauseHeld = pause; this.resetHeld = reset;
    if (newPause) this.options.onPause();
    if (newReset && this.options.enabled()) this.options.onReset();
    const input = sampleGamepad(pad);
    if (this.requireNeutral) {
      if (input.throttle < 0.05 && input.brake < 0.05 && input.steer === 0 && !input.drift && !pause && !reset) this.requireNeutral = false;
      return { ...NEUTRAL_INPUT };
    }
    return this.options.enabled() ? input : { ...NEUTRAL_INPUT };
  }
}
