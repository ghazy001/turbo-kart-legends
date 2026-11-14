import { useEffect, useState } from 'react';
import type { GameRuntime } from '../render/runtime';
import type { RaceSession } from '../race/RaceSession';
import type { TrialRecords } from '../timeTrial/TrialRecords';
import type { SampledTrack } from '../core/types';
import { formatTime } from './formatTime';
import '../../styles/timeTrial.css';

export function formatTrialDelta(seconds: number | null): string {
  return seconds === null ? '—' : `${seconds < -0.005 ? '−' : '+'}${Math.abs(seconds).toFixed(2)} s`;
}
function trialView(runtime: GameRuntime) {
  const { race } = runtime, { trial } = race;
  return { reference: trial.reference, invalid: trial.invalid, phase: race.phase,
    delta: race.phase === 'racing' && race.player.progress.started ? trial.delta(race.elapsed, race.player.progress.distance) : null };
}
export function TimeTrialHUD({ runtime }: { runtime: GameRuntime }) {
  const [view, setView] = useState(() => trialView(runtime)), [visible, setVisible] = useState(runtime.trialGhostVisible);
  useEffect(() => { const timer = window.setInterval(() => setView(trialView(runtime)), 100); return () => window.clearInterval(timer); }, [runtime]);
  const record = view.reference;
  return <div className="trial-hud" aria-label="Time Trial personal best">
    <div className="race-time"><span>PB RACE</span><output aria-label="Personal best race">{formatTime(record?.bestRace ?? null)}</output></div>
    <div className="race-time"><span>PB LAP</span><output aria-label="Personal best lap">{formatTime(record?.bestLap ?? null)}</output></div>
    <div className="trial-delta" data-ahead={view.delta !== null && view.delta < -0.005}><span>VS BEST RUN</span><output aria-label="Time difference to ghost" aria-live="off">{formatTrialDelta(view.delta)}</output></div>
    {view.invalid ? <p className="trial-practice" role="status">Practice run · {view.invalid === 'recovery' ? 'recovery used' : view.invalid === 'limit' ? 'recording limit reached' : 'replay interrupted'}. Restart for records.</p> : record?.ghost ? <label className="ghost-toggle"><input type="checkbox" checked={visible} onChange={event => { const next = event.currentTarget.checked; runtime.trialGhostVisible = next; setVisible(next); }} /> Show best-run ghost</label> : <p className="trial-hint">{record ? 'Times saved. Finish a faster clean run to record a ghost.' : 'Finish a clean run to set your first record.'}</p>}
  </div>;
}
export function TimeTrialRecordSummary({ records, track, laps = 3 }: { records: TrialRecords; track: SampledTrack; laps?: number }) {
  const record = records.get(track, laps);
  return <div className="trial-record-summary" aria-label="Saved Time Trial records"><span className="flow-overline">YOUR PERSONAL BEST</span>
    {record ? <><dl><div><dt>Race</dt><dd>{formatTime(record.bestRace)}</dd></div><div><dt>Lap</dt><dd>{formatTime(record.bestLap)}</dd></div></dl><p>{record.ghost ? 'Best-run ghost ready for the grid.' : 'Timing records ready. No saved ghost.'}</p></> : <p>No record yet. A clean three-lap run sets the benchmark.</p>}
    <small>Local to this browser · recoveries make the run practice-only.</small>
  </div>;
}
export function TimeTrialResults({ race }: { race: RaceSession }) {
  const result = race.trial.outcome;
  if (!result) return null;
  return <section className="trial-results" aria-label="Time Trial record result">
    <span className="trial-record-badge">{!result.eligible ? 'PRACTICE RUN' : result.first ? 'FIRST BENCHMARK' : result.newRace ? 'NEW RACE RECORD' : result.newLap ? 'NEW LAP RECORD' : 'RUN COMPLETE'}</span>
    {result.eligible ? <><div className="trial-result-comparison"><span>{result.previousRace === null ? 'Race record established' : `${formatTrialDelta(race.player.progress.finishTime! - result.previousRace)} vs previous best`}</span>{result.newLap && <strong>Personal-best lap ✓</strong>}</div><dl><div><dt>Best race</dt><dd>{formatTime(result.record?.bestRace ?? null)}</dd></div><div><dt>Best lap</dt><dd>{formatTime(result.record?.bestLap ?? null)}</dd></div></dl><p>{result.storage === 'memory-only' ? 'Browser storage unavailable. Records and ghost are kept for this session.' : result.storage === 'times-only' ? 'Times saved. Storage is full; the ghost is available for this session.' : result.newRace ? 'Best run saved. Race again to chase your ghost.' : 'Your faster records are retained. Try another run.'}</p></> : <p>{result.reason === 'recovery' ? 'Recovery was used.' : result.reason === 'limit' ? 'The 15-minute recording limit was reached.' : 'The replay was interrupted.'} Your existing records are unchanged. Restart for a clean attempt.</p>}
  </section>;
}
