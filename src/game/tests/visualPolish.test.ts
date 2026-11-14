import { BufferGeometry, Float32BufferAttribute, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { driverAssets, karts, racers } from '../config/visualAssets';
import { driverFitOptions } from '../render/models/driverFit';
import { createStaticPose } from '../render/models/staticPose';
import { applyPaletteBatch } from '../render/models/paletteBatch';
import { protectedPoseVertices } from '../render/models/poseRegions';
import { prepareModel } from '../render/models/prepareModel';
import { instantiateModel, disposeModelCache } from '../render/models/modelInstances';

function mount(point: Vector3, driver: typeof racers[number], kart: typeof karts[number]) {
  // Registry defaults are centered and unrotated; assert this before using the simple transform.
  expect(driver.transform.rotation).toEqual([0, 0, 0]); expect(kart.seat.rotation).toEqual([0, 0, 0]);
  return point.multiplyScalar(driver.transform.scale).add(new Vector3(...driver.transform.position)).multiplyScalar(kart.seat.scale).add(new Vector3(...kart.seat.position));
}
describe('cockpit fitting', () => {
  for (const kart of karts) for (const racer of racers.filter(driver => driver.staticPose)) it(`${racer.id}/${kart.id}: wrists reach the configured wheel grips`, () => {
    const options = driverFitOptions(kart, racer);
    expect(options.staticPose).toBeDefined();
    const point = new Vector3(...racer.staticPose!.wrist);
    createStaticPose(options.staticPose!)(point, racer.staticPose!.armMeshes?.[0]);
    expect(mount(point, racer, kart).distanceTo(new Vector3(...kart.steeringGrip))).toBeLessThan(1e-5);
    expect(racer.staticPose!.fittedWrist).not.toBe(options.staticPose!.fittedWrist);
  });
  it('keeps Arnold’s headphone mesh out of arm deformation', () => {
    const pose = driverFitOptions(karts[0], driverAssets.arnold).staticPose!;
    const source = new Vector3(0.5, 1.35, 0), point = source.clone();
    createStaticPose(pose)(point, 'Object_2');
    expect(point).toEqual(source.clone().add(new Vector3(0, -pose.hip, 0)));
    const neck = new Vector3(0.5, 1.36, -0.2), unchanged = neck.clone().add(new Vector3(0, -pose.hip, 0));
    createStaticPose(pose)(neck, 'Object_3', false); expect(neck.distanceTo(unchanged)).toBeLessThan(1e-10);
  });
  it('protects complete head islands across duplicate seam vertices, leaving separate arms bendable', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([0, 2, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0.9, 0, 0, 1, 0, 2, 1, 0, 3, 1, 0, 2, 0.9, 0], 3));
    expect(Array.from(protectedPoseVertices(geometry, 1.5))).toEqual([1, 1, 1, 1, 1, 1, 0, 0, 0]); geometry.dispose();
  });
  it('removes only the configured non-driving prop from the clone', () => {
    const source = new Group(), prop = new Mesh(new BoxGeometry(), new MeshStandardMaterial()), body = prop.clone();
    prop.name = 'Object_2'; body.name = 'body'; source.add(prop, body);
    const model = prepareModel(source, driverFitOptions(karts[0], driverAssets.spongebob));
    expect(source.getObjectByName('Object_2')).toBe(prop);
    expect(model.root.getObjectByName('Object_2')).toBeUndefined(); expect(model.root.getObjectByName('body')).toBeDefined();
    model.dispose(); prop.geometry.dispose(); (prop.material as MeshStandardMaterial).dispose();
  });
});
describe('static palette batching', () => {
  it('preserves linear colors and PBR settings while sharing a shader; sources remain immutable', () => {
    const group = new Group(), a = new MeshStandardMaterial({ color: '#e05234', roughness: 0.6 }), b = new MeshStandardMaterial({ color: '#234bc7', roughness: 0.6 });
    const first = new Mesh(new BoxGeometry(), a), second = new Mesh(new BoxGeometry(), b); group.add(first, second);
    const sourceGeometry = first.geometry, palette = new Map<string, MeshStandardMaterial>();
    const owned = applyPaletteBatch(group, palette);
    expect(first.material).toBe(second.material); expect(first.material.roughness).toBe(0.6); expect(first.material.color.getHex()).toBe(0xffffff);
    const colors = first.geometry.getAttribute('color'); expect(colors.getX(0)).toBeCloseTo(a.color.r); expect(colors.getY(0)).toBeCloseTo(a.color.g); expect(colors.getZ(0)).toBeCloseTo(a.color.b);
    expect(sourceGeometry.getAttribute('color')).toBeUndefined(); expect(a.vertexColors).toBe(false);
    const glass = new Mesh(new BoxGeometry(), new MeshStandardMaterial({ transparent: true, opacity: 0.5 })); group.add(glass); const glassMaterial = glass.material;
    applyPaletteBatch(group, palette).forEach(geometry => geometry.dispose()); expect(glass.material).toBe(glassMaterial);
    owned.forEach(geometry => geometry.dispose()); sourceGeometry.dispose(); second.geometry.dispose(); glass.geometry.dispose(); a.dispose(); b.dispose(); glassMaterial.dispose(); for (const material of palette.values()) material.dispose();
  });
  it('batches compatible baked colors without combining independent wheel transforms', () => {
    const source = new Group(), a = new Mesh(new BoxGeometry(), new MeshStandardMaterial({ color: 'red' })), b = new Mesh(new BoxGeometry(), new MeshStandardMaterial({ color: 'blue' }));
    a.name = 'front'; b.name = 'rear'; b.position.z = -2; source.add(a, b);
    const options = { wheels: [{ node: 'front', front: true }, { node: 'rear', front: false }] };
    const first = instantiateModel(source, 'palette-test', options), second = instantiateModel(source, 'palette-test', options);
    first.wheels[0].steer.rotation.y = 0.4; expect(second.wheels[0].steer.rotation.y).toBe(0);
    expect(first.wheels[0].spin.children[0]).not.toBe(second.wheels[0].spin.children[0]);
    expect(a.material.vertexColors).toBe(false); disposeModelCache(); a.geometry.dispose(); b.geometry.dispose(); a.material.dispose(); b.material.dispose();
  });
});
