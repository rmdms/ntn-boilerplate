import { describe, expect, it } from "bun:test";
import {
  createQualityGovernor,
  type QualityGovernor,
} from "../../app/experiences/core/quality-governor";

function started(levels: number, level: number): QualityGovernor {
  const governor = createQualityGovernor();
  governor.start({ levels }, level);
  return governor;
}

/** Feeds frames for `durationMs`, each lasting `frameMs(level)`; returns emitted levels. */
function run(
  governor: QualityGovernor,
  frameMs: number | ((level: number) => number),
  durationMs: number,
): number[] {
  const changes: number[] = [];
  let elapsed = 0;
  while (elapsed < durationMs) {
    const dt = typeof frameMs === "number" ? frameMs : frameMs(governor.level);
    elapsed += dt;
    const next = governor.sample(dt);
    if (next !== null) changes.push(next);
  }
  return changes;
}

describe("quality governor", () => {
  it("should not change the level when only one bad window has passed", () => {
    const governor = started(5, 2);
    expect(run(governor, 40, 2000)).toEqual([]);
  });

  it("should lower the level by one step when two windows of 40 ms frames have passed", () => {
    const governor = started(5, 2);
    expect(run(governor, 40, 3000)).toEqual([1]);
  });

  it("should not raise the level when only four good windows have passed", () => {
    const governor = started(5, 2);
    expect(run(governor, 10, 3500)).toEqual([]);
  });

  it("should raise the level by one step when five good windows have passed", () => {
    const governor = started(5, 2);
    expect(run(governor, 10, 4000)).toEqual([3]);
  });

  it("should wait five seconds between upgrades when frames stay good", () => {
    const governor = started(5, 0);
    const changes = run(governor, 10, 8500);
    changes.push(...run(governor, 10, 600));
    expect(changes).toEqual([1, 2]);
  });

  it("should not raise the level above its top when frames stay good", () => {
    const governor = started(3, 2);
    expect(run(governor, 10, 20_000)).toEqual([]);
  });

  it("should restore the level and stop degrading when 33 ms frames do not improve after the probe step", () => {
    const governor = started(5, 2);
    const changes = run(governor, 1000 / 30, 15_000);
    expect({ changes, capped: governor.refreshCapped }).toEqual({
      changes: [1, 2],
      capped: true,
    });
  });

  it("should not degrade when frames turn slow after a refresh cap was detected", () => {
    const governor = started(5, 2);
    run(governor, 1000 / 30, 5000);
    expect(run(governor, 80, 5000)).toEqual([]);
  });

  it("should keep the refresh cap when the next experience starts", () => {
    const governor = started(5, 2);
    run(governor, 1000 / 30, 5000);
    governor.start({ levels: 4 }, 1);
    expect(run(governor, 1000 / 30, 10_000)).toEqual([]);
  });

  it("should keep the lower level and keep governing when frames drop to 16 ms after the probe step", () => {
    const governor = started(5, 2);
    const changes = run(
      governor,
      (level) => (level === 2 ? 1000 / 30 : 16.7),
      3600,
    );
    changes.push(...run(governor, 40, 1100));
    expect({ changes, capped: governor.refreshCapped }).toEqual({
      changes: [1, 0],
      capped: false,
    });
  });

  it("should never drop below the floor whatever the frame times", () => {
    const governor = started(3, 1);
    run(governor, 100, 20_000);
    expect(governor.level).toBe(0);
  });

  it("should pin the level when good and bad windows keep alternating past the flip-flop limit", () => {
    const governor = started(5, 2);
    const changes: number[] = [];
    for (let cycle = 0; cycle < 4; cycle++) {
      changes.push(...run(governor, 10, 6000));
      changes.push(...run(governor, 40, 1100));
    }
    expect({ changes, pinned: governor.pinned }).toEqual({
      changes: [3, 2, 3, 2],
      pinned: true,
    });
  });

  it("should ignore a single 400 ms spike", () => {
    const governor = started(5, 2);
    run(governor, 40, 2000);
    const changes = [governor.sample(400), ...run(governor, 40, 480)].filter(
      (level) => level !== null,
    );
    expect(changes).toEqual([]);
  });

  it("should ignore frames during the warm-up after start", () => {
    const governor = started(5, 2);
    expect(run(governor, 100, 1500)).toEqual([]);
  });

  it("should emit nothing when it has not been started", () => {
    const governor = createQualityGovernor();
    expect(run(governor, 100, 5000)).toEqual([]);
  });

  it("should step a sub-30 fps Android stream down level by level until frame time recovers (AE2)", () => {
    const governor = started(5, 2);
    const frameMs = (level: number) => [19, 38, 45, 45, 45][level]!;
    expect(run(governor, frameMs, 20_000)).toEqual([1, 0]);
  });
});
