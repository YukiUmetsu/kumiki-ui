/** ANAT1's render pool: portraits, hands and skin rendered in module workers (see `foundation-render.ts`). */
import type { RenderPool } from "./foundation-render";

export const ANATOMY_RENDER_POOL: RenderPool = {
  id: "anatomy",
  worker: () => new Worker(new URL("./anatomy-render-worker.ts", import.meta.url), { type: "module" }),
  runners: () => import("./anatomy-render-jobs").then(m => m.ANATOMY_RUNNERS),
};
