/** FOOD1's render pool: cooked food rendered in module workers (see `../anatomy/foundation-render.ts`). */
import type { RenderPool } from "../anatomy/foundation-render";

export const FOOD_RENDER_POOL: RenderPool = {
  id: "food",
  worker: () => new Worker(new URL("./food-render-worker.ts", import.meta.url), { type: "module" }),
  runners: () => import("./food-render-jobs").then(m => m.FOOD_RUNNERS),
};
