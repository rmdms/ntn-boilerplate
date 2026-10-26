import type { ExperienceName } from "../assets";
import manifestJson from "../asset-manifest.json";

export interface AssetEntry {
  url: string;
  bytes: number;
}

export interface StreamedEntry extends AssetEntry {
  segments: AssetEntry[];
}

export interface ExperienceManifest {
  essential: AssetEntry[];
  deferred: AssetEntry[];
  streamed: StreamedEntry[];
}

export interface AssetManifest {
  experiences: Record<string, ExperienceManifest>;
}

export const assetManifest: AssetManifest = manifestJson;

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<Response>;

export type LoadPhase = "idle" | "loading" | "ready" | "error";

export interface LoadStatus {
  phase: LoadPhase;
  ratio: number;
}

export interface LoadTracker {
  readonly status: LoadStatus;
  subscribe(listener: (status: LoadStatus) => void): () => void;
  /** Starts a load; updates from any earlier load are ignored from now on. */
  begin(): (status: LoadStatus) => void;
}

export function createLoadTracker(): LoadTracker {
  let status: LoadStatus = { phase: "idle", ratio: 0 };
  let generation = 0;
  const listeners = new Set<(status: LoadStatus) => void>();

  return {
    get status() {
      return status;
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(status);
      return () => listeners.delete(listener);
    },
    begin() {
      const own = ++generation;
      return (next) => {
        if (own !== generation) return;
        status = next;
        for (const listener of listeners) listener(status);
      };
    },
  };
}

/** App-wide tracker the SiteLoader listens to. */
export const loadTracker = createLoadTracker();

export class AssetLoadError extends Error {
  constructor(
    readonly url: string,
    cause: unknown,
  ) {
    super(`failed to load ${url}`, { cause });
    this.name = "AssetLoadError";
  }
}

const BYTES_SHARE = 0.9;

const imageTypes: Record<string, string> = {
  avif: "image/avif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function imageType(url: string) {
  return imageTypes[url.split(".").pop()?.toLowerCase() ?? ""] ?? "";
}

async function fetchBytes(
  entry: AssetEntry,
  fetcher: FetchLike,
  signal: AbortSignal | undefined,
  onBytes: (count: number) => void,
): Promise<ArrayBuffer> {
  let response: Response;
  try {
    response = await fetcher(entry.url, { signal });
  } catch (error) {
    throw signal?.aborted ? error : new AssetLoadError(entry.url, error);
  }
  signal?.throwIfAborted();
  if (!response.ok || !response.body) {
    throw new AssetLoadError(entry.url, new Error(`HTTP ${response.status}`));
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      length += value.byteLength;
      onBytes(length);
    }
  } catch (error) {
    throw signal?.aborted ? error : new AssetLoadError(entry.url, error);
  }
  const buffer = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer.buffer;
}

function parseJson<T>(buffer: ArrayBuffer): T {
  return JSON.parse(new TextDecoder().decode(buffer)) as T;
}

function decodeImage(
  url: string,
  buffer: ArrayBuffer,
  options?: ImageBitmapOptions,
) {
  return createImageBitmap(
    new Blob([buffer], { type: imageType(url) }),
    options,
  );
}

export interface LoadedAssets {
  bytes(url: string): ArrayBuffer;
  json<T = unknown>(url: string): T;
  image(url: string, options?: ImageBitmapOptions): Promise<ImageBitmap>;
  /**
   * Marks one post-download step (decode, `renderer.compileAsync`) as finished;
   * the declared steps fill 90–100% of the bar. Pass the work to finish it when it settles.
   */
  step<T>(work?: Promise<T> | (() => Promise<T>)): Promise<T | undefined>;
}

export interface LoadOptions {
  fetch?: FetchLike;
  signal?: AbortSignal;
  /** Receives the overall ratio in [0, 1]; pass `LoadContext.progress`. */
  progress?(ratio: number): void;
  /** Number of `step()` calls that follow the download. */
  steps?: number;
  tracker?: LoadTracker;
}

