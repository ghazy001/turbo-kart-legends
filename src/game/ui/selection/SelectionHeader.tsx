import type { SelectionStep } from './selectionStore';
export function SelectionHeader({ step }: { step: SelectionStep }) {
  return <header className="selection-header">
    <div className="selection-wordmark"><span aria-hidden="true">T↗</span><strong>TURBO KART<small>LEGENDS / SUNSHINE CIRCUIT</small></strong></div>
    <ol className="selection-steps" aria-label="Race preparation"><li aria-current={step === 'racer' ? 'step' : undefined} data-complete={step === 'kart'}><span>{step === 'kart' ? '✓' : '01'}</span>Racer</li><li aria-current={step === 'kart' ? 'step' : undefined}><span>02</span>Kart</li><li><span>↗</span>Race</li></ol>
    <div className="selection-heading"><p className="selection-kicker">YOUR RACE STARTS HERE</p><h2 id="selection-title" key={step}>{step === 'racer' ? 'Racer' : 'Kart'} <em>Select<span>.</span></em></h2><p>{step === 'racer' ? 'Choose the personality behind the wheel.' : 'A perfect ride for your little legend.'}</p></div>
  </header>;
}
