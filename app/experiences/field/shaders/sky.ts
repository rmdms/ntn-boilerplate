export const skyVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const skyFragmentShader = /* glsl */ `
varying vec2 vUv;

void main() {
  float y = smoothstep(1.0, 0.75, vUv.y);
  vec3 color = vec3(0.7568627450980392, 0.8352941176470589, 0.9372549019607843) * y + (1.0 - y);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
`;
