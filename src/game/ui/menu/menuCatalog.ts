import { sunshineCup, trackCatalog } from '../../tracks/trackCatalog';
import type { RaceKind } from '../../race/RaceSession';
export { trackCatalog, sunshineCup, type TrackId } from '../../tracks/trackCatalog';

export const gameModes = [
  { id: 'quick-race', name: 'Quick Race', tag: 'STRAIGHT TO THE START', description: 'One circuit. Three rivals. Make every corner count.', detail: '3 laps · 3 CPU rivals', icon: 'flag', kind: 'quick-race' },
  { id: 'grand-prix', name: 'Grand Prix', tag: 'A BIGGER LITTLE ADVENTURE', description: `${trackCatalog.length} original circuits. Every place earns points. Chase the Sunshine Cup.`, detail: `${sunshineCup.tracks.length} races · championship points`, icon: 'cup', kind: 'quick-race' },
  { id: 'time-trial', name: 'Time Trial', tag: 'YOUR LINE. YOUR TIME.', description: 'An open track and a running clock. Find your cleanest three laps.', detail: '3 laps · solo against the clock', icon: 'clock', kind: 'time-trial' },
  { id: 'vs-race', name: 'VS Race', tag: 'BRING YOUR BEST CORNERS', description: 'Set the distance, pick your rivals’ pace and make this race your own.', detail: '1 / 3 / 5 laps · adjustable CPU difficulty', icon: 'versus', kind: 'quick-race' },
] as const satisfies readonly { id: string; name: string; tag: string; description: string; detail: string; icon: string; kind: RaceKind }[];
export type MenuMode = typeof gameModes[number]['id'];
export const modeDefinition = (id: MenuMode) => gameModes.find(mode => mode.id === id)!;
export type FlowStep = 'cup' | 'racer' | 'kart' | 'track' | 'options' | 'ready';
export function setupSteps(mode: MenuMode, cosmetic = false): readonly FlowStep[] {
  return cosmetic ? ['racer', 'kart'] : mode === 'grand-prix' ? ['cup', 'racer', 'kart', 'track', 'ready'] : mode === 'vs-race' ? ['racer', 'kart', 'track', 'options', 'ready'] : ['racer', 'kart', 'track', 'ready'];
}
export const stepNames: Record<FlowStep, string> = { cup: 'Cup', racer: 'Racer', kart: 'Kart', track: 'Track', options: 'Options', ready: 'Race' };
