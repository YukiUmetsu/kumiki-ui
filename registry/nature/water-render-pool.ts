/** WATER1's render pool: rendered in module workers (see `../anatomy/foundation-render.ts`). */
import type { RenderPool } from "../anatomy/foundation-render";

export const WATER_RENDER_POOL: RenderPool = {
  id: "water",
  worker: () => new Worker(new URL("./water-render-worker.ts", import.meta.url), { type: "module" }),
  runners: () => import("./water-render-jobs").then(m => m.WATER_RUNNERS),
};
