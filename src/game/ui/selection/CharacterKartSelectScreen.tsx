import { useState } from 'react';
import type { VisualSelection } from '../../config/visualAssets';
import { createRaceFlowStore } from '../menu/raceFlowStore';
import { RaceSetupScreen } from '../menu/RaceSetupScreen';

/** Compatibility entry point; all layout and navigation now belong to the shared mode flow. */
export function CharacterKartSelectScreen({ selection, onApply, onClose, startRace = false, returnFocusElement }: {
  selection: VisualSelection; onApply: (selection: VisualSelection) => void; onClose: () => void;
  startRace?: boolean; returnFocusElement?: HTMLElement | null;
}) {
  const [store] = useState(() => {
    const flow = createRaceFlowStore(selection); flow.begin('quick-race', startRace ? 'race' : 'cosmetic'); return flow;
  });
  return <RaceSetupScreen store={store} onComplete={() => onApply(store.selection())} onClose={onClose} returnFocusElement={returnFocusElement} />;
}
