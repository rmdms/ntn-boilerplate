import {
  AmbientLight,
  BoxGeometry,
  Color,
  DataTexture,
  DoubleSide,
  DynamicDrawUsage,
  Euler,
  IcosahedronGeometry,
  InstancedMesh,
  LinearSRGBColorSpace,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  type MeshPhongMaterialParameters,
  NearestFilter,
  PerspectiveCamera,
  Quaternion,
  RepeatWrapping,
  RGBAFormat,
  Scene,
  SphereGeometry,
  Vector3,
  type WebGLRenderer,
} from "three";
import { loadEssentials } from "../core/asset-loader";
import { createExperienceAudio, type AudioTrack } from "../core/audio";
import { disposeObject } from "../core/dispose";
import type { Experience, ViewportSize } from "../core/experience";
import { applyPixelRatio, levelAt, resolvePixelRatio } from "../core/quality";
import {
  createLightBuffer,
  createLightField,
  type LightBuffer,
  type LightField,
} from "../core/light-field";
import {
  BULB_COUNT,
  CAGE_COUNT,
  FFT_SIZE,
  MAX_LIT_CAGES,
  PLANET_RADIUS,
  createChoreography,
  legacyBin,
  createLegacyKick,
  type Choreography,
} from "./choreography";

const FOV = 50;
const CAMERA_RADIUS = 100;
// Legacy advanced its orbit angle by elapsed ms / 5000.
const ORBIT_SPEED = 1 / 5;

const BLACK_GLOSS = { color: 0x010101, specular: 0x111111, shininess: 100 };

// Legacy lights folded π into the irradiance; physical lights (r155+) and the light-field loop do not.
const AMBIENT_INTENSITY = 0.15 * Math.PI;
const BULB_INTENSITY = 1 * Math.PI;
const BULB_RADIUS = 100;
const CAGE_INTENSITY = 450 * Math.PI;
const CAGE_RADIUS = 5;

const LIGHT_CAPACITY = BULB_COUNT + MAX_LIT_CAGES;

export interface DiscomaniaLevel {
  /** Multiplier applied to the host's capped device pixel ratio. */
  pixelRatio: number;
  /** Lights the shader loop shades; the 20 bulbs always come first, so the floor keeps its colour flashes. */
  shaded: number;
}

/** Floor first. */
export const DISCOMANIA_LEVELS: readonly DiscomaniaLevel[] = [
  { pixelRatio: 0.5, shaded: BULB_COUNT },
  { pixelRatio: 0.7, shaded: BULB_COUNT + 8 },
  { pixelRatio: 0.85, shaded: LIGHT_CAPACITY },
  { pixelRatio: 1, shaded: LIGHT_CAPACITY },
];

export interface Built {
  scene: Scene;
  camera: PerspectiveCamera;
  field: LightField;
  bulbs: InstancedMesh;
  cages: InstancedMesh;
}

export interface DiscomaniaExperience extends Experience<Built> {
  readonly audio: AudioTrack;
}

function linear(hex: number) {
  return new Color().setHex(hex, LinearSRGBColorSpace);
}

function blackGloss(
  field: LightField,
  extra: MeshPhongMaterialParameters = {},
) {
  const material = new MeshPhongMaterial({
    color: linear(BLACK_GLOSS.color),
    emissive: 0x000000,
    specular: linear(BLACK_GLOSS.specular),
    shininess: BLACK_GLOSS.shininess,
    ...extra,
  });
  field.patch(material);
  return material;
}

// One shared stripe mask: row 0 (v in [0, 0.5)) opaque, row 1 cut by the alpha test, as the legacy 2 × 2 canvas.
function stripeTexture() {
  const texture = new DataTexture(
    new Uint8Array([255, 255, 255, 255, 0, 0, 0, 255]),
    1,
    2,
    RGBAFormat,
  );
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1, 3.5);
  texture.needsUpdate = true;
  return texture;
}

function buildScene(choreography: Choreography): Built {
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 1, 1000);
  camera.position.set(CAMERA_RADIUS, 0, 0);
  scene.add(camera);

  scene.add(new AmbientLight(0xffffff, AMBIENT_INTENSITY));

  const field = createLightField({ capacity: LIGHT_CAPACITY });

  const ground = new Mesh(new BoxGeometry(170, 2.5, 170), blackGloss(field));
  ground.position.set(0, -PLANET_RADIUS - PLANET_RADIUS / 6, 0);
  scene.add(ground);

  scene.add(
    new Mesh(new IcosahedronGeometry(PLANET_RADIUS), blackGloss(field)),
  );

  const bulbs = new InstancedMesh(
    new SphereGeometry(0.25, 16, 8),
    new MeshBasicMaterial({ color: 0xffffff }),
    BULB_COUNT,
  );
  bulbs.instanceMatrix.setUsage(DynamicDrawUsage);
  bulbs.frustumCulled = false;
  scene.add(bulbs);

  const cages = new InstancedMesh(
    new SphereGeometry(2.5, 16, 8),
    blackGloss(field, {
      side: DoubleSide,
      alphaMap: stripeTexture(),
      alphaTest: 0.5,
    }),
    CAGE_COUNT,
  );
  cages.instanceMatrix.setUsage(DynamicDrawUsage);
  cages.frustumCulled = false;
  scene.add(cages);

  const built = { scene, camera, field, bulbs, cages };
  writeInstances(built, choreography, 0);
  return built;
}

const matrix = new Matrix4();
const position = new Vector3();
const rotation = new Quaternion();
const euler = new Euler();
const scale = new Vector3();

