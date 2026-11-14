/** Nondeterminism enters at browser race setup, never inside a simulation tick. */
export function createRaceSeed(): number {
  const value = new Uint32Array(1);
  return globalThis.crypto?.getRandomValues ? globalThis.crypto.getRandomValues(value)[0] : Date.now() >>> 0;
}
