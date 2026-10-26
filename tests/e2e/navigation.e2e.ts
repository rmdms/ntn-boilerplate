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

test('should reveal the page once the first load has hydrated', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => page.locator('#portfolio').evaluate((root) => getComputedStyle(root).opacity)).toBe('1')
})

test('should show the travel page when arriving from the photography slider', async ({ page }) => {
  await page.goto('/photography')
  await expect.poll(() => page.locator('main.section__works').evaluate((main) => getComputedStyle(main).opacity)).toBe('1')
  await page.locator('.slide .tt__title').first().click({ force: true })
  await expect(page).not.toHaveURL(/\/photography$/)
  await expect
    .poll(() => page.locator('#main').evaluate((main) => [getComputedStyle(main).opacity, getComputedStyle(main).visibility].join(' ')))
    .toBe('1 visible')
  expect(await page.locator('#portfolio').evaluate((root) => getComputedStyle(root).opacity)).toBe('1')
})

test('should show the home page when leaving the error page', async ({ page }) => {
  await page.goto('/does-not-exist')
  await page.getByText('Rémy Dumas').click()
  await expect(page).toHaveURL(/\/$/)
  await expect.poll(() => page.locator('#portfolio').evaluate((root) => getComputedStyle(root).opacity)).toBe('1')
})

test.describe('before the scripts run', () => {
  test.use({ javaScriptEnabled: false })

  test('should keep the prerendered page hidden so no element shows before its intro', async ({ page }) => {
    await page.goto('/')
    expect(await page.locator('#portfolio').evaluate((root) => getComputedStyle(root).opacity)).toBe('0')
  })
})
