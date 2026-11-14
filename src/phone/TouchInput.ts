import { NEUTRAL_INPUT, type KartInput } from '../game/core/types';
export type TouchAction = 'throttle' | 'brake' | 'drift' | 'useItem';
export class TouchInput {
  private holds: Record<TouchAction, Set<number>> = { throttle: new Set(), brake: new Set(), drift: new Set(), useItem: new Set() };
  private itemPending = false;
  private steeringPointer: number | null = null;
  steer = 0;
  button(action: TouchAction, pointer: number, down: boolean) { if (down) { this.holds[action].add(pointer); if (action === 'useItem') this.itemPending = true; } else this.holds[action].delete(pointer); }
  steering(pointer: number, value: number, begin = false) { if (begin) this.steeringPointer = pointer; if (this.steeringPointer === pointer) this.steer = Math.max(-1, Math.min(1, value)); }
  releaseSteering(pointer: number) { if (this.steeringPointer === pointer) { this.steer = 0; this.steeringPointer = null; } }
  sample(): KartInput { const useItem = this.itemPending || this.holds.useItem.size > 0; this.itemPending = false; return { useItem, throttle: Number(this.holds.throttle.size > 0), brake: Number(this.holds.brake.size > 0), drift: this.holds.drift.size > 0, steer: this.steer }; }
  clear() { this.itemPending = false; for (const holds of Object.values(this.holds)) holds.clear(); this.steer = NEUTRAL_INPUT.steer; this.steeringPointer = null; }
}
