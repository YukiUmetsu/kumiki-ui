/** FX1's render job (`fire`: `renderFire`), run by `fx-render-worker.ts` (see `../anatomy/foundation-render.ts`). */
import type { RenderOutput, RenderRunners } from "../anatomy/foundation-render";
import { renderFire } from "./fx-render";
import type { FireRenderOptions } from "./fx-render";

export const FX_RUNNERS: RenderRunners = {
  fire: ((o: FireRenderOptions): RenderOutput => { const r = renderFire(o); return { width: r.width, height: r.height, rgba: r.rgba, ms: r.ms, meta: { flameHeight: r.flameHeight, flickerHz: r.flickerHz } }; }) as never,
};
