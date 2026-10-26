export interface FrameClock {
  /** Returns the seconds elapsed since the previous tick; 0 on the first tick after a reset. */
  tick(timeMs: number): number;
  reset(): void;
}

export function createClock(): FrameClock {
  let last: number | null = null;
  return {
    tick(timeMs) {
      const dt = last === null ? 0 : (timeMs - last) / 1000;
      last = timeMs;
      return dt;
    },
    reset() {
      last = null;
    },
  };
}
