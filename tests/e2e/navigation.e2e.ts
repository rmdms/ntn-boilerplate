import { expect, test } from '@playwright/test'

test('should navigate between pages without a full reload', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => ((window as unknown as { __marker: boolean }).__marker = true))
  await page.getByRole('link', { name: 'flower' }).click()
  await expect(page).toHaveURL(/\/flower$/)
  const marker = await page.evaluate(() => (window as unknown as { __marker?: boolean }).__marker)
  expect(marker).toBe(true)
})

test('should render the error page for an unknown URL', async ({ page }) => {
  await page.goto('/does-not-exist')
  await expect(page.getByText('Page not found')).toBeVisible()
})
