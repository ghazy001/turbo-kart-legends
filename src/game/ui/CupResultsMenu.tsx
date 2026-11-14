import type { CupSession } from '../race/CupSession';
import { trackDefinition } from '../tracks/trackCatalog';
import { bestLap } from '../race/raceProgress';
import { formatTime } from './RaceHUD';
import type { VisualSelection } from '../config/visualAssets';
import { ResultsShell } from './results/ResultsShell';
import { cupPodium } from './results/resultsPresentation';
import '../../styles/cup.css';

export function CupResultsMenu({ cup, selection, interactive = true, onNext, onRestart, onMenu }: { cup: CupSession; selection: VisualSelection; interactive?: boolean; onNext: () => void; onRestart: () => void; onMenu: () => void }) {
  const standings = cup.standings(), final = cup.complete;
  const latest = cup.rounds.at(-1)!;
  const player = latest.finishes.find(finish => finish.id === 'player')!;
  const winner = standings[0];
  return <ResultsShell id={`cup-results-${cup.round}`} label={`${cup.definition.name} · ${final ? 'FINAL STANDINGS' : `ROUND ${cup.round + 1} OF ${cup.definition.tracks.length}`}`}
    title={final ? winner.id === 'player' ? 'Cup champion!' : 'What a little adventure.' : 'One down. Keep rolling.'}
    description={final ? `${winner.id === 'player' ? 'You take' : `${winner.name} takes`} the cup with ${winner.points} points.` : `${trackDefinition(latest.trackId).name} complete. Next stop: ${trackDefinition(cup.definition.tracks[cup.round + 1]).name}.`}
    badge={final ? winner.id === 'player' ? 'CUP CHAMPION' : 'CHAMPIONSHIP COMPLETE' : `ROUND ${cup.round + 1} COMPLETE`} entries={cupPodium(cup, selection)} interactive={interactive} championship={final} celebrate={final || player.place === 1}
    primaryLabel={final ? 'Race cup again' : 'Next cup race'} onPrimary={final ? onRestart : onNext} onHome={onMenu}>
    <ol className="cup-round-progress" aria-label="Championship progress">{cup.definition.tracks.map((id, i) => <li key={id} data-complete={i < cup.rounds.length}><span>{i < cup.rounds.length ? '✓' : String(i + 1).padStart(2, '0')}</span><div><small>RACE {i + 1}</small><strong>{trackDefinition(id).name}</strong></div></li>)}</ol>
    <div className="cup-results-body"><div className="cup-table-wrap"><table className="cup-table"><caption>{final ? 'Final championship standings' : 'Championship standings'}</caption><thead><tr><th scope="col">POS</th><th scope="col">RACER</th>{cup.rounds.map((round, i) => <th key={round.trackId} scope="col" title={trackDefinition(round.trackId).name}>R{i + 1}</th>)}<th scope="col">PTS</th></tr></thead><tbody>{standings.map((entry, index) => <tr key={entry.id} data-player={entry.id === 'player'}><td>{String(index + 1).padStart(2, '0')}</td><th scope="row"><i style={{ background: entry.color }} />{entry.name}{entry.id === 'player' && entry.name !== 'You' && <small> YOU</small>}</th>{cup.rounds.map(round => <td key={round.trackId}>+{round.finishes.find(finish => finish.id === entry.id)?.points ?? 0}</td>)}<td><strong>{entry.points}</strong></td></tr>)}</tbody></table><p className="cup-scoring-note">10 / 7 / 4 / 1 points. Ties: most wins, then seconds, thirds, then final-race order.</p></div>
    <aside className="cup-round-recap"><span className="flow-mode-tag">YOUR ROUND {cup.round + 1}</span><h3>{player.place}<small> / 4</small> <em>+{player.points} pts</em></h3><dl><div><dt>Race time</dt><dd>{formatTime(player.finishTime)}</dd></div><div><dt>Best lap</dt><dd>{formatTime(bestLap(cup.race.player.progress))}</dd></div></dl><details><summary>Round finishing order</summary><ol>{latest.finishes.map(finish => <li key={finish.id}><span>{finish.name}</span><strong>{finish.finishTime === null ? 'On track' : formatTime(finish.finishTime)}</strong></li>)}</ol></details><p>As in Quick Race, the field freezes when you finish. Racers still on track are classified by validated progress.</p></aside></div>
  </ResultsShell>;
}
