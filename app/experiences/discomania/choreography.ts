/** Analyser FFT size; the legacy 512-point bins are rebuilt from it with `legacyBin`. */
export const FFT_SIZE = 2048;
export const LEGACY_FFT_SIZE = 512;

export const BPM = 98;
export const BEAT_DURATION = 60 / BPM;

export const BULB_COUNT = 20;
export const CAGE_COUNT = 50;
export const CAGE_HIDDEN = 0.01;

export const PLANET_RADIUS = 10;
const BULB_ORBIT = 5;
const BULB_SPECTRUM_GAIN = 2.5;
const BULB_SPIN = 10;
const GROUND_HALF = 170;

const FIRST_LIT_BEAT = 16;
const LAST_LIT_BEAT = 48;
/** Odd beats in [16, 48) each light one cage. */
export const MAX_LIT_CAGES = (LAST_LIT_BEAT - FIRST_LIT_BEAT) / 2;

// The playhead only moves backwards when the looping track restarts.
const LOOP_REWIND_S = 1;

export const PALETTE: readonly number[] = [
  0xf1c40f, 0xf10f0f, 0x95f10f, 0x0ff1b7, 0x0f9ff1, 0x5a0ff1, 0xe70ff1,
];

export const BULB_WHITE = 0xffffff;

export type Random = () => number;

/** Uniform over the palette; the legacy picker rounded past the end and returned undefined 3 times in 16. */
export function pickColour(random: Random = Math.random): number {
  const index = Math.min(
    PALETTE.length - 1,
    Math.floor(random() * PALETTE.length),
  );
  return PALETTE[Math.max(0, index)]!;
}

/** Byte level of the legacy 512-point bin `index`, averaged from the finer bins of an `fftSize` analyser. */
export function legacyBin(
  spectrum: Uint8Array,
  index: number,
  fftSize: number = FFT_SIZE,
): number {
  const span = Math.max(1, Math.round(fftSize / LEGACY_FFT_SIZE));
  const first = index * span;
  let sum = 0;
  for (let i = first; i < first + span; i++) sum += spectrum[i] ?? 0;
  return sum / span;
}

// Legacy random_interval: the +1 widens the range past max, kept for identical placement.
function legacyInterval(random: Random, min: number, max: number) {
  return random() * (max - min + 1) + min;
}

function legacyEither(random: Random, a: number, b: number) {
  return random() < 0.5 ? a : b;
}

export interface Bulbs {
  readonly phase: Float32Array;
  readonly x: Float32Array;
  readonly z: Float32Array;
  /** Hex colour per bulb light. */
  readonly color: number[];
}

export interface Cages {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly scale: Float64Array;
  /** Cages whose light is on, in the order they were lit. */
  readonly litOrder: number[];
}

export interface ChoreographyFrame {
  /** Track playhead in seconds. */
  time: number;
  /** Camera orbit angle (legacy TIME_current). */
  orbitTime: number;
  kick: boolean;
  /** Byte level of legacy bin i. */
  spectrum(index: number): number;
}

export interface Choreography {
  /** Number of the next beat; the legacy counter started at 1. */
  readonly beat: number;
  readonly bulbs: Bulbs;
  readonly cages: Cages;
  step(frame: ChoreographyFrame): void;
  reset(): void;
}

export function createChoreography(random: Random = Math.random): Choreography {
  const bulbs: Bulbs = {
    phase: new Float32Array(BULB_COUNT),
    x: new Float32Array(BULB_COUNT),
    z: new Float32Array(BULB_COUNT),
    color: new Array<number>(BULB_COUNT).fill(BULB_WHITE),
  };
  for (let i = 0; i < BULB_COUNT; i++)
    bulbs.phase[i] = legacyInterval(random, 0, Math.PI * 2);

  const cages: Cages = {
    x: new Float32Array(CAGE_COUNT),
    y: new Float32Array(CAGE_COUNT),
    z: new Float32Array(CAGE_COUNT),
    scale: new Float64Array(CAGE_COUNT).fill(CAGE_HIDDEN),
    litOrder: [],
  };
  const side = () =>
    legacyEither(
      random,
      legacyInterval(random, -GROUND_HALF / 3, -15),
      legacyInterval(random, 15, GROUND_HALF / 3),
    );
  for (let i = 0; i < CAGE_COUNT; i++) {
    cages.x[i] = side();
    cages.y[i] = legacyInterval(random, -10 + 2.5, 10 + 10 / 6);
    cages.z[i] = side();
  }

  let beat = 1;
  let beatTime = 0;
  let lastTime = 0;

  const orbit = (frame: ChoreographyFrame, sign: number) => {
    for (let i = 0; i < BULB_COUNT; i++) {
      const angle = frame.orbitTime * BULB_SPIN + bulbs.phase[i]!;
      const radius =
        BULB_ORBIT * (frame.spectrum(i) / 255) * BULB_SPECTRUM_GAIN;
      bulbs.x[i] = sign * Math.cos(angle) * radius;
      bulbs.z[i] = Math.sin(angle) * radius;
    }
  };

  const unlight = (cage: number) => {
    const at = cages.litOrder.indexOf(cage);
    if (at >= 0) cages.litOrder.splice(at, 1);
  };

  const onBeat = (frame: ChoreographyFrame) => {
    orbit(frame, 1);
    if (beat >= FIRST_LIT_BEAT && beat < LAST_LIT_BEAT) {
      if (beat % 2 !== 0) {
        const cage = (beat - FIRST_LIT_BEAT - 1) / 2;
        cages.scale[cage] = 1;
        if (!cages.litOrder.includes(cage)) cages.litOrder.push(cage);
      }
    } else if (beat === LAST_LIT_BEAT) {
      for (let i = FIRST_LIT_BEAT; i < CAGE_COUNT; i++) {
        cages.scale[i] = CAGE_HIDDEN;
        unlight(i);
      }
    }
    beat++;
  };

  const onKick = (frame: ChoreographyFrame) => {
    for (let i = 0; i < BULB_COUNT; i++) bulbs.color[i] = pickColour(random);
    orbit(frame, -1);
    for (let i = 0; i < CAGE_COUNT; i++)
      cages.scale[i] = cages.scale[i] === CAGE_HIDDEN ? 1 : CAGE_HIDDEN;
  };

  const reset = () => {
    beat = 1;
    beatTime = 0;
    lastTime = 0;
    bulbs.x.fill(0);
    bulbs.z.fill(0);
    bulbs.color.fill(BULB_WHITE);
    cages.scale.fill(CAGE_HIDDEN);
    cages.litOrder.length = 0;
  };

  return {
    get beat() {
      return beat;
    },
    bulbs,
    cages,
    step(frame) {
      if (frame.time < lastTime - LOOP_REWIND_S) reset();
      lastTime = frame.time;
      if (frame.kick) onKick(frame);
      if (frame.time > 0 && frame.time >= beatTime + BEAT_DURATION) {
        onBeat(frame);
        beatTime += BEAT_DURATION;
      }
    },
    reset,
  };
}
