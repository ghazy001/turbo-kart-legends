import { Float32BufferAttribute, Mesh, MeshStandardMaterial, SkinnedMesh, Texture, type BufferGeometry, type Object3D } from 'three';

/** Share an opaque, untextured PBR shader while preserving each part's linear color.
 * Only baked static meshes qualify. Transparency, maps, skins and morphs stay intact. */
export function applyPaletteBatch(root: Object3D, palette: Map<string, MeshStandardMaterial>): BufferGeometry[] {
  const owned: BufferGeometry[] = [];
  root.traverse(node => {
    if (!(node instanceof Mesh) || node instanceof SkinnedMesh || Array.isArray(node.material)) return;
    const source = node.material;
    if (!(source instanceof MeshStandardMaterial) || source.transparent || source.opacity !== 1 || source.alphaTest || source.vertexColors || Object.keys(node.geometry.morphAttributes).length) return;
    if (Object.values(source).some(value => value instanceof Texture)) return;
    if (node.position.lengthSq() || node.rotation.x || node.rotation.y || node.rotation.z || node.scale.x !== 1 || node.scale.y !== 1 || node.scale.z !== 1) return;
    const data: Record<string, unknown> = { ...source.toJSON() };
    for (const key of ['uuid', 'name', 'metadata', 'color']) delete data[key];
    const key = JSON.stringify(data);
    let material = palette.get(key);
    if (!material) { material = source.clone(); material.color.set(0xffffff); material.vertexColors = true; material.name = 'static-palette'; palette.set(key, material); }
    const geometry = node.geometry.clone(), count = geometry.getAttribute('position').count;
    const values = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { values[i * 3] = source.color.r; values[i * 3 + 1] = source.color.g; values[i * 3 + 2] = source.color.b; }
    geometry.setAttribute('color', new Float32BufferAttribute(values, 3));
    node.geometry = geometry; node.material = material; owned.push(geometry);
  });
  return owned;
}
