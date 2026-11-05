# Kart and driver GLB integration

Date: 2026-11-05. This extends the completed M2 visual rig; it does not add race systems. The user explicitly selected the supplied character for this **local prototype**, after its identity was flagged against the original-character rule. The source GLBs are preserved byte-for-byte.

## Inspected source files

| | Kart | Character |
| --- | --- | --- |
| File | `public/assets/karts/my-kart.glb` | `public/assets/characters/my-character.glb` |
| Bytes | 832,164 | 7,604,276 |
| Meshes / materials | 5 / 1 | 8 / 8 |
| Triangles | 7,696 | 36,482 |
| Embedded textures | One 1024² PNG | Seven 1024² PNGs and one 256² PNG |
| Skins / animation clips | 0 / 0 | 0 / 0 |
| Scene-space bounds | X ±0.843; Y −0.103…0.781; Z −0.951…0.994 | X ±3.850; Y −0.000318…7.134; Z −1.377…1.914 |

Both are glTF 2.0, with no required compression extensions. The exporters retain a −90° X conversion node. The kart also has FBX centimeter conversion and 100× mesh nodes; inspecting raw POSITION accessors alone gives misleading scale/axes. The loader preserves those transforms before baking **static** mesh geometry into Y-up scene coordinates. Both models face +Z. The character is a standing T-pose with meshes split by material, not limbs or bones. There is no seated driving animation to play.

The kart has a body mesh and four separately named wheel meshes. Their native centers are approximately X ±0.484, Y 0.052, Z +0.448 (front) / −0.489 (rear). Wheels are baked into scene coordinates, centered on separate spin/steering pivots, then fitted with the chassis.

All source materials are textured, double-sided, nonmetallic PBR. Kart roughness is approximately 0.82; character roughness is 0.5. UVs include values outside 0…1: their imported UVs and sampler wrapping are preserved. GLTFLoader handles base-color sRGB conversion, orientation and texture sampling; no blanket color-space changes are applied to data textures. Existing sunny hemisphere/directional lighting and filtered shadows are retained. Cloned meshes cast and receive shadows.

## Mounting and pose

`src/game/config/visualAssets.ts` defines URLs, model transforms, wheel names/radius, the driver seat transform and the asset-specific pose adapter. The kart is scaled 1.5× and its tire bottoms moved to local Y=0. The driver is scaled 0.24×, facing forward, with its hip anchored at `[0, 0.64, -0.27]`. The imported assembly is approximately 2.53 m wide and 2.92 m long. Its actual kart vertices fit inside the existing 1.8 m planar collision radius; the collider is unchanged.

`KartVisual` retains the previous interpolated translation/heading, drift yaw, banking, jump offset and landing squash. `KartAssembly` mounts the kart model and a named `driver-seat-anchor` beneath the same body group. The driver is a child of that anchor; it cannot lag behind or detach during hops/drifts. Wheels use the original steering sign and spin signal, adjusted for the imported tire radius. M2 spark/exhaust effects remain attached to the motion root. Decorative engine pods in the GLB are static; the existing boost effect is not a simulation of those pods.

`staticDriverPose.ts` applies a one-time approximate mesh deformation to the supplied unrigged character: hip/knee bends move legs into the footwell, and shoulder/elbow/wrist fitting brings the gloves near the steering wheel. It recomputes vertex normals. This is a **static compatible visual pose**, not skeletal animation, IK or a precise finger grip. Gloves remain large, finger contact is approximate, and blended joint regions can show mesh distortion close up. Hands do not animate with wheel steering.

`prepareModel.ts` clones cached models, owns/disposes only geometry it bakes/deforms, and leaves shared source materials/textures intact. Authored drivers with `pose: 'authored'` retain their hierarchy/skeleton using SkeletonUtils.clone. Future drivers/karts can be registered through new definitions and passed to `KartVisual`; there is no gameplay/stat change or selection menu. New authored drivers should export their mounting origin at the hips and be fitted through their definition.

Both GLBs load together through Drei `useGLTF`, using local files and no CDN decoders. Suspense shows the original procedural kart while loading. A local asset error boundary retains playable procedural art and displays a reload notice if a model fails.

## Fitting workshop

