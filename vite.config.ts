import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { setPriority } from 'node:os';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

/** On a laptop, tests stay out of the way: lower priority, and fewer workers. Measured on an M4 with 4 performance cores, 4 workers ran
 * the unit suite faster than one per core (47 s against 53 s) with 40% less memory (2.5 GB against 4.0 GB). CI keeps its defaults. */
const LOCAL = Boolean(process.env.VITEST) && !process.env.CI;
if (LOCAL) {
  // Workers inherit the lower priority, so the rest of the machine stays responsive while tests run.
  try { setPriority(10); } catch { /* Not every platform allows it; the tests still run. */ }
}

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    projects: [{
      extends: true,
      test: {
        name: "unit",
        environment: "jsdom",
        maxWorkers: LOCAL ? "40%" : undefined,
        setupFiles: ["./tests/setup.ts"],
        css: true,
        include: ["tests/**/*.test.{ts,tsx}"],
        // Playwright owns tests/e2e; vitest must never try to collect them.
        exclude: ["node_modules/**", "dist/**", "tests/e2e/**"]
      }
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        // Every story opens in headless Chromium, many with CPU-rendered WebGL. Two at a time is plenty on a laptop.
        maxWorkers: LOCAL ? 2 : undefined,
        // Software-rendered WebGL stories (3D heroes, House Math scenes) can take
        // 20–130 s on CPU-only runners; a 15 s limit fails them before they render.
        testTimeout: 240000,
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({
            launchOptions: process.env.KUMIKI_BROWSER_EXECUTABLE
              ? { executablePath: process.env.KUMIKI_BROWSER_EXECUTABLE } : {},
          }),
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});
