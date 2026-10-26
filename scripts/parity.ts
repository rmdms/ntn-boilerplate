// Captures the live site and a local build side by side, per experience, for visual parity checks.
// Usage: bun run scripts/parity.ts [experience] [--local http://localhost:3000] [--out .parity]
import { mkdirSync } from "node:fs";
import { chromium, type Page } from "playwright";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1]! : fallback;
};
const only = args.find((arg) => !arg.startsWith("--") && !args[args.indexOf(arg) - 1]?.startsWith("--"));
const sites = { live: "https://www.remydumas.fr", local: flag("--local", "http://localhost:3000") };
const out = flag("--out", ".parity");
const viewport = { width: 1440, height: 900 };

const scenarios: Record<string, (page: Page) => Promise<void>> = {
  index: async (page) => page.waitForTimeout(4000),
  illuminate: async (page) => {
    await page.waitForTimeout(3500);
    for (const x of [500, 720, 940]) {
      await page.mouse.move(x, 250);
      await page.mouse.click(x, 250);
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(4000);
  },
  field: async (page) => {
    await page.waitForTimeout(5000);
    await page.mouse.move(1000, 500);
    await page.waitForTimeout(3000);
  },
  attract: async (page) => {
    await page.waitForTimeout(3000);
    await page.mouse.move(720, 450);
    await page.waitForTimeout(2500);
  },
  photography: async (page) => page.waitForTimeout(5000),
  flower: async (page) => {
    await page.waitForTimeout(4000);
    await page.locator(".button__play").first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(9000);
  },
  discomania: async (page) => {
    await page.waitForTimeout(5000);
    await page.locator(".button__play").first().click({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(14000);
  },
};

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"],
});
for (const [name, scenario] of Object.entries(scenarios)) {
  if (only && only !== name) continue;
  for (const [site, base] of Object.entries(sites)) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/${name === "index" ? "" : name}`, { waitUntil: "load" });
    await scenario(page);
    await page.screenshot({ path: `${out}/${name}-${site}.png` });
    console.log(`${name} ${site}: ${out}/${name}-${site}.png${errors.length ? ` errors: ${errors.join(" | ")}` : ""}`);
    await context.close();
  }
}
await browser.close();
