import type { QualityRange } from "./experience";

export const GOVERNOR = {
  warmupMs: 1500,
  windowMs: 500,
  maxWindowFrames: 256,
  spikeMs: 250,
  badMedianMs: 20,
  badP90Ms: 40,
  goodMedianMs: 17.5,
  goodP90Ms: 20,
  cappedMinMs: 30,
  cappedMaxMs: 37,
  cappedP90Ms: 40,
  badWindowsToDegrade: 2,
  goodWindowsToUpgrade: 5,
  upgradeSpacingMs: 5000,
  flipFlopLimit: 3,
} as const;

export interface QualityGovernor {
  readonly level: number;
  readonly pinned: boolean;
  /** Set once a ~33 ms refresh cap is detected; degrading then stops for the session. */
  readonly refreshCapped: boolean;
  /** Called on each mount: begins a warm-up, then governs from `level`. */
  start(range: Pick<QualityRange, "levels">, level: number): void;
  /** Feeds one frame delta in ms; returns the new level when it changes, otherwise null. */
  sample(deltaMs: number): number | null;
}

interface WindowStats {
  median: number;
  p90: number;
}

export function createQualityGovernor(): QualityGovernor {
  const frames = new Float64Array(GOVERNOR.maxWindowFrames);
  let count = 0;
  let windowTime = 0;

  let active = false;
  let top = 0;
  let level = 0;
  let elapsed = 0;
  let badStreak = 0;
  let goodStreak = 0;
  let lastUpgradeAt = -Infinity;
  let lastDirection = 0;
  let reversals = 0;
  let pinned = false;
  let probeFrom: number | null = null;
  let refreshCapped = false;

  const clearWindow = () => {
    count = 0;
    windowTime = 0;
  };

  const stats = (): WindowStats => {
    const sorted = frames.slice(0, count).sort();
    const at = (ratio: number) =>
      sorted[Math.min(count - 1, Math.floor(ratio * count))]!;
    return { median: at(0.5), p90: at(0.9) };
  };

  const isCapped = ({ median, p90 }: WindowStats) =>
    median >= GOVERNOR.cappedMinMs &&
    median <= GOVERNOR.cappedMaxMs &&
    p90 <= GOVERNOR.cappedP90Ms;

  const track = (direction: number) => {
    if (lastDirection !== 0 && direction !== lastDirection) reversals++;
    lastDirection = direction;
    if (reversals >= GOVERNOR.flipFlopLimit) pinned = true;
  };

  const change = (next: number, counted: boolean) => {
    badStreak = 0;
    goodStreak = 0;
    if (counted) track(Math.sign(next - level));
    level = next;
    return next;
  };

  const resolveProbe = (window: WindowStats, from: number) => {
    probeFrom = null;
    if (isCapped(window)) {
      refreshCapped = true;
      return change(from, false);
    }
    // Frames moved off the ~33 ms plateau: the GPU was the limit, so the probe step stands.
    track(-1);
    return null;
  };

  const judge = (): number | null => {
    const window = stats();
    clearWindow();

    if (probeFrom !== null) return resolveProbe(window, probeFrom);
    if (pinned) return null;

    const bad =
      window.median > GOVERNOR.badMedianMs || window.p90 > GOVERNOR.badP90Ms;
    const good =
      window.median <= GOVERNOR.goodMedianMs &&
      window.p90 <= GOVERNOR.goodP90Ms;
    badStreak = bad ? badStreak + 1 : 0;
    goodStreak = good ? goodStreak + 1 : 0;

    if (badStreak >= GOVERNOR.badWindowsToDegrade) {
      badStreak = 0;
      if (refreshCapped || level === 0) return null;
      if (isCapped(window)) {
        probeFrom = level;
        return change(level - 1, false);
      }
      return change(level - 1, true);
    }

    if (
      goodStreak >= GOVERNOR.goodWindowsToUpgrade &&
      level < top &&
      elapsed - lastUpgradeAt >= GOVERNOR.upgradeSpacingMs
    ) {
      lastUpgradeAt = elapsed;
      return change(level + 1, true);
    }

    return null;
  };

  return {
    get level() {
      return level;
    },
    get pinned() {
      return pinned;
    },
    get refreshCapped() {
      return refreshCapped;
    },
    start(range, initial) {
      active = true;
      top = Math.max(0, range.levels - 1);
      level = Math.min(Math.max(0, initial), top);
      elapsed = 0;
      badStreak = 0;
      goodStreak = 0;
      lastUpgradeAt = -Infinity;
      lastDirection = 0;
      reversals = 0;
      pinned = false;
      probeFrom = null;
      clearWindow();
    },
    sample(deltaMs) {
      if (!active || !(deltaMs > 0)) return null;
      elapsed += deltaMs;
      if (elapsed <= GOVERNOR.warmupMs || deltaMs > GOVERNOR.spikeMs)
        return null;

      frames[count++] = deltaMs;
      windowTime += deltaMs;
      if (windowTime < GOVERNOR.windowMs && count < GOVERNOR.maxWindowFrames)
        return null;
      return judge();
    },
  };
}
