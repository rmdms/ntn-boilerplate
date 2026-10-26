import { describe, expect, it } from "bun:test";
import { experienceAssets } from "../../../app/experiences/assets";
import type { PointerState } from "../../../app/experiences/core/experience";
import {
  createSlider,
  createTripLoads,
  isPlaneOnScreen,
  letterCount,
  slideUrls,
  transitionTiming,
  TRIPS,
  type Step,
} from "../../../app/experiences/photography/slider";

const WIDTH = 400;
const ALL_LOADED = TRIPS.map(() => true);
const LETTERS = TRIPS.map((trip) => letterCount(trip.title));

function pointer(overrides: Partial<PointerState> = {}): PointerState {
  return {
    x: 0,
    y: 0,
    down: false,
    kind: "touch",
    active: true,
    wheel: 0,
    ...overrides,
  };
}

// NDC x of a CSS pixel column at the test viewport width.
const ndc = (px: number) => (px / WIDTH) * 2 - 1;

function setup(loaded: boolean[] = ALL_LOADED) {
  const steps: Step[] = [];
  const slider = createSlider({
    count: TRIPS.length,
    letters: LETTERS,
    loaded,
    onStep: (step) => steps.push(step),
  });
  const swipe = (fromPx: number, toPx: number) => {
    slider.input(pointer({ down: true, x: ndc(fromPx) }), WIDTH);
    slider.input(pointer({ down: true, x: ndc(toPx) }), WIDTH);
    slider.input(pointer({ down: false, active: false, x: ndc(toPx) }), WIDTH);
  };
  const wheel = (deltaY: number) =>
    slider.input(pointer({ kind: "mouse", wheel: deltaY }), WIDTH);
  const finish = () => {
    for (let i = 0; i < 400; i++) slider.update(1 / 60);
  };
  return { slider, steps, swipe, wheel, finish };
}

function expectOrdered(offset: (trip: number) => number, current: number) {
  const count = TRIPS.length;
  const along = [-2, -1, 0, 1, 2].map((k) =>
    offset((((current + k) % count) + count) % count),
  );
  along.slice(1).forEach((x, i) => expect(x - along[i]!).toBeCloseTo(1, 6));
}

