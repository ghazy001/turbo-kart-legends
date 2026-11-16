import { sunshineCircuit } from './sunshineCircuit';
import { frostbitePeak } from './frostbitePeak';
import { sugarRushValley } from './sugarRushValley';
import { volcanoSprint } from './volcanoSprint';

export const trackCatalog = [
  { id: 'sunshine-circuit', name: 'Sunshine Circuit', track: sunshineCircuit, region: 'THE SUNSHINE COAST',
    description: 'A sunlit harbor, palm-lined bends, two turbo straights and a coastal jump.', difficulty: 'Easy to learn', laps: 3,
    theme: { candy: false, winter: false, volcanic: false, sky: '#b8dee5', ground: '#a6bc7c', road: '#59666b', rail: '#477b7b', rock: '#a7bba5',
      leaves: ['#277f62', '#368e60', '#56a967', '#1d8c78'], hills: ['#91c4a1', '#8cba7d'], map: '#78a997', sign: 'SUNSHINE', subtitle: 'C I R C U I T' } },
  { id: 'sugar-rush-valley', name: 'Sugar Rush Valley', track: sugarRushValley, region: 'THE PASTEL HIGHLANDS',
    description: 'Candy village, lollipop gardens and ice-cream stops around a flowing chicane.', difficulty: 'Flowing chicane', laps: 3,
    theme: { candy: true, winter: false, volcanic: false, sky: '#d8e5ec', ground: '#dec9ba', road: '#686273', rail: '#a35f98', rock: '#faf0ce',
      leaves: ['#fa91b3', '#91dac9', '#f9d282', '#b6a0e5'], hills: ['#b4d9cb', '#e3a9c8'], map: '#c997ba', sign: 'SUGAR RUSH', subtitle: 'V A L L E Y' } },
  { id: 'frostbite-peak', name: 'Frostbite Peak', track: frostbitePeak, region: 'THE SNOWCAP SUMMIT',
    description: 'Snow pines, glacier tunnels and sweeping alpine bends. Find your line beneath the peaks.', difficulty: 'Alpine esses', laps: 3,
    theme: { candy: false, winter: true, volcanic: false, sky: '#b8d9ef', ground: '#e5f0f6', road: '#3d607b', rail: '#3772a5', rock: '#a4bbce',
      leaves: ['#397c81', '#316977', '#478a8c', '#2d6270'], hills: ['#8aa9c1', '#b2cadb'], map: '#a7c6da', sign: 'FROSTBITE', subtitle: 'P E A K' } },
  { id: 'volcano-sprint', name: 'Volcano Sprint', track: volcanoSprint, region: 'THE EMBER CALDERA',
    description: 'A glowing caldera, rugged rock gardens and prehistoric creatures around linked bends.', difficulty: 'Linked caldera bends', laps: 3,
    theme: { candy: false, winter: false, volcanic: true, sky: '#b98f89', ground: '#655964', road: '#6d727c', rail: '#97674b', rock: '#514858',
      leaves: ['#775563', '#916476', '#ad7d87', '#735067'], hills: ['#554451', '#684954'], map: '#594451', sign: 'VOLCANO', subtitle: 'S P R I N T' } },
] as const;
export type TrackId = typeof trackCatalog[number]['id'];
export const trackDefinition = (id: string) => trackCatalog.find(track => track.id === id) ?? trackCatalog[0];

export const sunshineCup = { id: 'sunshine-cup', name: 'Sunshine Cup', tracks: ['sunshine-circuit', 'sugar-rush-valley', 'frostbite-peak', 'volcano-sprint'],
  description: 'Coastal corners, sherbet hills, snowcap passes and glowing calderas. Four races, one championship. Every place earns points.' } as const;
export type CupDefinition = { readonly id: string; readonly name: string; readonly tracks: readonly TrackId[] };