function writeInstances(
  built: Built,
  choreography: Choreography,
  orbitTime: number,
) {
  const { bulbs, cages } = choreography;
  rotation.identity();
  scale.setScalar(1);
  for (let i = 0; i < BULB_COUNT; i++) {
    position.set(bulbs.x[i]!, -PLANET_RADIUS, bulbs.z[i]!);
    built.bulbs.setMatrixAt(i, matrix.compose(position, rotation, scale));
  }
  built.bulbs.instanceMatrix.needsUpdate = true;

  for (let i = 0; i < CAGE_COUNT; i++) {
    const x = cages.x[i]!;
    position.set(x, cages.y[i]!, cages.z[i]!);
    euler.set(Math.cos(orbitTime + x), 0, Math.sin(orbitTime + x));
    rotation.setFromEuler(euler);
    scale.setScalar(cages.scale[i]!);
    built.cages.setMatrixAt(i, matrix.compose(position, rotation, scale));
  }
  built.cages.instanceMatrix.needsUpdate = true;
}

const lightColours = new Map<number, Color>();
function lightColour(hex: number) {
  let colour = lightColours.get(hex);
  if (!colour) {
    colour = linear(hex);
    lightColours.set(hex, colour);
  }
  return colour;
}

/** Lit cages first, oldest first, then the bulbs, so a lower shaded maximum drops the oldest cage lights first. */
function writeLights(lights: LightBuffer, choreography: Choreography) {
  const { bulbs, cages } = choreography;
  let n = 0;
  for (const cage of cages.litOrder) {
    lights.position[n * 3] = cages.x[cage]!;
    lights.position[n * 3 + 1] = cages.y[cage]!;
    lights.position[n * 3 + 2] = cages.z[cage]!;
    lights.color.fill(CAGE_INTENSITY, n * 3, n * 3 + 3);
    lights.radius[n] = CAGE_RADIUS;
    n++;
  }
  for (let i = 0; i < BULB_COUNT; i++) {
    lights.position[n * 3] = bulbs.x[i]!;
    lights.position[n * 3 + 1] = -PLANET_RADIUS;
    lights.position[n * 3 + 2] = bulbs.z[i]!;
    const colour = lightColour(bulbs.color[i]!);
    lights.color[n * 3] = colour.r * BULB_INTENSITY;
    lights.color[n * 3 + 1] = colour.g * BULB_INTENSITY;
    lights.color[n * 3 + 2] = colour.b * BULB_INTENSITY;
    lights.radius[n] = BULB_RADIUS;
    n++;
  }
  lights.count = n;
}

export function createDiscomania(): DiscomaniaExperience {
  const audio = createExperienceAudio("discomania", { fftSize: FFT_SIZE });
  const choreography = createChoreography();
  const kicks = createLegacyKick();
  const lights = createLightBuffer(LIGHT_CAPACITY);
  const spectrum = (index: number) => legacyBin(audio.frequencyData, index);

  let built: Built | null = null;
  let renderer: WebGLRenderer | null = null;
  let basePixelRatio = 1;
  let started = false;
  let orbitTime = 0;

  const experience: DiscomaniaExperience = {
    audio,
    quality: {
      levels: DISCOMANIA_LEVELS.length,
      initial: DISCOMANIA_LEVELS.length - 1,
    },

    async load(ctx) {
      const assets = await loadEssentials("discomania", {
        signal: ctx.signal,
        progress: ctx.progress,
        steps: 1,
      });
      ctx.signal.throwIfAborted();

      // Legacy output was linear and colours were raw hex values; matching both keeps its exact shading.
      ctx.renderer.outputColorSpace = LinearSRGBColorSpace;
      built = buildScene(choreography);
      await assets.step(ctx.renderer.compileAsync(built.scene, built.camera));
      return built;
    },

    mount(assets, ctx) {
      built = assets;
      renderer = ctx.renderer;
      basePixelRatio = ctx.size.pixelRatio;
      experience.setQuality(ctx.quality);
      experience.resize(ctx.size);
    },

    update(dt) {
      if (!built || !renderer) return;
      audio.update(dt);
      const playing = audio.status === "playing";
      if (!started) {
        if (!playing) return;
        started = true;
        // The legacy canvas was opaque black.
        renderer.setClearColor(0x000000, 1);
      }

      orbitTime += dt * ORBIT_SPEED;
      const kick = playing
        ? kicks.update(spectrum, dt)
        : false;
      choreography.step({
        time: playing ? audio.time : 0,
        orbitTime,
        kick,
        spectrum,
      });

      const { camera } = built;
      camera.position.set(
        Math.cos(orbitTime) * CAMERA_RADIUS,
        0,
        Math.sin(orbitTime) * CAMERA_RADIUS,
      );
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      writeInstances(built, choreography, orbitTime);
      writeLights(lights, choreography);
      built.field.update(lights, camera.matrixWorldInverse);

      renderer.render(built.scene, camera);
    },

    setQuality(next) {
      const level = levelAt(DISCOMANIA_LEVELS, next);
      if (built) built.field.maxShaded = level.shaded;
      if (renderer)
        applyPixelRatio(
          renderer,
          resolvePixelRatio(basePixelRatio, level.pixelRatio),
        );
    },

    resize(size: ViewportSize) {
      if (!built || size.height === 0) return;
      built.camera.aspect = size.width / size.height;
      built.camera.updateProjectionMatrix();
    },

    input() {},

    dispose() {
      audio.dispose();
      if (built) {
        disposeObject(built.scene);
        built.field.dispose();
      }
      built = null;
      renderer = null;
    },
  };

  return experience;
}
