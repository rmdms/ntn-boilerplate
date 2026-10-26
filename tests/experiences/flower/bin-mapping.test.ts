import { describe, expect, it } from "bun:test";
import { SphereGeometry } from "three";
import { MAX_FFT_SIZE } from "../../../app/experiences/core/audio";
import {
  BIN_TEXTURE_SIZE,
  binIndices,
  COLOUR_INTERVAL,
  createColourCadence,
  DISPLAYED_BINS,
  FFT_SIZE,
  FLOWER_QUALITY,
  isLoud,
  sphereVertexCount,
} from "../../../app/experiences/flower/bin-mapping";

function usedBins(indices: Float32Array) {
  return new Set(indices);
}

describe("binIndices", () => {
  it("should map every vertex to a bin when a 4096-vertex sphere meets 1024 bins", () => {
    const indices = binIndices(4096, 1024);
    expect(indices.every((bin) => Number.isInteger(bin) && bin >= 0 && bin < 1024)).toBe(true);
  });

  it("should use every bin when a 4096-vertex sphere meets 1024 bins", () => {
    expect(usedBins(binIndices(4096, 1024)).size).toBe(1024);
  });

  it("should give one index per vertex when mapping", () => {
    expect(binIndices(4096, 1024).length).toBe(4096);
  });

  it("should keep the lowest and highest bin when detail drops below the bin count", () => {
    const indices = binIndices(sphereVertexCount(15), 1024);
    expect([indices[0], indices[indices.length - 1]]).toEqual([0, 1023]);
  });

  it("should spread bins evenly when detail drops below the bin count", () => {
    const indices = binIndices(sphereVertexCount(15), 1024);
    const steps = indices.slice(1).map((bin, i) => bin - indices[i]!);
    expect(Math.max(...steps) - Math.min(...steps)).toBeLessThanOrEqual(1);
  });

  it("should give consecutive vertices non-decreasing bins when mapping, so the spectrum runs pole to pole", () => {
    const indices = binIndices(sphereVertexCount(47), DISPLAYED_BINS);
    expect(indices.slice(1).every((bin, i) => bin >= indices[i]!)).toBe(true);
  });

  it("should give the duplicated seam vertices of a row different bins when mapping, so the surface tears there", () => {
    const segments = FLOWER_QUALITY[FLOWER_QUALITY.length - 1]!.segments;
    const indices = binIndices(sphereVertexCount(segments), DISPLAYED_BINS);
    const row = Math.floor(segments / 2) * (segments + 1);
    expect(indices[row + segments]).not.toBe(indices[row]);
  });
});

describe("FLOWER_QUALITY", () => {
  it("should match the legacy 4096-vertex sphere at the top level", () => {
    const top = FLOWER_QUALITY[FLOWER_QUALITY.length - 1]!;
    expect(new SphereGeometry(50, top.segments, top.segments).attributes.position!.count).toBe(4096);
  });

  it("should never raise pixel ratio or detail when the level drops", () => {
    const ordered = FLOWER_QUALITY.slice(1).every(
      (level, i) =>
        level.pixelRatio >= FLOWER_QUALITY[i]!.pixelRatio &&
        level.segments >= FLOWER_QUALITY[i]!.segments,
    );
    expect(ordered).toBe(true);
  });

  it("should use the legacy 2^14 FFT when configured", () => {
    expect(FFT_SIZE).toBe(16384);
  });

  it("should keep the FFT within what the audio system accepts when configured", () => {
    expect(FFT_SIZE).toBeLessThanOrEqual(MAX_FFT_SIZE);
  });

  it("should give each vertex of the top-level sphere its own bin, like legacy", () => {
    const top = FLOWER_QUALITY[FLOWER_QUALITY.length - 1]!;
    const indices = binIndices(sphereVertexCount(top.segments), DISPLAYED_BINS);
    expect(indices.every((bin, i) => bin === i)).toBe(true);
  });

  it("should lay the displayed bins out as a square texture within 4096 px a side", () => {
    expect([BIN_TEXTURE_SIZE * BIN_TEXTURE_SIZE, BIN_TEXTURE_SIZE <= 4096]).toEqual([DISPLAYED_BINS, true]);
  });
});

describe("isLoud", () => {
  it("should be false when the track is silent", () => {
    expect(isLoud(new Uint8Array(FFT_SIZE / 2))).toBe(false);
  });

  it("should be true when the displayed band averages above a fifth of full scale", () => {
    const data = new Uint8Array(FFT_SIZE / 2);
    data.fill(60, 0, DISPLAYED_BINS);
    expect(isLoud(data)).toBe(true);
  });

  it("should be false when the displayed band averages below a fifth of full scale", () => {
    const data = new Uint8Array(FFT_SIZE / 2);
    data.fill(40, 0, DISPLAYED_BINS);
    expect(isLoud(data)).toBe(false);
  });
});

describe("createColourCadence", () => {
  it("should not change colour before the interval has elapsed", () => {
    const cadence = createColourCadence();
    expect(cadence(COLOUR_INTERVAL * 0.9, true)).toBe(false);
  });

  it("should change colour once the interval has elapsed and the track is loud", () => {
    const cadence = createColourCadence();
    expect(cadence(COLOUR_INTERVAL * 1.1, true)).toBe(true);
  });

  it("should wait a full interval after a change when frames keep coming", () => {
    const cadence = createColourCadence();
    cadence(COLOUR_INTERVAL * 1.1, true);
    expect(cadence(COLOUR_INTERVAL * 0.5, true)).toBe(false);
  });

  it("should change colour at the first loud frame after a quiet stretch", () => {
    const cadence = createColourCadence();
    cadence(COLOUR_INTERVAL * 3, false);
    expect(cadence(1 / 60, true)).toBe(true);
  });
});
