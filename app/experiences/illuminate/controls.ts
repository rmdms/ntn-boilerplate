import type { PointerState } from "../core/experience";

export interface IlluminateLevel {
  /** Multiplies the host's capped device pixel ratio. */
  pixelRatio: number;
  /** Lights shaded by the light loop; the rest keep a glow sprite. */
  shaded: number;
  /** Total lights before the next drop triggers the reset. */
  cap: number;
}

// Index 0 is the floor. Degrading from the top lowers pixel ratio first, then shaded lights and cap.
export const ILLUMINATE_LEVELS: readonly IlluminateLevel[] = [
  { pixelRatio: 0.6, shaded: 48, cap: 120 },
  { pixelRatio: 0.75, shaded: 48, cap: 200 },
  { pixelRatio: 0.85, shaded: 96, cap: 300 },
  { pixelRatio: 0.85, shaded: 256, cap: 400 },
  { pixelRatio: 1, shaded: 256, cap: 400 },
];

export const MAX_SHADED = Math.max(
  ...ILLUMINATE_LEVELS.map((level) => level.shaded),
);
export const MAX_LIGHTS = Math.max(
  ...ILLUMINATE_LEVELS.map((level) => level.cap),
);
export const LIGHTS_PER_DROP = 10;
export const TAP_SLOP_PX = 10;

/** The drop that would take the total past the cap resets the scene instead. */
export function shouldReset(count: number, cap: number) {
  return count + LIGHTS_PER_DROP > cap;
}

export interface Size {
  width: number;
  height: number;
}

export interface TapTracker {
  /** Feeds one pointer frame; returns true on the release that completes a tap or click. */
  update(pointer: PointerState, size: Size): boolean;
}

/** A mouse release always clicks; a touch or pen press that travelled TAP_SLOP_PX or more is a drag, not a tap. */
export function createTapTracker(slop = TAP_SLOP_PX): TapTracker {
  let wasDown = false;
  let startX = 0;
  let startY = 0;
  let dragged = false;

  return {
    update(pointer, size) {
      const px = ((pointer.x + 1) / 2) * size.width;
      const py = ((1 - pointer.y) / 2) * size.height;
      if (pointer.down) {
        if (!wasDown) {
          startX = px;
          startY = py;
          dragged = false;
        } else if (Math.hypot(px - startX, py - startY) >= slop) {
          dragged = true;
        }
        wasDown = true;
        return false;
      }
      if (!wasDown) return false;
      wasDown = false;
      return pointer.kind === "mouse" || !dragged;
    },
  };
}

/** Legacy mouse mapping, including its use of the viewport width for the vertical axis. */
export function dropPoint(pointer: PointerState, size: Size) {
  const clientY = ((1 - pointer.y) / 2) * size.height;
  return {
    x: pointer.x * 45,
    y: Math.max(25, -((clientY / size.width) * 2 - 1) * 45),
  };
}

/** Legacy `getRandom`: uniform in [min, max + 1) when min < max. */
export function legacyRandom(min: number, max: number, random = Math.random) {
  return random() * (max - min + 1) + min;
}

const TEXT_SPAN = 110;
const CAMERA_DISTANCE = 100;

/** Moves the camera back on narrow viewports so the whole text stays in frame; the legacy distance otherwise. */
export function cameraDistance(aspect: number, fov: number) {
  const fit = TEXT_SPAN / (2 * Math.tan((fov * Math.PI) / 360) * aspect);
  return Math.max(CAMERA_DISTANCE, fit);
}
