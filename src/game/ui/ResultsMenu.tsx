import { raceConfig } from '../config/raceConfig';
import { bestLap } from '../race/raceProgress';
import type { RaceSession } from '../race/RaceSession';
import { formatTime } from './RaceHUD';
import { useDialogFocus } from './useDialogFocus';

export function ResultsMenu({ race, onRestart, onMenu }: { race: RaceSession; onRestart: () => void; onMenu: () => void }) {
  const { ref, trapFocus } = useDialogFocus();
  const progress = race.player.progress;
  const standings = race.standings(); const place = standings.indexOf(race.player) + 1;
  return <div className="results-scrim"><div ref={ref} className="results-card" role="dialog" aria-modal="true" aria-labelledby="results-title" onKeyDown={trapFocus}>
    <span className="eyebrow">SUNSHINE CIRCUIT · {raceConfig.laps} LAPS</span>
    <h2 id="results-title">{race.kind === 'time-trial' ? 'Time trial complete.' : place === 1 ? 'Sunshine is yours!' : 'Across the line!'}</h2>
    <p>{race.kind === 'quick-race' ? `You finished ${place} of ${standings.length}.` : 'Every gate. Every lap. Your run is complete.'}</p>
    <div className="result-metrics"><div><span className="micro-label">TOTAL TIME</span><strong>{formatTime(progress.finishTime)}</strong></div><div><span className="micro-label">BEST LAP</span><strong>{formatTime(bestLap(progress))}</strong></div></div>
    <ol className="lap-results" aria-label="Completed lap times">{progress.lapTimes.map((time, index) => <li key={index}><span>LAP {index + 1}</span><strong>{formatTime(time)}</strong></li>)}</ol>
    {race.kind === 'quick-race' && <ol className="finish-standings" aria-label="Race results">{standings.map(racer => <li key={racer.id} data-player={racer.id === 'player'}><i style={{ background: racer.color }} /><span>{racer.name}</span><strong>{racer.progress.finishTime !== null ? formatTime(racer.progress.finishTime) : `On track · lap ${racer.progress.completedLaps + 1}`}</strong></li>)}</ol>}
    <p className="results-note">{progress.recoveries} recoveries · {raceConfig.checkpoints} ordered gates per lap</p>
    <div className="result-actions"><button className="primary" onClick={onRestart}>Race again <span aria-hidden="true">↗</span></button><button className="secondary" onClick={onMenu}>Back to menu</button></div>
  </div></div>;
}
