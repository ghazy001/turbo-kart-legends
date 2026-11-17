/** Geometry-only inspection of the actual registered cockpit and driver assets. */
import { createServer } from 'vite';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { Box3, Group, Mesh, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
let adaptMaterials;
function strip(value) {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !key.endsWith('Texture') && !['images', 'textures'].includes(key)).map(([key, child]) => [key, strip(child)]));
  return value;
}
async function load(url) {
  const file = readFileSync(`${root}/public${url}`), length = file.readUInt32LE(12), raw = JSON.parse(file.subarray(20, 20 + length).toString());
  const document = strip(raw); adaptMaterials(document);
  document.extensionsRequired = document.extensionsRequired?.filter(name => name !== 'KHR_materials_pbrSpecularGlossiness');
  const json = Buffer.from(JSON.stringify(document)), padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
  const binary = file.subarray(20 + length), output = Buffer.alloc(20 + padded.length + binary.length);
  file.copy(output, 0, 0, 20); output.writeUInt32LE(output.length, 8); output.writeUInt32LE(padded.length, 12); padded.copy(output, 20); binary.copy(output, 20 + padded.length);
  const model = await new GLTFLoader().parseAsync(output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength), '');
  return { ...model, metadata: { skins: raw.skins?.length ?? 0, animations: (raw.animations ?? []).map(clip => clip.name), meshes: raw.meshes?.length ?? 0 } };
}
function mount(model, transform) { const group = new Group(); group.position.set(...transform.position); group.rotation.set(...transform.rotation); group.scale.setScalar(transform.scale); group.add(model); group.updateMatrixWorld(true); return group; }
const bounds = object => { const box = new Box3().setFromObject(object, true); return { min: box.min.toArray(), max: box.max.toArray() }; };
const server = await createServer({ configFile: false, root, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, hmr: false, ws: false } });
try {
  adaptMaterials = (await server.ssrLoadModule('/src/game/render/models/assetLoader.ts')).adaptDiffuseLegacyMaterials;
  const { karts, racers } = await server.ssrLoadModule('/src/game/config/visualAssets.ts');
  const { prepareModel } = await server.ssrLoadModule('/src/game/render/models/prepareModel.ts');
  const { driverFitOptions, resolveDriverMount } = await server.ssrLoadModule('/src/game/render/models/driverFit.ts');
  const { protectedPoseVertices } = await server.ssrLoadModule('/src/game/render/models/poseRegions.ts');
  const result = { karts: [], racers: [], fits: [] };
  for (const kart of karts) {
    const gltf = await load(kart.url), model = prepareModel(gltf.scene, { wheels: kart.wheels }), assembly = mount(model.root, kart.transform), parts = [];
    assembly.traverse(node => { if (node instanceof Mesh) parts.push({ name: node.name, ...bounds(node) }); });
    const scans = Array.from({ length: 17 }, (_, i) => {
      const z = -0.8 + i * 0.1, hits = new Raycaster(new Vector3(0, 3, z), new Vector3(0, -1, 0)).intersectObject(assembly, true);
      return { z: Number(z.toFixed(2)), hits: hits.filter((hit, n) => !n || Math.abs(hit.point.y - hits[n - 1].point.y) > 0.005).map(hit => ({ y: Number(hit.point.y.toFixed(4)), mesh: hit.object.name })) };
    });
    result.karts.push({ id: kart.id, ...gltf.metadata, parts, scans }); model.dispose();
  }
  for (const driver of racers) {
    const gltf = await load(driver.url), parts = [], joints = []; gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(node => { if (node instanceof Mesh) parts.push({ name: node.name, ...bounds(node) }); if (node.type === 'Bone') joints.push({ name: node.name, position: node.getWorldPosition(new Vector3()).toArray() }); });
    const regions = [];
    if (driver.id === 'crash') gltf.scene.traverse(node => { if (node instanceof Mesh) {
      const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld), mask = protectedPoseVertices(geometry, 1.06), positions = geometry.getAttribute('position');
      let arms = 0, protectedArms = 0;
      for (let i = 0; i < positions.count; i++) if (positions.getY(i) >= 0.78 && positions.getY(i) <= 1.04 && Math.abs(positions.getX(i)) > 0.4) { arms++; if (mask[i]) protectedArms++; }
      regions.push({ mesh: node.name, protected: mask.reduce((sum,value)=>sum+value,0), total: mask.length, arms, protectedArms }); geometry.dispose();
    } });
    result.racers.push({ id: driver.id, ...gltf.metadata, parts, joints, regions });
    for (const kart of karts) {
      const model = prepareModel(gltf.scene, driverFitOptions(kart, driver));
      const assembly = mount(mount(model.root, resolveDriverMount(kart, driver)), kart.seat);
      const lowest = { y: Infinity }; const point = new Vector3();
      if (driver.id === 'sonic') assembly.traverse(node => { if (node instanceof Mesh) {
        const positions = node.geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i++) {
          node.getVertexPosition(i, point).applyMatrix4(node.matrixWorld);
          if (point.y < lowest.y) { lowest.y = point.y; lowest.mesh = node.name; lowest.vertex = i;
            const indices = node.geometry.getAttribute('skinIndex'), weights = node.geometry.getAttribute('skinWeight');
            lowest.bones = indices ? Array.from({length:4}, (_,c)=>({ name: node.skeleton.bones[indices.getComponent(i,c)].name, weight:weights.getComponent(i,c) })) : [];
          }
        }
      } });
      result.fits.push({ racer: driver.id, kart: kart.id, ...bounds(assembly), ...(driver.id === 'sonic' ? {lowest} : {}) }); model.dispose();
    }
  }
  mkdirSync(`${root}/docs/cockpit-qa`, { recursive: true });
  writeFileSync(`${root}/docs/cockpit-qa/inspection.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ assets: [...result.karts, ...result.racers].map(({id,skins,animations,meshes})=>({id,skins,animations,meshes})), fits: result.fits }, null, 2));
} finally { await server.close(); }
