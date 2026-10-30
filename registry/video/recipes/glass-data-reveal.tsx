/** Semantic template: glass-data-reveal. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type GlassDataRevealSceneProps = SceneTemplateViewProps<"glass-data-reveal">;
export const GlassDataRevealScene = forwardRef<HTMLDivElement,GlassDataRevealSceneProps>(
  function GlassDataRevealScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
