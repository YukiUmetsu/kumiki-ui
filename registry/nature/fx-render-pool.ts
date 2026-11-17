/** FX1's render pool: fire and smoke rendered in module workers (see `../anatomy/foundation-render.ts`). */
import type { RenderPool } from "../anatomy/foundation-render";

export const FX_RENDER_POOL: RenderPool = {
  id: "fx",
  worker: () => new Worker(new URL("./fx-render-worker.ts", import.meta.url), { type: "module" }),
  runners: () => import("./fx-render-jobs").then(m => m.FX_RUNNERS),
};
