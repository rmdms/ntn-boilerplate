// Closed form of the legacy per-frame step: the settled offset toward the pointer, capped so a dot never passes it.
export const vertexShader = /* glsl */ `
attribute vec3 dotColor;

uniform vec2 uPointer;
uniform float uStrength;
uniform float uPull;
uniform float uRadius;
uniform float uPixelRatio;

varying vec3 vColor;

void main() {
  vec2 toPointer = uPointer - position.xy;
  float dist = length(toPointer);
  vec2 offset = toPointer * (min(uPull, dist) / max(dist, 1e-4)) * uStrength;
  vColor = dotColor;
  gl_PointSize = (2.0 * uRadius + 2.0) * uPixelRatio;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy + offset, 0.0, 1.0);
}
`;

// Colours are written as-is, like the legacy 2D canvas fill.
export const fragmentShader = /* glsl */ `
uniform float uRadius;
uniform float uPixelRatio;

varying vec3 vColor;

void main() {
  float size = (2.0 * uRadius + 2.0) * uPixelRatio;
  float d = length(gl_PointCoord - 0.5) * size;
  float alpha = clamp(uRadius * uPixelRatio - d + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(vColor, alpha);
}
`;
