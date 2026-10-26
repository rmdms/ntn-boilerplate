export const grassVertexShader = /* glsl */ `
uniform float uTime;
uniform float uFrequency;

varying float vPendul;
varying vec2 vUv;

float SimplexPerlin2D(vec2 P) {
  const float SKEWFACTOR = 0.36602540378443864676372317075294;
  const float UNSKEWFACTOR = 0.21132486540518711774542560974902;
  const float SIMPLEX_TRI_HEIGHT = 0.70710678118654752440084436210485;
  const vec3 SIMPLEX_POINTS = vec3(1.0 - UNSKEWFACTOR, -UNSKEWFACTOR, 1.0 - 2.0 * UNSKEWFACTOR);
  P *= SIMPLEX_TRI_HEIGHT;
  vec2 Pi = floor(P + dot(P, vec2(SKEWFACTOR)));
  vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);
  Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;
  Pt += vec2(26.0, 161.0).xyxy;
  Pt *= Pt;
  Pt = Pt.xzxz * Pt.yyww;
  vec4 hash_x = fract(Pt * (1.0 / 951.135664));
  vec4 hash_y = fract(Pt * (1.0 / 642.949883));
  vec2 v0 = Pi - dot(Pi, vec2(UNSKEWFACTOR)) - P;
  vec4 v1pos_v1hash = (v0.x < v0.y) ? vec4(SIMPLEX_POINTS.xy, hash_x.y, hash_y.y) : vec4(SIMPLEX_POINTS.yx, hash_x.z, hash_y.z);
  vec4 v12 = vec4(v1pos_v1hash.xy, SIMPLEX_POINTS.zz) + v0.xyxy;
  vec3 grad_x = vec3(hash_x.x, v1pos_v1hash.z, hash_x.w) - 0.49999;
  vec3 grad_y = vec3(hash_y.x, v1pos_v1hash.w, hash_y.w) - 0.49999;
  vec3 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y) * (grad_x * vec3(v0.x, v12.xz) + grad_y * vec3(v0.y, v12.yw));
  const float FINAL_NORMALIZATION = 99.204334582718712976990005025589;
  vec3 m = vec3(v0.x, v12.xz) * vec3(v0.x, v12.xz) + vec3(v0.y, v12.yw) * vec3(v0.y, v12.yw);
  m = max(0.5 - m, 0.0);
  m = m * m;
  return dot(m * m, grad_results) * FINAL_NORMALIZATION;
}

void main() {
  vUv = uv;
  vec4 mvPosition = instanceMatrix * vec4(position, 1.0);
  float noise = SimplexPerlin2D(mvPosition.xy * uFrequency + uTime * 0.4) * 0.5 + 0.5;
  vPendul = sin(vUv.y * noise);
  mvPosition.xy -= vPendul * 0.095;
  gl_Position = projectionMatrix * modelViewMatrix * mvPosition;
}
`;

export const grassFragmentShader = /* glsl */ `
uniform sampler2D uTexture;

varying float vPendul;
varying vec2 vUv;

void main() {
  if (texture2D(uTexture, vUv).a < 0.5) discard;
  vec3 color1 = vec3(0.5176470588, 0.2470588235, 0.03529411765);
  vec3 color2 = vec3(0.7960784314, 0.7215686275, 0.3568627451) * 1.25;
  vec3 color = mix(color1, color2, vUv.y) + smoothstep(0.25, 1.0, abs(vPendul)) * 0.25;
  gl_FragColor = sRGBTransferEOTF(vec4(color, 1.0));
  #include <colorspace_fragment>
}
`;
