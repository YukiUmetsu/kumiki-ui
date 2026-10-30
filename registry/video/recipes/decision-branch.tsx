/** Semantic template: decision-branch. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type DecisionBranchSceneProps = SceneTemplateViewProps<"decision-branch">;
export const DecisionBranchScene = forwardRef<HTMLDivElement,DecisionBranchSceneProps>(
  function DecisionBranchScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
