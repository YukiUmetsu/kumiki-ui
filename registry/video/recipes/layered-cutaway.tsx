/** Semantic template: layered-cutaway. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type LayeredCutawaySceneProps = SceneTemplateViewProps<"layered-cutaway">;
export const LayeredCutawayScene = forwardRef<HTMLDivElement,LayeredCutawaySceneProps>(
  function LayeredCutawayScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
