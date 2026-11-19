import { InstancedMesh, Material, Matrix4, Mesh, ShaderMaterial, Texture, type Camera, type Object3D, type Scene, type WebGLRenderer } from 'three';
import { performanceConfig } from '../../config/performanceConfig';
export interface PreparationProgress { phase: 'textures' | 'shaders' | 'finishing'; completed: number; total: number }
export function sceneTextures(scene: Scene): Texture[] {
  const textures = new Set<Texture>();
  const visit = (material: Material) => {
    for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    if (material instanceof ShaderMaterial) for (const uniform of Object.values(material.uniforms)) if (uniform.value instanceof Texture) textures.add(uniform.value);
  };
  scene.traverse(node => { if (node instanceof Mesh) (Array.isArray(node.material) ? node.material : [node.material]).forEach(visit); });
  return [...textures];
}
export function nextPaint(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Preparation canceled', 'AbortError')); return; }
    const abort = () => { cancelAnimationFrame(frame); signal.removeEventListener('abort', abort); reject(new DOMException('Preparation canceled', 'AbortError')); };
    const frame = requestAnimationFrame(() => { signal.removeEventListener('abort', abort); resolve(); });
    signal.addEventListener('abort', abort, { once: true });
  });
}
/** Upload once under the loading screen; all materials, including unused item variants, compile. */
export async function warmScene(renderer: Pick<WebGLRenderer, 'initTexture' | 'compileAsync' | 'render'>, scene: Scene, camera: Camera, signal: AbortSignal, report: (value: PreparationProgress) => void, paint = nextPaint) {
  const check = () => { if (signal.aborted) throw new DOMException('Preparation canceled', 'AbortError'); };
  await paint(signal); check();
  const textures = sceneTextures(scene);
  report({ phase: 'textures', completed: 0, total: textures.length });
  for (let i = 0; i < textures.length; i++) {
    check(); renderer.initTexture(textures[i]);
    if ((i + 1) % performanceConfig.texturesPerFrame === 0) { report({ phase: 'textures', completed: i + 1, total: textures.length }); await paint(signal); }
  }
  check(); report({ phase: 'shaders', completed: 0, total: 1 });
  await renderer.compileAsync(scene, camera); check();
  warmDraw(renderer, scene, camera); check();
  report({ phase: 'finishing', completed: 1, total: 1 });
  // Give normal hidden R3F frames time to submit buffers/shadows before the reveal.
  await paint(signal); check(); await paint(signal); check();
}

/** One hidden draw uploads off-camera geometry and shadow variants. Always restore visual state. */
export function warmDraw(renderer: Pick<WebGLRenderer, 'render'>, scene: Scene, camera: Camera) {
  const saved: { object: Object3D; visible: boolean; culled: boolean; count?: number; first?: Matrix4 }[] = [];
  const identity = new Matrix4();
  scene.traverse(object => {
    const state = { object, visible: object.visible, culled: object.frustumCulled } as (typeof saved)[number];
    if (object instanceof InstancedMesh && object.count === 0 && object.instanceMatrix.count > 0) {
      state.count = 0; state.first = new Matrix4(); object.getMatrixAt(0, state.first);
      object.setMatrixAt(0, identity); object.instanceMatrix.needsUpdate = true; object.count = 1;
    }
    saved.push(state); object.visible = true; object.frustumCulled = false;
  });
  try { renderer.render(scene, camera); }
  finally {
    for (const state of saved) {
      state.object.visible = state.visible; state.object.frustumCulled = state.culled;
      if (state.object instanceof InstancedMesh && state.count !== undefined && state.first) {
        state.object.count = state.count; state.object.setMatrixAt(0, state.first); state.object.instanceMatrix.needsUpdate = true;
      }
    }
  }
}