Run `npm run dev`, then open **http://127.0.0.1:5173/?asset-preview** (use the port printed by Vite). It reuses `KartAssembly` and provides orbit/zoom, side/front/top views, original-model inspection, anchor axes, numeric position/rotation/scale controls and copyable JSON. Rotation values are radians. Changes remain in preview memory; copy desired values into `visualAssets.ts` to keep them. Restore defaults resets the fit; scale/seat edits and keyboard activation of Restore defaults were checked in-browser. The workshop is gated by `import.meta.env.DEV` and excluded from the production bundle.

## Source attribution (embedded GLB metadata)

These credits reproduce the supplied files' metadata; they are not a claim that the imported character is original Turbo Kart Legends art or that its recognizable branding is cleared for release.

- **“practice kart”** — [amogusstrikesback2](https://sketchfab.com/amogusstrikesback2), [source model](https://sketchfab.com/3d-models/practice-kart-47a59d8980a44d318c489ebd054b11ba). File declares [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Runtime adaptations: scale/origin normalization and independently animated wheel pivots.
- **“Mario obj”** — [MatiasH290](https://sketchfab.com/matias029), [source model](https://sketchfab.com/3d-models/mario-obj-c549d24b60f74d8f85c7a5cbd2f55d0f). File declares [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Runtime adaptations: scale/origin fitting and approximate seated mesh deformation. Used locally at the user's explicit request; replace this recognizable franchise character with original art for the project's intended original-asset release.

## Verification

- `npm install` succeeded; stable Drei 10.7.9 peers match React 19 / R3F 9 / Three 0.187. Dependency audit reported zero vulnerabilities.
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`: passed. **59 tests across 9 files**, including all existing 54 M1/M2 behavior tests and five real-GLB geometry/metadata/instance tests.
- New tests verify zero skin/clip counts, four centered wheel pivots, immutable cached scenes, geometry disposal, road-level wheel placement, the existing collider envelope, driver floor clearance and hand reference positions, and independent authored instances. These are not a proof of triangle-level collision-free anatomy.
- SHA-256 comparison against the pre-integration snapshot confirms unchanged simulation, fixed-step loop, kart/drift/jump/collision controllers, keyboard/gamepad controls, chase camera and both supplied GLBs.
- Browser QA in the in-app browser: original T-pose inspection; fitted side/front/top views; no obvious torso/seat/sidewall or foot/floor penetration in those views; gloves approach the wheel with approximate finger contact. This is visual QA, not an exhaustive triangle-intersection guarantee.
- Gameplay QA: Play loads both textured models; acceleration reached 47–49 km/h; a drift-entry hop visibly lifts the entire assembly; release reaches Spark Turbo with exhaust effects; the character stays attached. Pause freezes the active boost while W is held; resume works; R at speed returns to the initial heading/position with speed and charge at zero.
- Production preview: HTTP 200 for the page and both GLBs; Play/movement work after a clean reload of the completed build. No new console errors after the loading-label fix. The existing upstream Three.Clock deprecation warning remains.
- During QA, Drei Html's loading-label teardown produced a React nested-root/removeChild error. Moving loading/error notices into GameCanvas's regular DOM layer resolved it in the final build. The development workshop no longer remounts Canvas when changing camera views.
- Screenshots: [source models](model-source-preview.jpg), [side fit](model-fit-side.jpg), [top fit](model-fit-top.jpg), [hop](model-hop.jpg), [turbo gameplay](model-gameplay.jpg).
- Historical device/controller coverage gaps from M2 still apply: real gamepad, OS focus switching, Firefox/Safari, listening checks and performance measurements remain manual. No new cross-browser/FPS claim is made.

## Remaining asset work

For a production seated driver, use Blender to add an armature, weight the mesh, author a proper seated bind/idle pose with pelvis/spine/hips/knees/ankles, and animate shoulder/elbow/wrist/finger placement against the kart's steering wheel. Export an appropriately named driving clip and hip/root mounting origin; test skin deformation through steering and landing. The current material-split OBJ export has no rig to retarget. Optimize/repack the eight character textures and consider a compressed export with local decoders before adding a fleet. Performance/device coverage has not been benchmarked.
