/**
 * FOOD1's render jobs, run by `food-render-worker.ts` (see `../anatomy/foundation-render.ts`): `food` (`renderFood`, the
 * cooking-physics rasters) and `still-life` (`renderFoodStillLife`, a storybook still life of a library entry).
 */
import type { RenderOutput, RenderRunners } from "../anatomy/foundation-render";
import { renderFood } from "./food-render";
import type { FoodRenderOptions } from "./food-render";
import { renderFoodStillLife } from "./food-still-life";
import type { FoodRenderJob } from "./food-still-life";

export const FOOD_RUNNERS: RenderRunners = {
  food: ((o: FoodRenderOptions): RenderOutput => { const r = renderFood(o); return { width: r.width, height: r.height, rgba: r.rgba, ms: r.ms, meta: { caption: r.caption } }; }) as never,
  "still-life": ((o: FoodRenderJob): RenderOutput => { const r = renderFoodStillLife(o); return { width: r.width, height: r.height, rgba: r.rgba, ms: r.ms, meta: { caption: r.caption } }; }) as never,
};
