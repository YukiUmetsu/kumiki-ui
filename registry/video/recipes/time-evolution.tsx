/** Semantic template: time-evolution. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type TimeEvolutionSceneProps = SceneTemplateViewProps<"time-evolution">;
export const TimeEvolutionScene = forwardRef<HTMLDivElement,TimeEvolutionSceneProps>(
  function TimeEvolutionScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
