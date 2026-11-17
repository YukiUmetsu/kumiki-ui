/** INTERIOR1's render pool: furniture and rooms painted in module workers (see `foundation-render.ts`). */
import type { RenderPool } from "./foundation-render";

export const FURN_RENDER_POOL: RenderPool = {
  id: "furn",
  worker: () => new Worker(new URL("./furn-paint-worker.ts", import.meta.url), { type: "module" }),
  runners: () => import("./furn-paint-jobs").then(m => m.FURN_RUNNERS),
};
