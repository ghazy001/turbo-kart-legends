import type { PointerEvent, ReactNode, RefObject } from 'react';
import { ControllerIcon } from './ControllerIcon';
import { TouchInput, type TouchAction } from './TouchInput';

function HoldButton({ action, touch, disabled, children }: { action: TouchAction; touch: TouchInput; disabled: boolean; children: ReactNode }) {
  const press = (element: HTMLButtonElement, pointer: number, down: boolean) => {
    touch.button(action, pointer, down); element.dataset.pressed = String(touch.isHeld(action));
  };
  const release = (event: PointerEvent<HTMLButtonElement>) => press(event.currentTarget, event.pointerId, false);
  return <button type="button" disabled={disabled} className={`drive-button ${action}`} onContextMenu={event => event.preventDefault()}
    onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); press(event.currentTarget, event.pointerId, true); }}
    onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
    onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); press(event.currentTarget, -1, true); } }}
    onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') press(event.currentTarget, -1, false); }}
    onBlur={event => press(event.currentTarget, -1, false)}>{children}</button>;
}

export interface PhoneControlDeckProps {
  touch: TouchInput; mode: 'touch' | 'tilt'; enabled: boolean; itemsEnabled: boolean; calibrated: boolean;
  deckRef: RefObject<HTMLDivElement | null>; sliderRef: RefObject<HTMLDivElement | null>;
  onTouch: () => void; onMotion: () => void; onCalibrate: () => void;
}

export function PhoneControlDeck({ touch, mode, enabled, itemsEnabled, calibrated, deckRef, sliderRef, onTouch, onMotion, onCalibrate }: PhoneControlDeckProps) {
  const steer = (event: PointerEvent<HTMLDivElement>, begin = false) => {
    if (!enabled) return;
    const box = event.currentTarget.getBoundingClientRect();
    touch.steering(event.pointerId, (event.clientX - box.left - box.width / 2) / (box.width * 0.42), begin);
  };
  return <div className="phone-controls" ref={deckRef} data-enabled={enabled}>
    <section className="phone-steering" aria-label="Steering controls">
      <div className="phone-mode-picker" aria-label="Steering mode"><button type="button" aria-pressed={mode === 'touch'} onClick={onTouch}><ControllerIcon name="wheel" />Touch</button><button type="button" aria-pressed={mode === 'tilt'} onClick={onMotion}><ControllerIcon name="tilt" />Tilt</button></div>
      {mode === 'touch' ? <div ref={sliderRef} className="steering-pad" role="slider" tabIndex={enabled ? 0 : -1} aria-disabled={!enabled}
        aria-label="Touch steering" aria-valuemin={-1} aria-valuemax={1} aria-valuenow={0} aria-valuetext="Centered"
        onContextMenu={event => event.preventDefault()} onPointerDown={event => { if (enabled) { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); steer(event, true); } }}
        onPointerMove={event => steer(event)} onPointerUp={event => touch.releaseSteering(event.pointerId)} onPointerCancel={event => touch.releaseSteering(event.pointerId)} onLostPointerCapture={event => touch.releaseSteering(event.pointerId)}
        onKeyDown={event => { if (enabled && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) { event.preventDefault(); touch.steering(-1, event.key === 'ArrowLeft' ? -1 : 1, true); } }}
        onKeyUp={() => touch.releaseSteering(-1)} onBlur={() => touch.releaseSteering(-1)}>
        <span className="steering-direction" aria-hidden="true">‹</span><div className="steering-wheel"><ControllerIcon name="wheel" /></div><span className="steering-direction" aria-hidden="true">›</span>
        <span className="steering-caption">Slide to steer</span>
      </div> : <div className="motion-pad"><div className="steering-wheel"><ControllerIcon name="wheel" /></div><span className="steering-caption">{calibrated ? 'Tilt into the corner' : 'Hold your neutral angle'}</span><button type="button" className="phone-calibrate" onClick={onCalibrate}>{calibrated ? 'Recalibrate' : 'Calibrate to drive'}</button></div>}
      <div className="steering-meter" aria-hidden="true"><span>L</span><div><i /></div><span>R</span></div>
    </section>
    <section className="phone-pedals" aria-label="Driving controls">
      <div className="phone-action-row">
        <HoldButton action="useItem" touch={touch} disabled={!enabled || !itemsEnabled}><ControllerIcon name="item" /><div><strong>Item</strong><small>{itemsEnabled ? 'Tap to use' : 'No items this mode'}</small></div></HoldButton>
        <HoldButton action="drift" touch={touch} disabled={!enabled}><ControllerIcon name="drift" /><div><strong>Drift</strong><small>Hold · release for turbo</small></div></HoldButton>
      </div>
      <div className="pedal-row">
        <HoldButton action="brake" touch={touch} disabled={!enabled}><ControllerIcon name="brake" /><strong>Brake</strong><small>Hold to reverse</small></HoldButton>
        <HoldButton action="throttle" touch={touch} disabled={!enabled}><ControllerIcon name="throttle" /><strong>GO</strong><small>Hold to accelerate</small><span className="pedal-grip" aria-hidden="true"><i /><i /><i /></span></HoldButton>
      </div>
    </section>
  </div>;
}
