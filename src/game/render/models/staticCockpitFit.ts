import { MathUtils, Vector3, type BufferGeometry, type Mesh } from 'three';
import { createStaticPose } from './staticPose';
import { createSuppliedStaticPose } from './staticDriverPose';
import { protectedPoseVertices } from './poseRegions';
import type { ModelOptions } from './prepareModel';

/** Fit clones once, then settle both feet together. Rigid shoe regions translate without being flattened. */
export function fitStaticMeshes(meshes: ReadonlyMap<Mesh, BufferGeometry>, options: ModelOptions): void {
  const config = options.staticPose;
  const fit: ((point: Vector3, meshName: string, allowPose?: boolean) => void) | null = config ? createStaticPose(config) : options.staticDriver ? createSuppliedStaticPose(options.handTarget) : null;
  if (!fit) return;
  const weights = new Map<BufferGeometry, Float32Array>(), point = new Vector3();
  const hip = config?.hip ?? 3, knee = config?.knee ?? 1.45;
  let lowestFoot = Infinity;
  for (const [mesh, geometry] of meshes) {
    const protectedVertices = config?.protectComponentsAbove === undefined ? null : protectedPoseVertices(geometry, config.protectComponentsAbove);
    const positions = geometry.getAttribute('position'), footWeights = new Float32Array(positions.count);
    const legs = !config?.legMeshes || config.legMeshes.includes(mesh.name);
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i);
      const y = point.y - (config?.origin?.[1] ?? 0);
      const weight = legs ? 1 - MathUtils.smoothstep(y, knee + (hip - knee) * 0.1, hip) : 0;
      fit(point, mesh.name, !protectedVertices?.[i]);
      positions.setXYZ(i, point.x, point.y, point.z); footWeights[i] = weight;
      if (weight > 0.999) lowestFoot = Math.min(lowestFoot, point.y);
    }
    weights.set(geometry, footWeights);
  }
  const settle = options.footFloor !== undefined && Number.isFinite(lowestFoot) ? options.footFloor - lowestFoot : 0;
  for (const geometry of meshes.values()) {
    const positions = geometry.getAttribute('position'), footWeights = weights.get(geometry)!;
    if (settle) for (let i = 0; i < positions.count; i++) positions.setY(i, positions.getY(i) + footWeights[i] * settle);
    positions.needsUpdate = true; geometry.computeVertexNormals();
    if (geometry.index && geometry.hasAttribute('tangent') && geometry.hasAttribute('uv')) geometry.computeTangents();
  }
}
