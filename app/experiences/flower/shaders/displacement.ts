export const displacementPars = /* glsl */ `
attribute float binIndex;
uniform sampler2D uFrequency;
`;

// Legacy CPU loop: displacement = sin(frequency / 255), position scaled by it, so silence collapses the sphere to its centre.
export const displacementVertex = /* glsl */ `
float frequency = texelFetch(uFrequency, ivec2(int(binIndex), 0), 0).r;
vec3 transformed = position * sin(frequency);
`;
