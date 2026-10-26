import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173',
    // Headless Chromium falls back to software WebGL; Metal keeps the light-heavy scenes at real frame rates on macOS.
    launchOptions: { args: process.platform === 'darwin' ? ['--use-angle=metal'] : [] }
  },
  webServer: {
    command: 'bunx serve .output/public -l 4173 --no-clipboard',
    url: 'http://localhost:4173',
    reuseExistingServer: true
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }
  ]
})
