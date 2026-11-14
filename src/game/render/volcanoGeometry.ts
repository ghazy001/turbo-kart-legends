import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { VolcanicPeak } from '../tracks/volcanoScenery';

/** Three slender lava seams follow the actual nine-sided frustum faces, rather than floating over them. */
export function makeVolcanoFissures(peaks: readonly VolcanicPeak[]): BufferGeometry {
  const vertices: number[] = [], indices: number[] = [];
  for (const peak of peaks) for (const face of [0, 3, 6]) {
    const start = vertices.length / 3;
    for (let level = 0; level <= 6; level++) for (const side of [-1, 1]) {
      const height = 0.15 + (peak.height * 0.97 - 0.15) * level / 6, offset = side * 0.02;
      const angle = peak.rotation + (face * 2 + 1) * Math.PI / 9 + offset;
      const radius = peak.radius * (1 - 0.73 * height / peak.height) * Math.cos(Math.PI / 9) / Math.cos(offset) + 0.04;
      vertices.push(peak.x + Math.sin(angle) * radius, height, peak.z + Math.cos(angle) * radius);
    }
    for (let level = 0; level < 6; level++) {
      const a = start + level * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new BufferGeometry(); geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere(); return geometry;
}
