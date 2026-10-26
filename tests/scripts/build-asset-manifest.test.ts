import { describe, expect, it } from "bun:test";
import { statSync } from "node:fs";
import { join } from "node:path";
import { experienceAssets } from "../../app/experiences/assets";
import committed from "../../app/experiences/asset-manifest.json";
import { buildAssetManifest } from "../../scripts/build-asset-manifest";

const publicDir = join(import.meta.dir, "../../public");
const manifest = buildAssetManifest(publicDir, experienceAssets);

function declaredUrls() {
  return Object.entries(experienceAssets).flatMap(([name, decl]) =>
    [...decl.essential, ...decl.deferred, ...decl.streamed].map((url) => `${name} ${url}`),
  );
}

function manifestUrls() {
  return Object.entries(manifest.experiences).flatMap(([name, entry]) =>
    [...entry.essential, ...entry.deferred, ...entry.streamed].map((asset) => `${name} ${asset.url}`),
  );
}

function allEntries() {
  return Object.values(manifest.experiences).flatMap((entry) => [
    ...entry.essential,
    ...entry.deferred,
    ...entry.streamed,
    ...entry.streamed.flatMap((track) => track.segments),
  ]);
}

describe("buildAssetManifest", () => {
  it("should list every declared file when built from the experience declarations", () => {
    expect(manifestUrls()).toEqual(declaredUrls());
  });

  it("should record on-disk byte sizes when listing files", () => {
    const mismatched = allEntries().filter(
      (asset) => statSync(join(publicDir, asset.url)).size !== asset.bytes,
    );
    expect(mismatched).toEqual([]);
  });

  it("should list the AAC segments when a streamed track is declared", () => {
    const tracks = Object.values(manifest.experiences).flatMap((entry) => entry.streamed);
    expect(tracks.every((track) => track.segments.length > 0)).toBe(true);
  });

  it("should throw when a declared file is missing", () => {
    expect(() =>
      buildAssetManifest(publicDir, {
        ghost: { essential: ["/images/missing.webp"], deferred: [], streamed: [] },
      }),
    ).toThrow("/images/missing.webp");
  });

  it("should match the committed manifest when the assets are unchanged", () => {
    expect(committed).toEqual(JSON.parse(JSON.stringify(manifest)));
  });
});
