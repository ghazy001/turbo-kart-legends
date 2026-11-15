import { seatedRacerScale } from './racerStyle';

/** Decorative meters: Y up, +Z forward. Never used to tune collision or racing. */
export type Triple = [number, number, number];
export interface VisualTransform { position: Triple; rotation: Triple; scale: number }
export interface WheelDefinition { node: string; nodes?: readonly string[]; front: boolean; side?: -1 | 1 }
export type AnimationAction = 'idle' | 'steerLeft' | 'steerRight' | 'leanLeft' | 'leanRight' | 'driftLeft' | 'driftRight' | 'victory';
export interface StaticPoseDefinition {
  hip: number; knee: number; bend: number;
  shoulder: Triple; elbow: Triple; wrist: Triple;
  fittedElbow: Triple; fittedWrist: Triple;
  armMinY: number; armMaxY: number;
  armMeshes?: readonly string[];
  /** Skip arm bending for complete mesh islands that extend above this height. */
  protectComponentsAbove?: number;
}
export interface AssetInfo {
  id: string; name: string; url: string; sourceUrl: string; color: string; description: string; sourceTitle: string;
  /** Live model portrait, rendered in the menu's shared canvas. */
  thumbnail: { kind: 'model'; yaw: number };
  locked?: boolean; lockReason?: string;
}
export interface KartAssetDefinition extends AssetInfo {
  transform: VisualTransform; seat: VisualTransform;
  /** Approximate right-hand grip in assembly meters (+X right, +Z forward). */
  steeringGrip: Triple;
  wheels: readonly WheelDefinition[]; wheelRadius: number;
  /** Wheel axle in source scene coordinates, after exporter transforms. */
  axle?: 'x' | 'z'; spinDirection?: number;
}
export interface DriverAssetDefinition extends AssetInfo {
  transform: VisualTransform;
  pose: 'supplied-static-seat' | 'static-fit' | 'authored';
  /** Non-driving props omitted from the seated assembly, retained in source portraits. */
  hideWhileDriving?: readonly string[];
  staticPose?: StaticPoseDefinition;
  /** Explicit clip names only; declare compatible seated clips after inspecting bindings. */
  clips?: Partial<Record<AnimationAction, string>>;
}
const transform = (scale: number, position: Triple = [0, 0, 0], yaw = 0): VisualTransform => ({ position, rotation: [0, yaw, 0], scale });
const wheelParts = (prefix: string) => Array.from({ length: 4 }, (_, i) => `${prefix}_${i}`);
export const kartAssets = {
  practice: {
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'practice', name: 'Practice Kart', color: '#e98742', description: 'Light frame. Familiar silhouette.', sourceTitle: 'Supplied practice kart',
    url: '/assets/optimized/karts/my-kart.glb', sourceUrl: '/assets/karts/my-kart.glb', transform: transform(1.5, [0, 0.15517, -0.03223]), seat: transform(1, [0, 0.64, -0.27]), steeringGrip: [0.29, 0.98, 0.28],
    wheels: [
      { node: 'WIRE_r_0128_fl_Default_OBJ002_0', front: true }, { node: 'WIRE_r_0128_fr_Default_OBJ002_0', front: true },
      { node: 'WIRE_r_0128_fl001_Default_OBJ002_0', front: false }, { node: 'WIRE_r_0128_fr001_Default_OBJ002_0', front: false },
    ], wheelRadius: 0.232876,
  },
  go64: {
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'go64', name: 'Go Kart 64', color: '#e77877', description: 'Twin engines. Bright tubular frame.', sourceTitle: 'Go kart 64',
    url: '/assets/optimized/karts/go_kart_64.glb', sourceUrl: '/assets/karts/go_kart_64.glb', transform: transform(16.5, [0, -0.25086, -0.07258], Math.PI), seat: transform(1.1, [0, 0.64, 0.1]), steeringGrip: [0.24, 1.0, 0.45],
    wheels: [
      { node: 'Torus002_0', nodes: wheelParts('Torus002'), front: true }, { node: 'Torus003_0', nodes: wheelParts('Torus003'), front: true },
      { node: 'Torus025_0', nodes: wheelParts('Torus025'), front: false }, { node: 'Torus001_0', nodes: wheelParts('Torus001'), front: false },
    ], wheelRadius: 0.2838, spinDirection: -1,
  },
  ds: {
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'ds', name: 'DS Kart', color: '#e85d56', description: 'Low nose. A compact classic.', sourceTitle: 'Mario Kart DS',
    url: '/assets/optimized/karts/mario_kart_ds.glb', sourceUrl: '/assets/karts/mario_kart_ds.glb', transform: transform(12, [0, -0.02869, 0.06193]), seat: transform(0.83, [0, 0.44, -0.045]), steeringGrip: [0.105, 0.50, 0.31],
    wheels: [
      { node: 'polySurface4_NEUMATICO_0', front: true, side: -1 }, { node: 'polySurface4_NEUMATICO_0', front: true, side: 1 },
      { node: 'polySurface2_NEUMATICO_0', front: false, side: -1 }, { node: 'polySurface2_NEUMATICO_0', front: false, side: 1 },
    ], wheelRadius: 0.1733,
  },
  boat: {
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'boat', name: 'Boat Kart', color: '#6abbd1', description: 'A little seaside spirit on four wheels.', sourceTitle: 'Nickelodeon Kart Racers 3 SpongeBob Boat Kart',
    url: '/assets/optimized/characters/nickelodeon_kart_racers_3_spongebob_boat_kart.glb', sourceUrl: '/assets/characters/nickelodeon_kart_racers_3_spongebob_boat_kart.glb', transform: transform(0.48, [0, 0.30274, 0.59355]), seat: transform(1, [0, 0.72, -0.4]), steeringGrip: [0.27, 1.01, 0.27],
    wheels: [
      { node: 'S_Wheel_Standard_L_MI_Wheels_Standard_0', front: true }, { node: 'S_Wheel_Standard_R_MI_Wheels_Standard_0', front: true },
      { node: 'S_Wheel_Standard_L001_MI_Wheels_Standard_0', front: false }, { node: 'S_Wheel_Standard_R001_MI_Wheels_Standard_0', front: false },
    ], wheelRadius: 0.2717,
  },
} satisfies Record<string, KartAssetDefinition>;
export const driverAssets = {
  supplied: {
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'supplied', name: 'Mario', color: '#ea624c', description: 'The original supplied local driver.', sourceTitle: 'Mario obj',
    url: '/assets/optimized/characters/my-character.glb', sourceUrl: '/assets/characters/my-character.glb', transform: transform(seatedRacerScale('supplied')), pose: 'supplied-static-seat',
  },
  aang: {
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'aang', name: 'Aang', color: '#eab451', description: 'A bright orange racing companion.', sourceTitle: 'Nickelodeon Kart Racers 3 Aang',
    url: '/assets/optimized/characters/nickelodeon_kart_racers_3_aang.glb', sourceUrl: '/assets/characters/nickelodeon_kart_racers_3_aang.glb', transform: transform(seatedRacerScale('aang')), pose: 'static-fit',
    staticPose: { hip: 1.03, knee: 0.48, bend: 1.4, shoulder: [0.27, 1.68, 0], elbow: [0.65, 1.68, 0], wrist: [0.97, 1.68, 0], fittedElbow: [0.41, 1.25, 0.3], fittedWrist: [0.35, 1.55, 0.59], armMinY: 1.5, armMaxY: 1.83 },
  },
  arnold: {
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'arnold', name: 'Arnold', color: '#56b3a0', description: 'Headphones on. Sunshine ahead.', sourceTitle: 'Nickelodeon Kart Racers 3 Arnold',
    url: '/assets/optimized/characters/nickelodeon_kart_racers_3_arnold.glb', sourceUrl: '/assets/characters/nickelodeon_kart_racers_3_arnold.glb', transform: transform(seatedRacerScale('arnold')), pose: 'static-fit',
    staticPose: { armMeshes: ['Object_3'], protectComponentsAbove: 1.29, hip: 0.61, knee: 0.3, bend: 1.4, shoulder: [0.22, 1.25, 0], elbow: [0.5, 1.25, 0], wrist: [0.78, 1.25, 0], fittedElbow: [0.38, 0.87, 0.31], fittedWrist: [0.35, 1.05, 0.6], armMinY: 0.95, armMaxY: 1.4 },
  },
  spongebob: {
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'spongebob', name: 'SpongeBob', color: '#ecd448', description: 'A bright smile. Ready for the next corner.', sourceTitle: 'Nickelodeon Kart Racers 3 SpongeBob',
    // Object_2 mixes prop faces with the pants/shirt caps: hiding it opens the clothing.
    url: '/assets/optimized/characters/nickelodeon_kart_racers_3_spongebob.glb', sourceUrl: '/assets/characters/nickelodeon_kart_racers_3_spongebob.glb', transform: transform(seatedRacerScale('spongebob')), pose: 'static-fit',
    staticPose: { hip: 0.32, knee: 0.15, bend: 1.4, shoulder: [0.52, 0.7, 0], elbow: [0.74, 0.7, 0], wrist: [0.94, 0.7, 0], fittedElbow: [0.59, 0.62, 0.32], fittedWrist: [0.37, 0.7, 0.62], armMinY: 0.37, armMaxY: 1.32 },
  },
  crash: {
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'crash', name: 'Crash', color: '#e98c4a', description: 'A big grin for the next hairpin.', sourceTitle: 'CRASH BANDICOOT CARTOON',
    url: '/assets/optimized/characters/crash_bandicoot_cartoon.glb', sourceUrl: '/assets/characters/crash_bandicoot_cartoon.glb', transform: transform(seatedRacerScale('crash')), pose: 'static-fit',
    staticPose: { hip: 0.42, knee: 0.2, bend: 1.4, shoulder: [0.22, 0.92, -0.23], elbow: [0.45, 0.92, -0.23], wrist: [0.66, 0.92, -0.23], fittedElbow: [0.36, 0.67, 0.23], fittedWrist: [0.28, 0.76, 0.46], armMinY: 0.78, armMaxY: 1.04 },
  },
} satisfies Record<string, DriverAssetDefinition>;
export type KartId = keyof typeof kartAssets;
export type RacerId = keyof typeof driverAssets;
export interface VisualSelection { kartId: KartId; racerId: RacerId }
export const defaultKart = kartAssets.practice;
export const defaultDriver = driverAssets.supplied;
export const defaultSelection: VisualSelection = { kartId: 'practice', racerId: 'supplied' };
export const karts: readonly KartAssetDefinition[] = Object.values(kartAssets);
export const racers: readonly DriverAssetDefinition[] = Object.values(driverAssets);
export const unsupportedAssets = [
  { id: 'kart2-duplicate', url: '/assets/karts/kart_2.glb', reason: 'Byte-identical duplicate of Go Kart 64; use go64.' },
  { id: 'kart3d-legacy', url: '/assets/karts/kart_3d.glb', reason: 'Complex legacy specular/glossiness materials and ~149 MiB source textures. Needs metallic/roughness conversion and texture cleanup.' },
  { id: 'world-high-detail', url: '/assets/karts/standard_kart_from_mario_kart_world.glb', reason: '560,980 triangles. Needs a lower-detail export before joining a four-kart race.' },
] as const;
