import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const HOST = "127.0.0.1";

/**
 * Browser-level verification for the showcase app: real layout, real computed
 * styles, real focus/scroll behaviour and an axe-core audit that jsdom cannot
 * provide (colour contrast in particular).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [["list"]],
  expect: {
    // Keep screenshot diffing deterministic across minor rasterisation noise.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" },
  },
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npx vite preview --host ${HOST} --port ${PORT} --strictPort`,
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
  },
});
