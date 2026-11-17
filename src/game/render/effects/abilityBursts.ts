import { abilityVisualConfig } from '../../config/abilityVisualConfig';
import type { ItemEvent } from '../../items/ItemSystem';

const { electric, ice, trap, impact, violet } = abilityVisualConfig.colors;
export const burstStyles = {
  pickup: { duration: 0.5, radius: 1.1, color: impact, height: 1.05 },
  fire: { duration: 0.26, radius: 0.7, color: electric, height: 0.8 },
  drop: { duration: 0.45, radius: 0.65, color: trap, height: 0.08 },
  hit: { duration: 0.55, radius: 1.8, color: impact, height: 0.8 },
  wall: { duration: 0.38, radius: 1.1, color: electric, height: 0.8 },
  blocked: { duration: 0.35, radius: 1.0, color: impact, height: 0.8 },
  guard: { duration: 0.55, radius: 2.0, color: ice, height: 1.2 },
  'guard-break': { duration: 0.6, radius: 2.6, color: ice, height: 1.2 },
  'guard-expire': { duration: 0.65, radius: 1.6, color: violet, height: 1.2 },
  turbo: { duration: 0.4, radius: 1.5, color: '#ffbd7a', height: 0.45 },
} satisfies Record<ItemEvent['kind'], { duration: number; radius: number; color: string; height: number }>;

export interface BurstSample { event: ItemEvent; progress: number; fade: number }

/** Stateless sampling into a fixed pool: pause, time rewind and restart cannot leave ghost particles. */
export class AbilityBurstPool {
  readonly slots: BurstSample[] = Array.from({ length: abilityVisualConfig.bursts.capacity }, () => ({ event: { id: -1, kind: 'pickup', time: 0, x: 0, z: 0, source: '' }, progress: 0, fade: 0 }));
  count = 0;
  sample(events: readonly ItemEvent[], time: number): void {
    this.count = 0;
    if (!Number.isFinite(time)) return;
    for (let i = events.length - 1; i >= 0 && this.count < this.slots.length; i--) {
      const event = events[i], duration = burstStyles[event.kind].duration, age = time - event.time;
      if (!Number.isFinite(age) || age < 0 || age >= duration) continue;
      const slot = this.slots[this.count++];
      slot.event = event; slot.progress = age / duration;
      slot.fade = (1 - slot.progress) ** 2;
    }
  }
}

/** Normalized particle phase independent of render rate; reduced motion freezes travel. */
export function particlePhase(time: number, index: number, count: number, speed: number, reduced: boolean): number {
  return ((reduced ? 0 : time * speed) + index / count) % 1;
}
