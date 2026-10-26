import { afterEach, describe, expect, it } from "bun:test";
import {
  createInput,
  type InputMode,
  type InputState,
} from "../../app/experiences/core/input";

interface FakeEventInit {
  clientX?: number;
  clientY?: number;
  pointerType?: string;
  pointerId?: number;
  deltaY?: number;
  relatedTarget?: EventTarget | null;
}

function createHarness(mode: InputMode = "fullscreen") {
  const target = new EventTarget();
  const captured: number[] = [];
  Object.assign(target, {
    setPointerCapture: (id: number) => captured.push(id),
  });
  const root = { style: { touchAction: "auto" } };
  const queue: (() => void)[] = [];
  const reads: InputState[] = [];
  const input = createInput({
    mode,
    target,
    root,
    viewport: () => ({ width: 200, height: 100 }),
    schedule: (callback) => queue.push(callback),
    onFrame: (state) => reads.push(state),
  });

  return {
    input,
    root,
    reads,
    captured,
    dispatch(type: string, init: FakeEventInit = {}) {
      const event = Object.assign(new Event(type), {
        clientX: 100,
        clientY: 50,
        pointerType: "mouse",
        pointerId: 1,
        deltaY: 0,
        relatedTarget: null,
        ...init,
      });
      target.dispatchEvent(event);
    },
    runFrame() {
      const pending = queue.splice(0);
      pending.forEach((callback) => callback());
    },
  };
}

const originalUserAgent = Object.getOwnPropertyDescriptor(
  globalThis.navigator,
  "userAgent",
);

afterEach(() => {
  if (originalUserAgent)
    Object.defineProperty(globalThis.navigator, "userAgent", originalUserAgent);
});

describe("createInput", () => {
  describe("modality", () => {
    it("should switch the kind from mouse to touch when a mouse move is followed by a touch press", () => {
      const h = createHarness();
      h.dispatch("pointermove", { pointerType: "mouse" });
      h.runFrame();
      h.dispatch("pointerdown", { pointerType: "touch" });
      h.runFrame();
      expect(h.reads.map((s) => s.kind)).toEqual(["mouse", "touch"]);
    });

    it("should report touch when a touch press comes from an iPad claiming to be a Mac", () => {
      Object.defineProperty(globalThis.navigator, "userAgent", {
        configurable: true,
        get: () =>
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      });
      const h = createHarness();
      h.dispatch("pointerdown", { pointerType: "touch" });
      h.runFrame();
      expect(h.reads.at(-1)?.kind).toBe("touch");
    });
  });

  describe("position", () => {
    it("should report NDC with y up when the pointer moves", () => {
      const h = createHarness();
      h.dispatch("pointermove", { clientX: 200, clientY: 0 });
      h.runFrame();
      expect(h.input.read()).toMatchObject({ x: 1, y: 1 });
    });
  });

  describe("release", () => {
    it("should report released and no pointer when pointercancel ends a touch drag", () => {
      const h = createHarness();
      h.dispatch("pointerdown", { pointerType: "touch" });
      h.dispatch("pointermove", { pointerType: "touch", clientX: 150 });
      h.dispatch("pointercancel", { pointerType: "touch" });
      h.runFrame();
      expect(h.reads.at(-1)).toMatchObject({ down: false, active: false });
    });

    it("should report no pointer when a touch lifts", () => {
      const h = createHarness();
      h.dispatch("pointerdown", { pointerType: "touch" });
      h.dispatch("pointerup", { pointerType: "touch" });
      h.runFrame();
      expect(h.reads.at(-1)?.active).toBe(false);
    });

    it("should keep the mouse active when the button is released", () => {
      const h = createHarness();
      h.dispatch("pointerdown");
      h.dispatch("pointerup");
      h.runFrame();
      expect(h.reads.at(-1)).toMatchObject({ down: false, active: true });
    });
  });

  describe("frame coalescing", () => {
    it("should produce one read with the last position when several moves land in one frame", () => {
      const h = createHarness();
      h.dispatch("pointermove", { clientX: 0 });
      h.dispatch("pointermove", { clientX: 50 });
      h.dispatch("pointermove", { clientX: 100 });
      h.runFrame();
      expect(h.reads).toEqual([
        { x: 0, y: 0, down: false, kind: "mouse", active: true, wheel: 0 },
      ]);
    });

    it("should not read when no event arrived during the frame", () => {
      const h = createHarness();
      h.runFrame();
      expect(h.reads).toHaveLength(0);
    });
  });

  describe("wheel", () => {
    it("should sum wheel deltas within a frame and reset them after the read", () => {
      const h = createHarness();
      h.dispatch("wheel", { deltaY: 10 });
      h.dispatch("wheel", { deltaY: 5 });
      h.runFrame();
      h.dispatch("pointermove");
      h.runFrame();
      expect(h.reads.map((s) => s.wheel)).toEqual([15, 0]);
    });
  });

  describe("touch-action", () => {
    it("should set touch-action none and capture the pointer when the experience is full-screen", () => {
      const h = createHarness("fullscreen");
      h.dispatch("pointerdown", { pointerType: "touch", pointerId: 7 });
      expect([h.root.style.touchAction, h.captured]).toEqual(["none", [7]]);
    });

    it("should set touch-action pan-y without capture when the experience is embedded", () => {
      const h = createHarness("embedded");
      h.dispatch("pointerdown", { pointerType: "touch", pointerId: 7 });
      expect([h.root.style.touchAction, h.captured]).toEqual(["pan-y", []]);
    });

    it("should restore touch-action and stop reading when disposed", () => {
      const h = createHarness();
      h.input.dispose();
      h.dispatch("pointermove");
      h.runFrame();
      expect([h.root.style.touchAction, h.reads.length]).toEqual(["auto", 0]);
    });
  });
});