describe("photography slider", () => {
  it("should step to the next trip when a swipe moves more than 50 px", () => {
    const { slider, steps, swipe } = setup();
    swipe(300, 240);
    expect(steps.map((step) => [step.from, step.to])).toEqual([[0, 1]]);
    expect(slider.current).toBe(1);
  });

  it("should step to the previous trip when a swipe moves more than 50 px rightwards", () => {
    const { steps, swipe } = setup();
    swipe(100, 160);
    expect(steps.map((step) => step.to)).toEqual([4]);
  });

  it("should not step when a swipe moves 50 px or less", () => {
    const { slider, steps, swipe } = setup();
    swipe(300, 250);
    expect(steps).toHaveLength(0);
    expect(slider.current).toBe(0);
  });

  it("should step one trip per wheel event when idle", () => {
    const { steps, wheel } = setup();
    wheel(-30);
    expect(steps.map((step) => step.direction)).toEqual([-1]);
  });

  it("should ignore input while a transition runs", () => {
    const { slider, steps, swipe, wheel } = setup();
    wheel(100);
    slider.update(1);
    wheel(100);
    swipe(300, 100);
    expect(steps).toHaveLength(1);
  });

  it("should accept input again once the transition and its 200 ms guard end", () => {
    const { slider, steps, wheel } = setup();
    wheel(100);
    const { unlockAt } = steps[0]!.timing;
    slider.update(unlockAt - 0.01);
    wheel(100);
    slider.update(0.02);
    wheel(100);
    expect(steps.map((step) => step.to)).toEqual([1, 2]);
  });

  it("should keep the planes in order when wrapping from the last trip to the first", () => {
    const { slider, wheel, finish } = setup();
    wheel(-100);
    finish();
    expect(slider.current).toBe(TRIPS.length - 1);
    wheel(100);
    for (let t = 0; t < 2.5; t += 0.05) {
      slider.update(0.05);
      expectOrdered(slider.offset, 0);
    }
    expect(slider.current).toBe(0);
    expect(slider.offset(0)).toBe(0);
  });

  it("should hold the planes still for 0.5 s then move them one slot over 0.9 s", () => {
    const { slider, wheel } = setup();
    wheel(100);
    slider.update(0.45);
    expect(slider.offset(1)).toBe(1);
    slider.update(0.5);
    expect(slider.offset(1)).toBeCloseTo(0.5, 6);
    slider.update(0.5);
    expect(slider.offset(1)).toBe(0);
  });

  it("should leave only the current trip in colour once the transition ends", () => {
    const { slider, wheel, finish } = setup();
    finish();
    wheel(100);
    finish();
    expect(TRIPS.map((_, trip) => slider.colour(trip))).toEqual([
      1, 0, 1, 1, 1,
    ]);
  });

  it("should be interactive once the centre trip's textures loaded while the others keep loading", () => {
    const loaded = [true, false, false, false, false];
    const { slider, swipe } = setup(loaded);
    swipe(300, 200);
    expect(slider.busy).toBe(true);
    expect(slider.pending).toBe(1);
  });

  it("should start a step toward an unloaded trip only once its textures arrive", () => {
    const { slider, steps, swipe } = setup([true, false, false, false, false]);
    swipe(300, 200);
    expect(steps).toHaveLength(0);
    slider.markLoaded(1);
    expect(steps.map((step) => step.to)).toEqual([1]);
    expect(slider.pending).toBeNull();
  });

  it("should ignore further input while a step waits for textures", () => {
    const { slider, steps, swipe } = setup([true, false, false, false, false]);
    swipe(300, 200);
    swipe(100, 300);
    slider.markLoaded(4);
    slider.markLoaded(1);
    expect(steps.map((step) => step.to)).toEqual([1]);
  });
});

describe("photography trip loads", () => {
  it("should mark a trip loaded only once its three textures arrived", () => {
    const loadedTrips: number[] = [];
    const arrived = createTripLoads(3, (trip) => loadedTrips.push(trip));
    arrived(2);
    arrived(2);
    expect(loadedTrips).toEqual([]);
    arrived(2);
    expect(loadedTrips).toEqual([2]);
  });

  it("should declare only the centre trip's three slides as essential", () => {
    expect([...experienceAssets.photography.essential]).toEqual(
      slideUrls(TRIPS[0]!),
    );
    expect(experienceAssets.photography.deferred).toHaveLength(12);
  });
});

describe("photography transition timing", () => {
  it("should bring the new trip into colour after the slower title cross-fade", () => {
    // Sweden (6 letters) to North Thailand (13 letters): titles end at 0.95 + 0.5 + 12 * 0.025.
    const timing = transitionTiming(6, 13);
    expect(timing.appearAt).toBeCloseTo(1.75 - 0.25, 6);
    expect(timing.end).toBeCloseTo(1.5 + 0.75, 6);
    expect(timing.unlockAt).toBeCloseTo(2.25 + 0.2, 6);
  });

  it("should never bring colour back before the planes and scrollbar settle", () => {
    expect(transitionTiming(1, 1).appearAt).toBeCloseTo(1.25, 6);
  });
});

describe("isPlaneOnScreen", () => {
  it("should keep a plane whose edge touches the visible bound", () => {
    expect(isPlaneOnScreen(3, 0.5, 2.5)).toBe(true);
  });

  it("should skip a plane strictly beyond the visible bound", () => {
    expect(isPlaneOnScreen(3.01, 0.5, 2.5)).toBe(false);
  });

  it("should treat negative positions symmetrically", () => {
    expect(isPlaneOnScreen(-3.01, 0.5, 2.5)).toBe(false);
  });
});
