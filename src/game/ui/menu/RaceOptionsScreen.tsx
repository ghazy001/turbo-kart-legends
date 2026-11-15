import { aiDifficulties, difficultyDefinition, lapChoices, lapLabel } from '../../config/raceOptions';
import { trackDefinition } from '../../tracks/trackCatalog';
import type { RaceFlowStore } from './raceFlowStore';
import { CourseMap, PreviewPanel } from './TrackSelectScreen';

export function RaceOptionsScreen({ store }: { store: RaceFlowStore }) {
  const state = store.getSnapshot(), options = state.vsOptions;
  const course = trackDefinition(state.selectedTrack), difficulty = difficultyDefinition(options.difficulty);
  const focusRow = (row: 0 | 1) => { if (store.getSnapshot().optionsIndex !== row) store.configureVS({}, row); };
  return <><section className="vs-options" aria-label="VS Race options"><div className="selection-roster-heading"><span>YOUR RACE. YOUR RULES.</span><span>3 CPU RIVALS</span></div>
    <div className="vs-option-group" data-active={state.optionsIndex === 0}><div className="vs-option-heading"><span>01</span><div><h3>Race length</h3><p>A quick sprint or a longer run?</p></div></div><div role="radiogroup" aria-label="Race length" className="vs-option-choices">{lapChoices.map(laps => <button key={laps} role="radio" aria-checked={options.laps === laps} tabIndex={options.laps === laps ? 0 : -1} data-menu-current={state.optionsIndex === 0 && options.laps === laps} onFocus={() => focusRow(0)} onClick={() => store.configureVS({ laps }, 0)}><strong>{laps}</strong><span>{laps === 1 ? 'LAP' : 'LAPS'}</span><small>{laps === 1 ? 'THE SPRINT' : laps === 3 ? 'THE CLASSIC' : 'THE LONG RUN'}</small></button>)}</div></div>
    <div className="vs-option-group" data-active={state.optionsIndex === 1}><div className="vs-option-heading"><span>02</span><div><h3>CPU difficulty</h3><p>{difficulty.description}</p></div></div><div role="radiogroup" aria-label="CPU difficulty" className="vs-option-choices vs-difficulty-choices">{aiDifficulties.map((entry, i) => <button key={entry.id} role="radio" aria-checked={options.difficulty === entry.id} tabIndex={options.difficulty === entry.id ? 0 : -1} data-menu-current={state.optionsIndex === 1 && options.difficulty === entry.id} onFocus={() => focusRow(1)} onClick={() => store.configureVS({ difficulty: entry.id }, 1)}><span className="vs-pace" aria-hidden="true">{[0, 1, 2].map(bar => <i key={bar} data-lit={bar <= i} />)}</span><strong>{entry.name}</strong><small>{i === 0 ? 'FIND YOUR FLOW' : i === 1 ? 'KEEP IT CLASSIC' : 'CHASE THE PACK'}</small></button>)}</div></div>
    <p className="vs-options-note">Saved as your VS defaults when you start.</p>
  </section><PreviewPanel label="YOUR VS RACE" name={`${lapLabel(options.laps)}. ${difficulty.name} rivals.`} region={course.region} description={`${course.name} · You + three CPU rivals. ${difficulty.description}`}><CourseMap course={course} /></PreviewPanel></>;
}
