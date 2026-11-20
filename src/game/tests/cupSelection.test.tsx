import { existsSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { defaultRaceOptions } from '../config/raceOptions';
import { defaultSelection } from '../config/visualAssets';
import { cupPoints } from '../race/CupSession';
import { sunshineCup, trackDefinition } from '../tracks/trackCatalog';
import { CupCollection } from '../ui/menu/CupSelectScreen';
import { createRaceFlowStore } from '../ui/menu/raceFlowStore';
import { trackArtworkUrl } from '../ui/menu/trackArtwork';

describe('cup collection presentation and handoff', () => {
  it('exposes the real selected cup as one accessible option, without invented entries', () => {
    const markup = renderToStaticMarkup(<CupCollection selected />);
    expect(markup.match(/role="radio"/g)).toHaveLength(1);
    expect(markup).toContain(`aria-label="${sunshineCup.name}"`);
    expect(markup).toContain('aria-checked="true"'); expect(markup).toContain('aria-describedby="cup-format"');
    expect(markup).toContain('aria-label="Choose cup"'); expect(markup).toContain(`>${sunshineCup.tracks.length} races</span>`);
    expect(markup).toContain(`>${defaultRaceOptions.laps} laps each</span>`);
  });
  it('presents every actual round in championship order with available thumbnail artwork', () => {
    const markup = renderToStaticMarkup(<CupCollection selected />);
    let previous = -1;
    for (const id of sunshineCup.tracks) {
      const next = markup.indexOf(`>${trackDefinition(id).name}</span>`, previous + 1);
      expect(next).toBeGreaterThan(previous); previous = next;
      const url = trackArtworkUrl(id, true);
      expect(markup).toContain(`src="${url}"`);
      expect(existsSync(new URL(`../../../public${url}`, import.meta.url))).toBe(true);
    }
  });
  it('keeps the real scoring/countback explanation visible', () => {
    const markup = renderToStaticMarkup(<CupCollection selected />);
    expect(markup).toContain(cupPoints.join(' / ')); expect(markup).toContain('points per finish');
    expect(markup).toContain('Highest total wins. Ties use finishing-place countback, then the final race.');
  });
  it('keeps cup navigation, draft cosmetics and the fixed itinerary attached to the existing launch', () => {
    const flow = createRaceFlowStore(defaultSelection, { audioEnabled: true, selectedTrack: 'volcano-sprint', mode: 'grand-prix' });
    flow.begin('grand-prix');
    for (const direction of ['up', 'right', 'down', 'left'] as const) flow.move(direction);
    expect(flow.getSnapshot()).toMatchObject({ currentStep: 'cup', selectedCup: sunshineCup.id, selectedTrack: 'volcano-sprint' });
    flow.next(); flow.choose(1); flow.next(); flow.choose(3); flow.next();
    expect(flow.getSnapshot().currentStep).toBe('track');
    flow.choose(2); flow.move('down'); flow.back(); flow.back(); flow.back();
    expect(flow.getSnapshot()).toMatchObject({ currentStep: 'cup', selectedRacer: 'sonic', selectedKart: 'boat', selectedTrack: 'volcano-sprint' });
    for (let i = 0; i < 4; i++) flow.next();
    expect(flow.getSnapshot().currentStep).toBe('ready'); expect(flow.next()).toBe('start');
    expect(flow.launch()).toMatchObject({ cupId: sunshineCup.id, trackId: sunshineCup.tracks[0], selection: { racerId: 'sonic', kartId: 'boat' }, options: defaultRaceOptions });
  });
});
