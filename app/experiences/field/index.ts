import {
  Color,
  DoubleSide,
  LinearSRGBColorSpace,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Texture,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  type WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { loadEssentials } from "../core/asset-loader";
import { disposeComposer, disposeObject } from "../core/dispose";
import { applyPixelRatio, resolvePixelRatio } from "../core/quality";
import type {
  Experience,
  PointerState,
  ViewportSize,
} from "../core/experience";
import {
  CAMERA_ROTATION,
  cameraTilt,
  createGrass,
  createHillGeometry,
  createRandom,
  easePointer,
  FIELD_QUALITY,
  fieldQuality,
  windFrequency,
  type Grass,
  type PointerPoint,
} from "./grass";
import { grassFragmentShader, grassVertexShader } from "./shaders/grass";
import { skyFragmentShader, skyVertexShader } from "./shaders/sky";

const GRASS_TEXTURE_URL = "/images/texture-grass-1024.webp";
const BLADE_SEED = 7;
// r127 scaled the bloom by its strength twice (colour and blend alpha); r186 applies it once, so legacy 0.1 becomes 0.1².
const BLOOM_STRENGTH = 0.1 * 0.1;

function createSky() {
  const sky = new Mesh(
    new SphereGeometry(5, 32, 32),
    new ShaderMaterial({
      side: DoubleSide,
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
    }),
  );
  sky.position.z = -1.5;
  return sky;
}

function createHill() {
  const hill = new Mesh(
    createHillGeometry(),
    new MeshBasicMaterial({
      color: new Color().setHex(0x894100, LinearSRGBColorSpace),
      side: DoubleSide,
    }),
  );
  hill.rotation.z = 0.001;
  return hill;
}

export function createField(): Experience<void> {
  let renderer: WebGLRenderer | null = null;
  let scene: Scene | null = null;
  let camera: PerspectiveCamera | null = null;
  let composer: EffectComposer | null = null;
  let bloomPass: UnrealBloomPass | null = null;
  let grass: Grass | null = null;
  let grassMaterial: ShaderMaterial | null = null;
  let image: ImageBitmap | null = null;
  let view = { width: 1, height: 1 };
  let basePixelRatio = 1;
  let level = FIELD_QUALITY.length - 1;
  let time = 0;
  let eased: PointerPoint = { x: 0, y: 0 };
  let pointer: PointerState = {
    x: 0,
    y: 0,
    down: false,
    kind: "mouse",
    active: false,
    wheel: 0,
  };

  // Last size applied to the composer; it is only rendered with bloom on, so sizing waits until then.
  let appliedComposer: {
    pixelRatio: number;
    bloomScale: number;
    width: number;
    height: number;
  } | null = null;

  const syncComposer = () => {
    if (!composer || !bloomPass) return;
    const quality = fieldQuality(level);
    if (!quality.bloom) return;
    const next = {
      pixelRatio: basePixelRatio * quality.pixelRatio,
      bloomScale: quality.bloomScale,
      width: view.width,
      height: view.height,
    };
    const last = appliedComposer;
    if (
      last &&
      last.pixelRatio === next.pixelRatio &&
      last.bloomScale === next.bloomScale &&
      last.width === next.width &&
      last.height === next.height
    )
      return;
    composer.setPixelRatio(next.pixelRatio);
    composer.setSize(next.width, next.height);
    bloomPass.setSize(
      Math.max(
        1,
        Math.round(next.width * next.pixelRatio * next.bloomScale),
      ),
      Math.max(
        1,
        Math.round(next.height * next.pixelRatio * next.bloomScale),
      ),
    );
    appliedComposer = next;
  };

  const applyRatioAndBloom = () => {
    if (!renderer) return;
    applyPixelRatio(
      renderer,
      resolvePixelRatio(basePixelRatio, fieldQuality(level).pixelRatio),
    );
    syncComposer();
  };

  const applyAspect = () => {
    if (!camera) return;
    camera.aspect = view.width / view.height;
    camera.updateProjectionMatrix();
  };

  const experience: Experience<void> = {
    quality: { levels: FIELD_QUALITY.length, initial: level },

    async load(ctx) {
      const assets = await loadEssentials("field", {
        signal: ctx.signal,
        progress: ctx.progress,
        steps: 2,
      });
      const bitmap = (await assets.step(
        assets.image(GRASS_TEXTURE_URL, { imageOrientation: "flipY" }),
      ))!;
      if (ctx.signal.aborted) {
        bitmap.close();
        ctx.signal.throwIfAborted();
      }
      image = bitmap;
      renderer = ctx.renderer;
      // Legacy output was linear with raw colours; matching it keeps the exact palette.
      renderer.outputColorSpace = LinearSRGBColorSpace;

      const texture = new Texture(bitmap);
      texture.flipY = false;
      texture.needsUpdate = true;

      scene = new Scene();
      camera = new PerspectiveCamera(45, 1, 0.1, 1000);
      camera.position.set(1.25, -2.1, 0.75);
      camera.rotation.set(CAMERA_ROTATION.x, CAMERA_ROTATION.y, 0);

      const hill = createHill();
      grassMaterial = new ShaderMaterial({
        side: DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uFrequency: { value: windFrequency(0) },
          uTexture: { value: texture },
        },
        vertexShader: grassVertexShader,
        fragmentShader: grassFragmentShader,
      });
      grass = createGrass(hill, grassMaterial, createRandom(BLADE_SEED));
      scene.add(createSky(), hill, grass.mesh);

      // Legacy targets were 8-bit, so values above 1 were clamped before the bloom threshold.
      composer = new EffectComposer(
        renderer,
        new WebGLRenderTarget(1, 1, { type: UnsignedByteType }),
      );
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new Vector2(1, 1), BLOOM_STRENGTH, 1, 0.5);
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());

      // Programs are keyed on the output colour space: compile them for the composer's linear target the initial level renders into.
      renderer.setRenderTarget(
        fieldQuality(level).bloom ? composer.readBuffer : null,
      );
      const compiled = renderer.compileAsync(scene, camera);
      renderer.setRenderTarget(null);
      await assets.step(compiled);
      ctx.signal.throwIfAborted();
    },

    mount(_assets, ctx) {
      view = { width: ctx.size.width, height: ctx.size.height };
      basePixelRatio = ctx.size.pixelRatio;
      applyAspect();
      experience.setQuality(ctx.quality);
    },

    update(dt) {
      if (!renderer || !scene || !camera || !composer || !grassMaterial) return;
      time += dt;
      eased = easePointer(eased, pointer, dt);
      grassMaterial.uniforms.uTime!.value = time;
      grassMaterial.uniforms.uFrequency!.value = windFrequency(eased.x);
      const tilt = cameraTilt(eased, view.width / view.height);
      camera.rotation.set(tilt.x, tilt.y, 0);

      if (fieldQuality(level).bloom) {
        composer.render(dt);
      } else {
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
      }
    },

    setQuality(next) {
      level = next;
      grass?.setQuality(level);
      applyRatioAndBloom();
    },

    resize(size: ViewportSize) {
      view = { width: size.width, height: size.height };
      applyAspect();
      syncComposer();
    },

    input(next) {
      pointer = { ...next };
    },

    dispose() {
      if (scene) disposeObject(scene);
      if (composer) disposeComposer(composer);
      appliedComposer = null;
      image?.close();
      renderer =
        scene =
        camera =
        composer =
        bloomPass =
        grass =
        grassMaterial =
        image =
          null;
    },
  };

  return experience;
}
