// Legacy warp, now read from the plane's world position: planes near the screen centre bulge toward the camera.
// u_scale undoes the responsive scene scale so the warp radius stays the legacy one.
export const vertexShader = /* glsl */ `
uniform float u_maxDistance;
uniform float u_magnitude;
uniform float u_progress;
uniform float u_scale;

varying vec2 vUv;

float q(float t) {
  float p = 2.0 * t * t;
  return t < 0.5 ? p : -p + (4.0 * t) - 1.0;
}

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  float distance = length(world.xy) / u_scale;
  float zChange = 0.0;
  if (distance < u_maxDistance) {
    zChange = (1.0 - q(distance / u_maxDistance)) * u_magnitude * u_progress;
  }
  // Legacy displaced local z on a plane flipped around x, which is world -z.
  world.z -= zChange;
  gl_Position = projectionMatrix * viewMatrix * world;
  vUv = uv;
}
`;

// Kept in the legacy's gamma space on purpose: the texture is not tagged sRGB and the output is not converted.
export const fragmentShader = /* glsl */ `
uniform sampler2D u_texture;
uniform vec2 u_textureFactor;
uniform float u_blackAndWhite;
uniform float u_opacityColor;

varying vec2 vUv;

void main() {
  vec2 textureUV = vec2(vUv.x, 1.0 - vUv.y) * u_textureFactor - u_textureFactor / 2.0 + 0.5;
  vec4 textureColor = texture2D(u_texture, textureUV);
  vec4 blackAndWhiteTexture = vec4(vec3(textureColor.x + textureColor.y + textureColor.z) / 3.0, 1.0);
  vec4 bwColored = mix(blackAndWhiteTexture, vec4(u_opacityColor), 0.9);
  gl_FragColor = mix(textureColor, bwColored, u_blackAndWhite);
}
`;
