export function Controls({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? 'controls compact' : 'controls'}>
    <div><span className="key-pair"><kbd>W</kbd><kbd>↑</kbd></span><span>Accelerate</span></div>
    <div><span className="key-pair"><kbd>S</kbd><kbd>↓</kbd></span><span>Brake / reverse</span></div>
    <div><span className="key-pair"><kbd>A</kbd><kbd>D</kbd></span><span>Steer <small>or ← →</small></span></div>
    {!compact && <div><span className="key-pair"><kbd>R</kbd><kbd>esc</kbd></span><span>Reset / pause</span></div>}
  </div>;
}
