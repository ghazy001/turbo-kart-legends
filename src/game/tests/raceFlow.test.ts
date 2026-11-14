import { defaultRaceOptions } from '../config/raceOptions';
import { describe, expect, it } from 'vitest';
import { defaultSelection } from '../config/visualAssets';
import { gameModes, setupSteps, trackCatalog } from '../ui/menu/menuCatalog';
import { createRaceFlowStore, loadMenuPreferences, saveMenuPreferences } from '../ui/menu/raceFlowStore';
import { validPhoneConfiguration } from '../../phone/protocol';
const preferences = { audioEnabled: true, selectedTrack: trackCatalog[0].id, mode: 'quick-race' as const };
const store = () => createRaceFlowStore(defaultSelection, preferences);

describe('Home and mode setup flow', () => {
  it('starts on Home and wraps all five vertical items in both directions', () => {
    const flow = store(); expect(flow.getSnapshot().currentScreen).toBe('home');
    flow.move('up'); expect(flow.getSnapshot().homeIndex).toBe(4);
    flow.move('down'); expect(flow.getSnapshot().homeIndex).toBe(0);
    flow.selectHome(-1); flow.selectHome(6); expect(flow.getSnapshot().homeIndex).toBe(0);
  });
  for (const mode of gameModes) it(`${mode.name}: ordered setup reaches a valid launch only after review`, () => {
    const flow = store(); flow.begin(mode.id); const steps = setupSteps(mode.id);
    for (const [index, step] of steps.entries()) {
      expect(flow.getSnapshot().currentStep).toBe(step);
      expect(flow.next()).toBe(index === steps.length - 1 ? 'start' : null);
    }
    expect(flow.launch()).toEqual({ mode: mode.id, kind: mode.kind, trackId: trackCatalog[0].id, selection: defaultSelection, cupId: mode.id === 'grand-prix' ? 'sunshine-cup' : null, options: defaultRaceOptions });
  });
  it('keeps chosen racer/kart and indices when going back from track and restores committed profile on cancel', () => {
    const flow = store(); flow.begin('vs-race'); flow.choose(4); flow.next(); flow.choose(1); flow.next();
    flow.back(); expect(flow.getSnapshot()).toMatchObject({ currentStep: 'kart', selectedRacer: 'crash', selectedKart: 'go64', racerIndex: 4, kartIndex: 1 });
    flow.back(); flow.back(); expect(flow.getSnapshot().currentScreen).toBe('home'); expect(flow.selection()).toEqual(defaultSelection);
  });
  it('commits a launch profile for subsequent mode setups and preserves draft selection under panels', () => {
    const flow = store(); flow.begin('quick-race'); flow.choose(1); flow.panel('controller'); flow.back();
    expect(flow.getSnapshot()).toMatchObject({ currentStep: 'racer', selectedRacer: 'aang', panel: 'none' });
    flow.next(); flow.choose(3); flow.commit(); flow.home(); flow.begin('time-trial');
    expect(flow.selection()).toEqual({ racerId: 'aang', kartId: 'boat' });
  });
  it('pause cosmetic editing has only two steps and produces save instead of a race launch', () => {
    const flow = store(); flow.begin('grand-prix', 'cosmetic'); expect(flow.getSnapshot().currentStep).toBe('racer');
    expect(flow.next()).toBeNull(); expect(flow.getSnapshot().currentStep).toBe('kart'); expect(flow.next()).toBe('save');
  });
  it('nested settings panels return to Settings without losing the underlying mode flow', () => {
    const flow = store(); flow.begin('time-trial'); flow.panel('settings'); flow.panel('controller'); flow.panel('phone');
    flow.back(); expect(flow.getSnapshot().panel).toBe('controller');
    flow.back(); expect(flow.getSnapshot().panel).toBe('settings'); flow.back();
    expect(flow.getSnapshot()).toMatchObject({ panel: 'none', currentScreen: 'setup', currentMode: 'time-trial', currentStep: 'racer' });
  });
  it('navigates each grid, rejects invalid indices and retains the real track', () => {
    const flow = store(); flow.begin('quick-race'); flow.choose(-1); flow.move('down'); expect(flow.getSnapshot().selectedRacer).toBe('spongebob');
    flow.next(); flow.move('down'); expect(flow.getSnapshot().selectedKart).toBe('boat');
    flow.next(); flow.choose(99); flow.move('right'); expect(flow.getSnapshot().selectedTrack).toBe(trackCatalog[1].id);
  });
  it('validates preferences, survives denied storage, and persists sound/mode/track independently from draft cosmetics', () => {
    let saved = ''; const flow = store(); flow.audio(false); flow.begin('vs-race');
    expect(saveMenuPreferences(flow.getSnapshot(), { setItem: (_key, value) => { saved = value; } })).toBe(true);
    expect(loadMenuPreferences({ getItem: () => saved })).toEqual({ ...preferences, audioEnabled: false, mode: 'vs-race' });
    expect(loadMenuPreferences({ getItem: () => '{bad' })).toEqual(preferences);
    expect(loadMenuPreferences({ getItem: () => JSON.stringify({ version: 1, mode: '__proto__', selectedTrack: 'missing', audioEnabled: 'yes' }) })).toEqual(preferences);
    expect(saveMenuPreferences(flow.getSnapshot(), { setItem: () => { throw new Error('denied'); } })).toBe(false);
  });
  it('launches either selected course and restores its index after committing, returning home, and reloading preferences', () => {
    const flow = store(); flow.begin('quick-race'); flow.next(); flow.next(); flow.choose(1);
    expect(flow.launch().trackId).toBe('sugar-rush-valley'); flow.commit(); flow.home(); flow.begin('time-trial');
    expect(flow.getSnapshot()).toMatchObject({ selectedTrack: 'sugar-rush-valley', trackIndex: 1 });
    const reloaded = createRaceFlowStore(defaultSelection, { ...preferences, selectedTrack: 'sugar-rush-valley' });
    expect(reloaded.getSnapshot().trackIndex).toBe(1);
  });
  it('locks Grand Prix to its itinerary while retaining the previously selected single-race course', () => {
    const flow = createRaceFlowStore(defaultSelection, { ...preferences, selectedTrack: 'sugar-rush-valley' });
    flow.begin('grand-prix'); flow.next(); flow.next(); flow.next();
    expect(flow.getSnapshot().currentStep).toBe('track'); flow.choose(0); flow.move('down');
    expect(flow.getSnapshot().selectedTrack).toBe('sugar-rush-valley');
    expect(flow.launch()).toMatchObject({ trackId: 'sunshine-circuit', cupId: 'sunshine-cup' });
  });
  it('bounds phone configuration, rejects malformed remote values and accepts touch/motion/calibration requests', () => {
    expect(validPhoneConfiguration({ touch: true, fullLockDegrees: 25, calibrate: false })).toBe(true);
    expect(validPhoneConfiguration({ touch: false, fullLockDegrees: 50, calibrate: true })).toBe(true);
    for (const value of [null, {}, { touch: 1, fullLockDegrees: 25, calibrate: false }, { touch: true, fullLockDegrees: Infinity, calibrate: false }, { touch: true, fullLockDegrees: 9, calibrate: false }, { touch: true, fullLockDegrees: 51, calibrate: false }]) expect(validPhoneConfiguration(value)).toBe(false);
  });
});
