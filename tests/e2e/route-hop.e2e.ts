import { expect, test } from "@playwright/test";

const EXPERIENCES = ["/illuminate", "/field", "/attract", "/flower", "/discomania", "/photography"];
const ROUNDS = 5;

// Covers AE1 in emulation: 30 in-site hops across every experience without a reload, a page error or JS heap growth.
test("should hop across every experience 30 times without reloading or growing memory", async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(() => ((window as unknown as { __marker: boolean }).__marker = true));

  const client = await page.context().newCDPSession(page);
  await client.send("Performance.enable");
  const heap = async () => {
    await client.send("HeapProfiler.collectGarbage");
    const { metrics } = await client.send("Performance.getMetrics");
    return metrics.find((metric) => metric.name === "JSHeapUsedSize")!.value;
  };

  const hop = async (route: string) => {
    await page.locator(`a[href="${route}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await page.waitForTimeout(800);
    await page.locator('a[href="/"]').first().click();
    await expect(page).toHaveURL(/\/$/);
    await page.waitForTimeout(400);
  };

  for (const route of EXPERIENCES) await hop(route);
  const baseline = await heap();
  for (let round = 1; round < ROUNDS; round++) for (const route of EXPERIENCES) await hop(route);
  const after = await heap();

  expect(await page.evaluate(() => (window as unknown as { __marker?: boolean }).__marker)).toBe(true);
  expect(errors).toEqual([]);
  expect(after).toBeLessThan(baseline * 1.5);
});
