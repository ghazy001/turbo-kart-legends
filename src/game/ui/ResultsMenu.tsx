import { difficultyDefinition, lapLabel } from '../config/raceOptions';
import { raceConfig } from '../config/raceConfig';
import { bestLap } from '../race/raceProgress';
import type { RaceSession } from '../race/RaceSession';
import { formatTime } from './RaceHUD';
import { TimeTrialResults } from './TimeTrialHUD';
import { ResultsShell } from './results/ResultsShell';
import { racePodium, resultBadge } from './results/resultsPresentation';
import type { VisualSelection } from '../config/visualAssets';

export function ResultsMenu({ race, selection, interactive = true, onRestart, onMenu }: { race: RaceSession; selection: VisualSelection; interactive?: boolean; onRestart: () => void; onMenu: () => void }) {
  const progress = race.player.progress;
  const standings = race.standings(); const place = standings.indexOf(race.player) + 1;
  const badge = resultBadge(race);
  return <ResultsShell id="results" label={`${race.track.definition.name.toUpperCase()} · ${lapLabel(race.options.laps).toUpperCase()}${race.kind === 'quick-race' ? ` · ${difficultyDefinition(race.options.difficulty).name.toUpperCase()} CPU` : ''}`}
    title={race.kind === 'time-trial' ? 'Your line. Your benchmark.' : place === 1 ? 'The track is yours!' : 'Across the line!'}
    description={race.kind === 'quick-race' ? `You finished ${place} of ${standings.length}. Every corner brought you here.` : 'Every gate. Every lap. Your run is complete.'}
    badge={badge} entries={racePodium(race, selection)} interactive={interactive} celebrate={badge === 'VICTORY' || ['FIRST BENCHMARK', 'NEW RACE RECORD', 'NEW LAP RECORD'].includes(badge)} primaryLabel="Race again" onPrimary={onRestart} onHome={onMenu}>
    <div className="result-metrics"><div><span className="micro-label">TOTAL TIME</span><strong>{formatTime(progress.finishTime)}</strong></div><div><span className="micro-label">BEST LAP</span><strong>{formatTime(bestLap(progress))}</strong></div></div>
    <ol className="lap-results" aria-label="Completed lap times">{progress.lapTimes.map((time, index) => <li key={index}><span>LAP {index + 1}</span><strong>{formatTime(time)}</strong></li>)}</ol>
    {race.kind === 'time-trial' && <TimeTrialResults race={race} />}
    {race.kind === 'quick-race' && <ol className="finish-standings" aria-label="Race results">{standings.map(racer => <li key={racer.id} data-player={racer.id === 'player'}><i style={{ background: racer.color }} /><span>{racer.name}</span><strong>{racer.progress.finishTime !== null ? formatTime(racer.progress.finishTime) : `On track · lap ${racer.progress.completedLaps + 1}`}</strong></li>)}</ol>}
    <p className="results-note">{progress.recoveries} recoveries · {raceConfig.checkpoints} ordered gates per lap</p>
  </ResultsShell>;
}
