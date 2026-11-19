import { describe, expect, it, vi } from 'vitest';
import { Bone, BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, ShaderMaterial, Skeleton, SkinnedMesh, Texture } from 'three';
import { AdaptiveResolution } from '../render/models/AdaptiveResolution';
import { SceneryVisibility } from '../render/models/SceneryVisibility';
import { sceneTextures, warmDraw, warmScene } from '../render/models/sceneWarmup';
import type { EnvironmentPlacement } from '../config/environmentAssets';
import { disposeModelCache, instantiateModel } from '../render/models/modelInstances';

function frames(budget: AdaptiveResolution, seconds: number, fps: number, active = true) {
  const changes: number[] = [];
  for (let i = 0; i < seconds * fps; i++) { const value = budget.sample(1 / fps, active); if (value !== null) changes.push(value); }
  return changes;
}
describe('adaptive rendering budget', () => {
  it('steps down only for sustained slow racing, and respects cooldown/minimum', () => {
    const budget = new AdaptiveResolution(2);
    expect(frames(budget, 6, 30)).toEqual([]);
    expect(frames(budget, 3, 30)).toEqual([1.25]);
    expect(frames(budget, 7, 30)).toEqual([]);
    expect(frames(budget, 5, 30)).toEqual([1]);
    expect(frames(budget, 30, 20)).toEqual([]);
  });
  it('recovers slowly, staying within native resolution', () => {
    const budget = new AdaptiveResolution(1.3);
    frames(budget, 25, 30); expect(budget.dpr).toBe(1);
    expect(frames(budget, 6, 60)).toEqual([]);
    expect(frames(budget, 5, 60)).toEqual([1.25]);
    expect(frames(budget, 12, 60)).toEqual([1.3]);
    expect(new AdaptiveResolution(0.8).dpr).toBe(1);
  });
  it('ignores pause/loading, long suspension, and isolated frame outliers', () => {
    const budget = new AdaptiveResolution(1.5);
    expect(frames(budget, 30, 20, false)).toEqual([]);
    for (let i = 0; i < 1200; i++) budget.sample(i % 60 === 0 ? 0.1 : 1 / 60, true);
    expect(budget.dpr).toBe(1.5);
    for (const delta of [10, NaN, 0, -1]) expect(budget.sample(delta, true)).toBeNull();
    expect(frames(budget, 6, 30)).toEqual([]);
  });
});

const placement = (id: string, z: number, x = 0): EnvironmentPlacement => ({ id, asset: 'stylized-tree', position: [x, 0, z], scale: 1, yaw: 0, tint: '#ffffff' });
function camera() { const view = new PerspectiveCamera(60, 1, 0.1, 450); view.position.set(0, 4.2, 0); view.lookAt(0, 4.2, -100); view.updateMatrixWorld(); return view; }
describe('shared static scenery visibility', () => {
  it('retains near/far LOD, distance limits and frustum rejection', () => {
    const placements = [placement('near', -20), placement('far', -60), placement('distant', -300), placement('behind', 20), placement('side', -20, 80)];
    const near = new SceneryVisibility(placements, 'stylized-tree'), far = new SceneryVisibility(placements, 'stylized-tree', true), view = camera();
    near.update(view); far.update(view);
    expect(near.indices).toEqual([0]); expect(far.indices).toEqual([1]);
    view.position.z = -45; view.updateMatrixWorld(); near.update(view); far.update(view);
    expect(near.indices).toEqual([1]); expect(far.indices).toEqual([]);
  });
  it('does not request material-batch uploads unless visible membership changes', () => {
    const visibility = new SceneryVisibility([placement('tree', -20)], 'stylized-tree'), view = camera();
    visibility.update(view); const version = visibility.version;
    visibility.update(view); expect(visibility.version).toBe(version);
    view.position.x = 0.1; view.updateMatrixWorld(); visibility.update(view); expect(visibility.version).toBe(version);
    view.rotation.y += Math.PI; view.updateMatrixWorld(); visibility.update(view); expect(visibility.indices).toEqual([]); expect(visibility.version).toBe(version + 1);
  });
  it('keeps course/LOD instances independent and source transforms unchanged', () => {
    const placements = [placement('a', -20)], snapshot = JSON.stringify(placements);
    const first = new SceneryVisibility(placements, 'stylized-tree'), next = new SceneryVisibility(placements, 'stylized-tree');
    first.update(camera()); expect(next.indices).toEqual([]); expect(JSON.stringify(placements)).toBe(snapshot);
    expect(first.matrices[0].elements[14]).toBe(-20);
  });
});

