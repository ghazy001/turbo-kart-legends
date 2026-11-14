import { itemBalance } from '../config/itemBalance';
import { RaceSession } from './RaceSession';
import { trackDefinition, type CupDefinition, type TrackId } from '../tracks/trackCatalog';

export const cupPoints = [10, 7, 4, 1] as const;
export interface CupFinish { readonly id: string; readonly name: string; readonly color: string; readonly place: number; readonly points: number; readonly finishTime: number | null }
export interface CupRound { readonly trackId: TrackId; readonly finishes: readonly CupFinish[] }
export interface CupStanding { id: string; name: string; color: string; points: number; places: number[] }

/** Championship bookkeeping only. Each round uses the unchanged racing simulation. */
export class CupSession {
  private roundIndex = 0;
  private readonly completed: CupRound[] = [];
  private activeRace: RaceSession;
  constructor(readonly definition: CupDefinition, private readonly itemSeed: number = itemBalance.seed) {
    if (!definition.tracks.length) throw new Error('A cup needs at least one course.');
    this.activeRace = this.createRace();
  }
  get race() { return this.activeRace; }
  get round() { return this.roundIndex; }
  get rounds(): readonly CupRound[] { return this.completed; }
  get complete() { return this.completed.length === this.definition.tracks.length; }
  private createRace() {
    const race = new RaceSession(trackDefinition(this.definition.tracks[this.roundIndex]).track, undefined, { seed: this.itemSeed ^ this.roundIndex });
    race.start('quick-race'); return race;
  }
  recordFinish(race: RaceSession): boolean {
    if (race !== this.activeRace || race.phase !== 'finished' || this.completed.length !== this.roundIndex) return false;
    this.completed.push({ trackId: this.definition.tracks[this.roundIndex], finishes: race.standings().map((racer, index) => ({
      id: racer.id, name: racer.name, color: racer.color, place: index + 1, points: cupPoints[index] ?? 0, finishTime: racer.progress.finishTime,
    })) });
    return true;
  }
  nextRound(): RaceSession | null {
    if (this.complete || this.completed.length !== this.roundIndex + 1) return null;
    this.roundIndex++; this.activeRace = this.createRace(); return this.activeRace;
  }
  /** Retry only an unscored round; committed results can never be farmed or overwritten. */
  restartRound(): boolean {
    if (this.completed.length !== this.roundIndex) return false;
    this.activeRace.start('quick-race'); return true;
  }
  standings(): CupStanding[] {
    const totals = new Map<string, CupStanding>();
    for (const round of this.completed) for (const finish of round.finishes) {
      const entry = totals.get(finish.id) ?? { id: finish.id, name: finish.name, color: finish.color, points: 0, places: [] };
      entry.points += finish.points; entry.places.push(finish.place); totals.set(finish.id, entry);
    }
    return [...totals.values()].sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      // Countback: most wins, then seconds, then thirds, then latest finishing order.
      for (let place = 1; place <= cupPoints.length; place++) {
        const difference = b.places.filter(p => p === place).length - a.places.filter(p => p === place).length;
        if (difference) return difference;
      }
      return (a.places.at(-1) ?? 0) - (b.places.at(-1) ?? 0) || a.id.localeCompare(b.id);
    });
  }
}
