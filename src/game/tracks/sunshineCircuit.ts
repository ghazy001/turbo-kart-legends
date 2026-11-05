import type { TrackDefinition } from '../core/types';
import { sampleTrack } from './trackSampling';

export const sunshineDefinition: TrackDefinition = {
  id: 'sunshine-circuit', name: 'Sunshine Circuit', closed: true, roadWidth: 11,
  // Original broad, asymmetric ribbon loop. Start straight faces east (+X).
  points: [
    { x: -38, z: -103 }, { x: 28, z: -103 }, { x: 92, z: -76 },
    { x: 120, z: -24 }, { x: 106, z: 38 }, { x: 64, z: 68 },
    { x: 30, z: 112 }, { x: -30, z: 119 }, { x: -94, z: 83 },
    { x: -119, z: 28 }, { x: -105, z: -22 }, { x: -96, z: -76 },
  ],
};
export const sunshineCircuit = sampleTrack(sunshineDefinition);
