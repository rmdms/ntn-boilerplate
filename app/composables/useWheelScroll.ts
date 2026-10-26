import { gsap } from "gsap";
import { onBeforeUnmount } from "vue";

export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

const WHEEL_STEP = 45;
const WHEEL_DAMPING = 0.15;
const WHEEL_DURATION = 0.5;
const WHEEL_STAGGER = 0.001;

export interface WheelStep {
  scroll: number;
  delta: number;
}

interface Killable {
  kill(): unknown;
  progress?(): number;
}

export function wheelDelta(event: {
  deltaY?: number;
  detail?: number;
}): number {
  return (event.deltaY ?? NaN) / 120 || -(event.detail ?? NaN) / 3 || 0;
}

export function stepWheelScroll(
  scroll: number,
  delta: number,
  min: number,
): WheelStep {
  const next = scroll - Math.trunc(delta * WHEEL_STEP);
  if (next > 0) return { scroll: 0, delta: 0 };
  if (next < min) return { scroll: min, delta: 0 };
  return {
    scroll: next,
    delta: Math.abs(delta) > 1 ? delta * WHEEL_DAMPING : delta,
  };
}

export function createWheelScroller(options: {
  min: () => number;
  animate: (step: WheelStep) => Killable;
}) {
  let scroll = 0;
  let running: Killable[] = [];

  return {
    get scroll() {
      return scroll;
    },
    wheel(delta: number) {
      const step = stepWheelScroll(scroll, delta, options.min());
      scroll = step.scroll;
      // Like the live site, a new event never kills the running animation: each element hands over to the new
      // one when its own staggered tween starts. Killing it froze the last elements under a 120 Hz trackpad.
      running = running.filter((animation) => (animation.progress?.() ?? 0) < 1);
      running.push(options.animate(step));
      return step;
    },
    dispose() {
      for (const animation of running) animation.kill();
      running = [];
    },
  };
}

export function useWheelScroll(options: {
  targets: () => Element[];
  min: () => number;
  y: (step: WheelStep) => number;
  skew: (step: WheelStep) => number;
  clampOnResize?: boolean;
}) {
  const scroller = createWheelScroller({
    min: options.min,
    animate: (step) => {
      const targets = options.targets();
      const straighten = () =>
        gsap.to(targets, {
          skewY: "0deg",
          duration: WHEEL_DURATION,
          stagger: WHEEL_STAGGER,
          overwrite: "auto",
        });
      return gsap.to(targets, {
        y: options.y(step),
        skewY: `${options.skew(step)}deg`,
        duration: WHEEL_DURATION,
        overwrite: "auto",
        // Legacy onComplete: each element that lands straightens the whole set back.
        stagger: { each: WHEEL_STAGGER, onComplete: straighten },
      });
    },
  });

  const onWheel = (event: WheelEvent) => scroller.wheel(wheelDelta(event));
  const onResize = () => scroller.wheel(0);
  let listening = false;

  function listen() {
    if (listening || !window.matchMedia(FINE_POINTER_QUERY).matches) return;
    listening = true;
    window.addEventListener("wheel", onWheel, { passive: true });
    if (options.clampOnResize) window.addEventListener("resize", onResize);
  }

  onBeforeUnmount(() => {
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("resize", onResize);
    scroller.dispose();
    gsap.killTweensOf(options.targets());
  });

  return { listen };
}
