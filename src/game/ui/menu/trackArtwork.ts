import type { TrackId } from '../../tracks/trackCatalog';

export const trackGridColumns = 2;

/** Menu illustrations only. The playable layout always comes from sampled track data. */
export const trackArtwork = {
  'sunshine-circuit': { position: '50% 48%', alt: 'A winding coastal road beside pastel cottages, turquoise water and a lighthouse.' },
  'sugar-rush-valley': { position: '50% 48%', alt: 'A pastel circuit through a candy village, lollipop gardens and ice-cream stalls.' },
  'frostbite-peak': { position: '50% 48%', alt: 'An alpine circuit beside snowy cabins and evergreens beneath a blue glacier arch.' },
  'volcano-sprint': { position: '50% 45%', alt: 'A sweeping caldera circuit between ochre rock gardens and distant glowing volcanoes.' },
} as const satisfies Record<TrackId, { position: string; alt: string }>;

export function trackArtworkUrl(id: TrackId, thumbnail = false) {
  return `/assets/track-cards/${id}${thumbnail ? '-thumb' : ''}.jpg`;
}
