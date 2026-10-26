import { describe, expect, it } from "bun:test";
import type { PointerState } from "../../../app/experiences/core/experience";
import {
  ILLUMINATE_LEVELS,
  LIGHTS_PER_DROP,
  createTapTracker,
  dropPoint,
  needsFrame,
  shouldReset,
} from "../../../app/experiences/illuminate/controls";

const size = { width: 400, height: 800 };
const square = { width: 400, height: 400 };

function pointer(
  px: number,
  py: number,
  down: boolean,
  kind: PointerState["kind"] = "touch",
  viewport = size,
): PointerState {
  return {
    x: (px / viewport.width) * 2 - 1,
    y: 1 - (py / viewport.height) * 2,
    down,
    kind,
    active: down || kind === "mouse",
    wheel: 0,
  };
}

function press(distance: number, kind: PointerState["kind"] = "touch") {
  const tracker = createTapTracker();
  const taps = [
    tracker.update(pointer(100, 100, true, kind), size),
    tracker.update(pointer(100 + distance, 100, true, kind), size),
    tracker.update(pointer(100 + distance, 100, false, kind), size),
  ];
  return taps.filter(Boolean).length;
}

describe("ILLUMINATE_LEVELS", () => {
  it("should allow at least 400 lights at the top level", () => {
    expect(ILLUMINATE_LEVELS.at(-1)!.cap).toBeGreaterThanOrEqual(400);
  });

  it("should never raise shaded lights above the light cap", () => {
    expect(ILLUMINATE_LEVELS.every((level) => level.shaded <= level.cap)).toBe(
      true,
    );
  });

  it("should keep more lights than the legacy cap of 60 at the floor", () => {
    expect(ILLUMINATE_LEVELS[0]!.cap).toBeGreaterThan(60);
  });
});

describe("shouldReset", () => {
  it("should add lights when the drop reaches the cap exactly", () => {
    expect(shouldReset(390, 400)).toBe(false);
  });

  it("should reset when the drop would exceed the cap", () => {
    expect(shouldReset(400, 400)).toBe(true);
  });

  it("should drop ten lights per tap", () => {
    expect(LIGHTS_PER_DROP).toBe(10);
  });
});

describe("createTapTracker", () => {
  it("should report a tap when a touch press moves 5 px", () => {
    expect(press(5)).toBe(1);
  });

  it("should not report a tap when a touch press moves 30 px", () => {
    expect(press(30)).toBe(0);
  });

  it("should report a click when a mouse press moves 30 px", () => {
    expect(press(30, "mouse")).toBe(1);
  });

  it("should not report a tap while the press is still down", () => {
    const tracker = createTapTracker();
    expect(tracker.update(pointer(100, 100, true), size)).toBe(false);
  });
});

describe("dropPoint", () => {
  it("should clamp the drop height to 25 like the legacy handler", () => {
    const point = dropPoint(pointer(300, 100, false, "mouse", square), square);
    expect([point.x, point.y]).toEqual([22.5, 25]);
  });

  it("should map the top edge to a drop height of 45 like the legacy handler", () => {
    const point = dropPoint(pointer(200, 0, false, "mouse", square), square);
    expect(point.y).toBe(45);
  });

  it("should follow a dragging finger", () => {
    const a = dropPoint(pointer(100, 100, true), size);
    const b = dropPoint(pointer(130, 100, true), size);
    expect(b.x).toBeGreaterThan(a.x);
  });
});

describe("needsFrame", () => {
  it("should draw when the scene is dirty even if nothing stepped", () => {
    expect(needsFrame({ dirty: true, steps: 0, wasAsleep: true })).toBe(true);
  });

  it("should draw when awake bodies ran a fixed step", () => {
    expect(needsFrame({ dirty: false, steps: 2, wasAsleep: false })).toBe(true);
  });

  it("should skip when no fixed step ran and nothing changed", () => {
    expect(needsFrame({ dirty: false, steps: 0, wasAsleep: false })).toBe(
      false,
    );
  });

  it("should skip when steps ran but every body was asleep", () => {
    expect(needsFrame({ dirty: false, steps: 3, wasAsleep: true })).toBe(false);
  });
});
