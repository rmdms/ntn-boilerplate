import { describe, expect, it } from "bun:test";
import { Mesh, MeshBasicMaterial, PlaneGeometry } from "three";
import type { PointerState } from "../../../app/experiences/core/experience";
import {
  BLADE_SEGMENTS,
  cameraTilt,
  createGrass,
  createHillGeometry,
  createRandom,
  easePointer,
  FIELD_QUALITY,
  fieldQuality,
  MAX_BLADES,
  sampleBladePositions,
  windFrequency,
} from "../../../app/experiences/field/grass";

// Literal copy of the legacy loop (Nuxt 2 field script, lines 605-624), run on a plain array.
function legacyDeform(source: ArrayLike<number>) {
  const vertices = Float32Array.from(source);
  for (let i = 0; i <= vertices.length; i++) {
    vertices[i + 2] += 0.1 * Math.sin(vertices[i]!);
    vertices[i + 3] += 0.35 * Math.sin(vertices[i]!);
  }
  return vertices;
}

function hillMesh() {
  return new Mesh(createHillGeometry(), new MeshBasicMaterial());
}

function pointer(x: number, y: number, active: boolean): PointerState {
  return { x, y, down: active, kind: "touch", active, wheel: 0 };
}

const COLUMNS = 7;
const ROWS = 3;

function regionsOf(positions: Float32Array, count: number) {
  const cells = new Set<number>();
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3]!;
    const y = positions[i * 3 + 1]!;
    const column = Math.min(COLUMNS - 1, Math.max(0, Math.floor(x + 3.5)));
    const row = Math.min(ROWS - 1, Math.max(0, Math.floor(y + 1.5)));
    cells.add(row * COLUMNS + column);
  }
  return cells;
}

describe("field hill", () => {
  it("should apply the legacy cascading sine deformation once when the hill is built", () => {
    const flat = new PlaneGeometry(7, 3, 32, 32).attributes.position!.array;
    const built = createHillGeometry().attributes.position!.array;
    expect(Array.from(built)).toEqual(Array.from(legacyDeform(flat)));
  });
});

describe("field blade sampling", () => {
  it("should still cover every region of the hill grid when only half of the shuffled set is visible", () => {
    const positions = sampleBladePositions(
      hillMesh(),
      MAX_BLADES,
      createRandom(7),
    );
    const half = regionsOf(positions, MAX_BLADES / 2);
    expect(half.size).toBe(COLUMNS * ROWS);
  });

  it("should lift every blade 0.1 above the hill surface when sampling", () => {
    const hill = hillMesh();
    hill.geometry.computeBoundingBox();
    const positions = sampleBladePositions(hill, 200, createRandom(3));
    let lowest = Infinity;
    for (let i = 0; i < 200; i++)
      lowest = Math.min(lowest, positions[i * 3 + 2]!);
    expect(lowest).toBeGreaterThanOrEqual(
      hill.geometry.boundingBox!.min.z + 0.1 - 1e-6,
    );
  });
});

describe("field grass quality", () => {
  it("should change the visible count without re-sampling when the quality level switches", () => {
    const grass = createGrass(
      hillMesh(),
      new MeshBasicMaterial(),
      createRandom(1),
    );
    const matrices = grass.mesh.instanceMatrix.array;
    const before = Array.from(matrices);
    grass.setQuality(0);
    const floorCount = grass.mesh.count;
    grass.setQuality(FIELD_QUALITY.length - 1);
    expect([
      floorCount,
      grass.mesh.count,
      grass.mesh.instanceMatrix.array === matrices,
      Array.from(matrices),
    ]).toEqual([MAX_BLADES / 2, MAX_BLADES, true, before]);
  });

  it("should build blades with one column of legacy height segments when the grass is created", () => {
    const grass = createGrass(
      hillMesh(),
      new MeshBasicMaterial(),
      createRandom(1),
    );
    expect(grass.mesh.geometry.attributes.position!.count).toBe(
      2 * (BLADE_SEGMENTS + 1),
    );
  });

  it("should keep half the blades and pointer wind at the floor level", () => {
    const floor = fieldQuality(0);
    expect([floor.bladeRatio, windFrequency(-1), windFrequency(1)]).toEqual([
      0.5, 0.6, 0.4,
    ]);
  });

  it("should lower pixel ratio, then bloom resolution, then bloom, then blade count when stepping down", () => {
    const knobs: string[] = [];
    for (let level = FIELD_QUALITY.length - 1; level > 0; level--) {
      const high = fieldQuality(level);
      const low = fieldQuality(level - 1);
      const changed = (
        ["pixelRatio", "bloomScale", "bloom", "bladeRatio"] as const
      ).filter((knob) => high[knob] !== low[knob]);
      expect(changed.length).toBe(1);
      if (knobs.at(-1) !== changed[0]) knobs.push(changed[0]!);
    }
    expect(knobs).toEqual(["pixelRatio", "bloomScale", "bloom", "bladeRatio"]);
  });

  it("should clamp out-of-range levels to the floor and the top", () => {
    expect([fieldQuality(-3), fieldQuality(99)]).toEqual([
      FIELD_QUALITY[0]!,
      FIELD_QUALITY[FIELD_QUALITY.length - 1]!,
    ]);
  });
});

describe("field pointer influence", () => {
  it("should follow the dragging finger when the touch is active", () => {
    let eased = { x: 0, y: 0 };
    for (let i = 0; i < 600; i++)
      eased = easePointer(eased, pointer(0.8, -0.4, true), 1 / 60);
    expect([eased.x, eased.y]).toEqual([
      expect.closeTo(0.8, 4),
      expect.closeTo(-0.4, 4),
    ]);
  });

  it("should ease back to rest when the touch lifts", () => {
    let eased = { x: 0.8, y: -0.4 };
    for (let i = 0; i < 600; i++)
      eased = easePointer(eased, pointer(0.8, -0.4, false), 1 / 60);
    expect([eased.x, eased.y]).toEqual([
      expect.closeTo(0, 4),
      expect.closeTo(0, 4),
    ]);
  });

  it("should ease by 5% per 60 Hz frame whatever the frame rate", () => {
    const once = easePointer({ x: 0, y: 0 }, pointer(1, 1, true), 2 / 60);
    const twice = easePointer(
      easePointer({ x: 0, y: 0 }, pointer(1, 1, true), 1 / 60),
      pointer(1, 1, true),
      1 / 60,
    );
    expect([
      once.x,
      twice.x,
      easePointer({ x: 0, y: 0 }, pointer(1, 1, true), 1 / 60).x,
    ]).toEqual([
      expect.closeTo(twice.x, 9),
      expect.closeTo(1 - 0.95 ** 2, 9),
      expect.closeTo(0.05, 9),
    ]);
  });

  it("should tilt the camera 5% toward the legacy pointer target when the pointer is at the top-left corner", () => {
    const tilt = cameraTilt({ x: -1, y: 1 }, 16 / 9);
    const baseX = (75 * Math.PI) / 180;
    const baseY = (15 * Math.PI) / 180;
    expect([tilt.x, tilt.y]).toEqual([
      expect.closeTo(baseX * 0.95 + 0.05, 9),
      expect.closeTo(baseY * 0.95 + 0.05, 9),
    ]);
  });
});
