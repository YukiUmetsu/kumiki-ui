/** Dedicated browser/visual checks against actual Storybook story renders.
 * Intentionally separate from the Vite-preview e2e suite in playwright.config.ts.
 */
import { defineConfig, devices } from "@playwright/test";

const HOST = "127.0.0.1", PORT = 6006;
export default defineConfig({
  testDir: "./tests/e2e-storybook",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: [["list"]],
  expect: { timeout: 120_000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    viewport: { width: 1600, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run storybook -- --host ${HOST} --ci`,
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
