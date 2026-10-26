import { describe, expect, it } from "bun:test";
import type { WebGLRenderer } from "three";
import {
  createStage,
  type Experience,
  type ExperienceState,
  type LoadContext,
  type MemoryCounts,
  type StageHost,
} from "../../app/experiences/core/experience";
import { createClock } from "../../app/experiences/core/clock";

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function createFakeHost(log: string[]) {
  let frame: ((dt: number) => void) | null = null;
  const memory: MemoryCounts = { geometries: 0, textures: 0, programs: 0 };
  const host: StageHost & {
    memoryCounts: MemoryCounts;
    tick(dt?: number): void;
    readonly looping: boolean;
  } = {
    renderer: {} as WebGLRenderer,
    memoryCounts: memory,
    size: () => ({ width: 320, height: 640, pixelRatio: 2 }),
    memory: () => ({ ...memory }),
    snapshot() {
      log.push("host:snapshot");
      return () => log.push("host:restore");
    },
    setFrame(next) {
      frame = next;
    },
    tick(dt = 0.016) {
      frame?.(dt);
    },
    get looping() {
      return frame !== null;
    },
  };
  return host;
}

function createStub(
  name: string,
  log: string[],
  load: (ctx: LoadContext) => Promise<string> = async () => `${name}-assets`,
) {
  const stub: Experience<string> & { contexts: LoadContext[] } = {
    contexts: [],
    quality: { levels: 3, initial: 1 },
    load(ctx) {
      stub.contexts.push(ctx);
      log.push(`${name}:load`);
      return load(ctx);
    },
    mount(assets, ctx) {
      log.push(`${name}:mount:${assets}:q${ctx.quality}`);
    },
    update(dt) {
      log.push(`${name}:update:${dt}`);
    },
    setQuality(level) {
      log.push(`${name}:quality:${level}`);
    },
    resize(size) {
      log.push(`${name}:resize:${size.width}x${size.height}`);
    },
    input(pointer) {
      log.push(`${name}:input:${pointer.x},${pointer.y}`);
    },
    dispose() {
      log.push(`${name}:dispose`);
    },
  };
  return stub;
}

