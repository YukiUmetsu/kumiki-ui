/** MATL1's render pool: material swatches rendered in module workers (see `foundation-render.ts`). */
import type { RenderPool } from "../anatomy/foundation-render";

export const MATERIALS_RENDER_POOL: RenderPool = {
  id: "materials",
  worker: () => new Worker(new URL("./materials-render-worker.ts", import.meta.url), { type: "module" }),
  runners: () => import("./materials-render-jobs").then(m => m.MATERIALS_RUNNERS),
};
