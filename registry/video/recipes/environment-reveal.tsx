/** Semantic template: environment-reveal. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type EnvironmentRevealSceneProps = SceneTemplateViewProps<"environment-reveal">;
export const EnvironmentRevealScene = forwardRef<HTMLDivElement,EnvironmentRevealSceneProps>(
  function EnvironmentRevealScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
