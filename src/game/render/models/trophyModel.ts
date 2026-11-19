import { Box3, Group, Mesh, MeshStandardMaterial, Vector3, type Material, type Object3D } from 'three';

/** Ground and center the static source without mutating GLTFLoader's cached scene. */
export function prepareTrophyModel(source: Object3D) {
  const root = new Group(), model = source.clone(true), materials = new Map<Material, Material>();
  root.add(model); root.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(root, true), size = bounds.getSize(new Vector3()), center = bounds.getCenter(new Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('Trophy has no usable geometry.');
  // Normalize to one unit tall; the presentation config supplies the final height.
  model.position.sub(new Vector3(center.x, bounds.min.y, center.z)); root.scale.setScalar(1 / size.y);
  const materialFor = (sourceMaterial: Material) => {
    const existing = materials.get(sourceMaterial); if (existing) return existing;
    const material = sourceMaterial.clone();
    if (material instanceof MeshStandardMaterial) {
      // The source assumes metallic reflections. Retain its gold/wood colors,
      // with enough diffuse response for the existing lightweight stage lights.
      material.metalness = Math.min(material.metalness, 0.55);
      material.roughness = Math.max(material.roughness, 0.28);
      if (material.name === 'phong2') { material.color.set('#152d30'); material.metalness = 0; }
    }
    materials.set(sourceMaterial, material); return material;
  };
  model.traverse(node => { if (node instanceof Mesh) node.material = Array.isArray(node.material) ? node.material.map(materialFor) : materialFor(node.material); });
  root.updateMatrixWorld(true);
  return { root, dispose: () => materials.forEach(material => material.dispose()) };
}
