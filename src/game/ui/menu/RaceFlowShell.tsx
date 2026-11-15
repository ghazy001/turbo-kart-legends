import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { View } from '@react-three/drei';
import { CanvasFrames } from '../selection/CanvasFrames';
import { stepNames, type FlowStep } from './menuCatalog';
import type { useMenuNavigation } from './useMenuNavigation';
import '../../../styles/selection.css';
import '../../../styles/menus.css';

export function StepHeader({ title, subtitle, mode, steps, step, tools, home = false }: {
  title: string; subtitle: string; mode: string; steps: readonly FlowStep[]; step: FlowStep; tools: ReactNode; home?: boolean;
}) {
  const index = steps.indexOf(step);
  return <header className="selection-header flow-header"><div className="selection-wordmark"><span aria-hidden="true">T↗</span><strong>TURBO KART<small>{home ? 'LEGENDS' : 'LEGENDS / YOUR LINE. YOUR LITTLE LEGEND.'}</small></strong></div>{tools}
    {!home && <><div className="flow-heading"><span className="flow-mode-tag">{mode}</span><h2 id="flow-title" key={title}>{title}<em>.</em></h2><p>{subtitle}</p></div><ol className="selection-steps" aria-label="Race setup">{steps.map((entry, i) => <li key={entry} aria-current={entry === step ? 'step' : undefined} data-complete={i < index}><span>{i < index ? '✓' : String(i + 1).padStart(2, '0')}</span>{stepNames[entry]}</li>)}</ol></>}
  </header>;
}
export function StepFooter({ context, confirm, onBack, onConfirm, home = false }: { context: string; confirm: string; onBack: () => void; onConfirm: () => void; home?: boolean }) {
  return <footer className="selection-footer flow-footer"><div className="flow-footer-context"><span className="selection-player">P1</span><span>{context}</span></div><div className="selection-actions">{!home && <button className="selection-back" data-selection-action onClick={onBack}>← <span>Back</span></button>}<button className="selection-confirm" data-selection-action onClick={onConfirm}>{confirm}<span aria-hidden="true">↗</span></button></div></footer>;
}
export function RaceFlowShell({ navigation, revision, home = false, header, children, footer, inert = false }: {
  navigation: ReturnType<typeof useMenuNavigation>; revision: string; home?: boolean; header: ReactNode; children: ReactNode; footer: ReactNode; inert?: boolean;
}) {
  return <div ref={navigation.ref} onKeyDownCapture={navigation.onKeyDownCapture} className={`selection-screen flow-screen${home ? ' flow-home' : ''}`} role={home ? 'region' : 'dialog'} aria-modal={home ? undefined : true} aria-labelledby={home ? 'home-title' : 'flow-title'} inert={inert}>
    <div className="flow-backdrop" aria-hidden="true" /><div className="selection-atmosphere" aria-hidden="true" />{header}<div className="selection-content flow-content">{children}</div>
    <div className="selection-webgl" aria-hidden="true"><Canvas shadows={home} frameloop="demand" dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }} eventSource={navigation.ref}><CanvasFrames revision={revision} /><View.Port /></Canvas></div>{footer}
  </div>;
}
