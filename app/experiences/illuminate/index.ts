import {
  BoxGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  type WebGLRenderer,
} from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader, type FontData } from "three/addons/loaders/FontLoader.js";
import { loadEssentials } from "../core/asset-loader";
import { disposeObject } from "../core/dispose";
import type {
  Experience,
  PointerState,
  ViewportSize,
} from "../core/experience";
import {
  createGlowSprites,
  createLightBuffer,
  createLightField,
  type GlowSprites,
  type LightBuffer,
  type LightField,
} from "../core/light-field";
import {
  ILLUMINATE_LEVELS,
  LIGHTS_PER_DROP,
  MAX_LIGHTS,
  MAX_SHADED,
  cameraDistance,
  createTapTracker,
  dropPoint,
  legacyRandom,
  needsFrame,
  shouldReset,
} from "./controls";
import { applyPixelRatio, levelAt, resolvePixelRatio } from "../core/quality";
import { createIlluminatePhysics, type IlluminatePhysics } from "./physics";

export const FONT_URL = "/json/Morganite_SemiBold.json";

const TEXT = "HAPPY NEW YEAR";
const SURFACE = {
  color: 0xaa907d,
  emissive: 0x000000,
  specular: 0x111111,
  shininess: 4,
};
const BULB_COLOR = 0xfff5e8;
const LIGHT_COLOR = 0xaa886f;
const LIGHT_RADIUS = 35;
// Legacy PointLight intensity 0.5 (decay 1, non-physical) retuned for the linear pipeline: matches one light's pool at its centre.
const LIGHT_INTENSITY = 0.79;
const GLOW = { size: 18, intensity: 0.6 };
const FOV = 50;
// The legacy canvas sat inside #main's 5vh / 7.5vw margin, shifting the scene right and down.
const VIEW_SHIFT = { x: 0.075, y: 0.05 };
const RESET_RESTORE_S = 0.25;
const RESET_CLEAR_S = 0.5;

export interface IlluminateHooks {
  /** Every accepted click or tap (the legacy hid the title on each one). */
  onDrop?(): void;
  /** The reset began; `hadLights` is false when the scene was already empty. */
  onResetStart?(hadLights: boolean): void;
  /** 250 ms into the reset, when the legacy brought the texts back. */
  onResetRestore?(): void;
}

export interface Built {
  scene: Scene;
  camera: PerspectiveCamera;
  field: LightField;
  glow: GlowSprites;
  bulbs: InstancedMesh;
  textBox: {
    halfExtents: { x: number; y: number; z: number };
    position: { x: number; y: number; z: number };
  };
}

export interface IlluminateExperience extends Experience<Built> {
  /** Gravity-flip reset, also triggered by the drop that would exceed the cap. */
  reset(): void;
}

interface IlluminateProbe {
  experience?: {
    lights(): number;
    shaded(): number;
    glows(): number;
    textureVersion(): number;
    programs(): number;
    drop(): { x: number; y: number };
    resetting(): boolean;
    levels: number;
    setQuality(level: number): void;
  } | null;
}

// Test hook: only present when a Playwright init script defines `window.__illuminateProbe`.
function probeSlot() {
  return (
    (globalThis as { __illuminateProbe?: IlluminateProbe }).__illuminateProbe ??
    null
  );
}

function buildScene(fontData: FontData): Built {
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 1, 1000);
  camera.position.set(0, 0, 100);
  scene.add(camera);

  const field = createLightField({ capacity: MAX_SHADED });
  const surface = new MeshPhongMaterial({ side: DoubleSide, ...SURFACE });
  field.patch(surface);

  const ground = new Mesh(new BoxGeometry(1000, 1000, 0.1), surface);
  ground.position.set(0, -12.5, 0);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const wall = new Mesh(new BoxGeometry(1000, 1000, 0.1), surface);
  wall.position.set(0, 0, -35);
  scene.add(wall);

  const font = new FontLoader().parse(fontData);
  const textGeometry = new TextGeometry(TEXT, { font, size: 22, depth: 10 });
  textGeometry.computeBoundingBox();
  const box = textGeometry.boundingBox!;
  const text = new Mesh(textGeometry, surface);
  text.position.set(-0.5 * (box.max.x - box.min.x), -7, 0);
  scene.add(text);

  const bulbs = new InstancedMesh(
    new SphereGeometry(1, 12, 8),
    new MeshBasicMaterial({ color: BULB_COLOR }),
    MAX_LIGHTS,
  );
  bulbs.instanceMatrix.setUsage(DynamicDrawUsage);
  bulbs.frustumCulled = false;
  bulbs.count = 0;
  // Only the translation changes per frame, so every slot keeps its identity rotation and scale.
  const bulbMatrices = bulbs.instanceMatrix.array as Float32Array;
  for (let i = 0; i < MAX_LIGHTS; i++) {
    const m = i * 16;
    bulbMatrices[m] =
      bulbMatrices[m + 5] =
      bulbMatrices[m + 10] =
      bulbMatrices[m + 15] =
        1;
  }
  scene.add(bulbs);

  const glow = createGlowSprites({ capacity: MAX_LIGHTS, ...GLOW });
  scene.add(glow.mesh);

  return {
    scene,
    camera,
    field,
    glow,
    bulbs,
    textBox: {
      halfExtents: { x: box.max.x / 2, y: box.max.y, z: box.max.z / 2 },
      position: { x: 0, y: -7, z: box.max.z / 2 },
    },
  };
}

// Positions alias the physics buffer (same capacity and xyz layout), so no per-frame copy is needed.
function createLights(positions: Float32Array): LightBuffer {
  const color = new Color(LIGHT_COLOR).multiplyScalar(LIGHT_INTENSITY);
  const lights = { ...createLightBuffer(MAX_LIGHTS), position: positions };
  lights.radius.fill(LIGHT_RADIUS);
  for (let i = 0; i < MAX_LIGHTS; i++) color.toArray(lights.color, i * 3);
  return lights;
}

