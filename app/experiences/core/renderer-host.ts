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
import { basePixelRatio } from "./quality";
import { createQualityGovernor } from "./quality-governor";

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
  /** Stops the loop and releases the renderer; the next getRendererHost call creates a fresh host. */
  dispose(): void;
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
    // The legacy site rendered every scene with MSAA; on tile-based mobile GPUs it costs little next to pixel ratio.
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  // Experiences scale the renderer's ratio for quality, so size() always reports this capped device ratio instead.
  const pixelRatio = basePixelRatio(window.devicePixelRatio);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const clock = createClock();
  const governor = createQualityGovernor();
  const contextListeners = new Set<ContextListener>();
  let frame: ((dt: number) => void) | null = null;

  const syncLoop = () => {
    clock.reset();
    renderer.setAnimationLoop(
      frame && !document.hidden
        ? (time) => {
            const dt = clock.tick(time);
            const renders = renderer.info.render.frame;
            frame?.(dt);
            // Idle ticks of render-on-change scenes run at vsync and would read as headroom.
            if (renderer.info.render.frame === renders) return;
            const level = governor.sample(dt * 1000);
            if (level !== null) stage.current?.setQuality(level);
          }
        : null,
    );
  };

  const size = (): ViewportSize => ({
    width: canvas.clientWidth,
    height: canvas.clientHeight,
    pixelRatio,
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
      const run = stage.current;
      if (next && run) governor.start(run.qualityRange, run.quality);
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

  const resizeObserver = new ResizeObserver(() => {
    const next = size();
    renderer.setSize(next.width, next.height, false);
    stage.resize(next);
  });
  resizeObserver.observe(canvas);

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
    dispose() {
      stage.current?.dispose();
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", syncLoop);
      contextListeners.clear();
      renderer.dispose();
    },
  };
}

let instance: RendererHost | null = null;

/** Returns the app-wide renderer host, recreating it when the layout remounts with a new canvas (e.g. after the error page). */
export function getRendererHost(canvas: HTMLCanvasElement): RendererHost {
  if (instance && instance.canvas !== canvas) {
    instance.dispose();
    instance = null;
  }
  instance ??= createRendererHost(canvas);
  return instance;
}
