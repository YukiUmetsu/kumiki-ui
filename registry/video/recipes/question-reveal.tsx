/** Semantic template: question-reveal. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type QuestionRevealSceneProps = SceneTemplateViewProps<"question-reveal">;
export const QuestionRevealScene = forwardRef<HTMLDivElement,QuestionRevealSceneProps>(
  function QuestionRevealScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
