import type { ReactNode } from 'react';
export function MenuIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    sound: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14" /></>,
    muted: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="m16 9 6 6m0-6-6 6" /></>,
    controller: <><path d="M7 7h10c3 0 6 11 3 12-2 1-4-3-5-3H9c-1 0-3 4-5 3C1 18 4 7 7 7Z" /><path d="M6 11v4m-2-2h4m8-1h.01m3 2h.01" /></>,
    phone: <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10 5h4m-3 14h2" /></>,
    flag: <><path d="M5 21V3c5-5 9 5 15 0v11c-6 5-10-5-15 0" /><path d="m10 3 0 10m5-9v10M5 8c5-5 9 5 15 0" /></>,
    cup: <><path d="M7 3h10v6c0 7-10 7-10 0V3Zm0 2H3v3c0 3 2 4 5 4m9-7h4v3c0 3-2 4-5 4m-4 3v6m-5 0h10" /></>,
    clock: <><circle cx="12" cy="13" r="8" /><path d="M12 9v5l3 2M9 2h6m-3 0v3" /></>,
    versus: <><path d="m4 5 6 7-6 7m16-14-6 7 6 7m-8-8v2" /></>,
    settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="10" cy="18" r="2" /></>,
  };
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.flag}</svg>;
}
export function AudioToggleButton({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return <button className="menu-icon-button" data-selection-action aria-label={enabled ? 'Mute sound' : 'Enable sound'} aria-pressed={enabled} title={enabled ? 'Mute sound' : 'Enable sound'} onClick={onToggle}><MenuIcon name={enabled ? 'sound' : 'muted'} /></button>;
}
export function MenuTools({ audioEnabled, phoneConnected, onSound, onController, onPhone }: {
  audioEnabled: boolean; phoneConnected: boolean; onSound: () => void; onController: () => void; onPhone: () => void;
}) {
  return <div className="menu-tools" aria-label="Quick settings"><AudioToggleButton enabled={audioEnabled} onToggle={onSound} /><button className="menu-icon-button" data-selection-action aria-label="Controller and input settings" title="Controller and input settings" onClick={onController}><MenuIcon name="controller" /></button><button className="menu-icon-button" data-selection-action aria-label="Phone controller setup" title="Phone controller setup" data-connected={phoneConnected} onClick={onPhone}><MenuIcon name="phone" /><i /></button></div>;
}
