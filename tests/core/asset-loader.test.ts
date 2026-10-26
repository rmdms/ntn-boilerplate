import { describe, expect, it } from "bun:test";
import {
  AssetLoadError,
  createLoadTracker,
  loadDeferred,
  loadEntries,
  type FetchLike,
} from "../../app/experiences/core/asset-loader";

interface Gate {
  release(): void;
  promise: Promise<void>;
}

function gate(): Gate {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function body(size: number) {
  return new Uint8Array(size).fill(65);
}

/** Serves each URL once its gate is released; unknown URLs answer 404. */
function fakeFetch(
  files: Record<string, { size: number; headers?: Record<string, string> }>,
  gates: Record<string, Gate> = {},
): FetchLike {
  return async (url) => {
    await gates[url]?.promise;
    const file = files[url];
    if (!file) return new Response("missing", { status: 404 });
    return new Response(body(file.size), { headers: file.headers });
  };
}

const twoAssets = [
  { url: "/a.bin", bytes: 300 },
  { url: "/b.bin", bytes: 700 },
];

describe("loadEntries", () => {
  it("should report 27% when the 300 byte asset of 1000 has completed", async () => {
    const gates = { "/a.bin": gate(), "/b.bin": gate() };
    const ratios: number[] = [];
    const load = loadEntries(twoAssets, {
      fetch: fakeFetch({ "/a.bin": { size: 300 }, "/b.bin": { size: 700 } }, gates),
      progress: (ratio) => ratios.push(ratio),
      steps: 2,
    });
    gates["/a.bin"].release();
    await flush();
    expect(ratios.at(-1)).toBeCloseTo(0.27, 5);
    gates["/b.bin"].release();
    await load;
  });

  it("should report 90% when both assets have completed and steps remain", async () => {
    const ratios: number[] = [];
    await loadEntries(twoAssets, {
      fetch: fakeFetch({ "/a.bin": { size: 300 }, "/b.bin": { size: 700 } }),
      progress: (ratio) => ratios.push(ratio),
      steps: 2,
    });
    expect(ratios.at(-1)).toBeCloseTo(0.9, 5);
  });

  it("should report 100% when the decode and compile steps have finished", async () => {
    const ratios: number[] = [];
    const assets = await loadEntries(twoAssets, {
      fetch: fakeFetch({ "/a.bin": { size: 300 }, "/b.bin": { size: 700 } }),
      progress: (ratio) => ratios.push(ratio),
      steps: 2,
    });
    await assets.step(Promise.resolve("decoded"));
    await assets.step(async () => "compiled");
    expect(ratios.at(-1)).toBe(1);
  });

  it("should never exceed 100% when a compressed response is larger than its manifest size", async () => {
    const ratios: number[] = [];
    const assets = await loadEntries(twoAssets, {
      fetch: fakeFetch({
        "/a.bin": { size: 3000, headers: { "content-encoding": "gzip", "content-length": "10" } },
        "/b.bin": { size: 50, headers: { "content-encoding": "br", "content-length": "99999" } },
      }),
      progress: (ratio) => ratios.push(ratio),
      steps: 1,
    });
    await assets.step();
    expect(Math.max(...ratios)).toBe(1);
  });

  it("should count progress from manifest sizes when a compressed response is smaller", async () => {
    const ratios: number[] = [];
    await loadEntries(twoAssets, {
      fetch: fakeFetch({
        "/a.bin": { size: 30, headers: { "content-encoding": "gzip" } },
        "/b.bin": { size: 70, headers: { "content-encoding": "gzip" } },
      }),
      progress: (ratio) => ratios.push(ratio),
      steps: 1,
    });
    expect(ratios.at(-1)).toBeCloseTo(0.9, 5);
  });

  it("should report progress that never decreases", async () => {
    const ratios: number[] = [];
    await loadEntries(twoAssets, {
      fetch: fakeFetch({ "/a.bin": { size: 300 }, "/b.bin": { size: 700 } }),
      progress: (ratio) => ratios.push(ratio),
    });
    expect(ratios).toEqual([...ratios].sort((a, b) => a - b));
  });

  it("should report ready immediately when there are no essential assets", async () => {
    const tracker = createLoadTracker();
    const ratios: number[] = [];
    await loadEntries([], { progress: (ratio) => ratios.push(ratio), tracker });
    expect({ ratios, phase: tracker.status.phase }).toEqual({ ratios: [1], phase: "ready" });
  });

  it("should expose the fetched bytes and parse JSON when loading completes", async () => {
    const fetch: FetchLike = async () => new Response('{"glyphs":{}}');
    const assets = await loadEntries([{ url: "/font.json", bytes: 13 }], { fetch });
    expect(assets.json("/font.json")).toEqual({ glyphs: {} });
  });

  it("should reject with an AssetLoadError when an essential fetch fails", async () => {
    const load = loadEntries(twoAssets, { fetch: fakeFetch({ "/a.bin": { size: 300 } }) });
    expect(load).rejects.toBeInstanceOf(AssetLoadError);
  });

  it("should surface an error state when an essential fetch fails", async () => {
    const tracker = createLoadTracker();
    await loadEntries(twoAssets, {
      fetch: fakeFetch({ "/a.bin": { size: 300 } }),
      tracker,
    }).catch(() => {});
    expect(tracker.status.phase).toBe("error");
  });

  it("should surface an error state when the network rejects", async () => {
    const tracker = createLoadTracker();
    await loadEntries(twoAssets, {
      fetch: async () => {
        throw new TypeError("Failed to fetch");
      },
      tracker,
    }).catch(() => {});
    expect(tracker.status.phase).toBe("error");
  });

  it("should return the tracker to idle when the load is aborted", async () => {
    const tracker = createLoadTracker();
    const abort = new AbortController();
    const gates = { "/a.bin": gate(), "/b.bin": gate() };
    const load = loadEntries(twoAssets, {
      fetch: fakeFetch({ "/a.bin": { size: 300 }, "/b.bin": { size: 700 } }, gates),
      signal: abort.signal,
      tracker,
    }).catch(() => {});
    abort.abort();
    gates["/a.bin"].release();
    gates["/b.bin"].release();
    await load;
    expect(tracker.status.phase).toBe("idle");
  });

  it("should ignore a stale load when a newer one has begun", async () => {
    const tracker = createLoadTracker();
    const gates = { "/a.bin": gate(), "/b.bin": gate() };
    const stale = loadEntries(twoAssets, {
      fetch: fakeFetch({ "/a.bin": { size: 300 } }, gates),
      tracker,
    }).catch(() => {});
    await loadEntries([], { tracker });
    gates["/a.bin"].release();
    gates["/b.bin"].release();
    await stale;
    expect(tracker.status.phase).toBe("ready");
  });
});

describe("loadDeferred", () => {
  it("should resolve each deferred asset independently when it arrives", async () => {
    const gates = { "/a.bin": gate(), "/b.bin": gate() };
    const deferred = loadDeferred(twoAssets, {
      fetch: fakeFetch({ "/a.bin": { size: 300 }, "/b.bin": { size: 700 } }, gates),
    });
    gates["/b.bin"].release();
    const buffer = await deferred.get("/b.bin");
    expect(buffer.byteLength).toBe(700);
    gates["/a.bin"].release();
  });

  it("should leave the load tracker untouched when deferred assets load", async () => {
    const tracker = createLoadTracker();
    await loadEntries([], { tracker });
    const deferred = loadDeferred(twoAssets, {
      fetch: fakeFetch({ "/a.bin": { size: 300 }, "/b.bin": { size: 700 } }),
    });
    await deferred.get("/a.bin");
    expect(tracker.status).toEqual({ phase: "ready", ratio: 1 });
  });
});
