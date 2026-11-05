import { useState } from 'react';
import type { RaceKind } from '../race/RaceSession';
import { Controls } from './Controls';

export function StartMenu({ onPlay }: { onPlay: (kind: RaceKind) => void }) {
  const [kind, setKind] = useState<RaceKind>('quick-race');
  return <section className="start-menu" aria-labelledby="game-title">
    <div className="eyebrow"><span className="sun-icon">✺</span> GOOD TIMES. GREAT CORNERS.</div>
    <h1 id="game-title"><span>TURBO</span><span>KART<span className="title-dot">.</span></span><span className="title-last">LEGENDS</span></h1>
    <p className="intro">A little kart. A lot of sunshine.<br />Slide the bends. Light up the straights.</p>
    <fieldset className="mode-picker"><legend className="micro-label">PICK YOUR SUNSHINE</legend>
      {([['quick-race', 'Quick Race'], ['time-trial', 'Time Trial'], ['free-drive', 'Free Drive']] as const).map(([value, title]) => <label key={value} data-selected={kind === value}><input type="radio" name="race-mode" value={value} checked={kind === value} onChange={() => setKind(value)} /><span>{title}</span></label>)}
    </fieldset>
    <p className="mode-description">{kind === 'quick-race' ? 'Three laps. Three rivals. One sunny finish.' : kind === 'time-trial' ? 'Three clean laps. Just you and the clock.' : 'Open road. Drift, explore and find your flow.'}</p>
    <button className="primary play-button" onClick={() => onPlay(kind)}>Play <span aria-hidden="true">↗</span></button>
    <div className="menu-controls"><span className="micro-label">YOU’VE GOT THE WHEEL</span><Controls compact /></div>
    <div className="course-card"><div className="course-mark" aria-hidden="true">01</div><div><span className="micro-label">EXPLORE THE CIRCUIT</span><strong>Sunshine Circuit</strong><span>Wide bends. Bright skies. Endless free drive.</span></div><span className="course-sun" aria-hidden="true">✺</span></div>
  </section>;
}
