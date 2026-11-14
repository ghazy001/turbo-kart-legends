import type { SelectionStep } from './selectionStore';
export function SelectionFooter({ step, racerName, kartName, startRace, onBack, onConfirm }: {
  step: SelectionStep; racerName: string; kartName: string; startRace: boolean; onBack: () => void; onConfirm: () => void;
}) {
  return <footer className="selection-footer">
    <div className="selection-combo"><span className="selection-player">P1</span><div><small>YOUR LINEUP</small><strong>{racerName}<span> / {step === 'kart' ? kartName : 'Choose a kart next'}</span></strong></div></div>
    <div className="selection-input-hints" aria-label="Menu controls"><span><kbd>↑↓←→</kbd><kbd>WASD</kbd> Navigate</span><span><kbd>Enter</kbd><kbd>Space</kbd> Confirm</span><span><kbd>Esc</kbd><kbd>⌫</kbd> Back</span><small>CONTROLLER: STICK / D-PAD · A CONFIRM · B BACK</small></div>
    <div className="selection-actions"><button type="button" className="selection-back" data-selection-action onClick={onBack}><span aria-hidden="true">←</span> Back</button><button type="button" className="selection-confirm" data-selection-action onClick={onConfirm}>{step === 'racer' ? 'Choose kart' : startRace ? 'Let’s race' : 'Save lineup'}<span aria-hidden="true">↗</span></button></div>
  </footer>;
}
