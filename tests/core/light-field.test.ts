import { describe, expect, it } from "bun:test";
import { Matrix4, MeshPhongMaterial } from "three";
import {
  createGlowSprites,
  createLightBuffer,
  createLightField,
  packLights,
  partitionLights,
} from "../../app/experiences/core/light-field";

function bufferWith(count: number) {
  const lights = createLightBuffer(count);
  for (let i = 0; i < count; i++) {
    lights.position.set([i, i + 0.5, -i], i * 3);
    lights.color.set([0.1 * i, 0.2, 0.3], i * 3);
    lights.radius[i] = 35;
  }
  lights.count = count;
  return lights;
}

const fakeShader = () => ({
  uniforms: {} as Record<string, { value: unknown }>,
  vertexShader: "void main() {}",
  fragmentShader:
    "#include <common>\nvoid main() {\n#include <lights_fragment_begin>\n}",
});

describe("partitionLights", () => {
  it("should shade every light when the total is under the maximum", () => {
    expect(partitionLights(30, 48)).toEqual({
      glowCount: 0,
      shadedStart: 0,
      shadedCount: 30,
    });
  });

  it("should give a glow sprite and no shading to lights beyond the shaded maximum", () => {
    expect(partitionLights(300, 96)).toEqual({
      glowCount: 204,
      shadedStart: 204,
      shadedCount: 96,
    });
  });

  it("should keep the most recent lights shaded when the maximum is lowered", () => {
    const { shadedStart, shadedCount } = partitionLights(300, 48);
    expect([shadedStart, shadedStart + shadedCount]).toEqual([252, 300]);
  });
});

describe("packLights", () => {
  it("should write view-space position and radius in row 0 and colour in row 1", () => {
    const capacity = 4;
    const data = new Float32Array(capacity * 2 * 4);
    const view = new Matrix4().makeTranslation(0, 0, -100);
    packLights(data, capacity, bufferWith(3), 1, 2, view);
    expect([...data.subarray(0, 8)]).toEqual([
      1, 1.5, -101, 35, 2, 2.5, -102, 35,
    ]);
    expect(
      [...data.subarray(16, 24)].map((v) => Math.round(v * 100) / 100),
    ).toEqual([0.1, 0.2, 0.3, 1, 0.2, 0.2, 0.3, 1]);
  });
});

describe("createLightField", () => {
  it("should set the light-count uniform to the shaded count when lights are updated", () => {
    const field = createLightField({ capacity: 256 });
    field.maxShaded = 96;
    field.update(bufferWith(300), new Matrix4());
    expect(field.uniforms.lightFieldCount.value).toBe(96);
    field.dispose();
  });

  it("should flag the data texture for upload when lights are updated", () => {
    const field = createLightField({ capacity: 8 });
    const before = field.texture.version;
    field.update(bufferWith(3), new Matrix4());
    expect(field.texture.version).toBeGreaterThan(before);
    field.dispose();
  });

  it("should clamp the shaded maximum to the texture capacity", () => {
    const field = createLightField({ capacity: 64 });
    field.maxShaded = 256;
    expect(field.maxShaded).toBe(64);
    field.dispose();
  });

  it("should inject a fixed-size loop bounded by the capacity when a material compiles", () => {
    const field = createLightField({ capacity: 256 });
    const material = new MeshPhongMaterial();
    field.patch(material);
    const shader = fakeShader();
    material.onBeforeCompile(shader as never, undefined as never);
    expect(shader.fragmentShader).toContain("i < 256");
    expect(shader.uniforms.lightFieldCount).toBe(
      field.uniforms.lightFieldCount,
    );
    field.dispose();
  });

  it("should give patched materials a program key that ignores the light count", () => {
    const field = createLightField({ capacity: 256 });
    const material = new MeshPhongMaterial();
    field.patch(material);
    const key = material.customProgramCacheKey();
    field.update(bufferWith(200), new Matrix4());
    expect(material.customProgramCacheKey()).toBe(key);
    field.dispose();
  });
});

describe("createGlowSprites", () => {
  const options = { capacity: 4, size: 18, intensity: 0.6 };

  it("should write only the translation of each shown sprite on top of an identity matrix", () => {
    const glow = createGlowSprites(options);
    glow.update(bufferWith(3), 2);
    const m = glow.mesh.instanceMatrix.array;
    expect([m[0], m[5], m[10], m[15]]).toEqual([1, 1, 1, 1]);
    expect([m[16 + 12], m[16 + 13], m[16 + 14]]).toEqual([1, 1.5, -1]);
    expect(glow.mesh.count).toBe(2);
    glow.dispose();
  });

  it("should copy a sprite colour only when it first appears", () => {
    const glow = createGlowSprites(options);
    const lights = bufferWith(3);
    glow.update(lights, 2);
    lights.color.fill(9);
    glow.update(lights, 2);
    const colors = glow.mesh.instanceColor!.array;
    expect(colors[3]).toBeCloseTo(0.1);
    glow.update(lights, 3);
    expect(colors[6]).toBe(9);
    glow.dispose();
  });
});
