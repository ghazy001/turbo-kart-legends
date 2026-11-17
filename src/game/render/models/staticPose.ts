import { MathUtils, Quaternion, Vector3 } from 'three';
import type { StaticPoseDefinition } from '../../config/visualAssets';

/** Approximate mesh deformation only. This does not create bones or clips. */
export function createStaticPose(config: StaticPoseDefinition): (point: Vector3, meshName?: string, allowPose?: boolean) => void {
  const origin = new Vector3(...(config.origin ?? [0, 0, 0]));
  const shoulder = new Vector3(...config.shoulder), elbow = new Vector3(...config.elbow), wrist = new Vector3(...config.wrist);
  const fittedElbow = new Vector3(...config.fittedElbow), fittedWrist = new Vector3(...config.fittedWrist);
  const upperDirection = elbow.clone().sub(shoulder).normalize(), foreDirection = wrist.clone().sub(elbow).normalize();
  const upper = new Quaternion().setFromUnitVectors(upperDirection, fittedElbow.clone().sub(shoulder).normalize());
  const fore = new Quaternion().setFromUnitVectors(foreDirection, fittedWrist.clone().sub(fittedElbow).normalize());
  const upperScale = fittedElbow.distanceTo(shoulder) / elbow.distanceTo(shoulder);
  const foreScale = fittedWrist.distanceTo(fittedElbow) / wrist.distanceTo(elbow);
  const original = new Vector3(), scratch = new Vector3();
  const rotateLeg = (p: Vector3, pivot: number, angle: number) => {
    const y = p.y - pivot, z = p.z; p.y = pivot + y * Math.cos(angle) - z * Math.sin(angle); p.z = y * Math.sin(angle) + z * Math.cos(angle);
  };
  return (point, meshName, allowPose = true) => {
    point.sub(origin);
    const y = point.y;
    if (allowPose && (!config.legMeshes || config.legMeshes.includes(meshName ?? '')) && y < config.hip + 0.03) {
      rotateLeg(point, config.knee, config.bend * (1 - MathUtils.smoothstep(y, config.knee - 0.04, config.knee + 0.04)));
      rotateLeg(point, config.hip, -config.bend * (1 - MathUtils.smoothstep(y, config.hip - 0.04, config.hip + 0.03)));
    }
    if (allowPose && (!config.armMeshes || config.armMeshes.includes(meshName ?? '')) && y >= config.armMinY && y <= config.armMaxY && Math.abs(point.x) > shoulder.x * 0.9) {
      const side = Math.sign(point.x); point.x *= side; original.copy(point);
      point.sub(shoulder); point.addScaledVector(upperDirection, point.dot(upperDirection) * (upperScale - 1)); point.applyQuaternion(upper).add(shoulder);
      scratch.copy(original).sub(elbow); scratch.addScaledVector(foreDirection, scratch.dot(foreDirection) * (foreScale - 1)); scratch.applyQuaternion(fore).add(fittedElbow);
      point.lerp(scratch, MathUtils.smoothstep(original.x, elbow.x - 0.04, elbow.x + 0.04));
      scratch.copy(original).sub(wrist).applyQuaternion(fore).add(fittedWrist);
      point.lerp(scratch, MathUtils.smoothstep(original.x, wrist.x - 0.04, wrist.x + 0.04));
      const start = config.armStartX ?? shoulder.x * 0.9;
      const armWeight = MathUtils.smoothstep(original.x, start, Math.max(start + 0.05, shoulder.x * 1.35));
      const depthWeight = config.armMaxZ === undefined ? 1 : 1 - MathUtils.smoothstep(original.z, config.armMaxZ - 0.04, config.armMaxZ + 0.04);
      point.lerp(original, 1 - armWeight * depthWeight);
      point.x *= side;
    }
    point.y -= config.hip;
  };
}
