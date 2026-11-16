import { Box3, Color, Float32BufferAttribute, Group, Material, Matrix4, Mesh, SkinnedMesh, MeshPhysicalMaterial, MeshStandardMaterial, Vector3, type BufferGeometry, type Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { environmentAssets, type EnvironmentAssetId } from '../../config/environmentAssets';
export interface EnvironmentPart { geometry: BufferGeometry; material: Material }
export interface EnvironmentModel { parts: EnvironmentPart[]; size: Vector3; dispose: () => void }
const cache = new Map<Object3D, Map<EnvironmentAssetId, EnvironmentModel>>();

/** Bake inspected exporter transforms into shared static buffers; source scene/materials stay intact. */
export function prepareEnvironmentModel(source: Object3D, id: EnvironmentAssetId): EnvironmentModel {
  let variants = cache.get(source); if (!variants) { variants = new Map(); cache.set(source, variants); }
  const previous = variants.get(id); if (previous) return previous;
  const asset = environmentAssets[id], root = new Group(); root.rotation.y = asset.yaw; root.add(clone(source)); root.updateMatrixWorld(true);
  // All LODs use the original source envelope, so switching cannot resize/recenter a tree.
  const minimum = new Vector3(...asset.sourceMin), maximum = minimum.clone().add(new Vector3(...asset.sourceSize));
  const bounds = new Box3(minimum, maximum).applyMatrix4(new Matrix4().makeRotationY(asset.yaw));
  const center = bounds.getCenter(new Vector3()), size = bounds.getSize(new Vector3()), scale = asset.height / size.y;
  const normalize = new Matrix4().makeScale(scale, scale, scale).multiply(new Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z));
  const groups = new Map<string, { original: Material; geometries: BufferGeometry[] }>();
  root.traverse(node => {
    if (!(node instanceof Mesh)) return;
    if (Array.isArray(node.material)) throw new Error('Environment batches require single-material primitives.');
    const geometry = node.geometry.clone();
    if (node instanceof SkinnedMesh) {
      if (id !== 'dinosaur') throw new Error('This rig needs an explicit static-pose integration.');
      // The supplied dinosaur has a bound skeleton but no clips. Freeze its
      // actual supplied pose once; never instance a shared mutable skeleton.
      node.skeleton.update();
      const positions = new Float32Array(geometry.attributes.position.count * 3), vertex = new Vector3();
      for (let i = 0; i < geometry.attributes.position.count; i++) { node.getVertexPosition(i, vertex); vertex.toArray(positions, i * 3); }
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      geometry.deleteAttribute('skinIndex'); geometry.deleteAttribute('skinWeight'); geometry.deleteAttribute('tangent'); geometry.computeVertexNormals();
    }
    geometry.applyMatrix4(new Matrix4().multiplyMatrices(normalize, node.matrixWorld));
    // Preserve authored vertex colors/UV channels. Incompatible layouts sharing
    // a material form separate batches instead of losing data or failing merge.
    const layout = Object.keys(geometry.attributes).map(name => { const attribute = geometry.getAttribute(name); return `${name}:${attribute.itemSize}:${attribute.normalized}`; }).sort().join('|');
    const key = `${node.material.uuid}/${layout}`;
    if (!groups.has(key)) groups.set(key, { original: node.material, geometries: [] }); groups.get(key)!.geometries.push(geometry);
  });
  const parts: EnvironmentPart[] = [];
  for (const { original, geometries } of groups.values()) {
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
      if (id === 'ice-cream-truck' || id === 'sugar-mascot' || id === 'sugarcube-corner') material.metalness = Math.min(material.metalness, 0.12);
      if (id === 'lollipops-pack' && material.opacity > 0.97) { material.transparent = false; material.opacity = 1; material.depthWrite = true; }
      if (id === 'charizard' || id === 'desert-rocks' || id === 'dinosaur' || id === 'deadly-nadder' || id === 'momma-dino') material.metalness = Math.min(material.metalness, 0.08);
      // Preserve the visible eye under a light clear shell, without an expensive
      // full-scene transmission pass for a tiny distant creature detail.
      if (id === 'momma-dino' && material instanceof MeshPhysicalMaterial && material.transmission > 0) {
        material.transmission = 0; material.transparent = true; material.opacity = 0.12; material.depthWrite = false;
      }
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
