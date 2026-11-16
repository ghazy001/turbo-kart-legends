import { describe, expect, it } from 'vitest';
import { defaultSelection, racers, karts } from '../config/visualAssets';
import { createSelectionStore, moveGrid } from '../ui/selection/selectionStore';
import { keyboardSelectionCommand, SelectionGamepad } from '../ui/selection/menuInput';
import type { PadSnapshot } from '../controls/gamepad';

function pad({ x = 0, y = 0, buttons = [], index = 0 }: { x?: number; y?: number; buttons?: number[]; index?: number } = {}): PadSnapshot {
  return { id: 'standard pad', index, connected: true, mapping: 'standard', axes: [x, y], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: buttons.includes(i), value: Number(buttons.includes(i)) })) };
}

describe('two-step racer/kart draft', () => {
  it('opens with persisted IDs and their matching indices without committing or mutating the profile', () => {
    const profile = { racerId: 'crash', kartId: 'boat' } as const;
    const store = createSelectionStore(profile);
    expect(store.getSnapshot()).toEqual({ currentStep: 'racer', selectedRacer: 'crash', selectedKart: 'boat', racerIndex: 4, kartIndex: 3 });
    store.choose(1); expect(profile).toEqual({ racerId: 'crash', kartId: 'boat' });
    expect(store.getSnapshot().selectedRacer).toBe('sonic');
  });
  it('requires two confirmations, keeps both choices and indices on back, then returns the spawn schema', () => {
    const store = createSelectionStore(defaultSelection);
    store.choose(2); expect(store.confirm()).toBeNull();
    store.choose(1); expect(store.back()).toBe('racer');
    expect(store.getSnapshot()).toEqual({ currentStep: 'racer', selectedRacer: 'arnold', selectedKart: 'go64', racerIndex: 2, kartIndex: 1 });
    expect(store.confirm()).toBeNull();
    expect(store.confirm()).toEqual({ racerId: 'arnold', kartId: 'go64' });
    expect(store.selectedAssets().driver.id).toBe('arnold');
  });
  it('cancel returns to the previous menu and does not apply a draft', () => {
    const store = createSelectionStore(defaultSelection); store.choose(3);
    expect(store.back()).toBe('close');
    expect(createSelectionStore(defaultSelection).getSnapshot().selectedRacer).toBe(defaultSelection.racerId);
  });
  it('notifies subscribers only on valid state changes, and removes listeners', () => {
    const store = createSelectionStore(defaultSelection); let updates = 0;
    const stop = store.subscribe(() => updates++);
    store.choose(-1); store.choose(100); store.choose(0); expect(updates).toBe(0);
    store.choose(1); store.confirm(); expect(updates).toBe(2);
    stop(); store.choose(2); expect(updates).toBe(2);
  });
  it('wraps horizontal navigation and keeps columns in incomplete rows', () => {
    expect(moveGrid(0, 'left', 5, 3)).toBe(4);
    expect(moveGrid(4, 'right', 5, 3)).toBe(0);
    expect(moveGrid(1, 'down', 5, 3)).toBe(4);
    expect(moveGrid(4, 'up', 5, 3)).toBe(1);
    expect(moveGrid(2, 'down', 5, 3)).toBe(2);
    expect(moveGrid(0, 'up', 5, 3)).toBe(3);
    const store = createSelectionStore(defaultSelection); store.move('down');
    expect(store.getSnapshot().selectedRacer).toBe('spongebob');
    store.confirm(); store.move('down'); expect(store.getSnapshot().selectedKart).toBe('boat');
  });
  it('every selectable definition exposes a named model thumbnail and model path', () => {
    for (const asset of [...racers, ...karts]) {
      expect(asset.name.length).toBeGreaterThan(0); expect(asset.url).toMatch(/^\/assets\/.*\.glb$/);
      expect(asset.thumbnail.kind).toBe('model'); expect(Number.isFinite(asset.thumbnail.yaw)).toBe(true);
    }
  });
});

describe('menu input separate from driving', () => {
  it('maps every advertised keyboard control', () => {
    for (const code of ['ArrowLeft', 'KeyA']) expect(keyboardSelectionCommand(code)).toBe('left');
    for (const code of ['ArrowRight', 'KeyD']) expect(keyboardSelectionCommand(code)).toBe('right');
    for (const code of ['ArrowUp', 'KeyW']) expect(keyboardSelectionCommand(code)).toBe('up');
    for (const code of ['ArrowDown', 'KeyS']) expect(keyboardSelectionCommand(code)).toBe('down');
    for (const code of ['Enter', 'NumpadEnter', 'Space']) expect(keyboardSelectionCommand(code)).toBe('confirm');
    for (const code of ['Escape', 'Backspace']) expect(keyboardSelectionCommand(code)).toBe('back');
    expect(keyboardSelectionCommand('KeyR')).toBeUndefined();
  });
  it('requires neutral on connect, and one fresh A/B press per action across steps', () => {
    const input = new SelectionGamepad();
    expect(input.poll([pad({ buttons: [0] })], 0)).toBeUndefined();
    input.poll([pad()], 10);
    expect(input.poll([pad({ buttons: [0] })], 20)).toBe('confirm');
    expect(input.poll([pad({ buttons: [0] })], 1000)).toBeUndefined();
    input.poll([pad()], 1010);
    expect(input.poll([pad({ buttons: [1] })], 1020)).toBe('back');
    expect(input.poll([pad({ buttons: [1] })], 2000)).toBeUndefined();
  });
  it('supports stick/d-pad, dead zones, repeat delay and quick direction changes', () => {
    const input = new SelectionGamepad(); input.poll([pad()], 0);
    expect(input.poll([pad({ x: .3 })], 10)).toBeUndefined();
    expect(input.poll([pad({ x: 1 })], 20)).toBe('right');
    expect(input.poll([pad({ x: 1 })], 340)).toBeUndefined();
    expect(input.poll([pad({ x: 1 })], 350)).toBe('right');
    expect(input.poll([pad({ x: 1 })], 474)).toBeUndefined();
    expect(input.poll([pad({ x: 1 })], 475)).toBe('right');
    expect(input.poll([pad({ buttons: [12] })], 480)).toBe('up');
    expect(input.poll([pad({ buttons: [13] })], 490)).toBe('down');
    expect(input.poll([pad({ buttons: [14] })], 500)).toBe('left');
  });
  it('re-arms after disconnect, device replacement, visibility loss or blur', () => {
    const input = new SelectionGamepad(); input.poll([pad()], 0);
    input.poll([], 10); expect(input.poll([pad({ x: 1 })], 20)).toBeUndefined();
    input.poll([pad()], 30); expect(input.poll([pad({ x: 1 })], 40)).toBe('right');
    expect(input.poll([pad({ buttons: [0], index: 1 })], 50)).toBeUndefined();
    input.poll([pad({ index: 1 })], 60); input.clear();
    expect(input.poll([pad({ buttons: [0], index: 1 })], 70)).toBeUndefined();
    expect(input.poll([{ ...pad(), mapping: '' }], 80)).toBeUndefined();
  });
});
