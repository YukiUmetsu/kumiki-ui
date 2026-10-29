/** Semantic template: orbit-world. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type OrbitWorldSceneProps = SceneTemplateViewProps<"orbit-world">;
export const OrbitWorldScene = forwardRef<HTMLDivElement,OrbitWorldSceneProps>(
  function OrbitWorldScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
