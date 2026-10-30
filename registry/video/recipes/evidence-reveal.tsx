/** Semantic template: evidence-reveal. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type EvidenceRevealSceneProps = SceneTemplateViewProps<"evidence-reveal">;
export const EvidenceRevealScene = forwardRef<HTMLDivElement,EvidenceRevealSceneProps>(
  function EvidenceRevealScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