/** Downloads essential assets, counting bytes against manifest sizes, never `Content-Length`. */
export async function loadEntries(
  entries: readonly AssetEntry[],
  options: LoadOptions = {},
): Promise<LoadedAssets> {
  const { signal, progress, steps = 0 } = options;
  const fetcher = options.fetch ?? ((url, init) => fetch(url, init));
  const publish = (options.tracker ?? loadTracker).begin();
  const total = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  const counted = entries.map(() => 0);
  let stepsDone = 0;
  let reported = -1;

  const report = () => {
    const bytes = counted.reduce((sum, count) => sum + count, 0);
    const byteRatio = total > 0 ? bytes / total : 1;
    const stepRatio = steps > 0 ? stepsDone / steps : 1;
    const ratio = Math.min(
      1,
      byteRatio * BYTES_SHARE + stepRatio * (1 - BYTES_SHARE),
    );
    if (ratio <= reported) return;
    reported = ratio;
    progress?.(ratio);
    publish({ phase: ratio >= 1 ? "ready" : "loading", ratio });
  };

  const fail = () =>
    publish(
      signal?.aborted
        ? { phase: "idle", ratio: 0 }
        : { phase: "error", ratio: reported },
    );

  publish({ phase: "loading", ratio: 0 });
  let buffers: ArrayBuffer[];
  try {
    buffers = await Promise.all(
      entries.map(async (entry, index) => {
        const buffer = await fetchBytes(entry, fetcher, signal, (count) => {
          counted[index] = Math.min(count, entry.bytes);
          report();
        });
        counted[index] = entry.bytes;
        report();
        return buffer;
      }),
    );
  } catch (error) {
    fail();
    throw error;
  }
  report();

  // Experiences may abort between steps (throwIfAborted), outside any step() call.
  const onAbort = () => {
    if (reported < 1) fail();
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  const byUrl = new Map(
    entries.map((entry, index) => [entry.url, buffers[index]!]),
  );
  const bytes = (url: string) => {
    const buffer = byUrl.get(url);
    if (!buffer) throw new Error(`asset not in this load: ${url}`);
    return buffer;
  };

  return {
    bytes,
    json: (url) => parseJson(bytes(url)),
    image: (url, imageOptions) => decodeImage(url, bytes(url), imageOptions),
    async step(work) {
      let result;
      try {
        result = typeof work === "function" ? await work() : await work;
      } catch (error) {
        fail();
        throw error;
      }
      stepsDone = Math.min(steps, stepsDone + 1);
      report();
      if (reported >= 1) signal?.removeEventListener("abort", onAbort);
      return result;
    },
  };
}

function experienceManifest(name: ExperienceName, manifest: AssetManifest) {
  const entry = manifest.experiences[name];
  if (!entry)
    throw new Error(`experience missing from asset manifest: ${name}`);
  return entry;
}

/** Loads an experience's essential assets; call from `Experience.load`. */
export function loadEssentials(
  name: ExperienceName,
  options: LoadOptions = {},
  manifest: AssetManifest = assetManifest,
): Promise<LoadedAssets> {
  return loadEntries(experienceManifest(name, manifest).essential, options);
}

export interface DeferredAssets {
  get(url: string): Promise<ArrayBuffer>;
  json<T = unknown>(url: string): Promise<T>;
  image(url: string, options?: ImageBitmapOptions): Promise<ImageBitmap>;
}

/** Starts fetching secondary assets; call after the first frame. Never touches the loader bar. */
export function loadDeferred(
  entries: readonly AssetEntry[],
  options: Pick<LoadOptions, "fetch" | "signal"> = {},
): DeferredAssets {
  const fetcher = options.fetch ?? ((url, init) => fetch(url, init));
  const pending = new Map(
    entries.map((entry) => {
      const promise = fetchBytes(entry, fetcher, options.signal, () => {});
      promise.catch(() => {});
      return [entry.url, promise] as const;
    }),
  );
  const get = (url: string) =>
    pending.get(url) ??
    Promise.reject(new Error(`asset not in this load: ${url}`));

  return {
    get,
    json: async (url) => parseJson(await get(url)),
    image: async (url, imageOptions) =>
      decodeImage(url, await get(url), imageOptions),
  };
}

export function loadDeferredFor(
  name: ExperienceName,
  options: Pick<LoadOptions, "fetch" | "signal"> = {},
  manifest: AssetManifest = assetManifest,
): DeferredAssets {
  return loadDeferred(experienceManifest(name, manifest).deferred, options);
}

/** Streamed tracks with their AAC segments, for the audio module. */
export function streamedTracks(
  name: ExperienceName,
  manifest: AssetManifest = assetManifest,
): StreamedEntry[] {
  return experienceManifest(name, manifest).streamed;
}
