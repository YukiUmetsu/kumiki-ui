/** Semantic template: data-story. Reuses the shared deterministic scene stage. */
import { forwardRef } from "react";
import { SceneTemplateView } from "../scene-templates-react";
import type { SceneTemplateViewProps } from "../scene-templates-react";

export type DataStorySceneProps = SceneTemplateViewProps<"data-story">;
export const DataStoryScene = forwardRef<HTMLDivElement,DataStorySceneProps>(
  function DataStoryScene({spec,...props},ref) {
    return <SceneTemplateView {...props} spec={spec} ref={ref}/>;
  }
);
