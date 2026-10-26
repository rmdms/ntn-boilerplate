import { DataTexture, RedFormat, UnsignedByteType } from "three";
import type { ExperienceName } from "../assets";
import { streamedTracks } from "./asset-loader";

/** Play button state: "idle" shows Play, "loading" shows Loading until the first audible frame. */
export type PlayStatus = "idle" | "loading" | "playing";

/** "element" streams through the media element; "segments" is the decoded-segment fallback. */
export type PlaybackMode = "element" | "segments";

export interface AudioSessionLike {
  type: string;
}

/** Browser dependencies, injectable so tests run without Web Audio. */
export interface AudioEnvironment {
  createContext(): AudioContext;
  createElement(url: string): HTMLAudioElement;
  fetch(url: string): Promise<ArrayBuffer>;
  audioSession(): AudioSessionLike | undefined;
  log(message: string): void;
}

export interface AudioTrackOptions {
  url: string;
  segments: readonly string[];
  /** At most 2048. */
  fftSize?: number;
  smoothing?: number;
}

export interface AudioTrack {
  readonly status: PlayStatus;
  readonly mode: PlaybackMode;
  /** frequencyBinCount × 1 red-channel texture, refreshed by `update`. */
  readonly texture: DataTexture;
  /** Byte frequency data read on the last `update`. */
  readonly frequencyData: Uint8Array;
  /** Width of one frequency bin in Hz. */
  readonly binHz: number;
  /** Playback position within the track, in seconds. */
  readonly time: number;
  subscribe(listener: (status: PlayStatus) => void): () => void;
  /** Call synchronously from the play tap handler; resolves false when playback could not start. */
  play(): Promise<boolean>;
  /** Stops playback and releases the analyser. */
  stop(): void;
  /** Reads the analyser once; call once per frame from the experience's update. */
  update(dt: number): void;
  dispose(): void;
}

export interface AudioSystem {
  track(options: AudioTrackOptions): AudioTrack;
}

const ZERO_FALLBACK_SECONDS = 1;
const SEGMENTS_AHEAD = 2;
const SCHEDULE_LEAD = 0.05;

interface ElementEntry {
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode | null;
}

