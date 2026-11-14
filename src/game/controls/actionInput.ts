import { NEUTRAL_INPUT, type KartInput } from '../core/types';
/** Accessible HUD clicks feed the same normalized action; RaceSession latches it until a tick. */
export class ActionInput {
  private pending = false;
  pressItem(): void { this.pending = true; }
  clear(): void { this.pending = false; }
  sample(): KartInput { const useItem = this.pending; this.pending = false; return { ...NEUTRAL_INPUT, useItem }; }
}
