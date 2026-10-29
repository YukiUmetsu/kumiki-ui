/** Semantic template: relief-map-expedition. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type ReliefMapExpeditionSceneProps = SceneTemplateViewProps<"relief-map-expedition">;
export const ReliefMapExpeditionScene = forwardRef<HTMLDivElement,ReliefMapExpeditionSceneProps>(
  function ReliefMapExpeditionScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
