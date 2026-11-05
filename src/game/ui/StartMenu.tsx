import { Controls } from './Controls';

export function StartMenu({ onPlay }: { onPlay: () => void }) {
  return <section className="start-menu" aria-labelledby="game-title">
    <div className="eyebrow"><span className="sun-icon">✺</span> GOOD TIMES. GREAT CORNERS.</div>
    <h1 id="game-title"><span>TURBO</span><span>KART<span className="title-dot">.</span></span><span className="title-last">LEGENDS</span></h1>
    <p className="intro">A little kart. A lot of sunshine.<br />Your next favorite corner is just ahead.</p>
    <button className="primary play-button" onClick={onPlay}>Play <span aria-hidden="true">↗</span></button>
    <div className="menu-controls"><span className="micro-label">YOU’VE GOT THE WHEEL</span><Controls compact /></div>
    <div className="course-card"><div className="course-mark" aria-hidden="true">01</div><div><span className="micro-label">EXPLORE THE CIRCUIT</span><strong>Sunshine Circuit</strong><span>Wide bends. Bright skies. Endless free drive.</span></div><span className="course-sun" aria-hidden="true">✺</span></div>
  </section>;
}
