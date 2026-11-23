import {defineConfig,devices} from "@playwright/test";

/** Isolated SSR-native ArtCraft proof; no Storybook or app server needed. */
export default defineConfig({
  testDir:"./tests/e2e-artcraft",
  fullyParallel:false,
  workers:1,
  retries:0,
  timeout:60_000,
  // A coding agent needs the failures, not a line for each pass. Both reporters print failures in full.
  reporter: [[process.env.AI_AGENT || process.env.CLAUDECODE ? "dot" : "list"]],
  use:{viewport:{width:960,height:540},deviceScaleFactor:1,
    trace:"retain-on-failure",...devices["Desktop Chrome"]},
  projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}],
});
