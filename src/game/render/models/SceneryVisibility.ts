import { Color, Frustum, Matrix4, Object3D, Sphere, type Camera } from 'three';
import { environmentAssets, environmentSize, type EnvironmentAssetId, type EnvironmentPlacement } from '../../config/environmentAssets';

/** One camera query per asset/LOD, shared by every material batch of that model. */
export class SceneryVisibility {
  readonly matrices: Matrix4[];
  readonly colors: Color[];
  readonly indices: number[] = [];
  version = 0;
  private readonly spheres: Sphere[];
  private readonly frustum = new Frustum();
  private readonly projection = new Matrix4();
  private readonly previous = new Matrix4();
  private readonly next: number[] = [];
  private initialized = false;
  constructor(placements: readonly EnvironmentPlacement[], private readonly id: EnvironmentAssetId, private readonly far = false) {
    const radius = Math.hypot(...environmentSize(id)) / 2, height = environmentAssets[id].height;
    this.colors = placements.map(placement => new Color(placement.tint));
    this.spheres = placements.map(placement => {
      const object = new Object3D(); object.position.set(placement.position[0], placement.position[1] + height * placement.scale / 2, placement.position[2]);
      return new Sphere(object.position, radius * placement.scale);
    });
    this.matrices = placements.map(placement => {
      const object = new Object3D(); object.position.set(...placement.position); object.scale.setScalar(placement.scale); object.rotation.y = placement.yaw; object.updateMatrix(); return object.matrix;
    });
  }
  update(camera: Camera) {
    this.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (this.initialized && this.previous.equals(this.projection)) return;
    this.previous.copy(this.projection); this.frustum.setFromProjectionMatrix(this.projection); this.next.length = 0;
    const asset = environmentAssets[this.id];
    for (let i = 0; i < this.spheres.length; i++) {
      const sphere = this.spheres[i], distance = camera.position.distanceTo(sphere.center);
      if (distance > asset.distance + sphere.radius || !this.frustum.intersectsSphere(sphere)) continue;
      if (this.id === 'stylized-tree') {
        const near = environmentAssets['stylized-tree'].nearDistance;
        if (this.far ? distance < near : distance >= near) continue;
      }
      this.next.push(i);
    }
    if (!this.initialized || this.next.length !== this.indices.length || this.next.some((index, i) => index !== this.indices[i])) {
      this.indices.length = 0; this.indices.push(...this.next); this.version++;
    }
    this.initialized = true;
  }
}
