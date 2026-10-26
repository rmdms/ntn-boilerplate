import type { PointerState } from "../core/experience";

export interface Trip {
  title: string;
  date: string;
  route: string;
  /** File prefix of the trip's three slide images. */
  images: string;
}

/** Slider order; the first trip starts in the centre. */
export const TRIPS: readonly Trip[] = [
  { title: "Sweden", date: "July 2016", route: "/sweden", images: "sweden" },
  {
    title: "North Thailand",
    date: "July 2017",
    route: "/north_thailand",
    images: "north_thailand",
  },
  {
    title: "Croatia",
    date: "August 2018",
    route: "/croatia",
    images: "croatia",
  },
  {
    title: "Netherlands",
    date: "July 2018",
    route: "/netherlands",
    images: "netherland",
  },
  {
    title: "South Thailand",
    date: "July 2016",
    route: "/south_thailand",
    images: "south_thailand",
  },
];

export const PLANES_PER_TRIP = 3;
export const SWIPE_THRESHOLD = 50;
export const SPACE_BETWEEN_PLANES = 7.5;

export const FADE_DURATION = 0.75;
export const MOVE_START = 0.5;
export const MOVE_DURATION = 0.9;
export const SCROLLBAR_DURATION = 1;
export const TITLE_OUT_AT = 0.65;
export const TITLE_IN_AT = 0.95;
export const LETTER_DURATION = 0.5;
export const LETTER_STAGGER = 0.025;
export const SUBTITLE_DURATION = 0.5;
export const UNLOCK_DELAY = 0.2;

export function slideUrls(trip: Trip): string[] {
  return Array.from(
    { length: PLANES_PER_TRIP },
    (_, j) => `/images/${trip.images}_slide_0${j + 1}.jpg`,
  );
}

// Legacy filled a trip's slots in texture load order, so which photo lands in which slot varies per visit.
/** A random permutation of the slots 0..count-1: entry j is the slot of the trip's j-th photo. */
export function shuffledSlots(
  count: number,
  random: () => number = Math.random,
): number[] {
  const slots = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [slots[i], slots[j]] = [slots[j]!, slots[i]!];
  }
  return slots;
}

/** False when a plane centred at `x` lies strictly beyond `visibleHalfWidth`, so it can be skipped. */
export function isPlaneOnScreen(
  x: number,
  halfWidth: number,
  visibleHalfWidth: number,
): boolean {
  return Math.abs(x) - halfWidth <= visibleHalfWidth;
}

export function letterCount(title: string): number {
  return title.replace(/\s/g, "").length;
}

