/** Soft, flowing exhaust instead of a solid cone face. The mesh remains a tiny shared primitive. */
export const jetVertexShader = /* glsl */`
  varying vec2 vUv;
  varying vec3 vTint;
  void main() {
    vUv = uv;
    #ifdef USE_INSTANCING_COLOR
      vTint = instanceColor;
    #else
      vTint = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;
export const jetFragmentShader = /* glsl */`
  uniform float uTime;
  uniform float uMotion;
  varying vec2 vUv;
  varying vec3 vTint;
  void main() {
    float flow = 0.5 + 0.5 * sin(vUv.x * 25.13274 + vUv.y * 16.0 - uTime * 12.0 * uMotion);
    float tip = pow(max(0.0, 1.0 - vUv.y), 0.55);
    float alpha = tip * (0.38 + flow * 0.32);
    gl_FragColor = vec4(mix(vTint, vec3(0.9, 1.0, 1.0), tip * 0.15), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
