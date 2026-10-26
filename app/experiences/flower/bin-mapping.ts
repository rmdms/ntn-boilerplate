/** Analyser FFT size (KTD7 caps it at 2048). */
export const FFT_SIZE = 2048;

/**
 * Bins spread over the sphere: the lower half of the analyser output, which is the
 * 0 – sampleRate/4 band the legacy sphere displayed (4096 vertices on 4096 of 8192 bins).
 */
export const DISPLAYED_BINS = FFT_SIZE / 4;

/** Seconds between two colour changes (legacy: 60 frames). */
export const COLOUR_INTERVAL = 1;

const LOUDNESS_THRESHOLD = 0.1;

export interface FlowerQualityLevel {
  /** Multiplier applied to the host's capped device pixel ratio. */
  pixelRatio: number;
  /** Width and height segments of the sphere. */
  segments: number;
}

/** Floor first; the top level is the legacy 64 × 64 = 4096-vertex sphere at full pixel ratio. */
export const FLOWER_QUALITY: readonly FlowerQualityLevel[] = [
  { pixelRatio: 0.5, segments: 31 },
  { pixelRatio: 0.6, segments: 47 },
  { pixelRatio: 0.7, segments: 63 },
  { pixelRatio: 0.85, segments: 63 },
  { pixelRatio: 1, segments: 63 },
];

export function sphereVertexCount(segments: number) {
  return (segments + 1) * (segments + 1);
}

/** Bin per vertex, in vertex order, spanning bin 0 to binCount - 1 evenly whatever the vertex count. */
export function binIndices(vertexCount: number, binCount: number) {
  const indices = new Float32Array(vertexCount);
  const scale = vertexCount > 1 ? (binCount - 1) / (vertexCount - 1) : 0;
  for (let i = 0; i < vertexCount; i++) indices[i] = Math.round(i * scale);
  return indices;
}

/** Legacy trigger: the displayed band summed against the full analyser range exceeds 10%. */
export function isLoud(frequencyData: Uint8Array) {
  let total = 0;
  for (let i = 0; i < DISPLAYED_BINS; i++) total += frequencyData[i]!;
  return total / (frequencyData.length * 255) > LOUDNESS_THRESHOLD;
}

/** Returns a per-frame check that is true when the colour should change. */
export function createColourCadence(interval = COLOUR_INTERVAL) {
  let elapsed = 0;
  return (dt: number, loud: boolean) => {
    elapsed += dt;
    if (elapsed <= interval || !loud) return false;
    elapsed = 0;
    return true;
  };
}
