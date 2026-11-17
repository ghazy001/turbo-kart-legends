import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { DriverAssetDefinition, KartAssetDefinition, Triple, VisualTransform } from '../../config/visualAssets';
import type { ModelOptions } from './prepareModel';

function matrix(transform: VisualTransform) {
  return new Matrix4().compose(new Vector3(...transform.position), new Quaternion().setFromEuler(new Euler(...transform.rotation)), new Vector3().setScalar(transform.scale));
}
/** The old seat marker was a pelvis guess, not the cushion. Resolve each body onto the measured cushion. */
export function resolveDriverMount(kart: KartAssetDefinition, driver: DriverAssetDefinition): VisualTransform {
  if (driver.pose === 'authored') return driver.transform;
  const offset = new Vector3(...kart.cockpit.cushion).applyMatrix4(matrix(kart.seat).invert());
  offset.y += driver.cushionClearance;
  offset.add(new Vector3(...driver.transform.position));
  return { ...driver.transform, position: offset.toArray() as Triple };
}
/** Static, symmetric wrist fitting only; no skeleton, IK or animation is fabricated. */
export function driverFitOptions(kart: KartAssetDefinition, driver: DriverAssetDefinition, mount = resolveDriverMount(kart, driver)): ModelOptions {
  const options: ModelOptions = { hiddenNodes: driver.hideWhileDriving, surface: 'racer-matte' };
  if (driver.pose === 'authored') return options;
  const inverse = matrix(kart.seat).multiply(matrix(mount)).invert();
  const wrist = new Vector3(...kart.steeringGrip).applyMatrix4(inverse);
  options.footFloor = new Vector3(0, kart.cockpit.footFloor, 0).applyMatrix4(inverse).y;
  if (driver.rigSeat) {
    wrist.y += driver.rigSeat.hip;
    // Place the glove palm at the wheel, rather than its wrist joint.
    wrist.z -= driver.rigSeat.palmOffset * (driver.rigSeat.handScale ?? 1);
    return { ...options, rigSeat: driver.rigSeat, handTarget: wrist.toArray() as Triple };
  }
  if (driver.pose === 'supplied-static-seat') {
    wrist.y += 3;
    // The supplied glove extends beyond its wrist along the forearm.
    wrist.sub(new Vector3(0, 0.12, 0.25));
    return { ...options, staticDriver: true, handTarget: wrist.toArray() as Triple };
  }
  if (!driver.staticPose) return options;
  wrist.y += driver.staticPose.hip;
  const offset = wrist.clone().sub(new Vector3(...driver.staticPose.fittedWrist));
  const elbow = new Vector3(...driver.staticPose.fittedElbow).addScaledVector(offset, 0.5);
  wrist.addScaledVector(wrist.clone().sub(elbow).normalize(), -(driver.staticPose.palmReach ?? 0));
  return { ...options, staticPose: { ...driver.staticPose, fittedWrist: wrist.toArray() as Triple,
    fittedElbow: elbow.toArray() as Triple } };
}
