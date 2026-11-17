/** MAKEUP1's render pool: portraits wearing a plan, rendered in module workers (see `foundation-render.ts`). */
import type { RenderPool } from "./foundation-render";

export const MAKEUP_RENDER_POOL: RenderPool = {
  id: "makeup",
  worker: () => new Worker(new URL("./makeup-render-worker.ts", import.meta.url), { type: "module" }),
  runners: () => import("./makeup-render-jobs").then(m => m.MAKEUP_RUNNERS),
};
