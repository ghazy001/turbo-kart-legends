import { Box3, Color, Group, Material, Matrix4, Mesh, SkinnedMesh, MeshStandardMaterial, Vector3, type BufferGeometry, type Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { environmentAssets, type EnvironmentAssetId } from '../../config/environmentAssets';
export interface EnvironmentPart { geometry: BufferGeometry; material: Material }
export interface EnvironmentModel { parts: EnvironmentPart[]; size: Vector3; dispose: () => void }
const cache = new Map<Object3D, Map<EnvironmentAssetId, EnvironmentModel>>();

/** Bake inspected exporter transforms into shared static buffers; source scene/materials stay intact. */
export function prepareEnvironmentModel(source: Object3D, id: EnvironmentAssetId): EnvironmentModel {
  let variants = cache.get(source); if (!variants) { variants = new Map(); cache.set(source, variants); }
  const previous = variants.get(id); if (previous) return previous;
  const asset = environmentAssets[id], root = new Group(); root.rotation.y = asset.yaw; root.add(source.clone(true)); root.updateMatrixWorld(true);
  // All LODs use the original source envelope, so switching cannot resize/recenter a tree.
  const minimum = new Vector3(...asset.sourceMin), maximum = minimum.clone().add(new Vector3(...asset.sourceSize));
  const bounds = new Box3(minimum, maximum).applyMatrix4(new Matrix4().makeRotationY(asset.yaw));
  const center = bounds.getCenter(new Vector3()), size = bounds.getSize(new Vector3()), scale = asset.height / size.y;
  const normalize = new Matrix4().makeScale(scale, scale, scale).multiply(new Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z));
  const groups = new Map<Material, BufferGeometry[]>();
  root.traverse(node => {
    if (!(node instanceof Mesh)) return;
    if (Array.isArray(node.material) || node instanceof SkinnedMesh) throw new Error('Environment batches require static single-material primitives.');
    const geometry = node.geometry.clone(); geometry.applyMatrix4(new Matrix4().multiplyMatrices(normalize, node.matrixWorld));
    if (!groups.has(node.material)) groups.set(node.material, []); groups.get(node.material)!.push(geometry);
  });
  const parts: EnvironmentPart[] = [];
  for (const [original, geometries] of groups) {
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach(buffer => buffer.dispose());
    if (!geometry) throw new Error(`Incompatible static buffers in ${id}`);
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const material = original.clone();
    if (material instanceof MeshStandardMaterial) {
      const service = id === 'gas-station' || id === 'lowpoly-gas-station';
      if (!material.transparent) material.roughness = Math.max(material.roughness, service ? 0.55 : 0.8);
      if (service) { material.metalness = Math.min(material.metalness, 0.3); material.aoMapIntensity = 0.6; }
      if (id === 'stylized-house') { material.metalness = Math.min(material.metalness, 0.05); material.aoMapIntensity = 0.75; }
      material.emissiveIntensity = id === 'gas-station' ? 0.35 : 0;
      if (id === 'stylized-tree' && /leaf/i.test(material.name)) {
        material.transparent = false; material.alphaTest = 0.15; material.depthWrite = true; material.alphaToCoverage = true;
        material.color.lerp(new Color('#8aa965'), 0.2);
      }
      for (const texture of [material.map, material.normalMap, material.roughnessMap, material.aoMap]) if (texture) texture.anisotropy = 4;
    }
    parts.push({ geometry, material });
  }
  const model: EnvironmentModel = { parts, size: size.multiplyScalar(scale), dispose: () => { parts.forEach(part => { part.geometry.dispose(); part.material.dispose(); }); } };
  variants.set(id, model); return model;
}
export function disposeEnvironmentModels() { for (const variants of cache.values()) for (const model of variants.values()) model.dispose(); cache.clear(); }
if (import.meta.hot) import.meta.hot.dispose(disposeEnvironmentModels);
