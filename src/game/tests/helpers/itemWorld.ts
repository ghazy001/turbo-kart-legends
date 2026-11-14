import { NEUTRAL_INPUT, type KartInput, type SampledTrack, type TrackSample } from '../../core/types';
import { Simulation } from '../../core/simulation';
import { ItemSystem, type ItemRacer, type ItemSystemOptions } from '../../items/ItemSystem';

const corners = [[0, 0, 0, 1], [0, 200, 1, 0], [200, 200, 0, -1], [200, 0, -1, 0]];
const samples: TrackSample[] = corners.flatMap(([x, z, tx, tz], side) => Array.from({ length: 40 }, (_, i) => ({ x: x + tx * i * 5, z: z + tz * i * 5, tx, tz, distance: side * 200 + i * 5 })));
export const itemTestTrack: SampledTrack = { definition: { id: 'balance-test', name: 'Balance loop', closed: true, roadWidth: 11, points: samples }, samples, length: 800, spawn: { x: 0, z: 50, heading: 0 } };
export function itemWorld(options: ItemSystemOptions = {}) {
  const racers: (ItemRacer & { simulation: Simulation })[] = ['player', 'one', 'two', 'three'].map((id, index) => ({ id, simulation: new Simulation(itemTestTrack), progress: { finishTime: null, distance: 100 - index * 10 } }));
  const items = new ItemSystem(itemTestTrack, options); items.reset(true, racers);
  const place = (index: number, x = 0, z = 50 + index * 30) => racers[index].simulation.reset({ x, z, heading: 0 });
  racers.forEach((_, index) => place(index));
  const step = (ticks = 1, inputs: ReadonlyMap<string, KartInput> = new Map()) => { for (let i = 0; i < ticks; i++) items.step(1 / 60, racers, inputs); };
  const collect = (index: number, boxIndex = 1) => {
    const box = items.pickups[boxIndex]; place(index, box.x, box.z); step(); place(index);
    return items.slot(racers[index].id)?.held;
  };
  const use = (index = 0) => step(1, new Map([[racers[index].id, { ...NEUTRAL_INPUT, useItem: true }]]));
  return { items, racers, place, step, collect, use };
}
