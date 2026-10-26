import { describe, expect, it } from "bun:test";
import {
  createAudioSystem,
  type AudioEnvironment,
  type PlayStatus,
} from "../../app/experiences/core/audio";

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

class FakeNode {
  connections = new Set<FakeNode>();
  connect(target: FakeNode) {
    this.connections.add(target);
    return target;
  }
  disconnect() {
    this.connections.clear();
  }
}

class FakeAnalyser extends FakeNode {
  fftSize = 2048;
  smoothingTimeConstant = 0.8;
  level = 0;
  reads = 0;
  get frequencyBinCount() {
    return this.fftSize / 2;
  }
  getByteFrequencyData(array: Uint8Array) {
    this.reads++;
    array.fill(this.level);
  }
}

class FakeBufferSource extends FakeNode {
  buffer: { duration: number } | null = null;
  startedAt: number | null = null;
  stopped = false;
  onended: (() => void) | null = null;
  start(when: number) {
    this.startedAt = when;
  }
  stop() {
    this.stopped = true;
  }
}

class FakeContext {
  currentTime = 0;
  sampleRate = 48000;
  destination = new FakeNode();
  resumes = 0;
  analysers: FakeAnalyser[] = [];
  mediaSources: FakeNode[] = [];
  bufferSources: FakeBufferSource[] = [];
  decodes: Deferred<{ duration: number }>[] = [];
  resume() {
    this.resumes++;
    return Promise.resolve();
  }
  createAnalyser() {
    const analyser = new FakeAnalyser();
    this.analysers.push(analyser);
    return analyser;
  }
  createMediaElementSource() {
    const source = new FakeNode();
    this.mediaSources.push(source);
    return source;
  }
  createBufferSource() {
    const source = new FakeBufferSource();
    this.bufferSources.push(source);
    return source;
  }
  decodeAudioData() {
    const decode = deferred<{ duration: number }>();
    this.decodes.push(decode);
    return decode.promise;
  }
}

