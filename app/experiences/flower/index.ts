import {
  BufferAttribute,
  DataTexture,
  DirectionalLight,
  LinearSRGBColorSpace,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  RedFormat,
  Scene,
  SphereGeometry,
  UnsignedByteType,
  type WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { loadEssentials } from "../core/asset-loader";
import { createExperienceAudio, type AudioTrack } from "../core/audio";
import { disposeObject } from "../core/dispose";
import type { Experience, ViewportSize } from "../core/experience";
import { applyPixelRatio, levelAt, resolvePixelRatio } from "../core/quality";
import {
  BIN_TEXTURE_SIZE,
  binIndices,
  createColourCadence,
  DISPLAYED_BINS,
  FFT_SIZE,
  FLOWER_QUALITY,
  isLoud,
  sphereVertexCount,
} from "./bin-mapping";
import { displacementPars, displacementVertex } from "./shaders/displacement";

const RADIUS = 50;
// Legacy advanced 0.005 rad per frame at 60 fps.
const SPIN_SPEED = 0.3;
const TILT = 1.5;
// Legacy lights folded π into the irradiance; physical lights (r155+) do not.
const LIGHT_INTENSITY = 1.5 * Math.PI;

export interface FlowerOptions {
  /** Element receiving orbit drags, pinches and wheel; the shared canvas ignores pointer events. */
  controlsTarget(): HTMLElement | null;
}

export interface FlowerExperience extends Experience<void> {
  readonly audio: AudioTrack;
}

function createSphereGeometry(segments: number) {
  const geometry = new SphereGeometry(RADIUS, segments, segments);
  geometry.setAttribute(
    "binIndex",
    new BufferAttribute(
      binIndices(sphereVertexCount(segments), DISPLAYED_BINS),
      1,
    ),
  );
  return geometry;
}

export function createFlower(options: FlowerOptions): FlowerExperience {
  const audio = createExperienceAudio("flower", { fftSize: FFT_SIZE });
  const colourCadence = createColourCadence();
  // The displayed band of the analyser output, shared with the audio track and uploaded as a square texture.
  const frequency = new DataTexture(
    audio.frequencyData.subarray(0, DISPLAYED_BINS),
    BIN_TEXTURE_SIZE,
    BIN_TEXTURE_SIZE,
    RedFormat,
    UnsignedByteType,
  );
  frequency.needsUpdate = true;
  let renderer: WebGLRenderer | null = null;
  let scene: Scene | null = null;
  let camera: PerspectiveCamera | null = null;
  let sphere: Mesh<SphereGeometry, MeshStandardMaterial> | null = null;
  let controls: OrbitControls | null = null;
  let basePixelRatio = 1;
  let rotationY = 0;

  const applyQuality = (next: number) => {
    const quality = levelAt(FLOWER_QUALITY, next);
    if (renderer)
      applyPixelRatio(
        renderer,
        resolvePixelRatio(basePixelRatio, quality.pixelRatio),
      );
    if (
      sphere &&
      sphere.geometry.parameters.widthSegments !== quality.segments
    ) {
      sphere.geometry.dispose();
      sphere.geometry = createSphereGeometry(quality.segments);
    }
  };

  const experience: FlowerExperience = {
    audio,
    quality: { levels: FLOWER_QUALITY.length, initial: FLOWER_QUALITY.length - 1 },

    async load(ctx) {
      const assets = await loadEssentials("flower", {
        signal: ctx.signal,
        progress: ctx.progress,
        steps: 1,
      });
      ctx.signal.throwIfAborted();

      // Legacy output was linear and colours were raw hex values; matching both keeps its exact shading.
      ctx.renderer.outputColorSpace = LinearSRGBColorSpace;

      scene = new Scene();
      camera = new PerspectiveCamera(50, 1, 1, 1000);
      camera.position.z = 100;

      const light = new DirectionalLight(0xffffff, LIGHT_INTENSITY);
      light.position.set(0, 0, 200);
      scene.add(light);

      const material = new MeshStandardMaterial({ flatShading: true });
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uFrequency = { value: frequency };
        shader.vertexShader = shader.vertexShader
          .replace("void main() {", `${displacementPars}\nvoid main() {`)
          .replace("#include <begin_vertex>", displacementVertex);
      };
      material.customProgramCacheKey = () => "flower-displacement";

      sphere = new Mesh(
        createSphereGeometry(
          FLOWER_QUALITY[experience.quality.initial]!.segments,
        ),
        material,
      );
      sphere.rotation.x = TILT;
      scene.add(sphere);

      await assets.step(ctx.renderer.compileAsync(scene, camera));
    },

    mount(_assets, ctx) {
      renderer = ctx.renderer;
      basePixelRatio = ctx.size.pixelRatio;
      applyQuality(ctx.quality);
      experience.resize(ctx.size);

      const target = options.controlsTarget();
      if (camera && target) {
        controls = new OrbitControls(camera, target);
        controls.update();
      }
    },

    update(dt) {
      if (!renderer || !scene || !camera || !sphere) return;
      audio.update(dt);
      frequency.needsUpdate = true;
      controls?.update(dt);

      if (colourCadence(dt, isLoud(audio.frequencyData)))
        sphere.material.color.setHex(
          Math.random() * 0xffffff,
          LinearSRGBColorSpace,
        );

      rotationY += SPIN_SPEED * dt;
      sphere.rotation.y = rotationY;

      renderer.render(scene, camera);
    },

    setQuality: applyQuality,

    resize(size: ViewportSize) {
      if (!camera || size.height === 0) return;
      camera.aspect = size.width / size.height;
      camera.updateProjectionMatrix();
    },

    input() {},

    dispose() {
      controls?.dispose();
      controls = null;
      audio.dispose();
      frequency.dispose();
      if (scene) disposeObject(scene);
      scene = null;
      sphere = null;
      camera = null;
      renderer = null;
    },
  };

  return experience;
}
