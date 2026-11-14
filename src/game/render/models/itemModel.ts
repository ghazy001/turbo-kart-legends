import { Box3, Matrix4, Mesh, Vector3, type BufferGeometry, type Material, type Object3D } from 'three';
import { combatAssets, type CombatModelId } from '../../config/itemConfig';
import { instantiateModel } from './modelInstances';

/** Bake exporter axes into immutable per-part matrices, never into simulation dimensions. */
export function combatModelParts(source: Object3D, kind: CombatModelId) {
  const asset = combatAssets[kind];
  const model = instantiateModel(source, `combat:${kind}`, { hiddenNodes: asset.hiddenNodes });
  model.root.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model.root, true), size = bounds.getSize(new Vector3()), center = bounds.getCenter(new Vector3());
  const scale = asset.size / Math.max(size.x, size.y, size.z, 1e-6);
  const normalize = new Matrix4().makeScale(scale, scale, scale).multiply(new Matrix4().makeTranslation(-center.x, -(asset.grounded ? bounds.min.y : center.y), -center.z));
  const parts: { geometry: BufferGeometry; material: Material | Material[]; transform: Matrix4 }[] = [];
  model.root.traverse(node => { if (node instanceof Mesh) parts.push({ geometry: node.geometry, material: node.material, transform: normalize.clone().multiply(node.matrixWorld) }); });
  return parts;
}