export function createIlluminate(
  hooks: IlluminateHooks = {},
): IlluminateExperience {
  let built: Built | null = null;
  let renderer: WebGLRenderer | null = null;
  let physics: IlluminatePhysics | null = null;
  let lights: LightBuffer | null = null;
  let basePixelRatio = 1;
  let size = { width: 1, height: 1 };
  let level = ILLUMINATE_LEVELS[ILLUMINATE_LEVELS.length >> 1]!;
  let drop = { x: 0, y: 25 };
  // Set by anything that changes the picture besides running physics; cleared once a frame is drawn.
  let dirty = true;
  let resetting = false;
  let resetTime = 0;
  let restored = false;
  const taps = createTapTracker();

  const applyCamera = () => {
    if (!built) return;
    const { camera } = built;
    camera.aspect = size.width / size.height;
    camera.position.z = cameraDistance(camera.aspect, FOV);
    camera.setViewOffset(
      size.width,
      size.height,
      -VIEW_SHIFT.x * size.width,
      -VIEW_SHIFT.y * size.height,
      size.width,
      size.height,
    );
    camera.updateProjectionMatrix();
    dirty = true;
  };

  const reset = () => {
    if (!physics || resetting) return;
    hooks.onResetStart?.(physics.count > 0);
    physics.flipGravity();
    dirty = true;
    resetting = true;
    resetTime = 0;
    restored = false;
  };

  const dropLights = () => {
    if (!physics || resetting) return;
    hooks.onDrop?.();
    if (shouldReset(physics.count, level.cap)) {
      reset();
      return;
    }
    dirty = true;
    for (let i = 0; i < LIGHTS_PER_DROP; i++) {
      physics.addLight(
        {
          x: legacyRandom(drop.x + 10, drop.x - 10),
          y: drop.y,
          z: legacyRandom(5, 7.5),
        },
        { x: legacyRandom(-10, 10), y: 0, z: legacyRandom(-10, 10) },
      );
    }
  };

  const experience: IlluminateExperience = {
    quality: {
      levels: ILLUMINATE_LEVELS.length,
      initial: ILLUMINATE_LEVELS.length >> 1,
    },

    async load(ctx) {
      const assets = await loadEssentials("illuminate", {
        signal: ctx.signal,
        progress: ctx.progress,
        steps: 1,
      });
      built = buildScene(assets.json<FontData>(FONT_URL));
      await assets.step(ctx.renderer.compileAsync(built.scene, built.camera));
      return built;
    },

    mount(assets, ctx) {
      built = assets;
      renderer = ctx.renderer;
      basePixelRatio = ctx.size.pixelRatio;
      size = { width: ctx.size.width, height: ctx.size.height };
      physics = createIlluminatePhysics({ capacity: MAX_LIGHTS });
      physics.setText(assets.textBox);
      lights = createLights(physics.positions);
      applyCamera();
      experience.setQuality(ctx.quality);

      const slot = probeSlot();
      if (slot)
        slot.experience = {
          lights: () => physics?.count ?? 0,
          shaded: () => built?.field.uniforms.lightFieldCount.value ?? 0,
          glows: () => built?.glow.mesh.count ?? 0,
          textureVersion: () => built?.field.texture.version ?? 0,
          programs: () => renderer?.info.programs?.length ?? 0,
          drop: () => ({ ...drop }),
          resetting: () => resetting,
          levels: ILLUMINATE_LEVELS.length,
          setQuality: (next) => experience.setQuality(next),
        };
    },

    update(dt) {
      if (!built || !renderer || !physics || !lights) return;
      if (resetting) {
        resetTime += dt;
        if (!restored && resetTime >= RESET_RESTORE_S) {
          restored = true;
          hooks.onResetRestore?.();
        }
        if (resetTime >= RESET_CLEAR_S) {
          physics.clear();
          resetting = false;
          dirty = true;
        }
      }
      const wasAsleep = physics.allSleeping();
      const steps = physics.step(dt);
      if (!needsFrame({ dirty, steps, wasAsleep })) return;
      dirty = false;

      const count = physics.count;
      lights.count = count;

      const matrices = built.bulbs.instanceMatrix.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const m = i * 16;
        matrices[m + 12] = lights.position[i * 3]!;
        matrices[m + 13] = lights.position[i * 3 + 1]!;
        matrices[m + 14] = lights.position[i * 3 + 2]!;
      }
      built.bulbs.count = count;
      built.bulbs.instanceMatrix.needsUpdate = true;

      built.camera.updateMatrixWorld();
      const { glowCount } = built.field.update(
        lights,
        built.camera.matrixWorldInverse,
      );
      built.glow.update(lights, glowCount);

      renderer.render(built.scene, built.camera);
    },

    setQuality(next) {
      level = levelAt(ILLUMINATE_LEVELS, next);
      if (built) built.field.maxShaded = level.shaded;
      if (renderer)
        applyPixelRatio(
          renderer,
          resolvePixelRatio(basePixelRatio, level.pixelRatio),
        );
      dirty = true;
    },

    resize(next: ViewportSize) {
      size = { width: next.width, height: next.height };
      applyCamera();
    },

    input(pointer: PointerState) {
      drop = dropPoint(pointer, size);
      if (taps.update(pointer, size)) dropLights();
    },

    reset,

    dispose() {
      const slot = probeSlot();
      if (slot) slot.experience = null;
      physics?.dispose();
      physics = null;
      if (built) {
        disposeObject(built.scene);
        built.field.dispose();
      }
      built = null;
      renderer = null;
      lights = null;
    },
  };

  return experience;
}
