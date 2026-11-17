/** GEO1's render job (`terrain`: `renderTerrain`), run by `geo-render-worker.ts` (see `../anatomy/foundation-render.ts`). */
import type { RenderOutput, RenderRunners } from "../anatomy/foundation-render";
import { renderTerrain } from "./geo-render";
import type { TerrainRenderOptions } from "./geo-render";

export const GEO_RUNNERS: RenderRunners = {
  terrain: ((o: TerrainRenderOptions): RenderOutput => {
    const r = renderTerrain(o);
    return { width: r.width, height: r.height, rgba: r.rgba, ms: r.ms, meta: { snowline: r.snowline, treeline: r.treeline, min: r.field.min, max: r.field.max } };
  }) as never,
};
