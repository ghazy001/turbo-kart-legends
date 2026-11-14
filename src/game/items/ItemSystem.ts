import { itemBalance } from '../config/itemBalance';
import { guardThreat, shouldDropTrap, shouldShootBolt, shouldUseTurbo } from './itemAI';
import { nextItemRoll, pickWeightedItem, racerItemSeed, type RewardContext, type RewardPicker } from './itemRewards';
import { itemConfig, type ItemId } from '../config/itemConfig';
import { kartConfig } from '../config/kartConfig';
import type { KartInput, KartState, SampledTrack } from '../core/types';
import { cancelDrift } from '../kart/driftController';
import { pointAtDistance } from '../race/trackProgress';
import { offsetSample } from '../tracks/trackSampling';
import { sweepKart, sweepRail } from './itemCollision';
import { activateTurbo, canActivateTurbo, turboBoost } from './turboCharge';

export interface ItemRacer { id: string; simulation: { current: KartState; previous: KartState }; progress: { finishTime: number | null; distance?: number } }
export interface ItemSlot { held: ItemId | null; cooldown: number; slowRemaining: number; immunity: number; shieldRemaining: number; turboRemaining: number; heldSince: number; hitWindow: number; hitChain: number; slowLimit: number; wasUsing: boolean }
export interface Pickup { id: string; x: number; z: number; respawn: number }
export interface SparkProjectile { id: number; owner: string; x: number; z: number; previousX: number; previousZ: number; y: number; dx: number; dz: number; life: number }
export interface BananaHazard { id: number; owner: string; x: number; z: number; heading: number; life: number; armRemaining: number; ownerGrace: number }
export interface ItemEvent { id: number; kind: 'pickup' | 'fire' | 'drop' | 'hit' | 'wall' | 'blocked' | 'guard' | 'guard-break' | 'guard-expire' | 'turbo'; time: number; x: number; z: number; source: string; target?: string; item?: ItemId; position?: number }
const emptySlot = (): ItemSlot => ({ held: null, cooldown: 0, slowRemaining: 0, immunity: 0, shieldRemaining: 0, turboRemaining: 0, heldSince: 0, hitWindow: 0, hitChain: 0, slowLimit: itemConfig.slowSpeed, wasUsing: true });

export interface ItemSystemOptions { seed?: number; rewardPicker?: RewardPicker }

