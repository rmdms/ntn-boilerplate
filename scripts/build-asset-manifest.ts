import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { experienceAssets, type ExperienceAssetDecl } from "../app/experiences/assets";
import type {
  AssetEntry,
  AssetManifest,
  ExperienceManifest,
  StreamedEntry,
} from "../app/experiences/core/asset-loader";

function entry(publicDir: string, url: string): AssetEntry {
  const path = join(publicDir, url);
  if (!existsSync(path)) throw new Error(`declared asset not found in public/: ${url}`);
  return { url, bytes: statSync(path).size };
}

function streamed(publicDir: string, url: string): StreamedEntry {
  const dir = url.slice(0, -extname(url).length);
  const segmentDir = join(publicDir, dir);
  const segments = existsSync(segmentDir)
    ? readdirSync(segmentDir)
        .filter((name) => /^segment-\d+\.m4a$/.test(name))
        .sort()
        .map((name) => entry(publicDir, `${dir}/${name}`))
    : [];
  if (segments.length === 0) throw new Error(`no AAC segments for streamed track ${basename(url)}`);
  return { ...entry(publicDir, url), segments };
}

export function buildAssetManifest(
  publicDir: string,
  decls: Record<string, ExperienceAssetDecl>,
): AssetManifest {
  const experiences: Record<string, ExperienceManifest> = {};
  for (const [name, decl] of Object.entries(decls)) {
    experiences[name] = {
      essential: decl.essential.map((url) => entry(publicDir, url)),
      deferred: decl.deferred.map((url) => entry(publicDir, url)),
      streamed: decl.streamed.map((url) => streamed(publicDir, url)),
    };
  }
  return { experiences };
}

if (import.meta.main) {
  const root = join(import.meta.dir, "..");
  const manifest = buildAssetManifest(join(root, "public"), experienceAssets);
  const out = join(root, "app/experiences/asset-manifest.json");
  writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`asset manifest written: ${Object.keys(manifest.experiences).length} experiences`);
}
