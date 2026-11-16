/** Supplied local scenery only. These envelopes never create or resize a collider. */
export const environmentAssets = {
  'stylized-tree': { name: 'Stylized Tree', url: '/assets/optimized/environment/stylized-tree.glb', farUrl: '/assets/optimized/environment/stylized-tree-far.glb', sourceUrl: '/assets/environment/stylized-tree.glb', height: 8.4, yaw: 0, sourceMin: [-0.1891136699, -0.0000000075, -0.1970015992], sourceSize: [0.3678287042, 0.5639603459, 0.3890091038], distance: 135, nearDistance: 42 },
  'gas-station': { name: 'Fuel dispenser', url: '/assets/optimized/environment/gas-station.glb', sourceUrl: '/assets/environment/gas-station.glb', height: 3, yaw: 0, sourceMin: [-0.7381925429, -0.0061013684, -0.4088330668], sourceSize: [1.475725085, 2.502003295, 0.8176635382], distance: 135 },
  spectators: { name: 'Spectator group', url: '/assets/optimized/environment/spectators.glb', sourceUrl: '/assets/environment/spectators.glb', height: 1.8, yaw: -Math.PI / 2, sourceMin: [-6.3518562317, -0.0227310006, -5.6364688873], sourceSize: [11.33749628, 2.187098915, 10.70541], distance: 115 },
  'tire-wall': { name: 'Tire wall', url: '/assets/optimized/environment/tire-wall.glb', sourceUrl: '/assets/environment/tire-wall.glb', height: 0.95, yaw: Math.PI / 2, sourceMin: [-0.5321866073, 0.001390342, -0.5573280165], sourceSize: [4.032380819, 0.9715418215, 1.1034109], distance: 120 },
  'viking-house': { name: 'Viking House', url: '/assets/optimized/environment/viking-house.glb', sourceUrl: '/assets/environment/viking-house.glb', height: 7.5, yaw: 0, sourceMin: [-21.656129837036133, -0.043072998523713935, -8.015466690063477], sourceSize: [42.299224853515625, 32.06263476610184, 16.030935287475593], distance: 160 },
  cactus: { name: 'Cactus', url: '/assets/optimized/environment/cactus.glb', sourceUrl: '/assets/environment/cactus.glb', height: 2.8, yaw: 0, sourceMin: [-0.6096242545567776, 0, -0.24986296028709276], sourceSize: [1.2200797156554444, 1.9847015429033377, 0.38608402432822597], distance: 110 },
  'stylized-house': { name: 'Stylized House', url: '/assets/optimized/environment/stylized-house.glb', sourceUrl: '/assets/environment/stylized-house.glb', height: 6.3, yaw: 0, sourceMin: [-11.135761012082668, -0.0044662000306778535, -8.196626793021373], sourceSize: [15.404638899759071, 13.63300705728793, 15.088425612788486], distance: 150 },
  'lowpoly-gas-station': { name: 'Lowpoly Gas Station', url: '/assets/optimized/environment/lowpoly-gas-station.glb', sourceUrl: '/assets/environment/lowpoly-gas-station.glb', height: 5.8, yaw: 0, sourceMin: [-11.973219260575931, -0.2060140945163198, -8.33133564446861], sourceSize: [31.11282576636613, 10.16966102757317, 19.65383768020932], distance: 155 },
} as const;
export type EnvironmentAssetId = keyof typeof environmentAssets;
export interface EnvironmentPlacement { id: string; asset: EnvironmentAssetId; position: [number, number, number]; yaw: number; scale: number; tint: string }
export function environmentSize(id: EnvironmentAssetId): [number, number, number] {
  const asset = environmentAssets[id], [x, y, z] = asset.sourceSize, scale = asset.height / y;
  return [(Math.abs(Math.cos(asset.yaw)) * x + Math.abs(Math.sin(asset.yaw)) * z) * scale, asset.height,
    (Math.abs(Math.sin(asset.yaw)) * x + Math.abs(Math.cos(asset.yaw)) * z) * scale];
}
