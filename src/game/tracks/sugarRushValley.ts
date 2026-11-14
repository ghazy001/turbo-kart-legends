import type { TrackDefinition } from '../core/types';
import { sampleTrack } from './trackSampling';

/** Original ribbon with a flowing east-side chicane and a generous starting straight. */
export const sugarRushDefinition: TrackDefinition = {
  id: 'sugar-rush-valley', name: 'Sugar Rush Valley', closed: true, roadWidth: 11, startDistance: 10,
  points: [
    { x: -50, z: -100 }, { x: 15, z: -100 }, { x: 78, z: -88 },
    { x: 110, z: -50 }, { x: 98, z: -8 }, { x: 58, z: 17 },
    { x: 64, z: 65 }, { x: 24, z: 105 }, { x: -34, z: 98 },
    { x: -83, z: 69 }, { x: -100, z: 18 }, { x: -78, z: -25 },
    { x: -102, z: -62 },
  ],
};
export const sugarRushValley = sampleTrack(sugarRushDefinition);
