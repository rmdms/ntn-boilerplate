export interface KickDetectorOptions {
  /** Low band watched for kicks, in Hz. */
  lowHz?: number;
  highHz?: number;
  /** Seconds after a kick during which no other kick fires. */
  refractory?: number;
  /** Time constant, in seconds, of the adaptive average the band energy is compared to. */
  averageTime?: number;
  /** Band energy must exceed the average by this factor... */
  ratio?: number;
  /** ...and by this many byte-spectrum units. */
  margin?: number;
}

export interface KickDetector {
  /** Feeds one frame of byte frequency data; returns true on the frame a kick starts. */
  update(spectrum: Uint8Array, binHz: number, dt: number): boolean;
  reset(): void;
}

export function createKickDetector(
  options: KickDetectorOptions = {},
): KickDetector {
  const {
    lowHz = 40,
    highHz = 150,
    refractory = 0.3,
    averageTime = 0.5,
    ratio = 1.3,
    margin = 20,
  } = options;

  let average = 0;
  let previous = 0;
  let sinceKick = Infinity;

  return {
    update(spectrum, binHz, dt) {
      const first = Math.max(0, Math.floor(lowHz / binHz));
      const last = Math.min(spectrum.length - 1, Math.ceil(highHz / binHz));
      let sum = 0;
      for (let i = first; i <= last; i++) sum += spectrum[i]!;
      const energy = last >= first ? sum / (last - first + 1) : 0;

      sinceKick += dt;
      const kick =
        sinceKick >= refractory &&
        energy > previous &&
        energy > average * ratio &&
        energy - average > margin;
      if (kick) sinceKick = 0;

      average += (energy - average) * (1 - Math.exp(-dt / averageTime));
      previous = energy;
      return kick;
    },
    reset() {
      average = 0;
      previous = 0;
      sinceKick = Infinity;
    },
  };
}
