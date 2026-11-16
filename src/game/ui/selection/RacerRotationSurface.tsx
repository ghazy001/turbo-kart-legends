import { useEffect, useRef, useSyncExternalStore, type PointerEvent } from 'react';
import type { PreviewRotation } from './previewRotation';

export function RacerRotationSurface({ rotation, name }: { rotation: PreviewRotation; name: string }) {
  const surface = useRef<HTMLDivElement>(null), captured = useRef<number | null>(null);
  const angle = useSyncExternalStore(rotation.subscribe, rotation.getSnapshot);
  useEffect(() => {
    const element = surface.current;
    const cancel = () => {
      rotation.cancel();
      if (captured.current !== null && element?.hasPointerCapture(captured.current)) element.releasePointerCapture(captured.current);
      captured.current = null;
    };
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('blur', cancel); document.addEventListener('visibilitychange', visibility);
    return () => { cancel(); window.removeEventListener('blur', cancel); document.removeEventListener('visibilitychange', visibility); };
  }, [rotation]);
  const release = (event: PointerEvent<HTMLDivElement>) => {
    rotation.end(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (captured.current === event.pointerId) captured.current = null;
  };
  const degrees = Math.round(angle * 180 / Math.PI) % 360;
  return <div ref={surface} className="racer-rotation-surface" data-preview-rotation role="slider" tabIndex={0}
    aria-label={`Rotate ${name} preview`} aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={360} aria-valuenow={degrees}
    aria-valuetext={`${degrees} degrees. Drag horizontally, or use Left and Right. Home resets the view.`}
    onPointerDown={event => {
      if (event.button !== 0 || !event.isPrimary || !rotation.begin(event.pointerId, event.clientX, event.currentTarget.getBoundingClientRect().width)) return;
      captured.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus({ preventScroll: true });
    }}
    onPointerMove={event => rotation.move(event.pointerId, event.clientX)} onPointerUp={release} onPointerCancel={release}
    onLostPointerCapture={event => { rotation.end(event.pointerId); if (captured.current === event.pointerId) captured.current = null; }}
    onKeyDown={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home') {
        event.preventDefault(); event.stopPropagation();
        if (event.key === 'Home') rotation.reset(); else rotation.turn((event.key === 'ArrowRight' ? 1 : -1) * Math.PI / 12);
      }
    }}>
    <span className="racer-rotation-mark" aria-hidden="true">360°</span>
  </div>;
}
