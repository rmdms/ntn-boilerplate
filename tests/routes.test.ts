import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROUTES } from "./routes";

// Run after `bun run generate`; asserts every URL the live site serves is prerendered.
const outputDir = join(import.meta.dir, "..", ".output", "public");


describe("static generation", () => {
  for (const route of ROUTES) {
    it(`should prerender an HTML page for ${route}`, () => {
      const file =
        route === "/" ? "index.html" : join(route.slice(1), "index.html");
      expect(existsSync(join(outputDir, file))).toBe(true);
    });
  }
});
