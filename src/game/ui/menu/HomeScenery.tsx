import { useEffect, useMemo } from 'react';
import { BackSide, BufferGeometry, CatmullRomCurve3, Color, Float32BufferAttribute, Vector3 } from 'three';

const coastlineRoad = new CatmullRomCurve3([
  new Vector3(-13, 0, -95), new Vector3(6, 0, -53), new Vector3(-3, 0, -25),
  new Vector3(0, 0, -9), new Vector3(0, 0, 9), new Vector3(8, 0, 45),
]);

/** Cosmetic menu road only; it never enters collision, track selection or simulation. */
function roadRibbon(left: number, right: number, y: number, stripes = false, dashed = false) {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const color = new Color();
  for (let i = 0; i < 200; i++) {
    if (dashed && i % 6 > 2) continue;
    const start = positions.length / 3;
    for (const [t, offset] of [[i / 200, left], [i / 200, right], [(i + 1) / 200, left], [(i + 1) / 200, right]]) {
      const point = coastlineRoad.getPoint(t), tangent = coastlineRoad.getTangent(t);
      const length = Math.hypot(tangent.x, tangent.z);
      positions.push(point.x + tangent.z / length * offset, y, point.z - tangent.x / length * offset);
      color.set(stripes && Math.floor(i / 3) % 2 === 0 ? '#e99c74' : '#fff1cf');
      colors.push(color.r, color.g, color.b);
    }
    indices.push(start, start + 2, start + 1, start + 1, start + 2, start + 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
function CoastalRoad() {
  const ribbons = useMemo(() => [roadRibbon(-4.1, 4.1, 0), roadRibbon(-3.75, 3.75, 0.012), roadRibbon(-3.95, -3.75, 0.02, true), roadRibbon(3.75, 3.95, 0.02, true), roadRibbon(-0.045, 0.045, 0.025, false, true)], []);
  useEffect(() => () => ribbons.forEach(geometry => geometry.dispose()), [ribbons]);
  return <group>
    <mesh geometry={ribbons[0]}><meshLambertMaterial color="#c8ad84" /></mesh>
    <mesh geometry={ribbons[1]} receiveShadow><meshStandardMaterial color="#4c626c" roughness={0.95} /></mesh>
    {ribbons.slice(2).map((geometry, index) => <mesh key={index} geometry={geometry}><meshLambertMaterial vertexColors /></mesh>)}
  </group>;
}
function Palm({ position, scale = 1, lean = 0 }: { position: [number, number, number]; scale?: number; lean?: number }) {
  return <group position={position} scale={scale} rotation={[0, 0, lean]}>
    <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.13, 0.23, 4.4, 7]} /><meshLambertMaterial color="#a67b60" /></mesh>
    {Array.from({ length: 6 }, (_, i) => <group key={i} position={[0, 4.3, 0]} rotation={[0, i * Math.PI / 3, 0]}>
      <mesh position={[1, -0.1, 0]} rotation={[0, 0, -0.18]} scale={[1.6, 0.13, 0.42]}><sphereGeometry args={[1, 7, 4]} /><meshLambertMaterial color={i % 2 ? '#679479' : '#83a578'} /></mesh>
    </group>)}
  </group>;
}
const skyVertex = `varying vec3 direction; void main() { direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const skyFragment = `varying vec3 direction;
void main() {
  vec3 d = normalize(direction);
  vec3 horizon = vec3(1.0, 0.77, 0.58);
  vec3 upper = vec3(0.39, 0.66, 0.76);
  vec3 sky = mix(horizon, upper, smoothstep(-0.03, 0.65, d.y));
  float sun = smoothstep(0.9985, 0.9995, dot(d, normalize(vec3(-0.65, 0.12, -1.0))));
  float glow = pow(max(0.0, dot(d, normalize(vec3(-0.65, 0.12, -1.0)))), 28.0);
  sky = mix(sky, vec3(1.0, 0.86, 0.63), glow * 0.28);
  gl_FragColor = vec4(mix(sky, vec3(1.0, 0.95, 0.76), sun), 1.0);
}`;

export function HomeScenery() {
  return <>
    <mesh><sphereGeometry args={[110, 32, 16]} /><shaderMaterial side={BackSide} vertexShader={skyVertex} fragmentShader={skyFragment} depthWrite={false} toneMapped={false} /></mesh>
    <mesh position={[-60, 11, -92]}><sphereGeometry args={[2.8, 24, 16]} /><meshBasicMaterial color="#fff3ce" fog={false} toneMapped={false} /></mesh>
    <fog attach="fog" args={['#eac5ac', 24, 95]} />
    <hemisphereLight args={['#fff1d3', '#69968a', 1.6]} />
    <directionalLight position={[-8, 12, -5]} color="#ffdbb1" intensity={2.4} castShadow
      shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-5} shadow-camera-right={5}
      shadow-camera-top={5} shadow-camera-bottom={-5} shadow-camera-far={35} shadow-bias={-0.0003} shadow-normalBias={0.015} />
    <directionalLight position={[7, 6, 9]} color="#d3eeff" intensity={1.3} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]}><planeGeometry args={[240, 240]} /><meshLambertMaterial color="#9bad83" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-52, -0.05, -20]}><planeGeometry args={[80, 200]} /><meshBasicMaterial color="#8ebfc1" /></mesh>
    <CoastalRoad />
    {[[11, 2, -30, 14], [22, 3, -47, 21], [-24, 1, -58, 12], [5, 2, -76, 17]].map(([x, y, z, scale], i) => <mesh key={i} position={[x, y, z]} scale={[scale, scale * 0.45, scale * 0.7]}>
      <icosahedronGeometry args={[1, 1]} /><meshLambertMaterial color={i % 2 ? '#8aa699' : '#a5b49a'} flatShading />
    </mesh>)}
    <Palm position={[-6, 0, -10]} scale={1.05} lean={-0.12} />
    <Palm position={[-10, 0, -28]} scale={1.4} lean={0.1} />
    <Palm position={[-7, 0, -20]} scale={1.2} lean={-0.14} />
    <Palm position={[-18, 0, -39]} scale={1.4} lean={0.07} />
    <Palm position={[-11, 0, -46]} scale={1.5} />
    {[[5, -5, 1], [5.2, -7, 0.6], [-5, -12, 1.1], [8, -23, 1.6]].map(([x, z, scale], i) => <mesh key={i} position={[x, scale * 0.25, z]} scale={[scale, scale * 0.6, scale * 0.8]}>
      <dodecahedronGeometry args={[0.6, 0]} /><meshLambertMaterial color="#c7bda7" />
    </mesh>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.028, 0]}>
      <planeGeometry args={[3.3, 4.2]} /><shaderMaterial transparent depthWrite={false}
        vertexShader={'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'}
        fragmentShader={'varying vec2 vUv; void main(){float a=pow(max(0.0,1.0-length((vUv-0.5)*2.0)),1.6); gl_FragColor=vec4(0.12,0.19,0.2,a*0.5);}'} />
    </mesh>
  </>;
}
