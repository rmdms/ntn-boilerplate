import { gsap } from "gsap";
import {
  DoubleSide,
  Group,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  type WebGLRenderer,
} from "three";
import { loadDeferredFor, loadEssentials } from "../core/asset-loader";
import type {
  Experience,
  PointerState,
  ViewportSize,
} from "../core/experience";
import { fragmentShader, vertexShader } from "./shaders/slide";
import {
  createSlider,
  createTripLoads,
  letterCount,
  PLANES_PER_TRIP,
  slideUrls,
  SPACE_BETWEEN_PLANES,
  TRIPS,
  type Slider,
  type Step,
} from "./slider";

const FOV = 45;
const CAMERA_Z = 5;
const PLANE_X = [-1, 1, 0];
const SPACING_HEIGHT = 0.75;
const PARALLAX_DIVISOR = 25000;
const PARALLAX_DURATION = 0.1;
// Keeps rendering a little past the parallax tween so its last frames land.
const PARALLAX_RENDER_TIME = PARALLAX_DURATION + 0.1;
const IMAGE_OPTIONS: ImageBitmapOptions = { imageOrientation: "flipY" };

/** Factor on the host pixel ratio, or "native" for the device ratio up to 2. Level 0 is the floor. */
const LEVELS: (number | "native")[] = [0.6, 0.8, 1, "native"];

export interface PhotographyOptions {
  /** Called when a transition starts, so the page can run its title, subtitle and scrollbar timeline. */
  onStep?(step: Step): void;
}

interface Plane {
  mesh: Mesh;
  trip: number;
  index: number;
  baseY: number;
  texture: Texture;
  bitmap: ImageBitmap;
  parallax: { x: number; y: number };
  moveX: gsap.QuickToFunc;
  moveY: gsap.QuickToFunc;
}

// Legacy scaled the whole scene between 400 and 1200 px wide.
function sceneScale(width: number) {
  const scale = ((width - 400) * (1 - 0.45)) / (1200 - 400) + 0.45;
  return Math.min(1, Math.max(0.45, scale));
}

