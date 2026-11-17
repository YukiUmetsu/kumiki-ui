/**
 * MAKEUP1's render job (`makeup-portrait`: an ANAT1 portrait wearing a plan), run by `makeup-render-worker.ts`. The job
 * gets the plan as plain data and builds its paint in the worker: a paint's functions cannot be sent to a worker.
 */
import type { RenderOutput, RenderRunners } from "./foundation-render";
import { renderPortrait } from "./face-portrait";
import type { PortraitOptions } from "./face-portrait";
import type { MakeupPlan } from "./makeup-design";
import { makeupPortraitOptions } from "./makeup-paint";

export const MAKEUP_RUNNERS: RenderRunners = {
  "makeup-portrait": (({ portrait, plan }: { portrait: PortraitOptions; plan: MakeupPlan }): RenderOutput => {
    const p = renderPortrait(makeupPortraitOptions(portrait, plan));
    return { width: p.width, height: p.height, rgba: p.rgba, ms: p.ms };
  }) as never,
};
