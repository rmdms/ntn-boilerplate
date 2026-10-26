import { describe, expect, it } from "bun:test";
import { experienceAssets } from "../../app/experiences/assets";

describe("experience assets", () => {
  it("should stream the live site's original mp3 tracks so the analysers see the same spectrum", () => {
    const tracks = [...experienceAssets.discomania.streamed, ...experienceAssets.flower.streamed];
    expect(tracks.every((url) => url.endsWith(".mp3"))).toBe(true);
  });
});
