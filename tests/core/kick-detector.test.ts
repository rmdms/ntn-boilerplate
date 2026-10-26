import { describe, expect, it } from "bun:test";
import { createKickDetector } from "../../app/experiences/core/kick-detector";

const SAMPLE_RATE = 48000;
const FFT_SIZE = 2048;
const BIN_HZ = SAMPLE_RATE / FFT_SIZE;
const BINS = FFT_SIZE / 2;
const DT = 1 / 60;
const BEAT = 0.612;
const BURST = 0.1;

function bin(hz: number) {
  return Math.round(hz / BIN_HZ);
}

function spectrum(low: number, high: number) {
  const data = new Uint8Array(BINS);
  for (let i = bin(40); i <= bin(150); i++) data[i] = low;
  for (let i = bin(18000); i <= bin(22000); i++) data[i] = high;
  return data;
}

/** Runs the detector at 60 fps and returns the times (seconds) of detected kicks. */
function run(seconds: number, frame: (time: number) => Uint8Array) {
  const detector = createKickDetector();
  const kicks: number[] = [];
  const frames = Math.round(seconds / DT);
  for (let n = 0; n < frames; n++) {
    const time = n * DT;
    if (detector.update(frame(time), BIN_HZ, DT)) kicks.push(time);
  }
  return kicks;
}

describe("kick detector", () => {
  it("should fire one kick per low-band burst when bursts come every 612 ms (98 BPM)", () => {
    const kicks = run(10, (time) =>
      spectrum(time % BEAT < BURST ? 220 : 30, 0),
    );
    const bursts = Math.ceil(10 / BEAT);
    const beatsHit = new Set(kicks.map((time) => Math.floor(time / BEAT)));

    expect({ kicks: kicks.length, beatsHit: beatsHit.size }).toEqual({
      kicks: bursts,
      beatsHit: bursts,
    });
  });

  it("should fire no kick when only high frequencies pulse (AE6)", () => {
    const kicks = run(10, (time) =>
      spectrum(0, time % BEAT < BURST ? 255 : (time * 997) % 200),
    );

    expect(kicks).toEqual([]);
  });

  it("should fire one kick when two bursts fall within the refractory period", () => {
    const kicks = run(1, (time) =>
      spectrum(
        (time >= 0.1 && time < 0.15) || (time >= 0.25 && time < 0.3) ? 220 : 30,
        0,
      ),
    );

    expect(kicks.length).toBe(1);
  });

  it("should fire no repeated kicks when a loud low note is sustained", () => {
    const kicks = run(3, () => spectrum(200, 0));

    expect(kicks.length).toBe(1);
  });
});
