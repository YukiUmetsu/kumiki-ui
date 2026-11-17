/** MATL1's render job (`material`: a swatch from `renderMaterialSwatch`), run by `materials-render-worker.ts`. */
import type { RenderOutput, RenderRunners } from "../anatomy/foundation-render";
import { renderMaterialSwatch } from "./materials-render";
import type { SwatchOptions } from "./materials-render";

export const MATERIALS_RUNNERS: RenderRunners = {
  material: (({ material, options }: { material: string; options: SwatchOptions }): RenderOutput => {
    const r = renderMaterialSwatch(material, options);
    return { width: r.width, height: r.height, rgba: r.rgba, ms: r.ms };
  }) as never,
};
