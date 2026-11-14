import type { VisualSelection } from '../../config/visualAssets';
import { opponentSelections } from '../../config/visualSelection';
import type { CupSession } from '../../race/CupSession';
import type { RaceSession } from '../../race/RaceSession';
import type { ResultCue } from '../../config/resultCues';

export interface PodiumEntry {
  id: string; name: string; color: string; place: number;
  selection: VisualSelection;
  /** Null means classified on validated progress, never an invented finish time. */
  finishTime: number | null;
  points?: number;
}
function cosmetics(race: RaceSession, player: VisualSelection) {
  const choices = opponentSelections(player);
  return new Map([['player', player], ...race.opponents.map((racer, index) => [racer.id, choices[index]] as const)]);
}
/** Presentation observes the existing classification; it never awards places or scores. */
export function racePodium(race: RaceSession, player: VisualSelection): PodiumEntry[] {
  const choices = cosmetics(race, player);
  return race.standings().slice(0, 3).map((racer, index) => ({
    id: racer.id, name: racer.name, color: racer.color, place: index + 1,
    selection: { ...choices.get(racer.id)! }, finishTime: racer.progress.finishTime,
  }));
}
export function cupPodium(cup: CupSession, player: VisualSelection): PodiumEntry[] {
  const choices = cosmetics(cup.race, player), latest = cup.rounds.at(-1);
  if (!latest) return [];
  return cup.complete
    ? cup.standings().slice(0, 3).map((racer, index) => ({ id: racer.id, name: racer.name, color: racer.color, place: index + 1,
      selection: { ...choices.get(racer.id)! }, points: racer.points, finishTime: null }))
    : latest.finishes.slice(0, 3).map(racer => ({ id: racer.id, name: racer.name, color: racer.color, place: racer.place,
      selection: { ...choices.get(racer.id)! }, points: racer.points, finishTime: racer.finishTime }));
}
export function resultCue(race: RaceSession, cup?: CupSession | null): ResultCue {
  if (cup?.complete) return cup.standings()[0]?.id === 'player' ? 'cup-champion' : 'finish';
  if (cup?.rounds.length) return cup.rounds.at(-1)?.finishes[0]?.id === 'player' ? 'victory' : 'finish';
  if (race.kind === 'time-trial') {
    const outcome = race.trial.outcome;
    return outcome?.eligible && (outcome.first || outcome.newRace || outcome.newLap) ? 'personal-best' : 'finish';
  }
  return race.standings()[0]?.id === 'player' ? 'victory' : 'finish';
}
export function resultBadge(race: RaceSession): string {
  if (race.kind !== 'time-trial') return race.standings()[0]?.id === 'player' ? 'VICTORY' : 'RACE COMPLETE';
  const result = race.trial.outcome;
  return !result?.eligible ? 'PRACTICE COMPLETE' : result.first ? 'FIRST BENCHMARK' : result.newRace ? 'NEW RACE RECORD' : result.newLap ? 'NEW LAP RECORD' : 'RUN COMPLETE';
}
