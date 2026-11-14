import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { DriverAssetDefinition, KartAssetDefinition, Triple, VisualTransform } from '../../config/visualAssets';
import type { ModelOptions } from './prepareModel';

function matrix(transform: VisualTransform) {
  return new Matrix4().compose(new Vector3(...transform.position), new Quaternion().setFromEuler(new Euler(...transform.rotation)), new Vector3().setScalar(transform.scale));
}
/** Static, symmetric wrist fitting only; no skeleton, IK or animation is fabricated. */
export function driverFitOptions(kart: KartAssetDefinition, driver: DriverAssetDefinition): ModelOptions {
  const options: ModelOptions = { hiddenNodes: driver.hideWhileDriving };
  if (driver.pose === 'authored') return options;
  const inverse = matrix(kart.seat).multiply(matrix(driver.transform)).invert();
  const wrist = new Vector3(...kart.steeringGrip).applyMatrix4(inverse);
  if (driver.pose === 'supplied-static-seat') {
    wrist.y += 3;
    // The supplied glove extends beyond its wrist along the forearm.
    wrist.sub(new Vector3(0, 0.12, 0.25));
    return { ...options, staticDriver: true, handTarget: wrist.toArray() as Triple };
  }
  if (!driver.staticPose) return options;
  wrist.y += driver.staticPose.hip;
  const offset = wrist.clone().sub(new Vector3(...driver.staticPose.fittedWrist));
  return { ...options, staticPose: { ...driver.staticPose, fittedWrist: wrist.toArray() as Triple,
    fittedElbow: new Vector3(...driver.staticPose.fittedElbow).addScaledVector(offset, 0.5).toArray() as Triple } };
}
