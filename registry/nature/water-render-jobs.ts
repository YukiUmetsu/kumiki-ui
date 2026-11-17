/** WATER1's render job (`ocean`: `renderOcean`), run by `water-render-worker.ts` (see `../anatomy/foundation-render.ts`). */
import type { RenderOutput, RenderRunners } from "../anatomy/foundation-render";
import { renderOcean } from "./water-ocean";
import type { OceanRenderOptions } from "./water-ocean";

export const WATER_RUNNERS: RenderRunners = {
  ocean: ((o: OceanRenderOptions): RenderOutput => { const r = renderOcean(o); return { width: r.width, height: r.height, rgba: r.rgba, ms: r.ms }; }) as never,
};
