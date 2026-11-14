import { Group, Material, Mesh, MeshStandardMaterial, SkinnedMesh, Texture, type BufferGeometry, type Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { applyPaletteBatch } from './paletteBatch';
import { prepareModel, type ModelOptions, type PreparedModel } from './prepareModel';

const templates = new Map<Object3D, Map<string, PreparedModel>>();
const materials = new Map<Material, Material>();
const palette = new Map<string, MeshStandardMaterial>();
const textures = new Map<Texture, Texture>();
/** One capped texture per source, shared across instances; GLTFLoader owns color-space settings. */
function optimizedTexture(source: Texture): Texture {
  const cached = textures.get(source); if (cached) return cached;
  const image = source.image as { width?: number; height?: number } | undefined;
  if (!image?.width || !image.height || Math.max(image.width, image.height) <= 1024 || typeof document === 'undefined') return source;
  const ratio = 1024 / Math.max(image.width, image.height), canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * ratio); canvas.height = Math.round(image.height * ratio);
  const context = canvas.getContext('2d'); if (!context) return source;
  context.drawImage(source.image as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  const texture = source.clone(); texture.image = canvas; texture.anisotropy = 4; texture.needsUpdate = true;
  textures.set(source, texture); return texture;
}
function optimizeMaterials(root: Object3D) {
  const get = (source: Material) => {
    const cached = materials.get(source); if (cached) return cached;
    const material = source.clone();
    for (const key of Object.keys(material)) {
      const value = Reflect.get(material, key) as unknown;
      if (value instanceof Texture) Reflect.set(material, key, optimizedTexture(value));
    }
    materials.set(source, material); return material;
  };
  root.traverse(node => { if (node instanceof Mesh) node.material = Array.isArray(node.material) ? node.material.map(get) : get(node.material); });
}
/** Merge only baked, static siblings with identical materials and buffer layouts.
 * Skeletons and authored animation hierarchies are never merged. */
function mergeStaticSiblings(root: Group): BufferGeometry[] {
  const owned: BufferGeometry[] = [], groups: Object3D[] = [];
  root.traverse(node => { if (node.children.length) groups.push(node); });
  for (const parent of groups) {
    const batches = new Map<string, Mesh[]>();
    for (const child of parent.children) {
      if (!(child instanceof Mesh) || child instanceof SkinnedMesh || Array.isArray(child.material) || Object.keys(child.geometry.morphAttributes).length) continue;
      const sourceGeometry: BufferGeometry = child.geometry;
      const layout = Object.entries(sourceGeometry.attributes).map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.normalized}:${attribute.array.constructor.name}`).sort().join('|');
      const key = `${child.material.uuid}:${Boolean(child.geometry.index)}:${layout}`;
      const batch = batches.get(key) ?? []; batch.push(child); batches.set(key, batch);
    }
    for (const batch of batches.values()) {
      if (batch.length < 2) continue;
      const geometry = mergeGeometries(batch.map(mesh => mesh.geometry)); if (!geometry) continue;
      const visual = new Mesh(geometry, batch[0].material); visual.name = 'merged-static-parts'; visual.castShadow = true; visual.receiveShadow = true;
      for (const mesh of batch) mesh.removeFromParent(); parent.add(visual); owned.push(geometry);
    }
  }
  return owned;
}
/** Independent transforms, bones and wheel pivots; immutable fitted buffers/textures shared. */
export function instantiateModel(source: Object3D, key: string, options: ModelOptions): PreparedModel {
  const cacheKey = `${key}:${JSON.stringify(options)}`;
  let entries = templates.get(source); if (!entries) { entries = new Map(); templates.set(source, entries); }
  let template = entries.get(cacheKey);
  if (!template) {
    template = prepareModel(source, options); optimizeMaterials(template.root);
    const painted = options.wheels?.length ? applyPaletteBatch(template.root, palette) : [];
    const merged = options.staticDriver || options.staticPose || options.wheels?.length ? mergeStaticSiblings(template.root) : [];
    template.releaseUnusedGeometry();
    const live = new Set<BufferGeometry>();
    template.root.traverse(node => { if (node instanceof Mesh) live.add(node.geometry); });
    const extras = [...painted, ...merged].filter(geometry => {
      if (live.has(geometry)) return true;
      geometry.dispose(); return false;
    });
    const dispose = template.dispose; template.dispose = () => { dispose(); extras.forEach(geometry => geometry.dispose()); };
    entries.set(cacheKey, template);
  }
  const root = clone(template.root) as Group;
  const wheels = template.wheels.map(wheel => ({ front: wheel.front, steer: root.getObjectByName(wheel.steer.name) as Group, spin: root.getObjectByName(wheel.spin.name) as Group }));
  return { root, wheels, dispose: () => undefined, releaseUnusedGeometry: () => undefined }; // Shared template buffers live for the bounded asset cache lifetime.
}
export function disposeModelCache() {
  for (const entries of templates.values()) for (const template of entries.values()) template.dispose();
  for (const material of materials.values()) material.dispose();
  for (const material of palette.values()) material.dispose();
  for (const texture of textures.values()) texture.dispose();
  templates.clear(); materials.clear(); textures.clear(); palette.clear();
}
if (import.meta.hot) import.meta.hot.dispose(disposeModelCache);