function graphics() { return { initTexture: vi.fn(), compileAsync: vi.fn(async () => new Scene()), render: vi.fn() }; }
const paint = async (signal: AbortSignal) => { if (signal.aborted) throw new DOMException('Canceled', 'AbortError'); };
describe('GPU preparation before release', () => {
  it('finds shared, hidden, multi-material and shader textures once', () => {
    const scene = new Scene(), texture = new Texture(), extra = new Texture();
    const group = new Group(); group.visible = false;
    group.add(new Mesh(new BoxGeometry(), [new MeshStandardMaterial({ map: texture, normalMap: texture }), new ShaderMaterial({ uniforms: { image: { value: extra } } })]));
    scene.add(group, new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map: texture })));
    expect(sceneTextures(scene)).toEqual([texture, extra]);
  });
  it('yields between texture batches, then compiles and warms before completing', async () => {
    const scene = new Scene(), renderer = graphics(), controller = new AbortController(), report = vi.fn();
    for (let i = 0; i < 7; i++) scene.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map: new Texture() })));
    const uploads: number[] = [];
    await warmScene(renderer, scene, camera(), controller.signal, report, async signal => { uploads.push(renderer.initTexture.mock.calls.length); await paint(signal); });
    expect(uploads).toEqual([0, 3, 6, 7, 7]);
    expect(renderer.compileAsync).toHaveBeenCalledOnce(); expect(renderer.render).toHaveBeenCalledOnce();
    expect(renderer.initTexture.mock.invocationCallOrder[6]).toBeLessThan(renderer.compileAsync.mock.invocationCallOrder[0]);
    expect(report.mock.calls.at(-1)?.[0].phase).toBe('finishing');
  });
  it('does not release a canceled course even if its shader promise completes late', async () => {
    const scene = new Scene(), renderer = graphics(), controller = new AbortController(), report = vi.fn();
    let complete!: () => void;
    renderer.compileAsync.mockImplementation(() => new Promise(resolve => { complete = () => resolve(new Scene()); }));
    const pending = warmScene(renderer, scene, camera(), controller.signal, report, paint);
    await vi.waitFor(() => expect(renderer.compileAsync).toHaveBeenCalledOnce());
    controller.abort(); complete();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' }); expect(renderer.render).not.toHaveBeenCalled();
    expect(report.mock.calls.some(([value]) => value.phase === 'finishing')).toBe(false);
  });
  it('surfaces a GPU upload failure without compiling or marking preparation complete', async () => {
    const scene = new Scene(), renderer = graphics(), report = vi.fn();
    scene.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map: new Texture() })));
    renderer.initTexture.mockImplementation(() => { throw new Error('Texture upload failed'); });
    await expect(warmScene(renderer, scene, camera(), new AbortController().signal, report, paint)).rejects.toThrow('Texture upload failed');
    expect(renderer.compileAsync).not.toHaveBeenCalled(); expect(renderer.render).not.toHaveBeenCalled();
    expect(report.mock.calls.some(([value]) => value.phase === 'finishing')).toBe(false);
  });
  it('restores off-camera and zero-count instance state even if upload fails', () => {
    const scene = new Scene(), group = new Group(), geometry = new BoxGeometry(), material = new MeshStandardMaterial();
    const instances = new InstancedMesh(geometry, material, 3), original = new Matrix4().makeTranslation(20, 3, 10);
    instances.setMatrixAt(0, original); instances.count = 0; instances.visible = false; group.visible = false; group.add(instances); scene.add(group);
    expect(() => warmDraw({ render: () => { expect(group.visible).toBe(true); expect(instances.count).toBe(1); expect(instances.frustumCulled).toBe(false); throw new Error('GPU unavailable'); } }, scene, camera())).toThrow('GPU unavailable');
    const restored = new Matrix4(); instances.getMatrixAt(0, restored);
    expect(group.visible).toBe(false); expect(instances.visible).toBe(false); expect(instances.count).toBe(0); expect(instances.frustumCulled).toBe(true); expect(restored.equals(original)).toBe(true);
    geometry.dispose(); material.dispose();
  });
});

describe('private GPU resource ownership', () => {
  it('releases cloned bone textures without disposing another racer or cached geometry/materials', () => {
    const source = new Group(), geometry = new BoxGeometry(), material = new MeshStandardMaterial(), bone = new Bone();
    const skin = new SkinnedMesh(geometry, material); source.add(bone, skin); skin.bind(new Skeleton([bone])); skin.skeleton.computeBoneTexture();
    const first = instantiateModel(source, 'private-skin', {}), second = instantiateModel(source, 'private-skin', {});
    const find = (root: Group) => { let skeleton!: Skeleton; root.traverse(node => { if (node instanceof SkinnedMesh) skeleton = node.skeleton; }); return skeleton; };
    const one = find(first.root), two = find(second.root); one.computeBoneTexture(); two.computeBoneTexture();
    const released = vi.fn(), sourceReleased = vi.fn(), otherReleased = vi.fn(), geometryReleased = vi.fn(), materialReleased = vi.fn();
    one.boneTexture!.addEventListener('dispose', released); two.boneTexture!.addEventListener('dispose', otherReleased); skin.skeleton.boneTexture!.addEventListener('dispose', sourceReleased);
    geometry.addEventListener('dispose', geometryReleased); material.addEventListener('dispose', materialReleased);
    first.dispose(); first.dispose();
    expect(released).toHaveBeenCalledOnce(); expect(one.boneTexture).toBeNull(); expect(two.boneTexture).not.toBeNull();
    expect(otherReleased).not.toHaveBeenCalled(); expect(sourceReleased).not.toHaveBeenCalled(); expect(geometryReleased).not.toHaveBeenCalled(); expect(materialReleased).not.toHaveBeenCalled();
    second.dispose(); skin.skeleton.dispose(); disposeModelCache(); geometry.dispose(); material.dispose();
  });
  it('disposes a private instance allocation while preserving shared model parts', () => {
    const geometry = new BoxGeometry(), material = new MeshStandardMaterial(), instance = new InstancedMesh(geometry, material, 4);
    const released = vi.fn(), geometryReleased = vi.fn(), materialReleased = vi.fn();
    instance.addEventListener('dispose', released); geometry.addEventListener('dispose', geometryReleased); material.addEventListener('dispose', materialReleased);
    instance.dispose(); expect(released).toHaveBeenCalledOnce(); expect(geometryReleased).not.toHaveBeenCalled(); expect(materialReleased).not.toHaveBeenCalled();
    geometry.dispose(); material.dispose();
  });
});
