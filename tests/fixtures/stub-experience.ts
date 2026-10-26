import {
  ACESFilmicToneMapping,
  BoxGeometry,
  DataTexture,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  type WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { CopyShader } from "three/addons/shaders/CopyShader.js";
import type { Experience } from "../../app/experiences/core/experience";
import {
  disposeComposer,
  disposeObject,
} from "../../app/experiences/core/dispose";

export interface StubProbe {
  uniformTextureDisposed: boolean;
}

export type StubVariant = "scene" | "failing";

function solidTexture(rgba: [number, number, number, number]) {
  const texture = new DataTexture(new Uint8Array(rgba), 1, 1);
  texture.needsUpdate = true;
  return texture;
}

// Exercises every disposal path the host guarantees: geometry, material map, uniform-only texture, composer passes.
export function createStubExperience(
  variant: StubVariant,
  probe: StubProbe,
): Experience<void> {
  let renderer: WebGLRenderer | null = null;
  let scene: Scene | null = null;
  let camera: PerspectiveCamera | null = null;
  let composer: EffectComposer | null = null;

  return {
    quality: { levels: 1, initial: 0 },
    async load() {
      if (variant === "failing") throw new Error("stub load failure");
    },
    mount(_assets, ctx) {
      renderer = ctx.renderer;
      renderer.setClearColor(0xff0000, 1);
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 2;

      scene = new Scene();
      camera = new PerspectiveCamera(
        50,
        ctx.size.width / ctx.size.height,
        0.1,
        100,
      );
      camera.position.z = 5;
      scene.add(new DirectionalLight(0xffffff, 2));
      scene.add(
        new Mesh(
          new BoxGeometry(),
          new MeshStandardMaterial({ map: solidTexture([0, 255, 0, 255]) }),
        ),
      );

      const uniformTexture = solidTexture([0, 0, 255, 255]);
      uniformTexture.addEventListener("dispose", () => {
        probe.uniformTextureDisposed = true;
      });
      scene.add(
        new Mesh(
          new PlaneGeometry(),
          new ShaderMaterial({
            uniforms: { uMap: { value: uniformTexture } },
            vertexShader:
              "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
            fragmentShader:
              "uniform sampler2D uMap; varying vec2 vUv; void main() { gl_FragColor = texture2D(uMap, vUv); }",
          }),
        ),
      );

      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new ShaderPass(CopyShader));
      composer.setSize(ctx.size.width, ctx.size.height);
    },
    update(dt) {
      composer?.render(dt);
    },
    setQuality() {},
    resize(size) {
      if (!camera || !composer) return;
      camera.aspect = size.width / size.height;
      camera.updateProjectionMatrix();
      composer.setSize(size.width, size.height);
    },
    input() {},
    dispose() {
      if (scene) disposeObject(scene);
      if (composer) disposeComposer(composer);
      renderer = scene = camera = composer = null;
    },
  };
}
