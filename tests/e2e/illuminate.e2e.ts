import { expect, test, type Page } from "@playwright/test";

interface IlluminateProbe {
  experience?: {
    lights(): number;
    shaded(): number;
    glows(): number;
    textureVersion(): number;
    programs(): number;
    drop(): { x: number; y: number };
    resetting(): boolean;
    levels: number;
    setQuality(level: number): void;
  } | null;
}

declare global {
  interface Window {
    __illuminateProbe?: IlluminateProbe;
  }
}

type Kind = "mouse" | "touch";
type Point = [number, number];

const probe = <T>(
  page: Page,
  read: (p: NonNullable<IlluminateProbe["experience"]>) => T,
) =>
  page.evaluate(
    `(${read.toString()})(window.__illuminateProbe.experience)`,
  ) as Promise<T>;

function frames(page: Page, count = 3) {
  return page.evaluate(
    (n) =>
      new Promise<void>((resolve) => {
        let i = 0;
        const tick = () => (++i >= n ? resolve() : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
      }),
    count,
  );
}

// Synthetic pointer events with frames in between, so the input layer flushes down, move and up separately.
async function press(page: Page, kind: Kind, from: Point, to: Point = from) {
  const fire = (type: string, [x, y]: Point) =>
    page.evaluate(
      ({ type, x, y, kind }) =>
        window.dispatchEvent(
          new PointerEvent(type, {
            pointerType: kind,
            pointerId: 7,
            clientX: x,
            clientY: y,
            isPrimary: true,
          }),
        ),
      { type, x, y, kind },
    );
  await fire("pointerdown", from);
  await frames(page, 2);
  if (to !== from) {
    await fire("pointermove", to);
    await frames(page, 2);
  }
  await fire("pointerup", to);
  await frames(page, 2);
}

async function dropPoint(page: Page): Promise<Point> {
  const size = page.viewportSize()!;
  return [size.width / 2, size.height * 0.2];
}

async function setLevel(page: Page, level: "top" | number) {
  await page.evaluate((level) => {
    const experience = window.__illuminateProbe!.experience!;
    experience.setQuality(level === "top" ? experience.levels - 1 : level);
  }, level);
}

/** Clicks `count` times, pinning the level before each click so the governor cannot change the cap meanwhile. */
async function clickTimes(page: Page, count: number, level: "top" | number) {
  const point = await dropPoint(page);
  for (let i = 0; i < count; i++) {
    await setLevel(page, level);
    await press(page, "mouse", point);
  }
  await frames(page);
}

test.describe("illuminate", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__illuminateProbe = {};
    });
    await page.goto("/illuminate");
    await page.waitForFunction(() =>
      Boolean(window.__illuminateProbe?.experience),
    );
    await frames(page, 5);
  });

  test("should update the data texture and the light-count uniform without changing the program count when 300 lights are added", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const programs = await probe(page, (e) => e.programs());
    const version = await probe(page, (e) => e.textureVersion());
    await clickTimes(page, 30, "top");
    expect(await probe(page, (e) => e.lights())).toBe(300);
    expect(await probe(page, (e) => e.shaded())).toBe(256);
    expect(await probe(page, (e) => e.textureVersion())).toBeGreaterThan(
      version,
    );
    expect(await probe(page, (e) => e.programs())).toBe(programs);
  });

  test("should reach 400 lights with no shader recompile when clicking 40 times at the top level", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const programs = await probe(page, (e) => e.programs());
    await clickTimes(page, 40, "top");
    expect(await probe(page, (e) => e.lights())).toBe(400);
    expect(await probe(page, (e) => e.programs())).toBe(programs);
  });

  test("should trigger the gravity-flip reset instead of adding lights when a click would exceed the cap", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await clickTimes(page, 12, 0);
    expect(await probe(page, (e) => e.lights())).toBe(120);
    await clickTimes(page, 1, 0);
    // The reset clears lights after 500 ms, which slow frames may already have elapsed: assert no light was added, then the reset.
    expect(await probe(page, (e) => e.lights() <= 120 && (e.resetting() || e.lights() === 0))).toBe(true);
    await page.waitForFunction(
      () => window.__illuminateProbe!.experience!.lights() === 0,
    );
  });

  test("should give glow sprites to lights beyond the shaded maximum when the quality level is lowered", async ({
    page,
  }) => {
    await clickTimes(page, 10, "top");
    await setLevel(page, 0);
    await frames(page);
    expect(await probe(page, (e) => [e.shaded(), e.glows()])).toEqual([48, 52]);
  });

  test("should drop lights when a touch press moves 5 px", async ({ page }) => {
    const [x, y] = await dropPoint(page);
    await press(page, "touch", [x, y], [x + 5, y]);
    expect(await probe(page, (e) => e.lights())).toBe(10);
  });

  test("should only move the drop point when a touch press moves 30 px", async ({
    page,
  }) => {
    const [x, y] = await dropPoint(page);
    await press(page, "touch", [x, y]);
    const before = await probe(page, (e) => e.drop().x);
    await press(page, "touch", [x, y], [x + 30, y]);
    expect(await probe(page, (e) => e.lights())).toBe(10);
    expect(await probe(page, (e) => e.drop().x)).toBeGreaterThan(before);
  });
});
