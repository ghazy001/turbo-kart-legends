import type { TrackDefinition } from '../core/types';
import { sampleTrack } from './trackSampling';

/** Original alpine ribbon: eastward grid straight, sweeping summit loop and west-side esses. */
export const frostbiteDefinition: TrackDefinition = {
  id: 'frostbite-peak', name: 'Frostbite Peak', closed: true, roadWidth: 11, startDistance: 10,
  points: [
    { x: -62, z: -116 }, { x: 6, z: -120 }, { x: 82, z: -111 },
    { x: 132, z: -73 }, { x: 132, z: -21 }, { x: 98, z: 12 },
    { x: 100, z: 70 }, { x: 48, z: 118 }, { x: -12, z: 126 },
    { x: -68, z: 101 }, { x: -72, z: 55 }, { x: -120, z: 27 },
    { x: -140, z: -23 }, { x: -116, z: -81 },
  ],
};
export const frostbitePeak = sampleTrack(frostbiteDefinition);
