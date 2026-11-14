import { itemBalance } from '../config/itemBalance';
import type { ItemId } from '../config/itemConfig';

export interface RewardContext { position: number; fieldSize: number }
export type RewardPicker = (context: RewardContext, roll: number) => ItemId;
export function rewardBand({ position, fieldSize }: RewardContext): keyof typeof itemBalance.weights {
  if (fieldSize <= 1 || position <= 1) return 'leading';
  return position >= fieldSize ? 'trailing' : 'middle';
}
export const pickWeightedItem: RewardPicker = (context, roll) => {
  const weights = itemBalance.weights[rewardBand(context)];
  const entries = Object.entries(weights) as [ItemId, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let remaining = Math.max(0, Math.min(1 - Number.EPSILON, Number.isFinite(roll) ? roll : 0)) * total;
  for (const [item, weight] of entries) { if (remaining < weight) return item; remaining -= weight; }
  return 'bubble-guard';
};
/** Per-racer streams make rewards independent of unrelated collection/frame order. */
export function racerItemSeed(seed: number, trackId: string, racerId: string): number {
  let result = seed >>> 0;
  for (const char of `${trackId}:${racerId}`) result = Math.imul(result ^ char.charCodeAt(0), 16777619) >>> 0;
  return result || itemBalance.seed;
}
export function nextItemRoll(seed: number): { seed: number; roll: number } {
  let next = seed || itemBalance.seed;
  next ^= next << 13; next ^= next >>> 17; next ^= next << 5;
  return { seed: next >>> 0, roll: (next >>> 0) / 4294967296 };
}
