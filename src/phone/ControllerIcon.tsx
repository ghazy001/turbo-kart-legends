export type ControllerIconName = 'wheel' | 'tilt' | 'throttle' | 'brake' | 'drift' | 'item' | 'pause' | 'play' | 'settings' | 'close';

/** Small original line icons, shared by the touch deck and its settings. */
export function ControllerIcon({ name }: { name: ControllerIconName }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === 'wheel' && <><circle cx="16" cy="16" r="12" /><circle cx="16" cy="16" r="3" /><path d="m4 13 9 2m6 0 9-2M16 19v9" /><path d="M12 5h8" strokeWidth="3" /></>}
    {name === 'tilt' && <><rect x="9" y="6" width="14" height="20" rx="4" transform="rotate(18 16 16)" /><path d="M3 15a13 13 0 0 1 5-9M29 17a13 13 0 0 1-5 9M3 8v7h6m20 2h-6m6 0v7" /></>}
    {name === 'throttle' && <><path d="m9 17 7-7 7 7m-14 7 7-7 7 7" /><path d="M9 5h14" opacity=".4" /></>}
    {name === 'brake' && <><path d="M10 6h12l3 20H7L10 6Z" /><path d="M12 12h8m-9 5h10m-11 5h12" /></>}
    {name === 'drift' && <><path d="m12 6 10 3-3 9-10-3 3-9Z" /><path d="m11 8-2 6m12-3-2 6M7 19c-6 5 9 3 3 8m6-7c-6 5 9 3 3 8" /></>}
    {name === 'item' && <path d="m18 3-12 15h9l-1 11 12-16h-9l1-10Z" />}
    {name === 'pause' && <><path d="M11 7v18m10-18v18" strokeWidth="4" /></>}
    {name === 'play' && <path d="m11 6 15 10-15 10V6Z" />}
    {name === 'settings' && <><path d="M6 9h20M6 23h20M12 5v8m8 6v8" /><circle cx="12" cy="9" r="3" fill="currentColor" stroke="none" /><circle cx="20" cy="23" r="3" fill="currentColor" stroke="none" /></>}
    {name === 'close' && <path d="m9 9 14 14M23 9 9 23" />}
  </svg>;
}
