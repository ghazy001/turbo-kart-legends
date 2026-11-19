import { difficultyDefinition, lapLabel } from '../config/raceOptions';
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
  const fastest = bestLap(progress);
  return <ResultsShell id="results" label={`${race.track.definition.name.toUpperCase()} · ${lapLabel(race.options.laps).toUpperCase()}${race.kind === 'quick-race' ? ` · ${difficultyDefinition(race.options.difficulty).name.toUpperCase()} CPU` : ''}`}
    title={race.kind === 'time-trial' ? 'Your line. Your benchmark.' : place === 1 ? 'The track is yours.' : 'Across the line.'}
    description={race.kind === 'quick-race' ? `You finished ${place} of ${standings.length}.` : 'Your run is complete.'}
    badge={badge} entries={racePodium(race, selection)} interactive={interactive} celebrate={badge === 'VICTORY' || ['FIRST BENCHMARK', 'NEW RACE RECORD', 'NEW LAP RECORD'].includes(badge)} primaryLabel="Race again" onPrimary={onRestart} onHome={onMenu}>
    <div className="result-metrics"><div><span className="micro-label">TOTAL TIME</span><strong>{formatTime(progress.finishTime)}</strong></div><div><span className="micro-label">BEST LAP</span><strong>{formatTime(fastest)}</strong></div></div>
    <ol className="lap-results" aria-label="Completed lap times">{progress.lapTimes.map((time, index) => <li key={index} data-best={time === fastest}><span>Lap {String(index + 1).padStart(2, '0')}{time === fastest && <small>Best</small>}</span><strong>{formatTime(time)}</strong></li>)}</ol>
    {race.kind === 'time-trial' && <TimeTrialResults race={race} />}
    {race.kind === 'quick-race' && <section className="finish-classification" aria-labelledby="finish-classification-title">
      <div className="finish-section-heading"><h3 id="finish-classification-title">Classification</h3><span>{standings.length} racers</span></div>
      <ol className="finish-standings" aria-label="Race results">{standings.map((racer, index) => <li key={racer.id} data-player={racer.id === 'player'}>
        <span className="finish-place">{String(index + 1).padStart(2, '0')}</span><i style={{ background: racer.color }} /><span className="finish-racer-name">{racer.name}</span>
        <strong>{racer.progress.finishTime !== null ? formatTime(racer.progress.finishTime) : <><span className="finish-on-track">On track · </span>Lap {racer.progress.completedLaps + 1}</>}</strong>
      </li>)}</ol>
      {standings.some(racer => racer.progress.finishTime === null) && <p className="finish-classification-note">Unfinished rivals are ranked by progress.</p>}
    </section>}
    {progress.recoveries > 0 && <p className="results-note">{progress.recoveries} {progress.recoveries === 1 ? 'recovery' : 'recoveries'} used</p>}
  </ResultsShell>;
}
