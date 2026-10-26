export const skyVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Legacy colours were written straight to an sRGB canvas: decode them to linear so the output pass encodes them back.
export const skyFragmentShader = /* glsl */ `
varying vec2 vUv;

void main() {
  float y = smoothstep(1.0, 0.75, vUv.y);
  vec3 color = vec3(0.7568627450980392, 0.8352941176470589, 0.9372549019607843) * y + (1.0 - y);
  gl_FragColor = sRGBTransferEOTF(vec4(color, 1.0));
  #include <colorspace_fragment>
}
`;
