export const displacementPars = /* glsl */ `
attribute float binIndex;
uniform sampler2D uFrequency;
`;

// Legacy CPU loop: displacement = sin(frequency / 255), position scaled by it, so silence collapses the sphere to its centre.
export const displacementVertex = /* glsl */ `
int bin = int(binIndex);
int binRow = textureSize(uFrequency, 0).x;
float frequency = texelFetch(uFrequency, ivec2(bin % binRow, bin / binRow), 0).r;
vec3 transformed = position * sin(frequency);
`;
