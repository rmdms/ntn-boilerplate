import { expect, test, type Page } from "@playwright/test";

const slide = (page: Page, index: number) => page.locator(".slide").nth(index);

async function openPhotography(page: Page) {
  await page.goto("/photography");
  await expect
    .poll(() =>
      page
        .locator("main.section__works")
        .evaluate((main) => getComputedStyle(main).opacity),
    )
    .toBe("1");
}

// Wheel on a fine pointer, a real touch swipe on the touch project.
async function stepNext(page: Page, touch: boolean) {
  if (!touch) {
    await page.mouse.move(200, 100);
    await page.mouse.wheel(0, 100);
    return;
  }
  const cdp = await page.context().newCDPSession(page);
  const touchAt = (type: string, x: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y: 100 }],
    });
  await touchAt("touchStart", 300);
  for (const x of [280, 250, 220, 200]) await touchAt("touchMove", x);
  await touchAt("touchEnd", 200);
}

test("should be interactive with the centre trip only, and step to a trip once its slides arrive", async ({
  page,
}, testInfo) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(/north_thailand_slide_0\d\.jpg$/, async (route) => {
    await held;
    await route.continue();
  });

  await openPhotography(page);
  await expect(slide(page, 0)).toBeVisible();

  await stepNext(page, testInfo.project.name === "mobile");
  await page.waitForTimeout(1000);
  await expect(slide(page, 1)).toBeHidden();

  release();
  await expect(slide(page, 1)).toBeVisible();
  await expect(slide(page, 0)).toBeHidden({ timeout: 5000 });
});

test("should ignore a second step while the first transition runs", async ({
  page,
}, testInfo) => {
  await openPhotography(page);
  await page.waitForLoadState("networkidle");
  const touch = testInfo.project.name === "mobile";

  await stepNext(page, touch);
  await page.waitForTimeout(300);
  await stepNext(page, touch);

  await expect(slide(page, 0)).toBeHidden({ timeout: 5000 });
  await page.waitForTimeout(500);
  await expect(slide(page, 1)).toBeVisible();
  await expect(slide(page, 2)).toBeHidden();
});
