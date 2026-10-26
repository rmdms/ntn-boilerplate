import { describe, expect, it } from "bun:test";
import {
  attractedPosition,
  createGrid,
  easeAttraction,
  fitRect,
  LEGACY_SOURCE,
  needsRender,
  pointerTarget,
  smoothing,
  type Raster,
  type Rect,
  type Size,
} from "../../../app/experiences/attract/grid";

function solidRaster(view: Size, rgb: [number, number, number]): Raster {
  const data = new Uint8ClampedArray(view.width * view.height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([...rgb, 255], i);
  return { width: view.width, height: view.height, data };
}

// Mirrors legacy preparePoints: for (i = 0; i < height; i += density) for (j = 0; j < width; j += density).
function legacyPointCount(width: number, height: number, density: number) {
  let count = 0;
  for (let i = 0; i < height; i += density)
    for (let j = 0; j < width; j += density) count++;
  return count;
}

describe("attract grid", () => {
  it("should produce the legacy point count when the viewport is 390 x 844 at spacing 25", () => {
    const grid = createGrid((view) => solidRaster(view, [0, 0, 0]));
    expect(grid.build({ width: 390, height: 844 }, 25).count).toBe(
      legacyPointCount(390, 844, 25),
    );
  });

  it("should place rest positions on the legacy loop coordinates when built", () => {
    const grid = createGrid((view) => solidRaster(view, [0, 0, 0]));
    const { positions } = grid.build({ width: 390, height: 844 }, 25);
    expect(Array.from(positions.slice(16 * 3, 16 * 3 + 6))).toEqual([
      0, 25, 0, 25, 25, 0,
    ]);
  });

  it("should read each point's colour from the raster pixel under its rest position", () => {
    const grid = createGrid((view) => {
      const raster = solidRaster(view, [0, 0, 0]);
      raster.data.set([200, 100, 50, 255], (25 + 50 * view.width) * 4);
      return raster;
    });
    const { colors } = grid.build({ width: 100, height: 100 }, 25);
    const index = 2 * 4 + 1;
    expect(Array.from(colors.slice(index * 3, index * 3 + 3))).toEqual([
      200, 100, 50,
    ]);
  });

  it("should rasterize the decoded image again without decoding it when the viewport resizes", () => {
    let decodes = 0;
    const decode = () => {
      decodes++;
      return { pixels: [10, 20, 30] as [number, number, number] };
    };
    const image = decode();
    const views: Size[] = [];
    const grid = createGrid((view) => {
      views.push(view);
      return solidRaster(view, image.pixels);
    });
    grid.build({ width: 390, height: 844 }, 25);
    const resized = grid.build({ width: 844, height: 390 }, 25);
    expect({ decodes, views: views.length, count: resized.count }).toEqual({
      decodes: 1,
      views: 2,
      count: legacyPointCount(844, 390, 25),
    });
  });

  it("should reuse the raster when only the spacing changes", () => {
    let rasterized = 0;
    const grid = createGrid((view) => {
      rasterized++;
      return solidRaster(view, [0, 0, 0]);
    });
    grid.build({ width: 390, height: 844 }, 25);
    grid.build({ width: 390, height: 844 }, 30);
    expect(rasterized).toBe(1);
  });
});

describe("attract letterbox fit", () => {
  it("should fit the original source inside the viewport minus 100 px when it is larger", () => {
    const rect = fitRect(LEGACY_SOURCE, { width: 390, height: 844 });
    const ratio = Math.max(8164 / 290, 5102 / 744);
    expect(rect).toEqual({
      x: (390 - 8164 / ratio) / 2,
      y: (844 - 5102 / ratio) / 2,
      width: 8164 / ratio,
      height: 5102 / ratio,
    });
  });

  it("should keep the original's fit when the downscaled source would fit unscaled", () => {
    const view = { width: 2560, height: 1440 };
    let drawn: Rect | null = null;
    const grid = createGrid((size, rect) => {
      drawn = rect;
      return solidRaster(size, [0, 0, 0]);
    });
    grid.build(view, 25);
    const ratio = Math.max(8164 / 2460, 5102 / 1340);
    expect(drawn!.width).toBeCloseTo(8164 / ratio, 6);
  });

  it("should draw the source at its own size when it already fits", () => {
    const rect = fitRect(
      { width: 100, height: 50 },
      { width: 400, height: 300 },
    );
    expect(rect).toEqual({ x: 150, y: 125, width: 100, height: 50 });
  });
});

describe("attract attraction", () => {
  it("should move a dot 20 px toward a far pointer when fully attracted", () => {
    const [x, y] = attractedPosition(100, 100, 100, 300, 1);
    expect([x, y]).toEqual([100, 120]);
  });

  it("should stop a dot on the pointer when the pointer is closer than 20 px", () => {
    const [x, y] = attractedPosition(100, 100, 108, 106, 1);
    expect([x, y]).toEqual([108, 106]);
  });

  it("should leave a dot at rest when the strength is zero", () => {
    expect(attractedPosition(100, 100, 300, 300, 0)).toEqual([100, 100]);
  });

  it("should leave a dot at rest when the pointer sits on it", () => {
    expect(attractedPosition(100, 100, 100, 100, 1)).toEqual([100, 100]);
  });
});

describe("attract smoothing", () => {
  it("should ease 5% of the way per frame when running at 60 Hz", () => {
    expect(smoothing(1 / 60)).toBeCloseTo(0.05, 10);
  });

  it("should ease as far in two 120 Hz frames as in one 60 Hz frame", () => {
    const twice = 1 - (1 - smoothing(1 / 120)) ** 2;
    expect(twice).toBeCloseTo(smoothing(1 / 60), 10);
  });

  it("should move the eased pointer 5% toward the target per 60 Hz frame while attracting", () => {
    const state = { x: 0, y: 0, strength: 1 };
    easeAttraction(state, { x: 100, y: 200, strength: 1 }, 1 / 60);
    expect([state.x, state.y].map((v) => v.toFixed(9))).toEqual(["5.000000000", "10.000000000"]);
  });

  it("should jump the eased pointer to the target when attraction starts from rest", () => {
    const state = { x: 0, y: 0, strength: 0 };
    easeAttraction(state, { x: 100, y: 200, strength: 1 }, 1 / 60);
    expect([state.x, state.y]).toEqual([100, 200]);
  });

  it("should decay the strength 5% per 60 Hz frame when attraction stops", () => {
    const state = { x: 0, y: 0, strength: 1 };
    easeAttraction(state, { x: 0, y: 0, strength: 0 }, 1 / 60);
    expect(state.strength).toBeCloseTo(0.95, 10);
  });
});

describe("attract pointer mapping", () => {
  const view = { width: 400, height: 800 };
  const base = { x: 0, y: 0, down: false, active: true, wheel: 0 };

  it("should convert the NDC pointer to CSS pixels with y down", () => {
    const target = pointerTarget({ ...base, x: -1, y: 1, kind: "mouse" }, view);
    expect([target.x, target.y]).toEqual([0, 0]);
  });

  it("should attract when a touch is pressed", () => {
    const target = pointerTarget({ ...base, kind: "touch", down: true }, view);
    expect(target.strength).toBe(1);
  });

  it("should relax when a touch is released", () => {
    const target = pointerTarget(
      { ...base, kind: "touch", down: false, active: false },
      view,
    );
    expect(target.strength).toBe(0);
  });

  it("should attract when a mouse hovers without pressing", () => {
    const target = pointerTarget({ ...base, kind: "mouse" }, view);
    expect(target.strength).toBe(1);
  });

  it("should relax when the mouse is not over the page", () => {
    const target = pointerTarget(
      { ...base, kind: "mouse", active: false },
      view,
    );
    expect(target.strength).toBe(0);
  });
});

describe("attract render decision", () => {
  const rest = { x: 0, y: 0, strength: 0 };
  const pressed = { x: 0, y: 0, strength: 1 };

  it("should skip rendering when at rest, not attracting and clean", () => {
    expect(needsRender(rest, rest, false)).toBe(false);
  });

  it("should render when the scene is dirty", () => {
    expect(needsRender(rest, rest, true)).toBe(true);
  });

  it("should render while the target attracts", () => {
    expect(needsRender(rest, pressed, false)).toBe(true);
  });

  it("should render while the eased strength has not settled", () => {
    expect(needsRender({ x: 0, y: 0, strength: 0.5 }, rest, false)).toBe(true);
  });
});
