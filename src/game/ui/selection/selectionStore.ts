import { driverAssets, kartAssets, racers, karts, type RacerId, type KartId, type VisualSelection, type AssetInfo } from '../../config/visualAssets';

export type SelectionStep = 'racer' | 'kart';
export const selectionGridColumns: Record<SelectionStep, number> = { racer: 3, kart: 2 };
export type GridDirection = 'left' | 'right' | 'up' | 'down';
export interface SelectionState {
  currentStep: SelectionStep;
  selectedRacer: RacerId;
  selectedKart: KartId;
  racerIndex: number;
  kartIndex: number;
}
export const selectionEntries = (step: SelectionStep): readonly AssetInfo[] => step === 'racer' ? racers : karts;

/** Wrap horizontal navigation; preserve columns vertically, including incomplete rows. */
export function moveGrid(index: number, direction: GridDirection, count: number, columns: number): number {
  if (count < 1) return 0;
  if (direction === 'left') return (index - 1 + count) % count;
  if (direction === 'right') return (index + 1) % count;
  const column = index % columns, rows = Math.ceil(count / columns);
  let row = Math.floor(index / columns);
  for (let i = 0; i < rows; i++) {
    row = (row + (direction === 'down' ? 1 : rows - 1)) % rows;
    const candidate = row * columns + column;
    if (candidate < count) return candidate;
  }
  return index;
}

/** A menu-only draft. App commits the existing VisualSelection schema on final confirm. */
export function createSelectionStore(selection: VisualSelection) {
  let state: SelectionState = {
    currentStep: 'racer', selectedRacer: selection.racerId, selectedKart: selection.kartId,
    racerIndex: racers.findIndex(asset => asset.id === selection.racerId),
    kartIndex: karts.findIndex(asset => asset.id === selection.kartId),
  };
  const listeners = new Set<() => void>();
  const update = (next: SelectionState) => { state = next; listeners.forEach(listener => listener()); };
  const choose = (index: number) => {
    const entry = selectionEntries(state.currentStep)[index];
    if (!entry || entry.locked) return;
    if (state.currentStep === 'racer') {
      const id = entry.id as RacerId;
      if (state.selectedRacer !== id) update({ ...state, selectedRacer: id, racerIndex: index });
    } else {
      const id = entry.id as KartId;
      if (state.selectedKart !== id) update({ ...state, selectedKart: id, kartIndex: index });
    }
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    choose,
    move(direction: GridDirection, columns = selectionGridColumns[state.currentStep]) {
      const entries = selectionEntries(state.currentStep);
      let index = state.currentStep === 'racer' ? state.racerIndex : state.kartIndex;
      for (let i = 0; i < entries.length; i++) {
        index = moveGrid(index, direction, entries.length, columns);
        if (!entries[index].locked) { choose(index); return; }
      }
    },
    confirm(): VisualSelection | null {
      if (state.currentStep === 'racer') { update({ ...state, currentStep: 'kart' }); return null; }
      return { racerId: state.selectedRacer, kartId: state.selectedKart };
    },
    back(): 'close' | 'racer' {
      if (state.currentStep === 'racer') return 'close';
      update({ ...state, currentStep: 'racer' }); return 'racer';
    },
    selectedAssets: () => ({ driver: driverAssets[state.selectedRacer], kart: kartAssets[state.selectedKart] }),
  };
}
