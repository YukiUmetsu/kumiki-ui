/** GEO1's render pool: terrain rendered in module workers (see `../anatomy/foundation-render.ts`). */
import type { RenderPool } from "../anatomy/foundation-render";

export const GEO_RENDER_POOL: RenderPool = {
  id: "geo",
  worker: () => new Worker(new URL("./geo-render-worker.ts", import.meta.url), { type: "module" }),
  runners: () => import("./geo-render-jobs").then(m => m.GEO_RUNNERS),
};