export function createAudioSystem(env: AudioEnvironment): AudioSystem {
  let context: AudioContext | null = null;
  const elements = new Map<string, ElementEntry>();

  const getContext = () => (context ??= env.createContext());

  const getElement = (url: string) => {
    let entry = elements.get(url);
    if (!entry) {
      const element = env.createElement(url);
      element.loop = true;
      element.preload = "auto";
      entry = { element, source: null };
      elements.set(url, entry);
    }
    return entry;
  };

  return {
    track(options) {
      const fftSize = Math.min(options.fftSize ?? 2048, 2048);
      const smoothing = options.smoothing ?? 0.8;
      const entry = getElement(options.url);
      const { element } = entry;
      const data = new Uint8Array(fftSize / 2);
      const texture = new DataTexture(
        data,
        data.length,
        1,
        RedFormat,
        UnsignedByteType,
      );
      texture.needsUpdate = true;
      const listeners = new Set<(status: PlayStatus) => void>();

      let status: PlayStatus = "idle";
      let mode: PlaybackMode = "element";
      let analyser: AnalyserNode | null = null;
      let disposed = false;
      let generation = 0;
      let zeroSeconds = 0;
      let lastElementTime = 0;

      let segmentSources: {
        node: AudioBufferSourceNode;
        at: number;
        offset: number;
      }[] = [];
      let nextIndex = 0;
      let nextStart = 0;
      let nextOffset = 0;
      let pumping = 0;

      const setStatus = (next: PlayStatus) => {
        if (next === status) return;
        status = next;
        for (const listener of listeners) listener(status);
      };

      const stopSegments = () => {
        for (const { node } of segmentSources) {
          node.onended = null;
          node.stop();
          node.disconnect();
        }
        segmentSources = [];
        nextIndex = 0;
        nextStart = 0;
        nextOffset = 0;
      };

      const release = () => {
        generation++;
        element.pause();
        element.currentTime = 0;
        stopSegments();
        entry.source?.disconnect();
        analyser?.disconnect();
        analyser = null;
        mode = "element";
        zeroSeconds = 0;
        lastElementTime = 0;
        data.fill(0);
        if (!disposed) texture.needsUpdate = true;
        setStatus("idle");
      };

      const pump = async (own: number) => {
        if (pumping === own) return;
        pumping = own;
        try {
          while (own === generation && segmentSources.length < SEGMENTS_AHEAD) {
            const index = nextIndex;
            nextIndex = (index + 1) % options.segments.length;
            const ctx = getContext();
            const buffer = await ctx.decodeAudioData(
              await env.fetch(options.segments[index]!),
            );
            if (own !== generation || !analyser) return;
            if (index === 0) nextOffset = 0;
            const node = ctx.createBufferSource();
            node.buffer = buffer;
            node.connect(analyser);
            const at = Math.max(nextStart, ctx.currentTime + SCHEDULE_LEAD);
            node.start(at);
            const scheduled = { node, at, offset: nextOffset };
            segmentSources.push(scheduled);
            nextStart = at + buffer.duration;
            nextOffset += buffer.duration;
            node.onended = () => {
              segmentSources = segmentSources.filter((s) => s !== scheduled);
              node.disconnect();
              void pump(own);
            };
          }
        } catch (error) {
          if (own !== generation) return;
          env.log(`[audio] segmented playback failed: ${String(error)}`);
          release();
        } finally {
          if (pumping === own) pumping = 0;
        }
      };

      const switchToSegments = () => {
        if (options.segments.length === 0) return;
        env.log(
          `[audio] analyser returned zeros for ${options.url}, switching to segmented playback`,
        );
        mode = "segments";
        element.pause();
        entry.source?.disconnect();
        void pump(generation);
      };

      const track: AudioTrack = {
        get status() {
          return status;
        },
        get mode() {
          return mode;
        },
        texture,
        frequencyData: data,
        get binHz() {
          return (context?.sampleRate ?? 48000) / fftSize;
        },
        get time() {
          if (mode === "element") return element.currentTime;
          const now = context?.currentTime ?? 0;
          let current: { at: number; offset: number } | undefined;
          for (const scheduled of segmentSources) {
            if (scheduled.at <= now) current = scheduled;
          }
          return current ? current.offset + now - current.at : 0;
        },
        subscribe(listener) {
          listeners.add(listener);
          listener(status);
          return () => listeners.delete(listener);
        },
        play() {
          if (disposed) return Promise.resolve(false);
          if (status !== "idle") return Promise.resolve(true);
          const own = ++generation;
          setStatus("loading");
          try {
            const session = env.audioSession();
            if (session) session.type = "playback";
            const ctx = getContext();
            const resumed = ctx.resume();
            entry.source ??= ctx.createMediaElementSource(element);
            analyser = ctx.createAnalyser();
            analyser.fftSize = fftSize;
            analyser.smoothingTimeConstant = smoothing;
            analyser.connect(ctx.destination);
            entry.source.connect(analyser);
            const started = element.play();
            return Promise.all([resumed, started]).then(
              () => {
                if (own !== generation) return false;
                setStatus("playing");
                return true;
              },
              (error: unknown) => {
                if (own !== generation) return false;
                env.log(`[audio] playback failed to start: ${String(error)}`);
                release();
                return false;
              },
            );
          } catch (error) {
            env.log(`[audio] playback failed to start: ${String(error)}`);
            release();
            return Promise.resolve(false);
          }
        },
        stop() {
          if (!disposed) release();
        },
        update(dt) {
          if (disposed || !analyser) return;
          analyser.getByteFrequencyData(data);
          texture.needsUpdate = true;
          if (mode !== "element" || status !== "playing") return;
          const advanced = element.currentTime > lastElementTime;
          lastElementTime = element.currentTime;
          if (!advanced || element.paused) return;
          zeroSeconds = data.every((value) => value === 0)
            ? zeroSeconds + dt
            : 0;
          if (zeroSeconds >= ZERO_FALLBACK_SECONDS) switchToSegments();
        },
        dispose() {
          if (disposed) return;
          release();
          disposed = true;
          listeners.clear();
          texture.dispose();
        },
      };
      return track;
    },
  };
}

function browserEnvironment(): AudioEnvironment {
  return {
    createContext: () => new AudioContext(),
    createElement: (url) => new Audio(url),
    fetch: async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return response.arrayBuffer();
    },
    audioSession: () =>
      (navigator as Navigator & { audioSession?: AudioSessionLike })
        .audioSession,
    log: (message) => console.info(message),
  };
}

let browserSystem: AudioSystem | null = null;

/** App-wide audio system: one AudioContext, one element and media source per track URL. */
export function audioSystem(): AudioSystem {
  return (browserSystem ??= createAudioSystem(browserEnvironment()));
}

/** Creates the audio track of an experience's first streamed asset. */
export function createExperienceAudio(
  name: ExperienceName,
  options: Omit<AudioTrackOptions, "url" | "segments"> = {},
): AudioTrack {
  const [streamed] = streamedTracks(name);
  if (!streamed) throw new Error(`experience has no streamed track: ${name}`);
  return audioSystem().track({
    ...options,
    url: streamed.url,
    segments: streamed.segments.map((segment) => segment.url),
  });
}
