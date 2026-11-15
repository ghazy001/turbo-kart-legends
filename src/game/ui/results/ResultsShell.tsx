import { Component, lazy, Suspense, useCallback, useState, type ReactNode } from 'react';
import { formatTime } from '../formatTime';
import { GameButton } from '../GameButton';
import { panelCommand, useMenuNavigation } from '../menu/useMenuNavigation';
import type { PodiumEntry } from './resultsPresentation';
import { usePresentationMotion } from './usePresentationMotion';
import '../../../styles/results.css';

const PodiumScene = lazy(() => import('../../render/PodiumScene').then(module => ({ default: module.PodiumScene })));
class PodiumBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.warn('3D podium unavailable; classification remains available.', error.message); }
  render() { return this.state.failed ? <p className="podium-fallback" role="status">3D podium unavailable. Your results are ready below.</p> : this.props.children; }
}
function PodiumPreview({ entries, celebrate, championship }: { entries: readonly PodiumEntry[]; celebrate: boolean; championship: boolean }) {
  const motion = usePresentationMotion();
  const [ready, setReady] = useState<readonly string[]>([]), [unavailable, setUnavailable] = useState(false);
  const onReady = useCallback((id: string) => setReady(current => current.includes(id) ? current : [...current, id]), []);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  return <section className="podium-preview" aria-label={championship ? 'Championship podium' : 'Finish podium'}>
    <div className="podium-preview-heading"><span>{championship ? 'THE CHAMPIONSHIP STAGE' : entries.length === 1 ? 'YOUR FINISH MOMENT' : 'THE FINISH STAGE'}</span><span>{unavailable ? 'DISPLAY KART FALLBACK' : ready.length < entries.length ? 'LOADING RACERS…' : 'YOUR RACING LINEUP'}</span></div>
    <div className="podium-canvas"><PodiumBoundary><Suspense fallback={<p className="podium-fallback" role="status">Setting the stage…</p>}><PodiumScene entries={entries} reduced={motion.reduced} visible={motion.visible} celebrate={celebrate} onReady={onReady} onUnavailable={onUnavailable} /></Suspense></PodiumBoundary></div>
    <ol className="podium-labels" data-solo={entries.length === 1} aria-label="Podium classification">{entries.map(entry => <li key={entry.id} data-place={entry.place} data-player={entry.id === 'player'}>
      <span className="podium-medal">{String(entry.place).padStart(2, '0')}</span><strong>{entry.name}</strong>
      <small>{championship ? `${entry.points} points` : entry.finishTime !== null ? formatTime(entry.finishTime) : 'On track · classified'}</small>
    </li>)}</ol>
    <p className="podium-caption">{championship ? 'Final points · ties resolved by existing place countback.' : entries.length === 1 ? 'Your kart. Your benchmark. Your next challenge.' : 'Classification at your finish. On-track rivals have no finish time yet.'}</p>
  </section>;
}
export function ResultsShell({ id, label, title, description, badge, entries, celebrate, championship = false, interactive = true, primaryLabel, onPrimary, onHome, children }: {
  id: string; label: string; title: string; description: string; badge: string; entries: readonly PodiumEntry[];
  celebrate: boolean; championship?: boolean; interactive?: boolean; primaryLabel: string; onPrimary: () => void; onHome: () => void; children: ReactNode;
}) {
  const navigation = useMenuNavigation(action => panelCommand(navigation.ref.current, action, onHome), id, interactive);
  return <div className="results-scrim finish-scrim"><div ref={navigation.ref} onKeyDownCapture={navigation.onKeyDownCapture} className="finish-shell" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
    <header className="finish-heading"><div><span className="finish-overline">{label}</span><h2 id={`${id}-title`}>{title}</h2><p>{description}</p></div><span className="finish-badge" data-celebrate={celebrate}>{badge}</span></header>
    <div className="finish-body"><PodiumPreview entries={entries} celebrate={celebrate} championship={championship} /><section className="finish-details" aria-label="Results details">{children}</section></div>
    <footer className="finish-actions"><span className="finish-hints"><kbd>↑↓←→</kbd> Navigate <kbd>Enter</kbd> Confirm <kbd>Esc</kbd> Home<br /><small>PAD: STICK / D-PAD · A CONFIRM · B HOME</small></span><div><GameButton tone="quiet" className="finish-home" data-selection-action onClick={onHome}>Home</GameButton><GameButton className="finish-confirm selection-confirm" data-menu-current="true" data-selection-action onClick={onPrimary}>{primaryLabel}</GameButton></div></footer>
  </div></div>;
}