export function createPhotography(
  options: PhotographyOptions = {},
): Experience<void> {
  const scene = new Scene();
  const root = new Group();
  scene.add(root);
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 1000);
  camera.position.z = CAMERA_Z;

  const geometries = {
    landscape: new PlaneGeometry(1.15, 0.8, 18, 14),
    portrait: new PlaneGeometry(0.8, 1.05, 18, 14),
  };
  const uniforms = {
    u_texture: { value: null as Texture | null },
    u_textureFactor: { value: new Vector2(1, 1) },
    u_maxDistance: { value: 3 * Math.tan((FOV * Math.PI) / 360) * CAMERA_Z },
    u_magnitude: { value: 1.6 },
    u_progress: { value: -1 },
    u_blackAndWhite: { value: 1 },
    u_opacityColor: { value: 0.1 },
    u_scale: { value: 1 },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: DoubleSide,
  });

  const planes: Plane[] = [];
  const deferredAbort = new AbortController();
  let slider: Slider | null = null;
  let renderer: WebGLRenderer | null = null;
  let view = { width: 1, height: 1 };
  let basePixelRatio = 1;
  let level = 2;
  let dirty = true;
  let parallaxTime = 0;
  let deferredStarted = false;
  let disposed = false;

  const addPlane = (trip: number, index: number, bitmap: ImageBitmap) => {
    const landscape = bitmap.width > bitmap.height;
    const texture = new Texture(bitmap);
    texture.needsUpdate = true;
    // The pixels live on the GPU once uploaded; the decoded copy is not needed anymore.
    texture.onUpdate = () => bitmap.close();
    const mesh = new Mesh(
      landscape ? geometries.landscape : geometries.portrait,
      material,
    );
    const randomY = (Math.random() * 2 - 1) * SPACING_HEIGHT;
    const baseY = -randomY;
    mesh.position.set(0, baseY, -index / 2);
    mesh.rotation.x = Math.PI;
    mesh.frustumCulled = false;
    mesh.onBeforeRender = () => {
      uniforms.u_texture.value = texture;
      uniforms.u_blackAndWhite.value = slider?.colour(trip) ?? 1;
      material.uniformsNeedUpdate = true;
    };
    const parallax = { x: 0, y: 0 };
    const plane: Plane = {
      mesh,
      trip,
      index,
      baseY,
      texture,
      bitmap,
      parallax,
      moveX: gsap.quickTo(parallax, "x", { duration: PARALLAX_DURATION }),
      moveY: gsap.quickTo(parallax, "y", { duration: PARALLAX_DURATION }),
    };
    planes.push(plane);
    root.add(mesh);
    return plane;
  };

  const startDeferred = () => {
    const deferred = loadDeferredFor("photography", {
      signal: deferredAbort.signal,
    });
    const arrived = createTripLoads(PLANES_PER_TRIP, (trip) =>
      slider?.markLoaded(trip),
    );
    TRIPS.forEach((trip, t) => {
      if (t === 0) return;
      slideUrls(trip).forEach((url, j) => {
        deferred.image(url, IMAGE_OPTIONS).then(
          (bitmap) => {
            if (disposed) {
              bitmap.close();
              return;
            }
            const plane = addPlane(t, j, bitmap);
            renderer?.initTexture(plane.texture);
            dirty = true;
            arrived(t);
          },
          (error) => {
            if (!deferredAbort.signal.aborted)
              console.error("[photography] slide failed to load", url, error);
          },
        );
      });
    });
  };

  const applyPixelRatio = () => {
    if (!renderer) return;
    const factor = LEVELS[level]!;
    renderer.setPixelRatio(
      factor === "native"
        ? Math.max(basePixelRatio, Math.min(window.devicePixelRatio, 2))
        : basePixelRatio * factor,
    );
    dirty = true;
  };

  const applySize = (size: ViewportSize) => {
    view = { width: size.width, height: size.height };
    basePixelRatio = size.pixelRatio;
    camera.aspect = size.width / Math.max(1, size.height);
    camera.updateProjectionMatrix();
    const scale = sceneScale(size.width);
    root.scale.set(scale, scale, 1);
    uniforms.u_scale.value = scale;
    dirty = true;
  };

  const followPointer = (pointer: PointerState) => {
    if (!slider || pointer.kind !== "mouse" || !pointer.active) return;
    const dx = (pointer.x * view.width) / 2 / PARALLAX_DIVISOR;
    const dy = (pointer.y * view.height) / 2 / PARALLAX_DIVISOR;
    for (const plane of planes) {
      if (plane.trip !== slider.current) continue;
      plane.moveX(dx / (plane.index + 1));
      plane.moveY(dy / (plane.index + 1));
    }
    parallaxTime = PARALLAX_RENDER_TIME;
  };

  return {
    quality: { levels: LEVELS.length, initial: 2 },

    async load(ctx) {
      const assets = await loadEssentials("photography", {
        signal: ctx.signal,
        progress: ctx.progress,
        steps: PLANES_PER_TRIP + 1,
      });
      const bitmaps = await Promise.all(
        slideUrls(TRIPS[0]!).map((url) =>
          assets.step(assets.image(url, IMAGE_OPTIONS)),
        ),
      );
      bitmaps.forEach((bitmap, j) => {
        if (disposed) bitmap!.close();
        else addPlane(0, j, bitmap!);
      });
      ctx.signal.throwIfAborted();
      await assets.step(ctx.renderer.compileAsync(scene, camera));
    },

    mount(_assets, ctx) {
      renderer = ctx.renderer;
      level = Math.max(0, Math.min(LEVELS.length - 1, ctx.quality));
      slider = createSlider({
        count: TRIPS.length,
        letters: TRIPS.map((trip) => letterCount(trip.title)),
        loaded: TRIPS.map((_, t) => t === 0),
        onStep: (step) => options.onStep?.(step),
      });
      applySize(ctx.size);
      applyPixelRatio();
    },

    update(dt) {
      if (!renderer || !slider) return;
      slider.update(dt);
      parallaxTime = Math.max(0, parallaxTime - dt);
      if (dirty || slider.animating || parallaxTime > 0) {
        for (const plane of planes) {
          plane.mesh.position.x =
            slider.offset(plane.trip) * SPACE_BETWEEN_PLANES +
            PLANE_X[plane.index]! +
            plane.parallax.x;
          plane.mesh.position.y = plane.baseY + plane.parallax.y;
        }
        renderer.render(scene, camera);
        dirty = false;
      }
      if (!deferredStarted) {
        deferredStarted = true;
        startDeferred();
      }
    },

    setQuality(next) {
      level = Math.max(0, Math.min(LEVELS.length - 1, next));
      applyPixelRatio();
    },

    resize(size) {
      applySize(size);
      applyPixelRatio();
    },

    input(pointer) {
      slider?.input(pointer, view.width);
      followPointer(pointer);
    },

    dispose() {
      disposed = true;
      deferredAbort.abort();
      for (const plane of planes) {
        gsap.killTweensOf(plane.parallax);
        plane.texture.dispose();
        plane.bitmap.close();
      }
      planes.length = 0;
      root.clear();
      uniforms.u_texture.value = null;
      geometries.landscape.dispose();
      geometries.portrait.dispose();
      material.dispose();
      slider = null;
      renderer = null;
    },
  };
}
