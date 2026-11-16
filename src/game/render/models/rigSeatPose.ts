import { Bone, Object3D, Quaternion, SkinnedMesh, Vector3 } from 'three';
import type { RigSeatDefinition, Triple } from '../../config/visualAssets';

/** A fitted, static skeleton pose. No clips or animated steering are fabricated. */
export function applyRigSeatPose(root: Object3D, config: RigSeatDefinition, handTarget: Triple): void {
  const bone = (name: string): Bone => {
    const node = root.getObjectByName(name);
    if (!(node instanceof Bone)) throw new Error(`Missing seated rig joint: ${name}`);
    return node;
  };
  const world = (node: Object3D) => node.getWorldPosition(new Vector3());
  const aim = (joint: Bone, child: Bone, target: Vector3) => {
    root.updateMatrixWorld(true);
    const origin = world(joint), before = world(child).sub(origin).normalize(), after = target.clone().sub(origin).normalize();
    const rotation = new Quaternion().setFromUnitVectors(before, after).multiply(joint.getWorldQuaternion(new Quaternion()));
    joint.quaternion.copy(joint.parent!.getWorldQuaternion(new Quaternion()).invert().multiply(rotation));
    root.updateMatrixWorld(true);
  };
  const chain = (names: readonly [string, string, string], middle: Vector3, end: Vector3) => {
    const [upper, lower, extremity] = names.map(bone);
    aim(upper, lower, middle);
    lower.position.copy(upper.worldToLocal(middle.clone()));
    root.updateMatrixWorld(true);
    aim(lower, extremity, end);
    extremity.position.copy(lower.worldToLocal(end.clone()));
    root.updateMatrixWorld(true);
    return extremity;
  };
  root.updateMatrixWorld(true);
  for (const [index, side] of [1, -1].entries()) {
    const hand = new Vector3(side * handTarget[0], handTarget[1], handTarget[2]);
    const elbow = new Vector3(side * Math.max(config.elbow.minWidth, handTarget[0] * config.elbow.widthRatio), config.elbow.height, handTarget[2] * config.elbow.reachRatio);
    const wrist = chain(config.arms[index], elbow, hand);
    aim(wrist, bone(config.fingers[index]), hand.clone().add(new Vector3(0, 0, 1)));
    const knee = new Vector3(...config.knee), ankle = new Vector3(...config.ankle); knee.x *= side; ankle.x *= side;
    const foot = chain(config.legs[index], knee, ankle);
    aim(foot, bone(config.toes[index]), world(foot).add(new Vector3(0, 0, 1)));
  }
  // Shift the whole skeleton AND its meshes together so the pelvis mounts on the seat.
  root.position.y -= config.hip;
  root.updateMatrixWorld(true);
  root.traverse(node => {
    if (node instanceof SkinnedMesh) {
      node.skeleton.update();
      node.computeBoundingBox(); node.computeBoundingSphere();
    }
  });
}
