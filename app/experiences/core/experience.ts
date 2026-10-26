import type { WebGLRenderer } from "three";

export type ExperienceState = "loading" | "ready" | "running" | "disposed";

export interface ViewportSize {
  width: number;
  height: number;
  pixelRatio: number;
}

export type PointerKind = "mouse" | "touch" | "pen";

/** Normalised pointer: x and y in [-1, 1], y up, like three.js NDC. */
export interface PointerState {
  x: number;
  y: number;
  down: boolean;
  kind: PointerKind;
  /** False once a touch or pen lifts or is cancelled: there is no pointer to follow. */
  active: boolean;
  /** Wheel deltaY summed since the previous read. */
  wheel: number;
}

/** Quality levels run from 0 (the floor) to levels - 1. */
export interface QualityRange {
  levels: number;
  initial: number;
}

export interface LoadContext {
  renderer: WebGLRenderer;
  signal: AbortSignal;
  /** Overall load progress ratio in [0, 1]. */
  progress(ratio: number): void;
}

export interface MountContext {
  renderer: WebGLRenderer;
  size: ViewportSize;
  quality: number;
}

/**
 * Contract every experience implements. `dispose` is called exactly once,
 * whether or not `mount` ran, and must release everything the experience allocated.
 */
export interface Experience<Assets = unknown> {
  readonly quality: QualityRange;
  load(ctx: LoadContext): Promise<Assets>;
  mount(assets: Assets, ctx: MountContext): void;
  /** Advances by dt seconds and renders the frame. */
  update(dt: number): void;
  setQuality(level: number): void;
  resize(size: ViewportSize): void;
  input(pointer: PointerState): void;
  dispose(): void;
}

export type ExperienceFactory = () => Experience<unknown>;

export interface MemoryCounts {
  geometries: number;
  textures: number;
  programs: number;
}

/** What the lifecycle runner needs from the renderer host; injectable for tests. */
export interface StageHost {
  readonly renderer: WebGLRenderer;
  size(): ViewportSize;
  memory(): MemoryCounts;
  /** Captures renderer-level state and returns a function restoring it. */
  snapshot(): () => void;
  /** Installs the single per-frame callback; null stops the loop. */
  setFrame(frame: ((dt: number) => void) | null): void;
}

export interface RunHandlers {
  onState?(state: ExperienceState): void;
  onProgress?(ratio: number): void;
  onError?(error: unknown): void;
}

export interface ExperienceRun {
  readonly state: ExperienceState;
  readonly qualityRange: QualityRange;
  readonly quality: number;
  setQuality(level: number): void;
  dispose(): void;
}

export interface StageOptions {
  onLeak?(baseline: MemoryCounts, after: MemoryCounts): void;
}

export interface Stage {
  readonly current: ExperienceRun | null;
  /** Disposes the current run, then starts the new experience. */
  start(factory: ExperienceFactory, handlers?: RunHandlers): ExperienceRun;
  resize(size: ViewportSize): void;
  input(pointer: PointerState): void;
}

function sameMemory(a: MemoryCounts, b: MemoryCounts) {
  return (
    a.geometries === b.geometries &&
    a.textures === b.textures &&
    a.programs === b.programs
  );
}

export function createStage(
  host: StageHost,
  options: StageOptions = {},
): Stage {
  let current:
    (ExperienceRun & { mounted: Experience<unknown> | null }) | null = null;

  function start(
    factory: ExperienceFactory,
    handlers: RunHandlers = {},
  ): ExperienceRun {
    current?.dispose();

    const baseline = host.memory();
    const restore = host.snapshot();
    const abort = new AbortController();
    let experience: Experience<unknown> | null = null;
    let state: ExperienceState = "loading";
    let quality = 0;

    const setState = (next: ExperienceState) => {
      state = next;
      handlers.onState?.(next);
    };

    const fail = (error: unknown) => {
      if (state === "disposed") return;
      run.dispose();
      handlers.onError?.(error);
    };

    const frame = (dt: number) => {
      try {
        experience?.update(dt);
      } catch (error) {
        fail(error);
        return;
      }
      if (state === "ready") setState("running");
    };

    const run = {
      get state() {
        return state;
      },
      get qualityRange() {
        return experience?.quality ?? { levels: 1, initial: 0 };
      },
      get quality() {
        return quality;
      },
      get mounted() {
        return state === "ready" || state === "running" ? experience : null;
      },
      setQuality(level: number) {
        if (state !== "ready" && state !== "running") return;
        quality = level;
        experience?.setQuality(level);
      },
      dispose() {
        if (state === "disposed") return;
        abort.abort();
        host.setFrame(null);
        try {
          experience?.dispose();
        } finally {
          experience = null;
          restore();
          if (current === run) current = null;
          setState("disposed");
          const after = host.memory();
          if (!sameMemory(baseline, after)) options.onLeak?.(baseline, after);
        }
      },
    };

    current = run;
    setState("loading");

    try {
      experience = factory();
      quality = experience.quality.initial;
      experience
        .load({
          renderer: host.renderer,
          signal: abort.signal,
          progress: (ratio) => {
            if (state === "loading") handlers.onProgress?.(ratio);
          },
        })
        .then(
          (assets) => {
            if (state !== "loading" || !experience) return;
            experience.mount(assets, {
              renderer: host.renderer,
              size: host.size(),
              quality,
            });
            setState("ready");
            host.setFrame(frame);
          },
          (error) => {
            if (state === "loading") fail(error);
          },
        )
        .catch(fail);
    } catch (error) {
      fail(error);
    }

    return run;
  }

  return {
    get current() {
      return current;
    },
    start,
    resize(size) {
      current?.mounted?.resize(size);
    },
    input(pointer) {
      current?.mounted?.input(pointer);
    },
  };
}
