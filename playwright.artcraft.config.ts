import {defineConfig,devices} from "@playwright/test";

/** Isolated SSR-native ArtCraft proof; no Storybook or app server needed. */
export default defineConfig({
  testDir:"./tests/e2e-artcraft",
  fullyParallel:false,
  workers:1,
  retries:0,
  timeout:60_000,
  reporter:[["list"]],
  use:{viewport:{width:960,height:540},deviceScaleFactor:1,
    trace:"retain-on-failure",...devices["Desktop Chrome"]},
  projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}],
});
