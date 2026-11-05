import { MathUtils, Quaternion, Vector3 } from 'three';

const hipHeight = 3;
const kneeHeight = 1.45;
const bend = 1.3;
const armScratch = new Vector3();
const bindDirection = new Vector3(1, 0, 0);
const shoulder = new Vector3(0.95, 4.05, 0.05);
const elbow = new Vector3(2.1, 4.05, 0.05);
const wrist = new Vector3(3, 4.05, 0.05);
const fittedElbow = new Vector3(1.35, 3.55, 1.05);
const fittedWrist = new Vector3(1.3, 4.05, 1.9);
const upperRotation = new Quaternion().setFromUnitVectors(bindDirection, fittedElbow.clone().sub(shoulder).normalize());
const foreRotation = new Quaternion().setFromUnitVectors(bindDirection, fittedWrist.clone().sub(fittedElbow).normalize());
const handRotation = foreRotation;

function rotateLeg(point: Vector3, pivot: number, angle: number) {
  const y = point.y - pivot;
  const z = point.z;
  point.y = pivot + y * Math.cos(angle) - z * Math.sin(angle);
  point.z = y * Math.sin(angle) + z * Math.cos(angle);
}

/** Approximate bind-pose fitting for this unrigged OBJ export only.
 * Operates in its inspected Y-up scene coordinates, before scale/seat transforms.
 * Continuous joint blends avoid cutting meshes or hiding the character's legs.
 */
export function fitStaticDriverVertex(point: Vector3, meshName: string): Vector3 {
  const originalY = point.y;
  if (originalY < hipHeight + 0.2) {
    const kneeWeight = 1 - MathUtils.smoothstep(originalY, kneeHeight - 0.2, kneeHeight + 0.2);
    rotateLeg(point, kneeHeight, bend * kneeWeight);
    const hipWeight = 1 - MathUtils.smoothstep(originalY, hipHeight - 0.15, hipHeight + 0.2);
    rotateLeg(point, hipHeight, -bend * hipWeight);
  }
  // Only gloves and shirt contain arms; face/hair/overalls must retain their shape.
  if ((meshName === 'Object_4' || meshName === 'Object_7') && Math.abs(point.x) > 0.8) {
    const side = Math.sign(point.x);
    point.x *= side;
    const original = point.clone();
    point.sub(shoulder).applyQuaternion(upperRotation).add(shoulder);
    armScratch.copy(original).sub(elbow).applyQuaternion(foreRotation).add(fittedElbow);
    point.lerp(armScratch, MathUtils.smoothstep(original.x, 1.9, 2.3));
    armScratch.copy(original).sub(wrist).applyQuaternion(handRotation).add(fittedWrist);
    point.lerp(armScratch, MathUtils.smoothstep(original.x, 2.8, 3.2));
    point.lerp(original, 1 - MathUtils.smoothstep(original.x, 0.8, 1.2));
    point.x *= side;
  }
  point.y -= hipHeight; // Driver's mounting origin is the hip, not the feet.
  return point;
}
