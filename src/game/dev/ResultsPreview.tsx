import { useEffect, useMemo, useState } from 'react';
import { defaultSelection } from '../config/visualAssets';
import { RaceSession } from '../race/RaceSession';
import { CupSession } from '../race/CupSession';
import { sunshineCup, trackCatalog } from '../tracks/trackCatalog';
import { DrivingAudio } from '../render/DrivingAudio';
import { ResultsMenu } from '../ui/ResultsMenu';
import { CupResultsMenu } from '../ui/CupResultsMenu';
import { resultCue } from '../ui/results/resultsPresentation';

type Scenario = 'race' | 'fourth' | 'record' | 'practice' | 'round' | 'champion' | 'runner-up';
/** Explicitly fabricated visual fixtures. No records are written and no App race is mounted. */
function fixture(scenario: Scenario, round: number) {
  const cup = ['round', 'champion', 'runner-up'].includes(scenario) ? new CupSession(sunshineCup) : null;
  const race = cup?.race ?? new RaceSession(trackCatalog[0].track, { laps: 3, difficulty: 'normal' });
  race.start(scenario === 'record' || scenario === 'practice' ? 'time-trial' : 'quick-race');
  const finish = (session: RaceSession, lose: boolean) => {
    session.phase = 'finished'; session.player.progress.finishTime = 142.75;
    session.player.progress.lapTimes = session.options.laps === 1 ? [142.75] : [48, 47, 47.75];
    session.player.progress.completedLaps = session.options.laps;
    session.opponents.forEach((racer, index) => { racer.progress.distance = 500 - index * 50; racer.progress.completedLaps = session.options.laps - 1; racer.progress.finishTime = lose ? 136 + index : null; });
  };
  if (cup) {
    const count = scenario === 'round' ? round + 1 : sunshineCup.tracks.length;
    for (let i = 0; i < count; i++) { finish(cup.race, scenario === 'runner-up'); cup.recordFinish(cup.race); if (i < count - 1) cup.nextRound(); }
  } else {
    finish(race, scenario === 'fourth');
    if (scenario === 'practice') race.player.progress.recoveries = 1;
    if (scenario === 'record' || scenario === 'practice') race.trial.outcome = { eligible: scenario === 'record', reason: scenario === 'practice' ? 'recovery' : undefined,
      first: false, newRace: scenario === 'record', newLap: scenario === 'record', previousRace: 145.9, previousLap: 47.9,
      record: { version: 1, rules: race.trial.rules, laps: race.options.laps, bestRace: 142.75, bestLap: 47, lapTimes: [48, 47, 47.75], ghost: null }, storage: 'memory-only' };
  }
  return { race: cup?.race ?? race, cup };
}
export function ResultsPreview() {
  const [scenario, setScenario] = useState<Scenario>('race'), [round, setRound] = useState(0), [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('Preview data only. No completed race or saved record is implied.');
  const [audio] = useState(() => new DrivingAudio());
  const sample = useMemo(() => fixture(scenario, round), [scenario, round]);
  useEffect(() => { const silence = () => audio.silence(); window.addEventListener('blur', silence); return () => { window.removeEventListener('blur', silence); audio.dispose(); }; }, [audio]);
  const restart = () => { audio.silence(); setRound(0); setRevision(value => value + 1); setNotice('Restart action received. Preview reset; no race was simulated.'); };
  return <main className="game-shell mode-results" style={{ paddingTop: 48 }}>
    <aside style={{ position: 'fixed', inset: '0 0 auto', minHeight: 42, zIndex: 30, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, background: '#fbefd0', padding: '8px 14px', fontSize: 10 }}>
      <strong>DEVELOPMENT · RESULTS FIXTURES</strong><label>Scenario <select aria-label="Results preview scenario" value={scenario} onChange={event => { audio.silence(); setScenario(event.currentTarget.value as Scenario); setRound(0); setRevision(value => value + 1); }}>
        <option value="race">Race victory</option><option value="fourth">Fourth place</option><option value="record">Personal best</option><option value="practice">Practice Time Trial</option><option value="round">Cup round</option><option value="champion">Cup champion</option><option value="runner-up">Cup opponent champion</option>
      </select></label><button onClick={() => { audio.unlock(); audio.celebrate(resultCue(sample.race, sample.cup)); }}>Play result cue</button><span role="status">{notice}</span>
    </aside>
    <div key={`${scenario}:${round}:${revision}`} style={{ position: 'absolute', inset: '48px 0 0' }}>
      {sample.cup ? <CupResultsMenu cup={sample.cup} selection={defaultSelection} onNext={() => { setRound(value => value + 1); setNotice('Next-round action received. Showing another visual fixture.'); }} onRestart={restart} onMenu={() => window.location.assign('/')} />
        : <ResultsMenu race={sample.race} selection={defaultSelection} onRestart={restart} onMenu={() => window.location.assign('/')} />}
    </div>
  </main>;
}
