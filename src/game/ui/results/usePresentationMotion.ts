import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
function subscribeMotion(notify: () => void) {
  const media = window.matchMedia(query); media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}
const subscribeVisibility = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify);
  return () => document.removeEventListener('visibilitychange', notify);
};
export function usePresentationMotion() {
  const reduced = useSyncExternalStore(subscribeMotion, () => window.matchMedia(query).matches, () => true);
  const visible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, () => false);
  return { reduced, visible };
}
