import { describe, expect, it } from "bun:test";
import {
  createWheelScroller,
  stepWheelScroll,
  wheelDelta,
  type WheelStep,
} from "../app/composables/useWheelScroll";

describe("wheelDelta", () => {
  it("should return one notch when deltaY is 120", () => {
    expect(wheelDelta({ deltaY: 120 })).toBe(1);
  });

  it("should fall back to the legacy detail value when deltaY is missing", () => {
    expect(wheelDelta({ detail: -3 })).toBe(1);
  });

  it("should return 0 when the event carries no wheel data", () => {
    expect(wheelDelta({})).toBe(0);
  });
});

describe("stepWheelScroll", () => {
  it("should move the scroll target by delta * 45 for one notch", () => {
    expect(stepWheelScroll(-100, 1, -1000).scroll).toBe(-145);
  });

  it("should truncate the step toward zero like the legacy parseInt", () => {
    expect(stepWheelScroll(-100, 0.5, -1000).scroll).toBe(-122);
  });

  it("should keep the delta when it is within one notch", () => {
    expect(stepWheelScroll(-100, 1, -1000).delta).toBe(1);
  });

  it("should damp the delta to 15% when it exceeds one notch", () => {
    expect(stepWheelScroll(-100, 2, -1000).delta).toBeCloseTo(0.3);
  });

  it("should clamp the scroll target at 0 when scrolling past the top", () => {
    expect(stepWheelScroll(-10, -1, -1000)).toEqual({ scroll: 0, delta: 0 });
  });

  it("should clamp the scroll target at min when scrolling past the bottom", () => {
    expect(stepWheelScroll(-990, 1, -1000)).toEqual({
      scroll: -1000,
      delta: 0,
    });
  });

  it("should re-clamp an out-of-range target when the delta is 0", () => {
    expect(stepWheelScroll(-1200, 0, -1000).scroll).toBe(-1000);
  });
});

describe("createWheelScroller", () => {
  const fakeAnimation = () => {
    const animation = { killed: false, kill: () => (animation.killed = true) };
    return animation;
  };

  it("should accumulate the scroll target across wheel events", () => {
    const scroller = createWheelScroller({
      min: () => -1000,
      animate: fakeAnimation,
    });
    scroller.wheel(1);
    scroller.wheel(1);
    expect(scroller.scroll).toBe(-90);
  });

  it("should let the running animation continue when a wheel event arrives mid-tween, like the live site", () => {
    const animations: ReturnType<typeof fakeAnimation>[] = [];
    const scroller = createWheelScroller({
      min: () => -1000,
      animate: () => {
        const animation = fakeAnimation();
        animations.push(animation);
        return animation;
      },
    });
    scroller.wheel(1);
    scroller.wheel(1);
    expect(animations.map((a) => a.killed)).toEqual([false, false]);
  });

  it("should retarget the new animation to the accumulated target", () => {
    const steps: WheelStep[] = [];
    const scroller = createWheelScroller({
      min: () => -1000,
      animate: (step) => {
        steps.push(step);
        return fakeAnimation();
      },
    });
    scroller.wheel(1);
    scroller.wheel(1);
    expect(steps[1]).toEqual({ scroll: -90, delta: 1 });
  });

  it("should kill an animation that has not started yet when disposed", () => {
    // Like a GSAP tween before its first render: isActive() is false until it is initialised.
    const pending = () => {
      const animation = { killed: false, kill: () => (animation.killed = true), isActive: () => false, progress: () => 0 };
      return animation;
    };
    const animations: ReturnType<typeof pending>[] = [];
    const scroller = createWheelScroller({
      min: () => -1000,
      animate: () => {
        const animation = pending();
        animations.push(animation);
        return animation;
      },
    });
    scroller.wheel(1);
    scroller.wheel(1);
    scroller.dispose();
    expect(animations.map((a) => a.killed)).toEqual([true, true]);
  });

  it("should kill every animation still running when disposed", () => {
    const animations: ReturnType<typeof fakeAnimation>[] = [];
    const scroller = createWheelScroller({
      min: () => -1000,
      animate: () => {
        const animation = fakeAnimation();
        animations.push(animation);
        return animation;
      },
    });
    scroller.wheel(1);
    scroller.wheel(1);
    scroller.dispose();
    expect(animations.map((a) => a.killed)).toEqual([true, true]);
  });
});
