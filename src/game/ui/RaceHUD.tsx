import { difficultyDefinition } from '../config/raceOptions';
import { useEffect, useState } from 'react';
import { raceConfig } from '../config/raceConfig';
import { bestLap } from '../race/raceProgress';
import type { GameRuntime } from '../render/runtime';
import { TimeTrialHUD } from './TimeTrialHUD';

import { formatTime } from './formatTime';
export { formatTime } from './formatTime';

function snapshot(runtime: GameRuntime) {
  const race = runtime.race; const progress = race.player.progress; const standings = race.standings();
  return { phase: race.phase, countdown: Math.ceil(race.countdown), elapsed: race.elapsed,
    lap: Math.min(race.options.laps, progress.completedLaps + 1), lapTime: race.elapsed - progress.lapStart,
    best: bestLap(progress), split: progress.lastSplit, checkpoint: progress.nextCheckpoint,
    wrongWay: progress.wrongWayTime >= raceConfig.wrongWayDelay,
    standings: standings.map(racer => ({ id: racer.id, name: racer.name, color: racer.color, finished: racer.progress.finishTime !== null })),
    position: standings.indexOf(race.player) + 1, recovery: progress.recoveries };
}
export function RaceHUD({ runtime }: { runtime: GameRuntime }) {
  const [view, setView] = useState(() => snapshot(runtime));
  useEffect(() => {
    const timer = window.setInterval(() => setView(snapshot(runtime)), 100);
    return () => window.clearInterval(timer);
  }, [runtime]);
  if (runtime.race.kind === 'free-drive') return null;
  const countdown = view.phase === 'countdown';
  return <>
    <section className="hud-timing" aria-live="off" aria-label="Race clock">
      <span>{runtime.race.kind === 'time-trial' ? 'TIME TRIAL' : 'RACE TIME'}</span><output aria-label="Race time">{formatTime(view.elapsed)}</output>
      {runtime.race.kind === 'time-trial' && <TimeTrialHUD runtime={runtime} compact />}
    </section>
    <div className="hud-lap"><svg width="22" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V3h14v11H5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M6 4h4v4H6m8-4h4v4h-4m-4 0h4v5h-4" fill="currentColor" /></svg><div><span>LAP</span><output aria-label="Current lap">{view.lap}<small> / {runtime.race.options.laps}</small></output></div></div>
    {runtime.race.kind === 'quick-race' && <div className="hud-position"><output aria-label="Race position"><strong>{view.position}</strong><span> / {view.standings.length}</span></output><small>POSITION</small></div>}
    {(countdown || view.phase === 'racing' && view.elapsed < raceConfig.goDisplay) && <div className="hud-countdown" role="status" aria-live="polite" aria-atomic="true"><span>{countdown ? 'READY' : 'LET’S RACE'}</span><strong>{countdown ? view.countdown : 'GO!'}</strong></div>}
    {view.wrongWay && !countdown && <div className="hud-wrong-way" role="status">Wrong way <span>Turn around · R to recover</span></div>}
  </>;
}

/** Detailed information stays available while paused, away from the driving line. */
export function RaceDetails({ runtime }: { runtime: GameRuntime }) {
  const view = snapshot(runtime);
  if (runtime.race.kind === 'free-drive') return null;
  return <details className="pause-race-details"><summary>Timing & standings</summary>
    <dl>{[['Race time', formatTime(view.elapsed)], ['Current lap', `${view.lap} / ${runtime.race.options.laps}`], ['Lap time', formatTime(view.lapTime)], ['Best lap', formatTime(view.best)], ['Last split', formatTime(view.split)], ['Next gate', view.checkpoint === 0 ? 'Finish line' : `${view.checkpoint} / ${raceConfig.checkpoints - 1}`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {runtime.race.kind === 'quick-race' && <><p>{difficultyDefinition(runtime.race.options.difficulty).name} CPU</p><ol aria-label="Live race standings">{view.standings.map(racer => <li key={racer.id}>{racer.name}{racer.finished ? ' · Finished' : ''}</li>)}</ol></>}
    {runtime.race.kind === 'time-trial' && <TimeTrialHUD runtime={runtime} />}
  </details>;
}
