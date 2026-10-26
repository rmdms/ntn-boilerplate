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
