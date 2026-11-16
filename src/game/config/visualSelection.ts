import { defaultSelection, driverAssets, kartAssets, type VisualSelection, type RacerId, type KartId } from './visualAssets';
export const selectionStorageKey = 'turbo-kart-legends.selection.v1';
interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function isVisualSelection(value: unknown): value is VisualSelection {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.kartId === 'string' && Object.hasOwn(kartAssets, record.kartId) && typeof record.racerId === 'string' && Object.hasOwn(driverAssets, record.racerId);
}
export function loadSelection(storage?: StoragePort): VisualSelection {
  try {
    const port = storage ?? window.localStorage;
    const saved: unknown = JSON.parse(port.getItem(selectionStorageKey) ?? 'null');
    if (saved && typeof saved === 'object' && 'version' in saved && saved.version === 1 && 'selection' in saved) {
      const selection = saved.selection;
      const migrated = selection && typeof selection === 'object' && 'racerId' in selection && selection.racerId === 'aang' ? { ...selection, racerId: 'sonic' } : selection;
      if (isVisualSelection(migrated)) return { ...migrated };
    }
  } catch { /* Private browsing, corrupt data or storage denial: retain playable defaults. */ }
  return { ...defaultSelection };
}
export function saveSelection(selection: VisualSelection, storage?: StoragePort): boolean {
  try { (storage ?? window.localStorage).setItem(selectionStorageKey, JSON.stringify({ version: 1, selection })); return true; }
  catch { return false; }
}
/** Cosmetics do not touch racer identities, simulation objects or race revisions. */
export function opponentSelections(player: VisualSelection): VisualSelection[] {
  const racers = (Object.keys(driverAssets) as RacerId[]).filter(id => id !== player.racerId);
  const karts = (Object.keys(kartAssets) as KartId[]).filter(id => id !== player.kartId);
  return Array.from({ length: 3 }, (_, i) => ({ racerId: racers[i], kartId: karts[i] }));
}
