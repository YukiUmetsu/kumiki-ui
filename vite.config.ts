import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    projects: [{
      extends: true,
      test: {
        name: "unit",
        environment: "jsdom",
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
