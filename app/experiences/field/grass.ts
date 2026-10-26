import {
  InstancedMesh,
  MathUtils,
  Matrix4,
  PlaneGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
  type Mesh,
} from "three";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import type { PointerState } from "../core/experience";

export const MAX_BLADES = 2000;
export const BLADE_SEGMENTS = 4;
const BLADE_SIZE = 0.2;
const BLADE_LIFT = 0.1;

export interface FieldQuality {
  /** Multiplier on the host's capped device pixel ratio. */
  pixelRatio: number;
  /** Bloom input resolution relative to the drawing buffer. */
  bloomScale: number;
  bloom: boolean;
  /** Share of the sampled blades drawn. */
  bladeRatio: number;
}

/** Floor first. Stepping down lowers pixel ratio, then bloom resolution, then turns bloom off, then hides blades. */
export const FIELD_QUALITY: readonly FieldQuality[] = [
  { pixelRatio: 0.65, bloomScale: 0.25, bloom: false, bladeRatio: 0.5 },
  { pixelRatio: 0.65, bloomScale: 0.25, bloom: false, bladeRatio: 0.75 },
  { pixelRatio: 0.65, bloomScale: 0.25, bloom: false, bladeRatio: 1 },
  { pixelRatio: 0.65, bloomScale: 0.25, bloom: true, bladeRatio: 1 },
  { pixelRatio: 0.65, bloomScale: 0.5, bloom: true, bladeRatio: 1 },
  { pixelRatio: 0.8, bloomScale: 0.5, bloom: true, bladeRatio: 1 },
  { pixelRatio: 1, bloomScale: 0.5, bloom: true, bladeRatio: 1 },
];

export function fieldQuality(level: number): FieldQuality {
  const index = MathUtils.clamp(Math.round(level), 0, FIELD_QUALITY.length - 1);
  return FIELD_QUALITY[index]!;
}

// Legacy loop kept verbatim: it walks every float, so each sine cascades into the following components.
function deformHill(vertices: Float32Array) {
  const length = vertices.length;
  for (let i = 0; i < length; i++) {
    const sine = Math.sin(vertices[i]!);
    if (i + 2 < length) vertices[i + 2]! += 0.1 * sine;
    if (i + 3 < length) vertices[i + 3]! += 0.35 * sine;
  }
}

export function createHillGeometry(): PlaneGeometry {
  const geometry = new PlaneGeometry(7, 3, 32, 32);
  deformHill(geometry.attributes.position!.array as Float32Array);
  geometry.attributes.position!.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Seeded mulberry32 generator. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Area-weighted samples on the hill in random order, so any prefix spreads over the whole hill. */
export function sampleBladePositions(
  hill: Mesh,
  count: number,
  random: () => number,
): Float32Array {
  const sampler = new MeshSurfaceSampler(hill)
    .setRandomGenerator(random)
    .build();
  const positions = new Float32Array(count * 3);
  const point = new Vector3();
  for (let i = 0; i < count; i++) {
    sampler.sample(point);
    positions.set([point.x, point.y, point.z + BLADE_LIFT], i * 3);
  }
  return positions;
}

export function createBladeGeometry(): BufferGeometry {
  const geometry = new PlaneGeometry(BLADE_SIZE, BLADE_SIZE, 1, BLADE_SEGMENTS);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

export interface Grass {
  readonly mesh: InstancedMesh;
  setQuality(level: number): void;
}

export function createGrass(
  hill: Mesh,
  material: Material,
  random: () => number,
): Grass {
  const positions = sampleBladePositions(hill, MAX_BLADES, random);
  const mesh = new InstancedMesh(createBladeGeometry(), material, MAX_BLADES);
  const matrix = new Matrix4();
  for (let i = 0; i < MAX_BLADES; i++) {
    matrix.makeTranslation(
      positions[i * 3]!,
      positions[i * 3 + 1]!,
      positions[i * 3 + 2]!,
    );
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  // Blades sway in the vertex shader, beyond any CPU bounds.
  mesh.frustumCulled = false;

  return {
    mesh,
    setQuality(level) {
      mesh.count = Math.round(MAX_BLADES * fieldQuality(level).bladeRatio);
    },
  };
}

export interface PointerPoint {
  x: number;
  y: number;
}

const POINTER_EASE = 0.05;

/** Legacy 5%-per-frame lerp at 60 Hz, made frame-rate independent; eases back to the centre without an active pointer. */
export function easePointer(
  current: PointerPoint,
  pointer: PointerState,
  dt: number,
): PointerPoint {
  const targetX = pointer.active ? pointer.x : 0;
  const targetY = pointer.active ? pointer.y : 0;
  const amount = 1 - (1 - POINTER_EASE) ** (dt * 60);
  return {
    x: current.x + (targetX - current.x) * amount,
    y: current.y + (targetY - current.y) * amount,
  };
}

/** Legacy map of the eased pointer x onto the wind noise frequency, 0.6 on the left to 0.4 on the right. */
export function windFrequency(x: number): number {
  return 0.5 - 0.1 * x;
}

export const CAMERA_ROTATION = {
  x: MathUtils.degToRad(75),
  y: MathUtils.degToRad(15),
};
const TILT = 0.05;

/**
 * Legacy camera tilt: 5% from the resting rotation toward the pointer target.
 * The legacy x target divided the pointer's pixel y by the window width; `aspect` (width / height) keeps that.
 */
export function cameraTilt(eased: PointerPoint, aspect: number): PointerPoint {
  const targetX = 1 - (1 - eased.y) / aspect;
  const targetY = -eased.x;
  return {
    x: MathUtils.lerp(CAMERA_ROTATION.x, targetX, TILT),
    y: MathUtils.lerp(CAMERA_ROTATION.y, targetY, TILT),
  };
}
