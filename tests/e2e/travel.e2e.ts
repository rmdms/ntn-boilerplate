import { expect, test, type Page } from "@playwright/test";

const firstImage = (page: Page) =>
  page.locator(".section_pictures img").first();

const imageTransform = (page: Page) =>
  firstImage(page).evaluate((img) => getComputedStyle(img).transform);

// Waits for hydration, then for the mount fade-in to finish.
async function openMountedTravelPage(page: Page) {
  await page.goto("/croatia", { waitUntil: "networkidle" });
  await expect
    .poll(() =>
      page.locator("#main").evaluate((main) => getComputedStyle(main).opacity),
    )
    .toBe("1");
}

test.describe("travel page on a touch device", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "touch behavior only");
  });

  test("should scroll the page natively when the finger drags", async ({
    page,
  }) => {
    await openMountedTravelPage(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.synthesizeScrollGesture", {
      x: 200,
      y: 600,
      yDistance: -600,
      gestureSourceType: "touch",
      speed: 2000,
    });
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0);
  });

  test("should not move the images when a wheel event arrives", async ({
    page,
  }) => {
    await openMountedTravelPage(page);
    await page.mouse.move(200, 400);
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(600);
    expect(await imageTransform(page)).toBe("none");
  });
});

test.describe("travel page with a fine pointer", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "wheel behavior only");
  });

  test("should keep every photo moving together when a trackpad sends a wheel event every frame", async ({
    page,
  }) => {
    await openMountedTravelPage(page);
    // A 120 Hz trackpad: one small wheel event every 8 ms. The live site's spread stays near 23 px.
    const spread = await page.evaluate(async () => {
      const images = [...document.querySelectorAll(".section_pictures img")];
      const y = (image: Element) => new DOMMatrix(getComputedStyle(image).transform).f;
      let widest = 0;
      let count = 0;
      await new Promise<void>((done) => {
        const id = setInterval(() => {
          window.dispatchEvent(new WheelEvent("wheel", { deltaY: 12 }));
          const ys = images.map(y);
          widest = Math.max(widest, Math.max(...ys) - Math.min(...ys));
          if (++count >= 90) {
            clearInterval(id);
            done();
          }
        }, 8);
      });
      return widest;
    });
    expect(spread).toBeLessThan(30);
  });

  test("should move the images instead of the page when the wheel turns", async ({
    page,
  }) => {
    await openMountedTravelPage(page);
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, 240);
    await expect.poll(() => imageTransform(page)).not.toBe("none");
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test("should serve travel images as AVIF or WebP from /_ipx/", async ({
  page,
}) => {
  await openMountedTravelPage(page);
  const image = firstImage(page);
  await expect
    .poll(() =>
      image.evaluate(
        (img) =>
          (img as HTMLImageElement).complete &&
          (img as HTMLImageElement).naturalWidth > 0,
      ),
    )
    .toBe(true);
  const src = await image.evaluate(
    (img) => (img as HTMLImageElement).currentSrc,
  );
  expect(new URL(src).pathname).toMatch(/^\/_ipx\//);

  const body = await (await page.request.get(src)).body();
  const isAvif = body.subarray(4, 12).toString("latin1") === "ftypavif";
  const isWebp =
    body.subarray(0, 4).toString("latin1") === "RIFF" &&
    body.subarray(8, 12).toString("latin1") === "WEBP";
  expect(isAvif || isWebp).toBe(true);
});

test("should only fetch the photos near the screen when the page opens", async ({
  page,
}, testInfo) => {
  // On the touch project the whole gallery sits within Chrome's own lazy-load distance, so every photo loads.
  test.skip(testInfo.project.name !== "desktop", "wheel-driven gallery only");
  const fetched = new Set<string>();
  page.on("request", (request) => {
    if (/\/_ipx\/.*croatia_\d+\.jpg/.test(request.url())) fetched.add(request.url());
  });
  await openMountedTravelPage(page);
  await page.waitForTimeout(1000);
  const total = await page.locator(".section_pictures img").count();
  expect(fetched.size).toBeLessThan(total);
});
