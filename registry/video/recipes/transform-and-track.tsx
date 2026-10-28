/** Semantic template: transform-and-track. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type TransformAndTrackSceneProps = SceneTemplateViewProps<"transform-and-track">;
export const TransformAndTrackScene = forwardRef<HTMLDivElement,TransformAndTrackSceneProps>(
  function TransformAndTrackScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
