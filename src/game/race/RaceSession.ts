import { waypointInput } from '../ai/waypointController';
import { aiProfiles, raceConfig, type AIProfile } from '../config/raceConfig';
import type { KartInput, SampledTrack } from '../core/types';
import { NEUTRAL_INPUT } from '../core/types';
import { Simulation } from '../core/simulation';
import { offsetSample } from '../tracks/trackSampling';
import { createRaceProgress, advanceRaceProgress, type RaceProgress } from './raceProgress';
import { createCheckpoints, pointAtDistance, type Checkpoint } from './trackProgress';
import { resolveRacerContacts } from './racerCollision';

export type RaceKind = 'quick-race' | 'time-trial' | 'free-drive';
export type RacePhase = 'free-drive' | 'countdown' | 'racing' | 'finished';
export const raceKindNames: Record<RaceKind, string> = { 'quick-race': 'QUICK RACE', 'time-trial': 'TIME TRIAL', 'free-drive': 'FREE DRIVE' };
export interface Racer {
  id: string; name: string; color: string; simulation: Simulation; progress: RaceProgress;
  profile: AIProfile | null; stuckTime: number;
}

/** One bounded fixed clock advances every racer, race time and validation together. */
export class RaceSession {
  readonly player: Racer;
  readonly opponents: Racer[];
  readonly checkpoints: readonly Checkpoint[];
  kind: RaceKind = 'free-drive';
  phase: RacePhase = 'free-drive';
  elapsed = 0;
  countdown = raceConfig.countdown as number;
  revision = 0;
  constructor(readonly track: SampledTrack) {
    this.player = { id: 'player', name: 'You', color: '#ff7654', simulation: new Simulation(track), progress: createRaceProgress(), profile: null, stuckTime: 0 };
    this.opponents = aiProfiles.map(profile => ({ id: profile.id, name: profile.name, color: profile.color,
      simulation: new Simulation(track), progress: createRaceProgress(), profile, stuckTime: 0 }));
    this.checkpoints = createCheckpoints(track);
  }
  get racers(): readonly Racer[] { return this.kind === 'quick-race' ? [this.player, ...this.opponents] : [this.player]; }
  start(kind: RaceKind): void {
    this.kind = kind; this.elapsed = 0; this.countdown = raceConfig.countdown;
    this.phase = kind === 'free-drive' ? 'free-drive' : 'countdown';
    this.revision++;
    for (const [index, racer] of [this.player, ...this.opponents].entries()) {
      const behind = raceConfig.gridBack + Math.floor(index / 2) * raceConfig.gridSpacing;
      const point = pointAtDistance(this.track, (this.track.definition.startDistance ?? 0) - behind);
      const position = offsetSample(point, kind === 'quick-race' ? (index % 2 ? 1 : -1) * raceConfig.gridLane : 0);
      racer.simulation.reset(kind === 'free-drive' ? this.track.spawn : { ...position, heading: Math.atan2(point.tx, point.tz) });
      racer.progress = createRaceProgress(-behind); racer.stuckTime = 0;
    }
  }
  pause(): void {
    this.player.simulation.clock.reset();
    for (const racer of this.racers) racer.simulation.cancelCharging();
  }
  recover(racer: Racer = this.player): void {
    if (this.phase === 'finished') return;
    if (this.kind === 'free-drive') { racer.simulation.reset(); return; }
    if (this.phase === 'countdown' || !racer.progress.started) {
      const index = this.racers.indexOf(racer);
      const behind = raceConfig.gridBack + Math.floor(index / 2) * raceConfig.gridSpacing;
      const point = pointAtDistance(this.track, (this.track.definition.startDistance ?? 0) - behind);
      const offset = this.kind === 'quick-race' ? (index % 2 ? 1 : -1) * raceConfig.gridLane : 0;
      racer.simulation.reset({ ...offsetSample(point, offset), heading: Math.atan2(point.tx, point.tz) });
      racer.progress.distance = -behind;
    } else {
      const last = (racer.progress.nextCheckpoint + this.checkpoints.length - 1) % this.checkpoints.length;
      const point = pointAtDistance(this.track, this.checkpoints[last].distance + raceConfig.recoveryOffset);
      racer.simulation.reset({ ...point, heading: Math.atan2(point.tx, point.tz) });
      racer.progress.distance = racer.progress.completedLaps * this.track.length + last / this.checkpoints.length * this.track.length;
    }
    racer.progress.wrongWayTime = 0; racer.progress.recoveries++; racer.stuckTime = 0;
  }
  standings(): Racer[] {
    return [...this.racers].sort((a, b) => {
      if (a.progress.finishTime !== null || b.progress.finishTime !== null) {
        if (a.progress.finishTime === null) return 1;
        if (b.progress.finishTime === null) return -1;
        return a.progress.finishTime - b.progress.finishTime;
      }
      return b.progress.distance - a.progress.distance;
    });
  }
  advance(delta: number, input: KartInput, playing: boolean): void {
    const clock = this.player.simulation.clock;
    if (!playing || this.phase === 'finished') { clock.reset(); return; }
    const racers = this.racers;
    const alpha = clock.advance(delta, dt => {
      if (this.phase === 'countdown') {
        this.countdown = Math.max(0, this.countdown - dt);
        if (this.countdown < 1e-9) { this.countdown = 0; this.phase = 'racing'; }
        return;
      }
      if (this.phase === 'finished') return;
      if (this.phase === 'free-drive') { this.player.simulation.step(dt, input); return; }
      this.elapsed += dt;
      const traffic = racers.filter(racer => racer.progress.finishTime === null).map(racer => ({ id: racer.id, state: racer.simulation.current }));
      for (const racer of racers) {
        const controls = racer.progress.finishTime !== null ? NEUTRAL_INPUT : racer.profile
          ? waypointInput(racer.simulation.current, this.track, racer.profile, traffic, this.player.progress.distance - racer.progress.distance) : input;
        if (racer.progress.finishTime === null) racer.simulation.step(dt, controls);
      }
      const active = racers.filter(racer => racer.progress.finishTime === null);
      const states = active.map(racer => racer.simulation.current);
      resolveRacerContacts(states, this.track);
      for (const [index, racer] of active.entries()) {
        if (racer.progress.finishTime !== null) continue;
        const simulation = racer.simulation;
        simulation.current = states[index];
        advanceRaceProgress(racer.progress, simulation.previous, simulation.current, this.elapsed, dt, this.track, this.checkpoints);
        if (racer.profile) {
          racer.stuckTime = simulation.current.forwardSpeed < raceConfig.botStuckSpeed ? racer.stuckTime + dt : 0;
          if (racer.stuckTime > raceConfig.botStuckTime) this.recover(racer);
        }
      }
      if (this.player.progress.finishTime !== null) this.phase = 'finished';
    });
    for (const racer of racers) racer.simulation.interpolate(this.player.progress.finishTime !== null ? 1 : alpha);
  }
}
