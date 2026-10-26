import { expect, test, type Page } from "@playwright/test";

// Needs a build with NUXT_PUBLIC_E2E=1 so the /__e2e/dispose fixture page is generated.

interface MemoryCounts {
  geometries: number;
  textures: number;
  programs: number;
}

interface RendererState {
  clearColor: number;
  clearAlpha: number;
  toneMapping: number;
  exposure: number;
}

interface E2EApi {
  memory(): MemoryCounts;
  state(): string;
  rendererState(): RendererState;
  probe: { uniformTextureDisposed: boolean };
  mount(variant: "scene" | "failing"): Promise<void>;
  unmount(): Promise<void>;
}

declare global {
  interface Window {
    __e2e?: E2EApi;
  }
}

const api = (page: Page) =>
  page.waitForFunction(() => window.__e2e !== undefined);

async function mountScene(page: Page) {
  await page.evaluate(() => window.__e2e!.mount("scene"));
  await page.waitForFunction(() => window.__e2e!.state() === "running");
}

test.describe("experience dispose", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/__e2e/dispose");
    await api(page);
  });

  test("should allocate GPU resources when the stub experience runs", async ({
    page,
  }) => {
    const baseline = await page.evaluate(() => window.__e2e!.memory());
    await mountScene(page);
    const running = await page.evaluate(() => window.__e2e!.memory());
    expect(running.textures).toBeGreaterThan(baseline.textures);
  });

  test("should leave geometry, texture and program counts at their pre-mount values when the experience is disposed", async ({
    page,
  }) => {
    // The first physically based render uploads three's shared DFG LUT once for the renderer's lifetime; warm it up before taking the baseline.
    await mountScene(page);
    await page.evaluate(() => window.__e2e!.unmount());
    const baseline = await page.evaluate(() => window.__e2e!.memory());
    for (let i = 0; i < 3; i++) {
      await mountScene(page);
      await page.evaluate(() => window.__e2e!.unmount());
    }
    const after = await page.evaluate(() => window.__e2e!.memory());
    expect(after).toEqual(baseline);
  });

  test("should dispose a texture referenced only through a shader uniform when the experience is disposed", async ({
    page,
  }) => {
    await mountScene(page);
    await page.evaluate(() => window.__e2e!.unmount());
    const disposed = await page.evaluate(
      () => window.__e2e!.probe.uniformTextureDisposed,
    );
    expect(disposed).toBe(true);
  });

  test("should restore the host clear colour and tone mapping when an experience that changed them is disposed", async ({
    page,
  }) => {
    const defaults = await page.evaluate(() => window.__e2e!.rendererState());
    await mountScene(page);
    await page.evaluate(() => window.__e2e!.unmount());
    const after = await page.evaluate(() => window.__e2e!.rendererState());
    expect(after).toEqual(defaults);
  });

  test("should keep the page text and show the fallback when the experience fails to load", async ({
    page,
  }) => {
    await page.evaluate(() => window.__e2e!.mount("failing"));
    await expect(
      page.getByText("This experience could not start."),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "dispose fixture" }),
    ).toBeVisible();
  });
});
