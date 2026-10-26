import { describe, expect, it } from "bun:test";
import {
  BEAT_DURATION,
  BULB_COUNT,
  CAGE_COUNT,
  CAGE_HIDDEN,
  PALETTE,
  createChoreography,
  legacyBin,
  pickColour,
  type Choreography,
} from "../../../app/experiences/discomania/choreography";

const FRAME = 1 / 60;
const silence = () => 0;

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Plays frames until `beats` beat events have fired; returns the lit cage list after each beat number. */
function playBeats(choreography: Choreography, beats: number, from = 0) {
  const litAfterBeat = new Map<number, number[]>();
  let time = from;
  while (choreography.beat <= beats) {
    time += FRAME;
    const before = choreography.beat;
    choreography.step({
      time,
      orbitTime: time / 5,
      kick: false,
      spectrum: silence,
    });
    if (choreography.beat !== before)
      litAfterBeat.set(before, [...choreography.cages.litOrder]);
  }
  return { litAfterBeat, time };
}

describe("cage schedule", () => {
  it("should light one more cage, in creation order, on legacy beat 17 and every other beat up to 47", () => {
    const { litAfterBeat } = playBeats(createChoreography(seeded()), 50);
    const firstLit = [];
    for (let beat = 1; beat <= 50; beat++) {
      const lit = litAfterBeat.get(beat)!;
      const previous = litAfterBeat.get(beat - 1) ?? [];
      if (lit.length > previous.length) firstLit.push([beat, lit.at(-1)]);
    }
    expect(firstLit).toEqual(
      Array.from({ length: 16 }, (_, n) => [17 + 2 * n, n]),
    );
  });

  it("should show a newly lit cage at full scale when its beat fires", () => {
    const choreography = createChoreography(seeded());
    playBeats(choreography, 17);
    expect(choreography.cages.scale[0]).toBe(1);
  });

  it("should fire beats every 60/98 s of track time when the track plays", () => {
    const { time } = playBeats(createChoreography(seeded()), 16);
    expect(Math.abs(time - 16 * BEAT_DURATION)).toBeLessThan(FRAME * 1.01);
  });
});

describe("kicks", () => {
  it("should keep every bulb colour when no kick occurs across frames (AE6)", () => {
    const choreography = createChoreography(seeded());
    choreography.step({
      time: 0.1,
      orbitTime: 0,
      kick: true,
      spectrum: () => 128,
    });
    const colours = [...choreography.bulbs.color];
    let time = 0.1;
    for (let frame = 0; frame < 600; frame++) {
      time += FRAME;
      choreography.step({
        time,
        orbitTime: time / 5,
        kick: false,
        spectrum: () => 200,
      });
    }
    expect([...choreography.bulbs.color]).toEqual(colours);
  });

  it("should give every bulb a palette colour when a kick occurs", () => {
    const choreography = createChoreography(seeded(7));
    choreography.step({
      time: 0.1,
      orbitTime: 0,
      kick: true,
      spectrum: silence,
    });
    expect(
      [...choreography.bulbs.color].every((c) => PALETTE.includes(c)),
    ).toBe(true);
  });

  it("should toggle every cage between full and hidden scale when a kick occurs", () => {
    const choreography = createChoreography(seeded());
    choreography.step({
      time: 0.1,
      orbitTime: 0,
      kick: true,
      spectrum: silence,
    });
    const afterOne = [...choreography.cages.scale];
    choreography.step({
      time: 0.12,
      orbitTime: 0,
      kick: true,
      spectrum: silence,
    });
    expect([
      afterOne.every((s) => s === 1),
      [...choreography.cages.scale].every((s) => s === CAGE_HIDDEN),
    ]).toEqual([true, true]);
  });
});

describe("pickColour", () => {
  it("should return a palette colour when the random draw is at either bound", () => {
    expect([pickColour(() => 0), pickColour(() => 0.999999999)]).toEqual([
      PALETTE[0]!,
      PALETTE[PALETTE.length - 1]!,
    ]);
  });

  it("should return a palette colour for every random draw", () => {
    const random = seeded(42);
    const picks = Array.from({ length: 10000 }, () => pickColour(random));
    expect(picks.every((c) => PALETTE.includes(c))).toBe(true);
  });
});

describe("track loop", () => {
  it("should restart the choreography from beat 0 when the track playhead jumps back", () => {
    const choreography = createChoreography(seeded());
    const { time } = playBeats(choreography, 30);
    choreography.step({
      time: 0.01,
      orbitTime: time / 5,
      kick: false,
      spectrum: silence,
    });
    expect([choreography.beat, choreography.cages.litOrder.length]).toEqual([
      1, 0,
    ]);
  });

  it("should replay the cage schedule without errors when the track has looped", () => {
    const choreography = createChoreography(seeded());
    playBeats(choreography, 30);
    choreography.step({
      time: 0.01,
      orbitTime: 0,
      kick: false,
      spectrum: silence,
    });
    const { litAfterBeat } = playBeats(choreography, 19, 0.01);
    expect([
      litAfterBeat.get(16),
      litAfterBeat.get(17),
      litAfterBeat.get(19),
    ]).toEqual([[], [0], [0, 1]]);
  });

  it("should hide every cage again when the track has looped", () => {
    const choreography = createChoreography(seeded());
    playBeats(choreography, 30);
    choreography.step({
      time: 0.01,
      orbitTime: 0,
      kick: false,
      spectrum: silence,
    });
    expect(choreography.cages.scale.every((s) => s === CAGE_HIDDEN)).toBe(true);
  });
});

describe("bulb orbit", () => {
  it("should scale a bulb's orbit radius with its legacy spectrum bin when a beat fires", () => {
    const choreography = createChoreography(seeded());
    choreography.step({
      time: BEAT_DURATION + 0.001,
      orbitTime: 0,
      kick: false,
      spectrum: () => 255,
    });
    const radius = Math.hypot(
      choreography.bulbs.x[0]!,
      choreography.bulbs.z[0]!,
    );
    expect(radius).toBeCloseTo(12.5, 5);
  });

  it("should read a flat 2048-point spectrum 6 dB higher in the legacy 512-point bin, as four bins' power", () => {
    const spectrum = new Uint8Array(1024).fill(100);
    expect(legacyBin(spectrum, 5, 2048)).toBeCloseTo(
      100 + ((10 * Math.log10(4)) / 70) * 255,
      5,
    );
  });

  it("should read a silent spectrum as a silent legacy bin", () => {
    expect(legacyBin(new Uint8Array(1024), 5, 2048)).toBe(0);
  });

  it("should read a 512-point spectrum as is", () => {
    const spectrum = new Uint8Array(256);
    spectrum[3] = 42;
    expect(legacyBin(spectrum, 3, 512)).toBe(42);
  });

  it("should create one orbit slot per bulb and one cage per legacy morph", () => {
    const choreography = createChoreography(seeded());
    expect([
      choreography.bulbs.x.length,
      choreography.cages.scale.length,
    ]).toEqual([BULB_COUNT, CAGE_COUNT]);
  });
});
