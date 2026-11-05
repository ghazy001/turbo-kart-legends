import { useEffect, useState } from 'react';
import { raceConfig } from '../config/raceConfig';
import { bestLap } from '../race/raceProgress';
import type { GameRuntime } from '../render/runtime';

export function formatTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—';
  const milliseconds = Math.max(0, Math.round(seconds * 1000));
  return `${Math.floor(milliseconds / 60000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')}.${String(milliseconds % 1000).padStart(3, '0')}`;
}
function snapshot(runtime: GameRuntime) {
  const race = runtime.race; const progress = race.player.progress; const standings = race.standings();
  return { phase: race.phase, countdown: Math.ceil(race.countdown), elapsed: race.elapsed,
    lap: Math.min(raceConfig.laps, progress.completedLaps + 1), lapTime: race.elapsed - progress.lapStart,
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
    <section className="race-card" aria-live="off" aria-label="Race timing and position">
      <div className="race-primary"><div><span className="micro-label">LAP</span><output aria-label="Current lap">{view.lap}<small> / {raceConfig.laps}</small></output></div>
        {runtime.race.kind === 'quick-race' && <div><span className="micro-label">POSITION</span><output aria-label="Race position">{view.position}<small> / {view.standings.length}</small></output></div>}</div>
      <div className="race-time"><span>RACE</span><output aria-label="Race time">{formatTime(view.elapsed)}</output></div>
      <div className="race-time"><span>THIS LAP</span><output aria-label="Current lap time">{formatTime(view.lapTime)}</output></div>
      <div className="race-time"><span>BEST LAP</span><output aria-label="Best lap time">{formatTime(view.best)}</output></div>
      <div className="race-time split-time"><span>LAST SPLIT</span><output aria-label="Last checkpoint split">{formatTime(view.split)}</output></div>
      <span className="checkpoint-hint">{view.checkpoint === 0 ? 'NEXT · FINISH LINE' : `NEXT · GATE ${view.checkpoint} / ${raceConfig.checkpoints - 1}`}</span>
    </section>
    {runtime.race.kind === 'quick-race' && <ol className="race-standings" aria-label="Live race standings">{view.standings.map(racer => <li key={racer.id} data-player={racer.id === 'player'}><i style={{ background: racer.color }} /><span>{racer.name}</span>{racer.finished && <span aria-label="Finished">✓</span>}</li>)}</ol>}
    {(countdown || view.phase === 'racing' && view.elapsed < raceConfig.goDisplay) && <div className="countdown-overlay" role="status" aria-live="polite" aria-atomic="true"><span>{countdown ? 'READY FOR SUNSHINE?' : 'MAKE IT A GOOD ONE'}</span><strong>{countdown ? view.countdown : 'GO!'}</strong><p>{countdown ? 'Hold W / ↑ or RT. The grid releases at GO.' : 'Three laps. Find your flow.'}</p></div>}
    {view.wrongWay && !countdown && <div className="wrong-way" role="status">↶ WRONG WAY <span>Turn around or press R to recover.</span></div>}
  </>;
}
