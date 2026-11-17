/** SKY1's render pool: rendered in module workers (see `../anatomy/foundation-render.ts`). */
import type { RenderPool } from "../anatomy/foundation-render";

export const SKY_RENDER_POOL: RenderPool = {
  id: "sky",
  worker: () => new Worker(new URL("./sky-render-worker.ts", import.meta.url), { type: "module" }),
  runners: () => import("./sky-render-jobs").then(m => m.SKY_RUNNERS),
};
