import type { TrackDefinition } from '../core/types';
import { sampleTrack } from './trackSampling';

/** Original caldera circuit: a launch straight, east-side switchback and linked western esses. */
export const volcanoDefinition: TrackDefinition = {
  id: 'volcano-sprint', name: 'Volcano Sprint', closed: true, roadWidth: 11, startDistance: 10,
  points: [
    { x: -60, z: -98 }, { x: 0, z: -102 }, { x: 66, z: -95 },
    { x: 106, z: -62 }, { x: 104, z: -12 }, { x: 76, z: 16 },
    { x: 92, z: 56 }, { x: 68, z: 94 }, { x: 14, z: 112 },
    { x: -44, z: 90 }, { x: -52, z: 47 }, { x: -96, z: 47 },
    { x: -126, z: 7 }, { x: -112, z: -49 },
  ],
};
export const volcanoSprint = sampleTrack(volcanoDefinition);