/** Pure TS race subsystem. It advances ONLY on the race's existing fixed clock. */
export class ItemSystem {
  enabled = false;
  time = 0;
  eventSerial = 0;
  readonly pickups: Pickup[];
  readonly events: ItemEvent[] = [];
  readonly projectiles: SparkProjectile[] = [];
  readonly traps: BananaHazard[] = [];
  readonly stats = { pickups: 0, shots: 0, drops: 0, hits: 0, guards: 0, turbos: 0, blocks: 0 };
  private readonly slots = new Map<string, ItemSlot>();
  readonly rewards: Record<ItemId, number> = { 'spark-bolt': 0, 'banana-trap': 0, 'bubble-guard': 0, 'turbo-charge': 0 };
  private readonly rolls = new Map<string, number>();
  private readonly seed: number;
  private readonly rewardPicker: RewardPicker;
  private projectileSerial = 0;
  constructor(readonly track: SampledTrack, options: ItemSystemOptions = {}) {
    this.seed = Number.isFinite(options.seed) ? options.seed! >>> 0 : itemBalance.seed;
    this.rewardPicker = options.rewardPicker ?? pickWeightedItem;
    this.pickups = itemConfig.rows.flatMap((fraction, row) => {
      const point = pointAtDistance(track, (track.definition.startDistance ?? 0) + track.length * fraction);
      return itemConfig.lanes.map((lane, column) => ({ id: `pickup-${row}-${column}`, ...offsetSample(point, lane), respawn: 0 }));
    });
  }
  slot(id: string): Readonly<ItemSlot> | undefined { return this.slots.get(id); }
  reset(enabled: boolean, racers: readonly ItemRacer[]): void {
    this.enabled = enabled; this.time = 0; this.eventSerial = 0; this.projectileSerial = 0;
    this.slots.clear(); this.rolls.clear();
    racers.forEach(racer => { this.slots.set(racer.id, emptySlot()); this.rolls.set(racer.id, racerItemSeed(this.seed, this.track.definition.id, racer.id)); });
    for (const item of Object.keys(this.rewards) as ItemId[]) this.rewards[item] = 0;
    this.projectiles.length = 0; this.traps.length = 0; this.events.length = 0; this.pickups.forEach(pickup => { pickup.respawn = 0; });
    this.stats.pickups = 0; this.stats.shots = 0; this.stats.drops = 0; this.stats.hits = 0; this.stats.guards = 0; this.stats.turbos = 0; this.stats.blocks = 0;
  }
  disarm(): void { this.slots.forEach(slot => { slot.wasUsing = true; }); }
  observe(id: string, input: KartInput): void { const slot = this.slots.get(id); if (slot) slot.wasUsing = !!input.useItem; }
  recover(id: string): void {
    this.slots.set(id, { ...emptySlot(), immunity: itemConfig.immunitySeconds, cooldown: 1 });
    for (let i = this.projectiles.length - 1; i >= 0; i--) if (this.projectiles[i].owner === id) this.projectiles.splice(i, 1);
    for (let i = this.traps.length - 1; i >= 0; i--) if (this.traps[i].owner === id) this.traps.splice(i, 1);
  }
  private emit(kind: ItemEvent['kind'], x: number, z: number, source: string, target?: string, item?: ItemId, position?: number): void {
    this.events.push({ id: ++this.eventSerial, kind, x, z, source, target, item, position, time: this.time });
    if (this.events.length > itemConfig.maxEvents) this.events.shift();
  }
  private dropPoint(state: KartState): { x: number; z: number } | null {
    if (state.y > itemConfig.trapMaxDropHeight) return null;
    const offset = kartConfig.collisionHalfLength + itemConfig.trapRadius + itemConfig.trapDropSkin;
    const point = { x: state.x - Math.sin(state.heading) * offset, z: state.z - Math.cos(state.heading) * offset };
    return sweepRail(this.track, state, point, itemConfig.trapRadius) === null ? point : null;
  }
  private hit(victim: ItemRacer, x: number, z: number, owner: string, item: ItemId): void {
    const slot = this.slots.get(victim.id)!;
    if (slot.immunity > 0) { this.emit('blocked', x, z, owner, victim.id, item); return; }
    if (slot.shieldRemaining > 0) {
      slot.shieldRemaining = 0; this.stats.blocks++;
      this.emit('guard-break', x, z, owner, victim.id, item); return;
    }
    const state = victim.simulation.current;
    slot.hitChain = slot.hitWindow > 0 ? slot.hitChain + 1 : 1; slot.hitWindow = itemBalance.hitWindowSeconds;
    const repeat = slot.hitChain > 1, retention = repeat ? itemBalance.repeatHitRetention : itemConfig.hitRetention;
    victim.simulation.current = { ...cancelDrift(state), forwardSpeed: state.forwardSpeed * retention, lateralSpeed: state.lateralSpeed * retention,
      boostRemaining: 0, boostTier: 0, actionCooldown: itemConfig.fireCooldown };
    slot.slowRemaining = repeat ? itemBalance.repeatSlowSeconds : itemConfig.slowSeconds;
    slot.slowLimit = repeat ? itemBalance.repeatSlowSpeed : itemConfig.slowSpeed;
    slot.immunity = repeat ? itemBalance.repeatImmunitySeconds : itemConfig.immunitySeconds;
    this.stats.hits++; this.emit('hit', x, z, owner, victim.id, item);
  }
  /** AI submits the same useItem action; navigation/pace remain owned by waypointInput. */
  shouldFire(id: string, racers: readonly ItemRacer[]): boolean {
    const owner = racers.find(racer => racer.id === id), slot = this.slots.get(id);
    if (!this.enabled || !owner || owner.progress.finishTime !== null || !slot?.held || slot.cooldown > 0 || slot.slowRemaining > 0
      || this.time - slot.heldSince < itemBalance.aiReactionSeconds) return false;
    if (slot.held === 'turbo-charge') return shouldUseTurbo(owner, racers, this.track);
    if (slot.held === 'bubble-guard') {
      const state = owner.simulation.current;
      // Anticipatory pack defense also prevents an all-guard opening from locking inventory forever.
      const prepare = this.time - slot.heldSince >= itemBalance.aiGuardPrepareSeconds && state.forwardSpeed >= 4
        && racers.some(racer => racer.id !== id && racer.progress.finishTime === null
          && Math.hypot(racer.simulation.current.x - state.x, racer.simulation.current.z - state.z) < itemBalance.aiGuardPackRange);
      return slot.shieldRemaining <= 0 && slot.immunity <= 0 && (prepare || guardThreat(owner, this.projectiles, this.traps, this.track));
    }
    if (slot.held === 'banana-trap') {
      const point = this.dropPoint(owner.simulation.current);
      return !!point && this.traps.length < itemConfig.maxTraps && owner.simulation.current.forwardSpeed >= 4
        && shouldDropTrap(owner, racers, point, id => this.slot(id));
    }
    return this.projectiles.length < itemConfig.maxProjectiles && shouldShootBolt(owner, racers, id => this.slot(id), this.track);
  }
  private rewardContext(winner: ItemRacer, racers: readonly ItemRacer[]): RewardContext {
    const ranked = [...racers].sort((a, b) => {
      if (a.progress.finishTime !== null || b.progress.finishTime !== null) {
        if (a.progress.finishTime === null) return 1;
        if (b.progress.finishTime === null) return -1;
        return a.progress.finishTime - b.progress.finishTime;
      }
      return (b.progress.distance ?? 0) - (a.progress.distance ?? 0);
    });
    return { position: ranked.indexOf(winner) + 1, fieldSize: ranked.length };
  }
  step(dt: number, racers: readonly ItemRacer[], inputs: ReadonlyMap<string, KartInput>): void {
    if (!this.enabled) return;
    this.time += dt;
    for (const pickup of this.pickups) pickup.respawn = Math.max(0, pickup.respawn - dt);
    for (const racer of racers) {
      const slot = this.slots.get(racer.id); if (!slot) continue;
      slot.cooldown = Math.max(0, slot.cooldown - dt); slot.slowRemaining = Math.max(0, slot.slowRemaining - dt); slot.immunity = Math.max(0, slot.immunity - dt);
      if (slot.shieldRemaining > 0) {
        slot.shieldRemaining = Math.max(0, slot.shieldRemaining - dt);
        if (slot.shieldRemaining < 1e-9) {
          slot.shieldRemaining = 0;
          this.emit('guard-expire', racer.simulation.current.x, racer.simulation.current.z, racer.id, undefined, 'bubble-guard');
        }
      }
      slot.turboRemaining = Math.max(0, slot.turboRemaining - dt);
      slot.hitWindow = Math.max(0, slot.hitWindow - dt);
      if (slot.hitWindow === 0) slot.hitChain = 0;
      const using = !!inputs.get(racer.id)?.useItem;
      if (racer.progress.finishTime === null && using && !slot.wasUsing && slot.held && slot.cooldown <= 0) {
        const state = racer.simulation.current, dx = Math.sin(state.heading), dz = Math.cos(state.heading);
        let used = false;
        if (slot.held === 'turbo-charge') {
          if (canActivateTurbo(state, inputs.get(racer.id)!, slot.slowRemaining)) {
            racer.simulation.current = activateTurbo(state); slot.turboRemaining = turboBoost.duration;
            this.stats.turbos++; this.emit('turbo', state.x, state.z, racer.id, undefined, slot.held); used = true;
          }
        } else if (slot.held === 'bubble-guard') {
          if (slot.shieldRemaining <= 0) {
            slot.shieldRemaining = itemConfig.shieldSeconds; this.stats.guards++;
            this.emit('guard', state.x, state.z, racer.id, undefined, slot.held); used = true;
          }
        } else if (slot.held === 'banana-trap') {
          const point = this.dropPoint(state);
          if (point && this.traps.length < itemConfig.maxTraps) {
            this.traps.push({ ...point, id: ++this.projectileSerial, owner: racer.id, heading: state.heading, life: itemConfig.trapLife,
              armRemaining: itemConfig.trapArmSeconds, ownerGrace: itemConfig.trapOwnerGrace });
            this.stats.drops++; this.emit('drop', point.x, point.z, racer.id, undefined, slot.held); used = true;
          }
        } else if (this.projectiles.length < itemConfig.maxProjectiles) {
          const speed = itemConfig.projectileSpeed + Math.max(0, state.forwardSpeed) * itemConfig.inheritedSpeed;
          const offset = kartConfig.collisionHalfLength + itemConfig.projectileRadius + 0.12;
          const x = state.x + dx * offset, z = state.z + dz * offset;
          this.projectiles.push({ id: ++this.projectileSerial, owner: racer.id, x, z, previousX: x, previousZ: z, y: itemConfig.projectileHeight + state.y, dx: dx * speed, dz: dz * speed, life: itemConfig.projectileLife });
          this.stats.shots++; this.emit('fire', x, z, racer.id, undefined, slot.held); used = true;
        }
        if (used) { slot.held = null; slot.cooldown = itemBalance.useCooldown; }
      }
      slot.wasUsing = using;
    }
    for (let index = this.projectiles.length - 1; index >= 0; index--) {
      const bolt = this.projectiles[index], from = { x: bolt.x, z: bolt.z }, to = { x: bolt.x + bolt.dx * dt, z: bolt.z + bolt.dz * dt };
      let at = sweepRail(this.track, from, to, itemConfig.projectileRadius), victim: ItemRacer | null = null;
      for (const racer of racers) {
        if (racer.id === bolt.owner || racer.progress.finishTime !== null) continue;
        const t = sweepKart(from, to, racer.simulation.previous, racer.simulation.current, itemConfig.projectileRadius);
        if (t === null || (at !== null && t >= at)) continue;
        const y = racer.simulation.previous.y + (racer.simulation.current.y - racer.simulation.previous.y) * t;
        if (bolt.y + itemConfig.projectileRadius < y + itemConfig.kartHitBottom || bolt.y - itemConfig.projectileRadius > y + itemConfig.kartHitTop) continue;
        at = t; victim = racer;
      }
      bolt.previousX = bolt.x; bolt.previousZ = bolt.z;
      if (at !== null) {
        const x = from.x + (to.x - from.x) * at, z = from.z + (to.z - from.z) * at;
        if (victim) this.hit(victim, x, z, bolt.owner, 'spark-bolt');
        else this.emit('wall', x, z, bolt.owner, undefined, 'spark-bolt');
        this.projectiles.splice(index, 1); continue;
      }
      bolt.x = to.x; bolt.z = to.z; bolt.life -= dt;
      if (bolt.life <= 0) this.projectiles.splice(index, 1);
    }
    for (let index = this.traps.length - 1; index >= 0; index--) {
      const trap = this.traps[index];
      trap.life -= dt; trap.armRemaining = Math.max(0, trap.armRemaining - dt); trap.ownerGrace = Math.max(0, trap.ownerGrace - dt);
      if (trap.life <= 0) { this.traps.splice(index, 1); continue; }
      if (trap.armRemaining > 0) continue;
      let victim: ItemRacer | null = null, first = Infinity;
      for (const racer of racers) {
        if (racer.progress.finishTime !== null || racer.id === trap.owner && trap.ownerGrace > 0) continue;
        const t = sweepKart(trap, trap, racer.simulation.previous, racer.simulation.current, itemConfig.trapRadius);
        if (t === null || t >= first) continue;
        const y = racer.simulation.previous.y + (racer.simulation.current.y - racer.simulation.previous.y) * t;
        if (y + itemConfig.kartHitBottom > itemConfig.trapHeight) continue;
        first = t; victim = racer;
      }
      if (victim) { this.hit(victim, trap.x, trap.z, trap.owner, 'banana-trap'); this.traps.splice(index, 1); }
    }
    for (const pickup of this.pickups) {
      if (pickup.respawn > 0) continue;
      let winner: ItemRacer | null = null, first = Infinity;
      for (const racer of racers) {
        const slot = this.slots.get(racer.id);
        if (racer.progress.finishTime !== null || !slot || slot.held || slot.cooldown > 0) continue;
        const t = sweepKart(pickup, pickup, racer.simulation.previous, racer.simulation.current, itemConfig.pickupRadius);
        if (t === null || t >= first) continue;
        const y = racer.simulation.previous.y + (racer.simulation.current.y - racer.simulation.previous.y) * t;
        if (y + itemConfig.kartHitBottom > itemConfig.pickupHeight + itemConfig.pickupRadius || y + itemConfig.kartHitTop < itemConfig.pickupHeight - itemConfig.pickupRadius) continue;
        winner = racer; first = t;
      }
      if (winner) {
        const context = this.rewardContext(winner, racers), next = nextItemRoll(this.rolls.get(winner.id)!);
        const item = this.rewardPicker(context, next.roll), slot = this.slots.get(winner.id)!;
        this.rolls.set(winner.id, next.seed); slot.held = item; slot.heldSince = this.time;
        pickup.respawn = itemConfig.respawnSeconds; this.stats.pickups++; this.rewards[item]++;
        this.emit('pickup', pickup.x, pickup.z, winner.id, undefined, item, context.position);
      }
    }
    for (const racer of racers) {
      const slot = this.slots.get(racer.id); if (!slot) continue;
      const state = racer.simulation.current;
      // Observe the existing boost owner: wall/kart hits, braking and item damage can cancel it.
      slot.turboRemaining = racer.progress.finishTime !== null ? 0 : Math.min(slot.turboRemaining, state.boostRemaining);
      if (slot.slowRemaining > 0) racer.simulation.current = { ...state, forwardSpeed: Math.max(-slot.slowLimit, Math.min(slot.slowLimit, state.forwardSpeed)) };
    }
  }
}
