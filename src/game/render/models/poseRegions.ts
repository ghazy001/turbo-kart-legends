import type { BufferGeometry } from 'three';

/** Protect complete connected islands, including vertices duplicated at UV seams.
 * A vertex-height mask alone can stretch head/cord triangles into an arm bend. */
export function protectedPoseVertices(geometry: BufferGeometry, above: number): Uint8Array {
  const positions = geometry.getAttribute('position'), count = positions.count;
  const parents = Int32Array.from({ length: count }, (_, i) => i);
  const find = (value: number): number => {
    while (parents[value] !== value) { parents[value] = parents[parents[value]]; value = parents[value]; }
    return value;
  };
  const join = (a: number, b: number) => { parents[find(a)] = find(b); };
  const welded = new Map<string, number>();
  for (let i = 0; i < count; i++) {
    const key = `${Math.round(positions.getX(i) * 1e5)},${Math.round(positions.getY(i) * 1e5)},${Math.round(positions.getZ(i) * 1e5)}`;
    const previous = welded.get(key);
    if (previous === undefined) welded.set(key, i); else join(i, previous);
  }
  const indices = geometry.index;
  for (let i = 0; i < (indices?.count ?? count); i += 3) {
    const a = indices ? indices.getX(i) : i;
    join(a, indices ? indices.getX(i + 1) : i + 1); join(a, indices ? indices.getX(i + 2) : i + 2);
  }
  const protectedIslands = new Set<number>();
  for (let i = 0; i < count; i++) if (positions.getY(i) > above) protectedIslands.add(find(i));
  return Uint8Array.from({ length: count }, (_, i) => Number(protectedIslands.has(find(i))));
}
