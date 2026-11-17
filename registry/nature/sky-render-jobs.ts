/** SKY1's render job (`sky`: `renderCloudSky`), run by `sky-render-worker.ts` (see `../anatomy/foundation-render.ts`). */
import type { RenderOutput, RenderRunners } from "../anatomy/foundation-render";
import { renderCloudSky } from "./sky-volume";
import type { SkyRenderOptions } from "./sky-volume";

export const SKY_RUNNERS: RenderRunners = {
  sky: ((o: SkyRenderOptions): RenderOutput => { const r = renderCloudSky(o); return { width: r.width, height: r.height, rgba: r.rgba, ms: r.ms }; }) as never,
};
