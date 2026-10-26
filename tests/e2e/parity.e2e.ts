import { expect, test } from "@playwright/test";

// Reference images are captured from the live site (www.remydumas.fr) with:
//   PARITY_BASE=https://www.remydumas.fr bunx playwright test tests/e2e/parity.e2e.ts --project=desktop --update-snapshots
// and every later run compares the local build against them. Only deterministic states belong here.
const base = process.env.PARITY_BASE ?? "";

test.use({ viewport: { width: 1440, height: 900 } });
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "references are desktop captures");
});

test("should render attract like the live site when the pointer rests at the centre", async ({ page }) => {
  await page.goto(`${base}/attract`);
  await page.waitForTimeout(3000);
  await page.mouse.move(720, 450);
  await page.waitForTimeout(2500);
  await expect(page).toHaveScreenshot("attract.png", { maxDiffPixelRatio: 0.01 });
});

test("should render illuminate like the live site before any click", async ({ page }) => {
  await page.goto(`${base}/illuminate`);
  await page.waitForTimeout(3500);
  await page.mouse.move(1300, 120);
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot("illuminate-idle.png", { maxDiffPixelRatio: 0.01 });
});

// Dropped lights land at random places, and the live site draws its randoms in another order, so this lit state
// cannot match a live capture pixel for pixel. Its reference is a local capture, with Math.random seeded, that was
// checked by eye against the live site (same tint, falloff and bulb size); it guards the light rendering itself.
test("should keep rendering illuminate's dropped lights the same way", async ({ page }) => {
  test.skip(base !== "", "the reference is a local capture");
  await page.addInitScript(() => {
    let state = 7;
    Math.random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  });
  await page.goto("/illuminate");
  await page.waitForTimeout(3500);
  await page.mouse.click(720, 450);
  await page.waitForTimeout(8000);
  await page.mouse.move(1300, 120);
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot("illuminate-lit.png", { maxDiffPixelRatio: 0.01 });
});
