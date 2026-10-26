import {
  BufferAttribute,
  BufferGeometry,
  OrthographicCamera,
  Points,
  Scene,
  ShaderMaterial,
  Uint8BufferAttribute,
  Vector2,
  type WebGLRenderer,
} from "three";
import { loadEssentials } from "../core/asset-loader";
import type { Experience, ViewportSize } from "../core/experience";
import { applyPixelRatio, levelAt, resolvePixelRatio } from "../core/quality";
import {
  AT_REST,
  createGrid,
  DOT_RADIUS,
  easeAttraction,
  needsRender,
  pointerTarget,
  PULL_DISTANCE,
  type Attraction,
  type Rasterize,
  type Size,
} from "./grid";
import { fragmentShader, vertexShader } from "./shaders/dots";

const SOURCE_URL = "/images/mmi.webp";

interface Level {
  spacing: number;
  /** Factor on the host pixel ratio, or "native" for the device ratio up to 2. */
  pixelRatio: number | "native";
}

// Level 2 is the legacy look; 0 is the floor.
const LEVELS: Level[] = [
  { spacing: 30, pixelRatio: 0.75 },
  { spacing: 25, pixelRatio: 0.75 },
  { spacing: 25, pixelRatio: 1 },
  { spacing: 25, pixelRatio: "native" },
];

export interface AttractAssets {
  image: ImageBitmap;
}

export function createAttract(): Experience<AttractAssets> {
  const scene = new Scene();
  const camera = new OrthographicCamera(0, 1, 0, 1, -1, 1);
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uPointer: { value: new Vector2() },
      uStrength: { value: 0 },
      uPull: { value: PULL_DISTANCE },
      uRadius: { value: DOT_RADIUS },
      uPixelRatio: { value: 1 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const points = new Points(new BufferGeometry(), material);
  points.frustumCulled = false;
  scene.add(points);

  let renderer: WebGLRenderer | null = null;
  let image: ImageBitmap | null = null;
  let grid: ReturnType<typeof createGrid> | null = null;
  let view: Size = { width: 1, height: 1 };
  let basePixelRatio = 1;
  let level = LEVELS[2]!;
  // The canvas keeps its last frame while nothing is drawn, so every change to what it shows sets this.
  let dirty = true;
  // Set by resize, consumed by the next update so a burst of observer callbacks rebuilds the grid once.
  let rebuildPending = false;
  const eased: Attraction = { x: 0, y: 0, strength: 0 };
  let target: Attraction = { x: 0, y: 0, strength: 0 };

  const rasterize: Rasterize = (size, rect) => {
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(image!, rect.x, rect.y, rect.width, rect.height);
    const pixels = context.getImageData(0, 0, size.width, size.height);
    canvas.width = canvas.height = 0;
    return pixels;
  };

  const rebuild = () => {
    const data = grid!.build(view, level.spacing);
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(data.positions, 3));
    geometry.setAttribute(
      "dotColor",
      new Uint8BufferAttribute(data.colors, 3, true),
    );
    points.geometry.dispose();
    points.geometry = geometry;
    dirty = true;
    rebuildPending = false;
  };

  const applyLevelPixelRatio = () => {
    if (!renderer) return;
    const ratio = resolvePixelRatio(basePixelRatio, level.pixelRatio);
    if (applyPixelRatio(renderer, ratio)) dirty = true;
    material.uniforms.uPixelRatio!.value = ratio;
  };

  const fitCamera = () => {
    camera.right = view.width;
    camera.bottom = view.height;
    camera.updateProjectionMatrix();
  };

  return {
    quality: { levels: LEVELS.length, initial: 2 },

    async load(ctx) {
      const assets = await loadEssentials("attract", {
        signal: ctx.signal,
        progress: ctx.progress,
        steps: 2,
      });
      image = (await assets.step(assets.image(SOURCE_URL)))!;
      await assets.step(ctx.renderer.compileAsync(scene, camera));
      return { image };
    },

    mount(_assets, ctx) {
      renderer = ctx.renderer;
      renderer.setClearColor(0x000000, 1);
      basePixelRatio = ctx.size.pixelRatio;
      level = LEVELS[ctx.quality] ?? level;
      dirty = true;
      view = { width: ctx.size.width, height: ctx.size.height };
      grid = createGrid(rasterize);
      applyLevelPixelRatio();
      fitCamera();
      rebuild();
    },

    update(dt) {
      if (rebuildPending && grid) rebuild();
      const wasMoving = eased.strength >= AT_REST;
      easeAttraction(eased, target, dt);
      // The frame that settles to rest is drawn once more so the dots end exactly at rest.
      if (wasMoving && eased.strength < AT_REST) dirty = true;
      if (!renderer || !needsRender(eased, target, dirty)) return;
      material.uniforms.uPointer!.value.set(eased.x, eased.y);
      material.uniforms.uStrength!.value = eased.strength;
      renderer.render(scene, camera);
      dirty = false;
    },

    setQuality(next) {
      const previous = level;
      level = levelAt(LEVELS, next);
      applyLevelPixelRatio();
      dirty = true;
      if (grid && level.spacing !== previous.spacing) rebuild();
    },

    // The host passes the current renderer ratio, which this experience already scaled; keep the mount-time base.
    resize(size: ViewportSize) {
      view = { width: size.width, height: size.height };
      fitCamera();
      rebuildPending = true;
      dirty = true;
    },

    input(pointer) {
      target = pointerTarget(pointer, view);
    },

    dispose() {
      points.geometry.dispose();
      material.dispose();
      image?.close();
      image = null;
      grid = null;
      renderer = null;
    },
  };
}