class FakeElement {
  paused = true;
  currentTime = 0;
  loop = false;
  preload = "";
  nextPlay: Deferred<void> | null = null;
  constructor(readonly src: string) {}
  play() {
    this.paused = false;
    return this.nextPlay ? this.nextPlay.promise : Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

function createHarness() {
  const contexts: FakeContext[] = [];
  const elements: FakeElement[] = [];
  const fetched: string[] = [];
  const logs: string[] = [];
  const session = { type: "auto" };
  const env: AudioEnvironment = {
    createContext: () => {
      const context = new FakeContext();
      contexts.push(context);
      return context as unknown as AudioContext;
    },
    createElement: (url) => {
      const element = new FakeElement(url);
      elements.push(element);
      return element as unknown as HTMLAudioElement;
    },
    fetch: async (url) => {
      fetched.push(url);
      return new ArrayBuffer(8);
    },
    audioSession: () => session,
    log: (message) => logs.push(message),
  };
  const system = createAudioSystem(env);
  const segments = Array.from(
    { length: 58 },
    (_, i) => `/audios/track/segment-${String(i).padStart(3, "0")}.m4a`,
  );
  const track = () =>
    system.track({ url: "/audios/track.m4a", segments, fftSize: 2048 });
  return { contexts, elements, fetched, logs, session, segments, track };
}

describe("audio track", () => {
  it("should report loading until playback starts, then playing", async () => {
    const { elements, track } = createHarness();
    const audio = track();
    const started = deferred<void>();
    elements[0]!.nextPlay = started;
    const statuses: PlayStatus[] = [];
    audio.subscribe((status) => statuses.push(status));

    const playing = audio.play();
    started.resolve();
    await playing;

    expect(statuses).toEqual(["idle", "loading", "playing"]);
  });

  it("should return the button to idle when the playback start rejects", async () => {
    const { elements, track } = createHarness();
    const audio = track();
    const started = deferred<void>();
    elements[0]!.nextPlay = started;

    const playing = audio.play();
    started.reject(new Error("NotAllowedError"));

    expect({ ok: await playing, status: audio.status }).toEqual({
      ok: false,
      status: "idle",
    });
  });

  it("should set the audio session to playback and resume the context when play is tapped", async () => {
    const { contexts, session, track } = createHarness();

    await track().play();

    expect({ session: session.type, resumes: contexts[0]!.resumes }).toEqual({
      session: "playback",
      resumes: 1,
    });
  });

  it("should reuse one context, element and media source when a track is visited twice", async () => {
    const { contexts, elements, track } = createHarness();
    const first = track();
    await first.play();
    first.dispose();
    await track().play();

    expect({
      contexts: contexts.length,
      elements: elements.length,
      mediaSources: contexts[0]!.mediaSources.length,
    }).toEqual({ contexts: 1, elements: 1, mediaSources: 1 });
  });

  it("should switch to segments after one second of analyser zeros and start sound once the first segment decodes", async () => {
    const { contexts, elements, fetched, logs, segments, track } =
      createHarness();
    const audio = track();
    await audio.play();
    const context = contexts[0]!;
    const element = elements[0]!;

    for (let frame = 0; frame < 62; frame++) {
      element.currentTime += 1 / 60;
      audio.update(1 / 60);
    }
    await flush();
    const startedBeforeDecode = context.bufferSources.length;
    context.decodes[0]!.resolve({ duration: 4 });
    await flush();
    const source = context.bufferSources[0]!;

    expect({
      mode: audio.mode,
      elementPaused: element.paused,
      startedBeforeDecode,
      firstStarted: source.startedAt !== null,
      throughAnalyser: source.connections.has(context.analysers[0] as FakeNode),
      fetched,
      logged: logs.length > 0,
    }).toEqual({
      mode: "segments",
      elementPaused: true,
      startedBeforeDecode: 0,
      firstStarted: true,
      throughAnalyser: true,
      fetched: [segments[0]!, segments[1]!],
      logged: true,
    });
  });

  it("should schedule the next segment back to back when it decodes", async () => {
    const { contexts, elements, track } = createHarness();
    const audio = track();
    await audio.play();
    const context = contexts[0]!;
    for (let frame = 0; frame < 62; frame++) {
      elements[0]!.currentTime += 1 / 60;
      audio.update(1 / 60);
    }
    await flush();
    context.decodes[0]!.resolve({ duration: 4 });
    await flush();
    context.decodes[1]!.resolve({ duration: 4 });
    await flush();
    const [first, second] = context.bufferSources;

    expect(second!.startedAt).toBe(first!.startedAt! + 4);
  });

  it("should keep streaming from the element when the analyser returns sound", async () => {
    const { contexts, elements, track } = createHarness();
    const audio = track();
    await audio.play();
    contexts[0]!.analysers[0]!.level = 90;

    for (let frame = 0; frame < 120; frame++) {
      elements[0]!.currentTime += 1 / 60;
      audio.update(1 / 60);
    }

    expect(audio.mode).toBe("element");
  });

  it("should stop playback and skip texture updates when the page is left while playing", async () => {
    const { contexts, elements, track } = createHarness();
    const audio = track();
    await audio.play();
    const analyser = contexts[0]!.analysers[0]!;
    analyser.level = 90;
    audio.update(1 / 60);
    audio.dispose();
    const reads = analyser.reads;
    const version = audio.texture.version;

    audio.update(1 / 60);

    expect({
      paused: elements[0]!.paused,
      reads: analyser.reads - reads,
      version: audio.texture.version - version,
    }).toEqual({ paused: true, reads: 0, version: 0 });
  });

  it("should expose the frequency data read on update", async () => {
    const { contexts, track } = createHarness();
    const audio = track();
    await audio.play();
    contexts[0]!.analysers[0]!.level = 77;

    audio.update(1 / 60);

    expect([audio.frequencyData.length, audio.frequencyData[10]]).toEqual([
      1024, 77,
    ]);
  });
});
