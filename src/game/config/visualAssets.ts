import { seatedRacerScale } from './racerStyle';

/** Decorative meters: Y up, +Z forward. Never used to tune collision or racing. */
export type Triple = [number, number, number];
export interface VisualTransform { position: Triple; rotation: Triple; scale: number }
export interface WheelDefinition { node: string; nodes?: readonly string[]; front: boolean; side?: -1 | 1 }
export type AnimationAction = 'idle' | 'steerLeft' | 'steerRight' | 'leanLeft' | 'leanRight' | 'driftLeft' | 'driftRight' | 'victory';
export interface StaticPoseDefinition {
  /** Scene-space center offset applied before the symmetric static fit. */
  origin?: Triple;
  hip: number; knee: number; bend: number;
  shoulder: Triple; elbow: Triple; wrist: Triple;
  fittedElbow: Triple; fittedWrist: Triple;
  armMinY: number; armMaxY: number;
  armMeshes?: readonly string[];
  legMeshes?: readonly string[];
  /** Skip arm bending for complete mesh islands that extend above this height. */
  protectComponentsAbove?: number;
}
export interface RigSeatDefinition {
  hip: number;
  palmOffset: number;
  elbow: { minWidth: number; widthRatio: number; height: number; reachRatio: number };
  knee: Triple; ankle: Triple;
  /** Inspected left/right upper arm, elbow and wrist names. */
  arms: readonly [readonly [string, string, string], readonly [string, string, string]];
  legs: readonly [readonly [string, string, string], readonly [string, string, string]];
  fingers: readonly [string, string];
  toes: readonly [string, string];
}
export interface SelectionArtwork { url: string; position: string; scale: number }
export interface AssetInfo {
  id: string; name: string; url: string; sourceUrl: string; color: string; description: string; sourceTitle: string;
  /** Live model thumbnail; also the fallback when supplied card artwork fails. */
  thumbnail: { kind: 'model'; yaw: number };
  locked?: boolean; lockReason?: string;
}
export interface KartAssetDefinition extends AssetInfo {
  /** Supplied card artwork; the side preview and gameplay still use the GLB. */
  artwork?: SelectionArtwork;
  transform: VisualTransform; seat: VisualTransform;
  /** Approximate right-hand grip in assembly meters (+X right, +Z forward). */
  steeringGrip: Triple;
  wheels: readonly WheelDefinition[]; wheelRadius: number;
  /** Wheel axle in source scene coordinates, after exporter transforms. */
  axle?: 'x' | 'z'; spinDirection?: number;
}
export interface DriverAssetDefinition extends AssetInfo {
  /** Supplied face-card artwork only; the side preview and gameplay still use the GLB. */
  portrait?: SelectionArtwork;
  transform: VisualTransform;
  pose: 'supplied-static-seat' | 'static-fit' | 'rig-seat' | 'authored';
  /** Non-driving props omitted from the seated assembly, retained in source portraits. */
  hideWhileDriving?: readonly string[];
  staticPose?: StaticPoseDefinition;
  rigSeat?: RigSeatDefinition;
  /** Explicit clip names only; declare compatible seated clips after inspecting bindings. */
  clips?: Partial<Record<AnimationAction, string>>;
}
const transform = (scale: number, position: Triple = [0, 0, 0], yaw = 0): VisualTransform => ({ position, rotation: [0, yaw, 0], scale });
const wheelParts = (prefix: string) => Array.from({ length: 4 }, (_, i) => `${prefix}_${i}`);
export const kartAssets = {
  practice: {
    artwork: { url: '/assets/kart-cards/practice.webp', position: '50% 56%', scale: 0.96 },
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'practice', name: 'Practice Kart', color: '#e98742', description: 'Light frame. Familiar silhouette.', sourceTitle: 'Supplied practice kart',
    url: '/assets/optimized/karts/my-kart.glb', sourceUrl: '/assets/karts/my-kart.glb', transform: transform(1.5, [0, 0.15517, -0.03223]), seat: transform(1, [0, 0.64, -0.27]), steeringGrip: [0.29, 0.98, 0.28],
    wheels: [
      { node: 'WIRE_r_0128_fl_Default_OBJ002_0', front: true }, { node: 'WIRE_r_0128_fr_Default_OBJ002_0', front: true },
      { node: 'WIRE_r_0128_fl001_Default_OBJ002_0', front: false }, { node: 'WIRE_r_0128_fr001_Default_OBJ002_0', front: false },
    ], wheelRadius: 0.232876,
  },
  go64: {
    artwork: { url: '/assets/kart-cards/go64.webp', position: '50% 56%', scale: 0.96 },
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'go64', name: 'Go Kart 64', color: '#e77877', description: 'Twin engines. Bright tubular frame.', sourceTitle: 'Go kart 64',
    url: '/assets/optimized/karts/go_kart_64.glb', sourceUrl: '/assets/karts/go_kart_64.glb', transform: transform(16.5, [0, -0.25086, -0.07258], Math.PI), seat: transform(1.1, [0, 0.64, 0.1]), steeringGrip: [0.24, 1.0, 0.45],
    wheels: [
      { node: 'Torus002_0', nodes: wheelParts('Torus002'), front: true }, { node: 'Torus003_0', nodes: wheelParts('Torus003'), front: true },
      { node: 'Torus025_0', nodes: wheelParts('Torus025'), front: false }, { node: 'Torus001_0', nodes: wheelParts('Torus001'), front: false },
    ], wheelRadius: 0.2838, spinDirection: -1,
  },
  ds: {
    artwork: { url: '/assets/kart-cards/ds.webp', position: '50% 56%', scale: 0.96 },
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'ds', name: 'DS Kart', color: '#e85d56', description: 'Low nose. A compact classic.', sourceTitle: 'Mario Kart DS',
    url: '/assets/optimized/karts/mario_kart_ds.glb', sourceUrl: '/assets/karts/mario_kart_ds.glb', transform: transform(12, [0, -0.02869, 0.06193]), seat: transform(0.83, [0, 0.44, -0.045]), steeringGrip: [0.105, 0.50, 0.31],
    wheels: [
      { node: 'polySurface4_NEUMATICO_0', front: true, side: -1 }, { node: 'polySurface4_NEUMATICO_0', front: true, side: 1 },
      { node: 'polySurface2_NEUMATICO_0', front: false, side: -1 }, { node: 'polySurface2_NEUMATICO_0', front: false, side: 1 },
    ], wheelRadius: 0.1733,
  },
  boat: {
    artwork: { url: '/assets/kart-cards/boat.webp', position: '50% 56%', scale: 0.96 },
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
    portrait: { url: '/assets/portraits/mario.jpg', position: '55% 32%', scale: 1.5 },
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'supplied', name: 'Mario', color: '#ea624c', description: 'Ready for another sunny lap.', sourceTitle: 'Mario obj',
    url: '/assets/optimized/characters/my-character.glb', sourceUrl: '/assets/characters/my-character.glb', transform: transform(seatedRacerScale('supplied')), pose: 'supplied-static-seat',
  },
  sonic: {
    portrait: { url: '/assets/portraits/sonic.jpg', position: '56% 34%', scale: 1.5 },
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'sonic', name: 'Sonic', color: '#388bd7', description: 'Blue skies. A little more attitude.', sourceTitle: 'Movie Sonic (Sonic Rumble)',
    url: '/assets/optimized/characters/movie_sonic_sonic_rumble.glb', sourceUrl: '/assets/characters/movie_sonic_sonic_rumble.glb', transform: transform(seatedRacerScale('sonic')), pose: 'rig-seat',
    rigSeat: { hip: 0.37572, palmOffset: 0.10, elbow: { minWidth: 0.12, widthRatio: 0.8, height: 0.43, reachRatio: 0.4 }, knee: [0.07, 0.36, 0.15], ankle: [0.09, 0.23, 0.18],
      arms: [['L_Arm_A_011', 'L_Arm_B_012', 'L_Hand_013'], ['R_Arm_A_029', 'R_Arm_B_030', 'R_Hand_031']],
      legs: [['L_Leg_A_047', 'L_Leg_B_048', 'L_Foot_A_049'], ['R_Leg_A_051', 'R_Leg_B_052', 'R_Foot_A_053']],
      fingers: ['L_FingerMiddle_A_017', 'R_FingerMiddle_A_035'], toes: ['L_Foot_B_050', 'R_Foot_B_054'] },
  },
  arnold: {
    portrait: { url: '/assets/portraits/arnold.jpg', position: '52% 32%', scale: 1.65 },
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'arnold', name: 'Arnold', color: '#56b3a0', description: 'Headphones on. Sunshine ahead.', sourceTitle: 'Nickelodeon Kart Racers 3 Arnold',
    url: '/assets/optimized/characters/nickelodeon_kart_racers_3_arnold.glb', sourceUrl: '/assets/characters/nickelodeon_kart_racers_3_arnold.glb', transform: transform(seatedRacerScale('arnold')), pose: 'static-fit',
    staticPose: { armMeshes: ['Object_3'], protectComponentsAbove: 1.29, hip: 0.61, knee: 0.3, bend: 1.4, shoulder: [0.22, 1.25, 0], elbow: [0.5, 1.25, 0], wrist: [0.78, 1.25, 0], fittedElbow: [0.38, 0.87, 0.31], fittedWrist: [0.35, 1.05, 0.6], armMinY: 0.95, armMaxY: 1.4 },
  },
  spongebob: {
    portrait: { url: '/assets/portraits/spongebob.jpg', position: '52% 36%', scale: 1.6 },
    thumbnail: { kind: 'model', yaw: -0.3 },
    id: 'spongebob', name: 'SpongeBob', color: '#ecd448', description: 'A bright smile. Ready for the next corner.', sourceTitle: 'The SpongeBob Squarepants',
    url: '/assets/optimized/characters/the_spongebob_squarepants.glb', sourceUrl: '/assets/characters/the_spongebob_squarepants.glb', transform: transform(seatedRacerScale('spongebob')), pose: 'static-fit',
    staticPose: { origin: [0.032041, 0, 0], hip: 0.82, knee: 0.38, bend: 1.4,
      armMeshes: ['defaultMaterial_5', 'defaultMaterial_6', 'defaultMaterial_8', 'defaultMaterial_13'],
      legMeshes: ['defaultMaterial', 'defaultMaterial_1', 'defaultMaterial_2', 'defaultMaterial_3', 'defaultMaterial_4', 'defaultMaterial_7', 'defaultMaterial_9', 'defaultMaterial_10', 'defaultMaterial_11', 'defaultMaterial_12'],
      shoulder: [0.95, 1.45, -0.04], elbow: [1.18, 1.30, 0], wrist: [1.51, 1.15, 0.04], fittedElbow: [0.90, 1.12, 0.46], fittedWrist: [0.60, 1.60, 1.20], armMinY: 0.90, armMaxY: 1.56 },
  },
  crash: {
    portrait: { url: '/assets/portraits/crash.jpg', position: '54% 33%', scale: 1.6 },
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
