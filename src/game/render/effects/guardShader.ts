/** Original procedural lattice: no textures, lights or post-processing dependency. */
export const guardVertexShader = /* glsl */`
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vTint;
  void main() {
    vUv = uv;
    vec4 local = instanceMatrix * vec4(position, 1.0);
    vec4 view = modelViewMatrix * local;
    mat3 basis = mat3(instanceMatrix);
    vec3 corrected = normal / vec3(dot(basis[0], basis[0]), dot(basis[1], basis[1]), dot(basis[2], basis[2]));
    vNormal = normalize(normalMatrix * basis * corrected);
    vView = -view.xyz;
    #ifdef USE_INSTANCING_COLOR
      vTint = instanceColor;
    #else
      vTint = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * view;
  }
`;
export const guardFragmentShader = /* glsl */`
  uniform float uTime;
  uniform float uMotion;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vTint;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
    vec2 p = vUv * vec2(31.1769, 18.0);
    vec2 period = vec2(1.73205, 3.0);
    vec2 a = mod(p, period) - period * 0.5;
    vec2 b = mod(p - period * 0.5, period) - period * 0.5;
    vec2 cell = dot(a,a) < dot(b,b) ? a : b;
    cell = abs(cell);
    float hex = max(dot(cell, vec2(0.8660254, 0.5)), cell.y);
    float lattice = smoothstep(0.69, 0.76, hex);
    float scan = pow(0.5 + 0.5 * sin(vUv.y * 18.84956 - uTime * 2.4 * uMotion), 12.0);
    float alpha = 0.035 + rim * 0.53 + lattice * (0.035 + rim * 0.12) + scan * 0.045;
    vec3 tint = mix(vTint, vec3(0.84, 1.0, 1.0), rim * 0.65 + scan * 0.15);
    gl_FragColor = vec4(tint, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
