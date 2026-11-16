import type { TrackDefinition } from '../core/types';
import { sampleTrack } from './trackSampling';

const coastalRoller = { start: 0.30, length: 38, height: 1.4, crest: 0.55 };

export const sunshineDefinition: TrackDefinition = {
  id: 'sunshine-circuit', name: 'Sunshine Circuit', closed: true, roadWidth: 11, startDistance: 10,
  // Original broad, asymmetric ribbon loop. Start straight faces east (+X).
  // A modest full-width coastal roller: no road gaps or mandatory aerial shortcuts.
  rises: [coastalRoller],
  features: [
    { id: 'harbor-turbo', kind: 'turbo', fraction: 0.075, width: 7.4, length: 6, minSpeed: 5, strength: 0.85 },
    { id: 'garden-turbo', kind: 'turbo', fraction: 0.565, width: 7.4, length: 6, minSpeed: 5, strength: 0.85 },
    { id: 'coast-hop', kind: 'jump', fraction: 0.30, width: 10.6, length: 2, minSpeed: 11, strength: 5.8 },
  ],
  points: [
    { x: -38, z: -103 }, { x: 28, z: -103 }, { x: 90, z: -80 },
    { x: 123, z: -34 }, { x: 116, z: 10 }, { x: 96, z: 44 }, { x: 66, z: 66 },
    { x: 34, z: 107 }, { x: -26, z: 120 }, { x: -84, z: 95 },
    { x: -115, z: 50 }, { x: -112, z: 9 }, { x: -99, z: -28 }, { x: -101, z: -70 },
  ],
};
// Derive the lip from the actual resampled length, rather than a second layout constant.
const sampled = sampleTrack(sunshineDefinition);
sunshineDefinition.features = sunshineDefinition.features?.map(feature => feature.kind === 'jump'
  ? { ...feature, fraction: coastalRoller.start + coastalRoller.length * coastalRoller.crest / sampled.length } : feature);
export const sunshineCircuit = sampled;
