/** Semantic template: scale-reveal. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type ScaleRevealSceneProps = SceneTemplateViewProps<"scale-reveal">;
export const ScaleRevealScene = forwardRef<HTMLDivElement,ScaleRevealSceneProps>(
  function ScaleRevealScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
