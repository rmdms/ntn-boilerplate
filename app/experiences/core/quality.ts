import { MathUtils } from "three";

/** Pixel ratio as a factor of the host's capped base ratio, or the device ratio up to 2 ("native"). */
export type PixelRatioFactor = number | "native";

/** The entry for a quality level, clamped to the table's floor and top. */
export function levelAt<T>(levels: readonly T[], level: number): T {
  return levels[MathUtils.clamp(level, 0, levels.length - 1)]!;
}

export function resolvePixelRatio(
  base: number,
  factor: PixelRatioFactor,
  deviceRatio = window.devicePixelRatio,
): number {
  return factor === "native"
    ? Math.max(base, Math.min(deviceRatio, 2))
    : base * factor;
}

interface PixelRatioTarget {
  getPixelRatio(): number;
  setPixelRatio(ratio: number): void;
}

/** setPixelRatio reallocates and clears the drawing buffer, so it only runs when the ratio actually changes. Returns whether it changed. */
export function applyPixelRatio(
  renderer: PixelRatioTarget,
  ratio: number,
): boolean {
  if (renderer.getPixelRatio() === ratio) return false;
  renderer.setPixelRatio(ratio);
  return true;
}