describe("experience lifecycle", () => {
  it("should go through loading, ready and running when the load resolves and a frame renders", async () => {
    const log: string[] = [];
    const host = createFakeHost(log);
    const states: ExperienceState[] = [];
    createStage(host).start(() => createStub("a", log), {
      onState: (state) => states.push(state),
    });
    await flush();
    host.tick();
    expect(states).toEqual(["loading", "ready", "running"]);
  });

  it("should mount with the experience's initial quality level", async () => {
    const log: string[] = [];
    createStage(createFakeHost(log)).start(() => createStub("a", log));
    await flush();
    expect(log).toContain("a:mount:a-assets:q1");
  });

  it("should not mount when the late load result arrives after dispose", async () => {
    const log: string[] = [];
    const pending = deferred<string>();
    const run = createStage(createFakeHost(log)).start(() =>
      createStub("a", log, () => pending.promise),
    );
    run.dispose();
    pending.resolve("late");
    await flush();
    expect(log.some((entry) => entry.startsWith("a:mount"))).toBe(false);
  });

  it("should abort the pending load signal when disposed during loading", () => {
    const log: string[] = [];
    const stub = createStub("a", log, () => new Promise(() => {}));
    createStage(createFakeHost(log))
      .start(() => stub)
      .dispose();
    expect(stub.contexts[0]?.signal.aborted).toBe(true);
  });

  it("should end disposed when disposed during loading", () => {
    const log: string[] = [];
    const run = createStage(createFakeHost(log)).start(() =>
      createStub("a", log, () => new Promise(() => {})),
    );
    run.dispose();
    expect(run.state).toBe("disposed");
  });

  it("should go to disposed when a load step throws", async () => {
    const log: string[] = [];
    const run = createStage(createFakeHost(log)).start(() =>
      createStub("a", log, async () => {
        throw new Error("asset 404");
      }),
    );
    await flush();
    expect(run.state).toBe("disposed");
  });

  it("should report the error so the page can show its fallback when a load step throws", async () => {
    const log: string[] = [];
    const errors: unknown[] = [];
    createStage(createFakeHost(log)).start(
      () =>
        createStub("a", log, async () => {
          throw new Error("asset 404");
        }),
      { onError: (error) => errors.push(error) },
    );
    await flush();
    expect((errors[0] as Error).message).toBe("asset 404");
  });

  it("should release the experience and restore renderer state when a load step throws", async () => {
    const log: string[] = [];
    createStage(createFakeHost(log)).start(() =>
      createStub("a", log, async () => {
        throw new Error("asset 404");
      }),
    );
    await flush();
    expect(log.slice(-2)).toEqual(["a:dispose", "host:restore"]);
  });

  it("should snapshot renderer state before load and restore it after the experience disposes", async () => {
    const log: string[] = [];
    const run = createStage(createFakeHost(log)).start(() =>
      createStub("a", log),
    );
    await flush();
    run.dispose();
    expect(log).toEqual([
      "host:snapshot",
      "a:load",
      "a:mount:a-assets:q1",
      "a:dispose",
      "host:restore",
    ]);
  });

  it("should dispose the experience only once when dispose is called twice", async () => {
    const log: string[] = [];
    const run = createStage(createFakeHost(log)).start(() =>
      createStub("a", log),
    );
    await flush();
    run.dispose();
    run.dispose();
    expect(log.filter((entry) => entry === "a:dispose")).toHaveLength(1);
  });

  it("should stop the loop when the running experience is disposed", async () => {
    const log: string[] = [];
    const host = createFakeHost(log);
    const run = createStage(host).start(() => createStub("a", log));
    await flush();
    run.dispose();
    expect(host.looping).toBe(false);
  });

  it("should forward quality changes to the running experience", async () => {
    const log: string[] = [];
    const host = createFakeHost(log);
    const run = createStage(host).start(() => createStub("a", log));
    await flush();
    host.tick();
    run.setQuality(0);
    expect(log.at(-1)).toBe("a:quality:0");
  });

  it("should forward resize and pointer input to the mounted experience", async () => {
    const log: string[] = [];
    const stage = createStage(createFakeHost(log));
    stage.start(() => createStub("a", log));
    await flush();
    stage.resize({ width: 640, height: 320, pixelRatio: 1 });
    stage.input({ x: 0.5, y: -0.5, down: true, kind: "touch" });
    expect(log.slice(-2)).toEqual(["a:resize:640x320", "a:input:0.5,-0.5"]);
  });

  it("should forward the load progress ratio to the progress handler", async () => {
    const log: string[] = [];
    const ratios: number[] = [];
    createStage(createFakeHost(log)).start(
      () =>
        createStub("a", log, async (ctx) => {
          ctx.progress(0.5);
          ctx.progress(1);
          return "assets";
        }),
      { onProgress: (ratio) => ratios.push(ratio) },
    );
    await flush();
    expect(ratios).toEqual([0.5, 1]);
  });

  it("should report a leak when GPU memory differs from the pre-mount baseline after dispose", async () => {
    const log: string[] = [];
    const host = createFakeHost(log);
    const leaks: MemoryCounts[] = [];
    const run = createStage(host, {
      onLeak: (_before, after) => leaks.push(after),
    }).start(() => createStub("a", log));
    await flush();
    host.memoryCounts.textures = 2;
    run.dispose();
    expect(leaks).toEqual([{ geometries: 0, textures: 2, programs: 0 }]);
  });

  it("should not report a leak when GPU memory is back at baseline after dispose", async () => {
    const log: string[] = [];
    const leaks: MemoryCounts[] = [];
    const run = createStage(createFakeHost(log), {
      onLeak: (_before, after) => leaks.push(after),
    }).start(() => createStub("a", log));
    await flush();
    run.dispose();
    expect(leaks).toHaveLength(0);
  });
});

describe("navigation A -> B -> A", () => {
  async function navigate() {
    const log: string[] = [];
    const host = createFakeHost(log);
    const stage = createStage(host);
    stage.start(() => createStub("a1", log));
    await flush();
    host.tick(1);
    stage.start(() => createStub("b", log));
    await flush();
    host.tick(2);
    stage.start(() => createStub("a2", log));
    await flush();
    host.tick(3);
    return log;
  }

  it("should mount B only after A is disposed and A again only after B is disposed", async () => {
    const log = await navigate();
    const order = log.filter((entry) => /:(dispose|mount)/.test(entry));
    expect(order).toEqual([
      "a1:mount:a1-assets:q1",
      "a1:dispose",
      "b:mount:b-assets:q1",
      "b:dispose",
      "a2:mount:a2-assets:q1",
    ]);
  });

  it("should drive only the current experience from the single loop", async () => {
    const log = await navigate();
    const updates = log.filter((entry) => entry.includes(":update:"));
    expect(updates).toEqual(["a1:update:1", "b:update:2", "a2:update:3"]);
  });

  it("should keep the previous experience disposed when the next one starts while it is still loading", async () => {
    const log: string[] = [];
    const host = createFakeHost(log);
    const stage = createStage(host);
    const pending = deferred<string>();
    stage.start(() => createStub("a", log, () => pending.promise));
    stage.start(() => createStub("b", log));
    pending.resolve("late");
    await flush();
    host.tick(1);
    expect(log.filter((entry) => entry.startsWith("a:"))).toEqual([
      "a:load",
      "a:dispose",
    ]);
  });
});

describe("frame clock", () => {
  it("should return the seconds elapsed since the previous tick", () => {
    const clock = createClock();
    clock.tick(1000);
    expect(clock.tick(1016)).toBeCloseTo(0.016);
  });

  it("should return zero on the first tick after a reset so a paused tab does not produce a huge step", () => {
    const clock = createClock();
    clock.tick(1000);
    clock.reset();
    expect(clock.tick(60_000)).toBe(0);
  });
});
