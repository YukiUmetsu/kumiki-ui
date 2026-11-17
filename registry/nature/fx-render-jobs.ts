/** FX1's render jobs (`fire`: `renderFire`; `fireball`: `renderFireball`), run by `fx-render-worker.ts` (see `../anatomy/foundation-render.ts`). */
import type { RenderOutput, RenderRunners } from "../anatomy/foundation-render";
import { renderFire, renderFireball } from "./fx-render";
import type { FireballRenderOptions, FireRenderOptions } from "./fx-render";

export const FX_RUNNERS: RenderRunners = {
  fire: ((o: FireRenderOptions): RenderOutput => { const r = renderFire(o); return { width: r.width, height: r.height, rgba: r.rgba, ms: r.ms, meta: { flameHeight: r.flameHeight, flickerHz: r.flickerHz } }; }) as never,
  fireball: ((o: FireballRenderOptions): RenderOutput => { const r = renderFireball(o); return { width: r.width, height: r.height, rgba: r.rgba, ms: r.ms }; }) as never,
};
