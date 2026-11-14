import { itemBalance } from '../config/itemBalance';
import { itemConfig } from '../config/itemConfig';
import { kartConfig } from '../config/kartConfig';
import type { KartState, SampledTrack } from '../core/types';
import type { BananaHazard, ItemRacer, ItemSlot, SparkProjectile } from './ItemSystem';
import { sweepKart, sweepRail } from './itemCollision';

function projected(state: KartState, seconds: number): KartState {
  const sin = Math.sin(state.heading), cos = Math.cos(state.heading);
  return { ...state, x: state.x + (sin * state.forwardSpeed + cos * state.lateralSpeed) * seconds,
    z: state.z + (cos * state.forwardSpeed - sin * state.lateralSpeed) * seconds };
}
/** Straight shots are evaluated along their actual trajectory; no aim-assist or homing. */
export function shouldShootBolt(owner: ItemRacer, racers: readonly ItemRacer[], slot: (id: string) => Readonly<ItemSlot> | undefined, track: SampledTrack): boolean {
  const state = owner.simulation.current, dx = Math.sin(state.heading), dz = Math.cos(state.heading);
  const speed = itemConfig.projectileSpeed + Math.max(0, state.forwardSpeed) * itemConfig.inheritedSpeed;
  const horizon = Math.min(itemBalance.aiBoltLookAhead, itemConfig.projectileLife);
  const offset = kartConfig.collisionHalfLength + itemConfig.projectileRadius + 0.12;
  const start = { x: state.x + dx * offset, z: state.z + dz * offset };
  const end = { x: start.x + dx * speed * horizon, z: start.z + dz * speed * horizon };
  let first = Infinity, target: ItemRacer | undefined;
  for (const racer of racers) {
    if (racer.id === owner.id || racer.progress.finishTime !== null) continue;
    const other = racer.simulation.current;
    if (Math.abs(state.y - other.y) >= 0.7) continue;
    const at = sweepKart(start, end, other, projected(other, horizon), itemConfig.projectileRadius);
    if (at !== null && at < first) { first = at; target = racer; }
  }
  if (!target || (slot(target.id)?.immunity ?? 0) > first * horizon) return false;
  const ahead = (target.simulation.current.x - state.x) * dx + (target.simulation.current.z - state.z) * dz;
  if (ahead <= 3 || ahead > itemConfig.aiRange) return false;
  // An earlier protected kart absorbs the bolt; don't pretend it can hit a racer beyond it.
  const wall = sweepRail(track, start, { x: start.x + (end.x - start.x) * first, z: start.z + (end.z - start.z) * first }, itemConfig.projectileRadius);
  return wall === null;
}
export function shouldDropTrap(owner: ItemRacer, racers: readonly ItemRacer[], point: { x: number; z: number }, slot: (id: string) => Readonly<ItemSlot> | undefined): boolean {
  const state = owner.simulation.current, sin = Math.sin(state.heading), cos = Math.cos(state.heading);
  return racers.some(racer => {
    if (racer.id === owner.id || racer.progress.finishTime !== null) return false;
    const other = racer.simulation.current, ahead = (other.x - state.x) * sin + (other.z - state.z) * cos;
    if (ahead >= -4 || ahead <= -itemConfig.aiTrapRange || other.y + itemConfig.kartHitBottom > itemConfig.trapHeight) return false;
    const at = sweepKart(point, point, other, projected(other, itemBalance.aiTrapLookAhead), itemConfig.trapRadius);
    const impact = at === null ? -1 : at * itemBalance.aiTrapLookAhead;
    return impact >= itemConfig.trapArmSeconds && (slot(racer.id)?.immunity ?? 0) <= impact;
  });
}
export function guardThreat(owner: ItemRacer, projectiles: readonly SparkProjectile[], traps: readonly BananaHazard[], track: SampledTrack): boolean {
  const state = owner.simulation.current, horizon = itemConfig.aiGuardLookAhead, future = projected(state, horizon);
  for (const bolt of projectiles) {
    if (bolt.owner === owner.id) continue;
    const lifetime = Math.min(horizon, bolt.life), end = { x: bolt.x + bolt.dx * lifetime, z: bolt.z + bolt.dz * lifetime };
    const at = sweepKart(bolt, end, state, projected(state, lifetime), itemConfig.projectileRadius);
    if (at === null || bolt.y + itemConfig.projectileRadius < state.y + itemConfig.kartHitBottom || bolt.y - itemConfig.projectileRadius > state.y + itemConfig.kartHitTop) continue;
    const wall = sweepRail(track, bolt, { x: bolt.x + (end.x - bolt.x) * at, z: bolt.z + (end.z - bolt.z) * at }, itemConfig.projectileRadius);
    if (wall === null) return true;
  }
  for (const trap of traps) {
    const at = sweepKart(trap, trap, state, future, itemConfig.trapRadius);
    if (at === null || trap.armRemaining > at * horizon || trap.life <= at * horizon
      || trap.owner === owner.id && trap.ownerGrace > at * horizon || state.y + itemConfig.kartHitBottom > itemConfig.trapHeight) continue;
    const contact = projected(state, at * horizon);
    if (sweepRail(track, state, contact, itemConfig.trapRadius) === null) return true;
  }
  return false;
}
