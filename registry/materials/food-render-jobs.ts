/** FOOD1's render job (`food`: `renderFood`), run by `food-render-worker.ts` (see `../anatomy/foundation-render.ts`). */
import type { RenderOutput, RenderRunners } from "../anatomy/foundation-render";
import { renderFood } from "./food-render";
import type { FoodRenderOptions } from "./food-render";

export const FOOD_RUNNERS: RenderRunners = {
  food: ((o: FoodRenderOptions): RenderOutput => { const r = renderFood(o); return { width: r.width, height: r.height, rgba: r.rgba, ms: r.ms, meta: { caption: r.caption } }; }) as never,
};
