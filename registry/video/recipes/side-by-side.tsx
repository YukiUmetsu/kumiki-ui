/** Semantic template: side-by-side. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type SideBySideSceneProps = SceneTemplateViewProps<"side-by-side">;
export const SideBySideScene = forwardRef<HTMLDivElement,SideBySideSceneProps>(
  function SideBySideScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
