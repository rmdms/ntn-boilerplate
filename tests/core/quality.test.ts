import { describe, expect, it } from "bun:test";
import { applyPixelRatio, basePixelRatio, levelAt, resolvePixelRatio } from "../../app/experiences/core/quality";
import { frameEase } from "../../app/experiences/core/clock";

describe("basePixelRatio", () => {
  it("should cap a 3x phone screen at 2 without knowing the device", () => {
    expect(basePixelRatio(3)).toBe(2);
  });

  it("should keep a Retina Mac at its native 2, like the live site's field and photography", () => {
    expect(basePixelRatio(2)).toBe(2);
  });

  it("should keep a ratio below the cap unchanged", () => {
    expect(basePixelRatio(1.25)).toBe(1.25);
  });
});

describe("levelAt", () => {
  it("should return the entry at the requested level", () => {
    expect(levelAt(["a", "b", "c"], 1)).toBe("b");
  });

  it("should clamp to the floor when the level is negative", () => {
    expect(levelAt(["a", "b", "c"], -2)).toBe("a");
  });

  it("should clamp to the top when the level is past the last entry", () => {
    expect(levelAt(["a", "b", "c"], 9)).toBe("c");
  });
});

describe("resolvePixelRatio", () => {
  it("should scale the base ratio by a numeric factor", () => {
    expect(resolvePixelRatio(2, 0.5)).toBe(1);
  });

  it("should use the device ratio up to 2 but never below the base when native", () => {
    expect(resolvePixelRatio(1.5, "native", 3)).toBe(2);
    expect(resolvePixelRatio(1.5, "native", 1)).toBe(1.5);
  });
});

describe("applyPixelRatio", () => {
  const fakeRenderer = (initial: number) => {
    let ratio = initial;
    let sets = 0;
    return {
      renderer: {
        getPixelRatio: () => ratio,
        setPixelRatio: (next: number) => {
          ratio = next;
          sets++;
        },
      },
      sets: () => sets,
    };
  };

  it("should set the ratio when it changes", () => {
    const fake = fakeRenderer(1);
    expect(applyPixelRatio(fake.renderer, 2)).toBe(true);
    expect(fake.sets()).toBe(1);
  });

  it("should leave the renderer untouched when the ratio is unchanged", () => {
    const fake = fakeRenderer(1.5);
    expect(applyPixelRatio(fake.renderer, 1.5)).toBe(false);
    expect(fake.sets()).toBe(0);
  });
});

describe("frameEase", () => {
  it("should cover the rate per frame at 60 Hz", () => {
    expect(frameEase(0.05, 1 / 60)).toBeCloseTo(0.05, 10);
  });

  it("should match one 60 Hz frame with two 120 Hz frames", () => {
    const half = frameEase(0.05, 1 / 120);
    expect(1 - (1 - half) ** 2).toBeCloseTo(frameEase(0.05, 1 / 60), 10);
  });
});
