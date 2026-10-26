import { frameEase } from "../core/clock";
import type { PointerState } from "../core/experience";

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

export interface Raster extends Size {
  data: Uint8ClampedArray;
}

/** Draws the decoded source into `rect` on a `view`-sized raster and reads it back. */
export type Rasterize = (view: Size, rect: Rect) => Raster;

export interface GridData {
  count: number;
  /** Rest positions in CSS pixels, y down, z = 0. */
  positions: Float32Array;
  /** sRGB bytes per point. */
  colors: Uint8Array;
}

export interface Attraction {
  x: number;
  y: number;
  strength: number;
}

/** Size of the original photo; the fit is computed from it so the downscaled file lands where the original did. */
export const LEGACY_SOURCE: Size = { width: 8164, height: 5102 };

export const LETTERBOX_MARGIN = 100;
export const DOT_RADIUS = 3;
/** Equilibrium of the legacy step: 1 px pull per frame against a 0.05 spring. */
export const PULL_DISTANCE = 1 / 0.05;

export function fitRect(source: Size, view: Size): Rect {
  const maxWidth = view.width - LETTERBOX_MARGIN;
  const maxHeight = view.height - LETTERBOX_MARGIN;
  let { width, height } = source;
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.max(width / maxWidth, height / maxHeight);
    width /= ratio;
    height /= ratio;
  }
  return {
    x: (view.width - width) / 2,
    y: (view.height - height) / 2,
    width,
    height,
  };
}

function sampleGrid(raster: Raster, spacing: number): GridData {
  const columns = Math.ceil(raster.width / spacing);
  const rows = Math.ceil(raster.height / spacing);
  const count = columns * rows;
  const positions = new Float32Array(count * 3);
  const colors = new Uint8Array(count * 3);
  let point = 0;
  for (let y = 0; y < raster.height; y += spacing) {
    for (let x = 0; x < raster.width; x += spacing) {
      const pixel = (x + y * raster.width) * 4;
      positions[point * 3] = x;
      positions[point * 3 + 1] = y;
      colors[point * 3] = raster.data[pixel]!;
      colors[point * 3 + 1] = raster.data[pixel + 1]!;
      colors[point * 3 + 2] = raster.data[pixel + 2]!;
      point++;
    }
  }
  return { count, positions, colors };
}

/** Builds the dot grid, rasterizing the already-decoded source only when the viewport size changes. */
export function createGrid(rasterize: Rasterize, source: Size = LEGACY_SOURCE) {
  let cached: Raster | null = null;
  return {
    build(view: Size, spacing: number): GridData {
      if (
        !cached ||
        cached.width !== view.width ||
        cached.height !== view.height
      ) {
        cached = rasterize(view, fitRect(source, view));
      }
      return sampleGrid(cached, spacing);
    },
  };
}

/** CPU mirror of the vertex shader: moves toward the pointer by up to PULL_DISTANCE, never past it. */
export function attractedPosition(
  restX: number,
  restY: number,
  pointerX: number,
  pointerY: number,
  strength: number,
): [number, number] {
  const dx = pointerX - restX;
  const dy = pointerY - restY;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return [restX, restY];
  const step = (Math.min(PULL_DISTANCE, distance) / distance) * strength;
  return [restX + dx * step, restY + dy * step];
}

/** Frame-rate-independent share of the remaining distance covered in dt seconds: 5% per frame at 60 Hz. */
export function smoothing(dt: number) {
  return frameEase(0.05, dt);
}

export const AT_REST = 1e-3;

export function easeAttraction(
  state: Attraction,
  target: Attraction,
  dt: number,
) {
  const k = smoothing(dt);
  // From rest, the pointer jumps to where attraction starts instead of sweeping in from where it ended.
  if (state.strength < AT_REST && target.strength > 0) {
    state.x = target.x;
    state.y = target.y;
  } else {
    state.x += (target.x - state.x) * k;
    state.y += (target.y - state.y) * k;
  }
  state.strength += (target.strength - state.strength) * k;
}

/** Touch and pen attract while pressed; a mouse attracts while it is over the page. */
export function pointerTarget(pointer: PointerState, view: Size): Attraction {
  const attracting = pointer.kind === "mouse" ? pointer.active : pointer.down;
  return {
    x: ((pointer.x + 1) / 2) * view.width,
    y: ((1 - pointer.y) / 2) * view.height,
    strength: attracting ? 1 : 0,
  };
}

/** Whether the frame must be drawn: while attraction is moving or wanted, or when the scene changed. The settling frame is drawn too, so rest is the last thing on screen. */
export function needsRender(
  eased: Attraction,
  target: Attraction,
  dirty: boolean,
): boolean {
  return dirty || target.strength > 0 || eased.strength >= AT_REST;
}
