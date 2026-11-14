import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { SampledTrack } from '../core/types';
import { tunnelOutline, tunnelSections, type AlpineTunnel } from '../tracks/frostbiteScenery';
import { offsetSample } from '../tracks/trackSampling';

/** A continuous shell follows the same sampled ribbon as road/rails, with two open portals. */
export function makeAlpineTunnel(track: SampledTrack, tunnel: AlpineTunnel): BufferGeometry {
  const sections = tunnelSections(track, tunnel), outlines = [tunnelOutline(), tunnelOutline(true)];
  const width = outlines[0].length, vertices: number[] = [], colors: number[] = [], indices: number[] = [];
  for (const [surface, outline] of outlines.entries()) for (const section of sections) for (const p of outline) {
    const world = offsetSample(section, p.offset); vertices.push(world.x, p.height, world.z);
    const snow = surface === 1 && p.height > 7;
    colors.push(...(snow ? [0.88, 0.95, 1] : surface === 0 ? [0.34, 0.46, 0.58] : [0.48, 0.61, 0.72]));
  }
  const layer = sections.length * width;
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, b, c, b, d, c);
  for (let surface = 0; surface < 2; surface++) for (let i = 0; i < sections.length - 1; i++) for (let j = 0; j < width - 1; j++) {
    const a = surface * layer + i * width + j;
    if (surface === 0) quad(a, a + width, a + 1, a + width + 1);
    else quad(a, a + 1, a + width, a + width + 1);
  }
  for (const section of [0, sections.length - 1]) for (let j = 0; j < width - 1; j++) {
    const a = section * width + j; quad(a, a + 1, a + layer, a + layer + 1);
  }
  for (let i = 0; i < sections.length - 1; i++) for (const edge of [0, width - 1]) {
    const a = i * width + edge; quad(a, a + layer, a + width, a + width + layer);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}
