/** Semantic template: nature-world-identity-reveal. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type NatureWorldIdentityRevealSceneProps = SceneTemplateViewProps<"nature-world-identity-reveal">;
export const NatureWorldIdentityRevealScene = forwardRef<HTMLDivElement,NatureWorldIdentityRevealSceneProps>(
  function NatureWorldIdentityRevealScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