export function power1Out(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function power2InOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export function wrapIndex(index: number, count: number): number {
  return ((index % count) + count) % count;
}

/** Signed slot of a trip around the current one: 0 is centre, -2..2 for five trips. */
export function slotOf(trip: number, current: number, count: number): number {
  const ahead = wrapIndex(trip - current, count);
  return ahead <= Math.floor(count / 2) ? ahead : ahead - count;
}

export interface TransitionTiming {
  /** When the new trip starts fading back into colour. */
  appearAt: number;
  /** When every tween of the transition has finished. */
  end: number;
  /** When input is accepted again. */
  unlockAt: number;
}

// Legacy appended each tween to one timeline, so the colour fade waits for the slower title cross-fade.
export function transitionTiming(
  fromLetters: number,
  toLetters: number,
): TransitionTiming {
  const titleEnd = (start: number, letters: number) =>
    start + LETTER_DURATION + LETTER_STAGGER * Math.max(0, letters - 1);
  const settled = Math.max(
    MOVE_START + SCROLLBAR_DURATION,
    titleEnd(TITLE_OUT_AT, fromLetters),
    titleEnd(TITLE_IN_AT, toLetters),
  );
  const appearAt = settled - 0.25;
  const end = appearAt + FADE_DURATION;
  return { appearAt, end, unlockAt: end + UNLOCK_DELAY };
}

export type Direction = 1 | -1;

export interface Step {
  from: number;
  to: number;
  direction: Direction;
  timing: TransitionTiming;
}

export interface SliderOptions {
  count: number;
  letters: readonly number[];
  /** Whether each trip's textures are ready; copied. */
  loaded: readonly boolean[];
  onStep?(step: Step): void;
}

export interface Slider {
  readonly current: number;
  /** A transition runs or waits for textures; input is ignored. */
  readonly busy: boolean;
  /** Target trip of a step waiting for its textures. */
  readonly pending: number | null;
  /** A tween is running, so the frame changes. */
  readonly animating: boolean;
  input(pointer: PointerState, viewportWidth: number): void;
  request(direction: Direction): void;
  markLoaded(trip: number): void;
  update(dt: number): void;
  /** Horizontal position of a trip in slots, including the running move. */
  offset(trip: number): number;
  /** Desaturation of a trip, 1 for black and white, 0 for colour. */
  colour(trip: number): number;
}

export function createSlider(options: SliderOptions): Slider {
  const { count, letters } = options;
  const loaded = [...options.loaded];
  const colours = Array.from({ length: count }, () => 1);
  let current = 0;
  let pendingDirection: Direction | null = null;
  let transition: (Step & { time: number; startColours: number[] }) | null =
    null;
  let intro: number | null = 0;
  let swipeStart: number | null = null;

  const start = (direction: Direction) => {
    const from = current;
    const to = wrapIndex(current + direction, count);
    const step: Step = {
      from,
      to,
      direction,
      timing: transitionTiming(letters[from] ?? 0, letters[to] ?? 0),
    };
    current = to;
    intro = null;
    transition = { ...step, time: 0, startColours: [...colours] };
    options.onStep?.(step);
  };

  const pendingTarget = () =>
    pendingDirection === null
      ? null
      : wrapIndex(current + pendingDirection, count);

  const request = (direction: Direction) => {
    if (transition || pendingDirection !== null) return;
    if (loaded[wrapIndex(current + direction, count)]) start(direction);
    else pendingDirection = direction;
  };

  const updateColours = () => {
    if (transition) {
      const { time, startColours, to, timing } = transition;
      const fade = power1Out(clamp01(time / FADE_DURATION));
      for (let trip = 0; trip < count; trip++)
        colours[trip] = startColours[trip]! + (1 - startColours[trip]!) * fade;
      if (time >= timing.appearAt)
        colours[to] =
          1 - power1Out(clamp01((time - timing.appearAt) / FADE_DURATION));
    } else if (intro !== null) {
      colours[current] = 1 - power1Out(clamp01(intro / FADE_DURATION));
    }
  };

  return {
    get current() {
      return current;
    },
    get busy() {
      return transition !== null || pendingDirection !== null;
    },
    get pending() {
      return pendingTarget();
    },
    get animating() {
      return (
        (transition !== null && transition.time < transition.timing.end) ||
        intro !== null
      );
    },
    input(pointer, viewportWidth) {
      if (pointer.wheel !== 0) request(pointer.wheel > 0 ? 1 : -1);
      if (!pointer.down) {
        swipeStart = null;
        return;
      }
      swipeStart ??= pointer.x;
      const distance = ((swipeStart - pointer.x) * viewportWidth) / 2;
      if (distance > SWIPE_THRESHOLD) request(1);
      else if (distance < -SWIPE_THRESHOLD) request(-1);
    },
    request,
    markLoaded(trip) {
      loaded[trip] = true;
      if (pendingTarget() === trip) {
        const direction = pendingDirection!;
        pendingDirection = null;
        start(direction);
      }
    },
    update(dt) {
      if (transition) {
        transition.time += dt;
        updateColours();
        if (transition.time >= transition.timing.unlockAt) transition = null;
      } else if (intro !== null) {
        intro += dt;
        updateColours();
        if (intro >= FADE_DURATION) intro = null;
      }
    },
    offset(trip) {
      const slot = slotOf(trip, current, count);
      if (!transition) return slot;
      const move = power2InOut(
        clamp01((transition.time - MOVE_START) / MOVE_DURATION),
      );
      return slot + transition.direction * (1 - move);
    },
    colour(trip) {
      return colours[trip] ?? 1;
    },
  };
}

/** Counts texture arrivals per trip and reports a trip once all its planes have one. */
export function createTripLoads(
  perTrip: number,
  onTripLoaded: (trip: number) => void,
): (trip: number) => void {
  const arrivals = new Map<number, number>();
  return (trip) => {
    const next = (arrivals.get(trip) ?? 0) + 1;
    arrivals.set(trip, next);
    if (next === perTrip) onTripLoaded(trip);
  };
}
