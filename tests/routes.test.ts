import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Run after `bun run generate`; asserts every URL the live site serves is prerendered.
const outputDir = join(import.meta.dir, "..", ".output", "public");

export const ROUTES = [
  "/",
  "/attract",
  "/discomania",
  "/field",
  "/flower",
  "/illuminate",
  "/photography",
  "/croatia",
  "/netherlands",
  "/sweden",
  "/north_thailand",
  "/south_thailand",
];

describe("static generation", () => {
  for (const route of ROUTES) {
    it(`should prerender an HTML page for ${route}`, () => {
      const file =
        route === "/" ? "index.html" : join(route.slice(1), "index.html");
      expect(existsSync(join(outputDir, file))).toBe(true);
    });
  }
});
