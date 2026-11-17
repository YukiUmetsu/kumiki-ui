/** ARCH1's render pool: storybook plates painted in module workers (see `foundation-render.ts`). */
import type { RenderPool } from "./foundation-render";

export const ARCH_RENDER_POOL: RenderPool = {
  id: "arch",
  worker: () => new Worker(new URL("./arch-paint-worker.ts", import.meta.url), { type: "module" }),
  runners: () => import("./arch-paint-jobs").then(m => m.ARCH_RUNNERS),
};