describe("mouse leaving the page", () => {
  it("should report no pointer when the mouse leaves the window", () => {
    const harness = createHarness();
    harness.dispatch("pointermove");
    harness.runFrame();
    harness.dispatch("pointerout", { relatedTarget: null });
    harness.runFrame();
    expect(harness.reads.at(-1)?.active).toBe(false);
  });

  it("should keep the pointer active when the mouse moves onto another element", () => {
    const harness = createHarness();
    harness.dispatch("pointermove");
    harness.runFrame();
    harness.dispatch("pointerout", { relatedTarget: new EventTarget() });
    harness.runFrame();
    expect(harness.reads.at(-1)?.active).toBe(true);
  });
});


describe("fast taps", () => {
  it("should deliver the press when a tap starts and ends within one frame", () => {
    const harness = createHarness();
    harness.dispatch("pointerdown", { pointerType: "touch" });
    harness.dispatch("pointerup", { pointerType: "touch" });
    harness.runFrame();
    expect(harness.reads.some((state) => state.down)).toBe(true);
  });

  it("should end released when a tap starts and ends within one frame", () => {
    const harness = createHarness();
    harness.dispatch("pointerdown", { pointerType: "touch" });
    harness.dispatch("pointerup", { pointerType: "touch" });
    harness.runFrame();
    expect(harness.reads.at(-1)?.down).toBe(false);
  });
});

describe("multi-touch", () => {
  it("should keep the first finger pressed when a second finger lifts", () => {
    const harness = createHarness();
    harness.dispatch("pointerdown", { pointerType: "touch", pointerId: 1 });
    harness.runFrame();
    harness.dispatch("pointerdown", { pointerType: "touch", pointerId: 2 });
    harness.dispatch("pointerup", { pointerType: "touch", pointerId: 2 });
    harness.runFrame();
    expect(harness.reads.at(-1)?.down).toBe(true);
  });

  it("should follow only the first finger when a second finger moves", () => {
    const harness = createHarness();
    harness.dispatch("pointerdown", { pointerType: "touch", pointerId: 1, clientX: 100 });
    harness.dispatch("pointermove", { pointerType: "touch", pointerId: 2, clientX: 200 });
    harness.runFrame();
    expect(harness.reads.at(-1)?.x).toBe(0);
  });

  it("should release when the first finger lifts", () => {
    const harness = createHarness();
    harness.dispatch("pointerdown", { pointerType: "touch", pointerId: 1 });
    harness.runFrame();
    harness.dispatch("pointerup", { pointerType: "touch", pointerId: 1 });
    harness.runFrame();
    expect(harness.reads.at(-1)?.down).toBe(false);
  });
});
