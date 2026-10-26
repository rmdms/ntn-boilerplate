import { Color, WebGLRenderer } from "three";
import type { InjectionKey, Ref } from "vue";
import { createClock } from "./clock";
import {
  createStage,
  type MemoryCounts,
  type Stage,
  type StageHost,
  type ViewportSize,
} from "./experience";

/** The layout provides its persistent canvas under this key. */
export const EXPERIENCE_CANVAS: InjectionKey<Ref<HTMLCanvasElement | null>> =
  Symbol("experience-canvas");

export type ContextListener = (lost: boolean) => void;

export interface RendererHost extends StageHost {
  readonly canvas: HTMLCanvasElement;
  readonly stage: Stage;
  /** Fades the canvas in or out (CSS opacity transition owned by the layout). */
  setVisible(visible: boolean): void;
  /** Notified with true on webglcontextlost and false on webglcontextrestored. */
  onContextChange(listener: ContextListener): () => void;
}

// Viewport and scissor go back to the full canvas at its current size, since the canvas may have resized meanwhile.
function captureRendererState(
  renderer: WebGLRenderer,
  size: () => ViewportSize,
): () => void {
  const clearColor = renderer.getClearColor(new Color());
  const clearAlpha = renderer.getClearAlpha();
  const toneMapping = renderer.toneMapping;
  const toneMappingExposure = renderer.toneMappingExposure;
  const outputColorSpace = renderer.outputColorSpace;
  const shadowMap = {
    enabled: renderer.shadowMap.enabled,
    type: renderer.shadowMap.type,
    autoUpdate: renderer.shadowMap.autoUpdate,
  };
  const autoClear = {
    autoClear: renderer.autoClear,
    autoClearColor: renderer.autoClearColor,
    autoClearDepth: renderer.autoClearDepth,
    autoClearStencil: renderer.autoClearStencil,
  };
  const pixelRatio = renderer.getPixelRatio();
  const scissorTest = renderer.getScissorTest();

  return () => {
    renderer.setRenderTarget(null);
    renderer.setClearColor(clearColor, clearAlpha);
    renderer.toneMapping = toneMapping;
    renderer.toneMappingExposure = toneMappingExposure;
    renderer.outputColorSpace = outputColorSpace;
    Object.assign(renderer.shadowMap, shadowMap);
    Object.assign(renderer, autoClear);
    renderer.setPixelRatio(pixelRatio);
    const { width, height } = size();
    renderer.setSize(width, height, false);
    renderer.setScissor(0, 0, width, height);
    renderer.setScissorTest(scissorTest);
    renderer.resetState();
    renderer.clear();
  };
}

function createRendererHost(canvas: HTMLCanvasElement): RendererHost {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const clock = createClock();
  const contextListeners = new Set<ContextListener>();
  let frame: ((dt: number) => void) | null = null;

  const syncLoop = () => {
    clock.reset();
    renderer.setAnimationLoop(
      frame && !document.hidden ? (time) => frame?.(clock.tick(time)) : null,
    );
  };

  const size = (): ViewportSize => ({
    width: canvas.clientWidth,
    height: canvas.clientHeight,
    pixelRatio: renderer.getPixelRatio(),
  });

  const stageHost: StageHost = {
    renderer,
    size,
    memory: (): MemoryCounts => ({
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      programs: renderer.info.programs?.length ?? 0,
    }),
    snapshot: () => captureRendererState(renderer, size),
    setFrame(next) {
      frame = next;
      syncLoop();
    },
  };

  const stage = createStage(stageHost, {
    onLeak(baseline, after) {
      if (import.meta.dev)
        console.warn(
          "[experience] GPU memory not back at baseline after dispose",
          { baseline, after },
        );
    },
  });

  new ResizeObserver(() => {
    const next = size();
    renderer.setSize(next.width, next.height, false);
    stage.resize(next);
  }).observe(canvas);

  document.addEventListener("visibilitychange", syncLoop);

  // three.js already calls preventDefault on webglcontextlost, which allows the restore event.
  canvas.addEventListener("webglcontextlost", () =>
    contextListeners.forEach((listener) => listener(true)),
  );
  canvas.addEventListener("webglcontextrestored", () =>
    contextListeners.forEach((listener) => listener(false)),
  );

  return {
    ...stageHost,
    canvas,
    stage,
    setVisible(visible) {
      canvas.classList.toggle("is-hidden", !visible);
    },
    onContextChange(listener) {
      contextListeners.add(listener);
      return () => contextListeners.delete(listener);
    },
  };
}

let instance: RendererHost | null = null;

/** Returns the app-wide renderer host, creating it on the layout's canvas the first time. */
export function getRendererHost(canvas: HTMLCanvasElement): RendererHost {
  instance ??= createRendererHost(canvas);
  return instance;
}
