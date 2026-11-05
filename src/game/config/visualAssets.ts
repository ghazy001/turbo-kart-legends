/** Visual units: meters, Y up, +Z forward. These settings never change colliders. */
export type Triple = [number, number, number];
export interface VisualTransform {
  position: Triple;
  rotation: Triple;
  scale: number;
}
export interface WheelDefinition { node: string; front: boolean }
export interface KartAssetDefinition {
  id: string;
  url: string;
  transform: VisualTransform;
  seat: VisualTransform;
  wheels: readonly WheelDefinition[];
  wheelRadius: number;
}
export interface DriverAssetDefinition {
  id: string;
  url: string;
  transform: VisualTransform;
  /** Asset-specific static vertex fitting; not a skeleton or animation clip. */
  pose: 'supplied-static-seat' | 'authored';
}
export const kartAssets = {
  practice: {
    id: 'practice', url: '/assets/karts/my-kart.glb',
    transform: { position: [0, 0.15517, -0.03223], rotation: [0, 0, 0], scale: 1.5 },
    seat: { position: [0, 0.64, -0.27], rotation: [0, 0, 0], scale: 1 },
    wheels: [
      { node: 'WIRE_r_0128_fl_Default_OBJ002_0', front: true },
      { node: 'WIRE_r_0128_fr_Default_OBJ002_0', front: true },
      { node: 'WIRE_r_0128_fl001_Default_OBJ002_0', front: false },
      { node: 'WIRE_r_0128_fr001_Default_OBJ002_0', front: false },
    ],
    wheelRadius: 0.232876,
  },
} satisfies Record<string, KartAssetDefinition>;
export const driverAssets = {
  supplied: {
    id: 'supplied', url: '/assets/characters/my-character.glb',
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 0.24 },
    pose: 'supplied-static-seat',
  },
} satisfies Record<string, DriverAssetDefinition>;
export const defaultKart = kartAssets.practice;
export const defaultDriver = driverAssets.supplied;
