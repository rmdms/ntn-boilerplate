import { expect, test } from "@playwright/test";
import { ROUTES } from "../routes";

test.describe("direct loads", () => {
  for (const route of ROUTES) {
    test(`should render ${route} when loaded directly`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator("main").first()).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});
